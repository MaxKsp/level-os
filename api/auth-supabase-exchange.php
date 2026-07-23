<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
if (!supabase_auth_enabled()) {
    http_response_code(503);
    echo json_encode(['error' => 'auth_provider_unavailable']);
    exit;
}
require_csrf();
if (!rate_ok_for_subject('supabase_exchange', 'i:' . substr(hash('sha256', client_ip()), 0, 62), 20, 60)) {
    http_response_code(429);
    header('Retry-After: 60');
    echo json_encode(['error' => 'too_many_requests']);
    exit;
}

try {
    $identity = supabase_auth_client()->verifyAccessToken(supabase_bearer_token());
    if ($identity->hasVerifiedTotp && $identity->assuranceLevel !== 'aal2') {
        http_response_code(403);
        echo json_encode(['status' => 'supabase_mfa_required']);
        exit;
    }
    $identityService = new SupabaseIdentityService(get_db());
    $resolved = $identityService->resolve($identity);
    if ($resolved['totp_enabled'] && $identity->hasVerifiedTotp && $identity->assuranceLevel === 'aal2') {
        $identityService->retireLegacyTotp($resolved['user_id']);
        $resolved['totp_enabled'] = false;
    }
    if ($resolved['totp_enabled'] && $identity->assuranceLevel !== 'aal2') {
        session_regenerate_id(true);
        stage_pending_supabase_link($identity);
        $_SESSION['pending_2fa_user_id'] = $resolved['user_id'];
        $_SESSION['pending_2fa_session_version'] = $resolved['session_version'];
        echo json_encode(['status' => 'mfa_required']);
        exit;
    }
    // O bridge roda tambem quando o app ja possui uma sessao PHP valida.
    // Nessa situacao, regenerar a sessao apagaria o CSRF que acabou de ser
    // injetado no shell React e todas as escritas seguintes retornariam 403.
    // A regeneracao continua obrigatoria no callback inicial, em uma sessao
    // expirada ou quando ha uma troca real de usuario.
    $currentUserId = current_user_id();
    if ($currentUserId !== $resolved['user_id']) {
        complete_login($resolved['user_id'], $resolved['session_version']);
    }
    mark_supabase_session($identity);
    // Se complete_login() trocou a sessao, entrega o novo CSRF no mesmo
    // round-trip para o cliente nao continuar com um token obsoleto.
    header('X-CSRF-Token: ' . csrf_token());
    echo json_encode(['status' => 'authenticated', 'created' => $resolved['created']]);
} catch (SupabaseAccountLinkRequiredException) {
    stage_pending_supabase_link($identity);
    http_response_code(409);
    echo json_encode(['error' => 'link_required']);
} catch (SupabaseAuthException $e) {
    error_log('Supabase session validation failed: ' . $e->getMessage());
    http_response_code(401);
    echo json_encode(['error' => 'invalid_authentication']);
} catch (Throwable $e) {
    error_log('Supabase session exchange failed (' . get_class($e) . ').');
    http_response_code(503);
    echo json_encode(['error' => 'authentication_unavailable']);
}
