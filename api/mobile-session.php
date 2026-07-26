<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/**
 * A URL e a publishable key do Supabase são dados públicos presentes no APK.
 * Em produção, a configuração privada do PHP continua sendo preferida. Este
 * fallback permite que a ponte nativa seja ativada sem armazenar service-role
 * key ou qualquer segredo no aplicativo.
 */
function mobile_supabase_auth_client(): SupabaseAuthClient {
    if (supabase_auth_enabled()) return supabase_auth_client();

    $projectUrl = trim((string)($_SERVER['HTTP_X_LEVEL_SUPABASE_URL'] ?? ''));
    $publishableKey = trim((string)($_SERVER['HTTP_X_LEVEL_SUPABASE_KEY'] ?? ''));
    $expectedProjectUrl = 'https://vohkymrffrasgzkfpjng.supabase.co';

    if (!hash_equals($expectedProjectUrl, rtrim($projectUrl, '/'))) {
        throw new SupabaseAuthException('Unexpected authentication project.');
    }
    return new SupabaseAuthClient($projectUrl, $publishableKey);
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$rateSubject = 'i:' . substr(hash('sha256', client_ip()), 0, 62);
if (!rate_ok_for_subject('mobile_session', $rateSubject, 30, 60)) {
    http_response_code(429);
    header('Retry-After: 60');
    echo json_encode(['error' => 'too_many_requests']);
    exit;
}

if ($method === 'GET') {
    echo json_encode([
        'csrf' => csrf_token(),
        'authenticated' => current_user_id() !== null,
    ]);
    exit;
}

require_csrf();

if ($method === 'DELETE') {
    $uid = current_user_id();
    if ($uid !== null) {
        try {
            audit_record(get_db(), $uid, 'auth.logout', 'success', ['client' => 'native']);
        } catch (Throwable) {
        }
    }
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    echo json_encode(['status' => 'signed_out']);
    exit;
}

$requestPayload = json_decode((string)file_get_contents('php://input'), true);
$localPassword = is_array($requestPayload)
    ? (string)($requestPayload['local_password'] ?? '')
    : '';

try {
    $identity = mobile_supabase_auth_client()->verifyAccessToken(supabase_bearer_token());
    if ($identity->hasVerifiedTotp && $identity->assuranceLevel !== 'aal2') {
        http_response_code(403);
        echo json_encode(['status' => 'supabase_mfa_required']);
        exit;
    }

    $identityService = new SupabaseIdentityService(get_db());
    $resolved = $identityService->resolve($identity);
    if ($resolved['totp_enabled'] && $identity->assuranceLevel !== 'aal2') {
        http_response_code(403);
        echo json_encode(['status' => 'mfa_required']);
        exit;
    }
    if ($resolved['totp_enabled'] && $identity->hasVerifiedTotp) {
        $identityService->retireLegacyTotp($resolved['user_id']);
    }

    complete_login($resolved['user_id'], $resolved['session_version']);
    mark_supabase_session($identity);
    $csrf = csrf_token();
    header('X-CSRF-Token: ' . $csrf);
    echo json_encode([
        'status' => 'authenticated',
        'created' => $resolved['created'],
        'csrf' => $csrf,
    ]);
} catch (SupabaseAccountLinkRequiredException) {
    // O e-mail já existia antes da migração para Supabase. No login nativo por
    // senha, a mesma credencial local pode confirmar a posse e concluir a
    // vinculação sem abrir uma WebView. A senha só existe durante esta request.
    if (
        isset($identity)
        && $identity instanceof SupabaseIdentity
        && $localPassword !== ''
        && strlen($localPassword) <= 1024
    ) {
        if (!rate_ok_for_subject('mobile_account_link', $rateSubject, 6, 900)) {
            http_response_code(429);
            header('Retry-After: 900');
            echo json_encode(['error' => 'too_many_requests']);
            exit;
        }
        $lookup = get_db()->prepare(
            'SELECT id, password_hash, session_version, totp_enabled
             FROM users
             WHERE LOWER(email) = LOWER(?)
             LIMIT 1'
        );
        $lookup->execute([$identity->email]);
        $existing = $lookup->fetch();
        $hash = is_array($existing) ? (string)($existing['password_hash'] ?? '') : '';

        if ($hash !== '' && password_verify($localPassword, $hash)) {
            if ((int)($existing['totp_enabled'] ?? 0) === 1) {
                stage_pending_supabase_link($identity);
                http_response_code(403);
                echo json_encode(['error' => 'mfa_required']);
                exit;
            }

            $userId = (int)$existing['id'];
            (new SupabaseIdentityService(get_db()))->linkExisting($userId, $identity);
            complete_login($userId, max(1, (int)$existing['session_version']));
            mark_supabase_session($identity);
            $csrf = csrf_token();
            header('X-CSRF-Token: ' . $csrf);
            echo json_encode([
                'status' => 'authenticated',
                'created' => false,
                'linked' => true,
                'csrf' => $csrf,
            ]);
            exit;
        }
    }

    http_response_code(409);
    echo json_encode(['error' => 'link_required']);
} catch (SupabaseAuthException $e) {
    error_log('Native session validation failed: ' . $e->getMessage());
    http_response_code(401);
    echo json_encode(['error' => 'invalid_authentication']);
} catch (Throwable $e) {
    error_log('Native session exchange failed (' . get_class($e) . ').');
    http_response_code(503);
    echo json_encode(['error' => 'authentication_unavailable']);
}
