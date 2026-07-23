<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/totp.php';
require_once __DIR__ . '/app/Core/Audit.php';
require_once __DIR__ . '/app/Core/SentryClient.php';
require_once __DIR__ . '/app/Modules/Email/EmailBootstrap.php';
require_once __DIR__ . '/app/Modules/Auth/SupabaseAuthBootstrap.php';

sentry_bootstrap();

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ini_set('session.use_strict_mode', '1');

$__secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => $__secure,
    'httponly' => true,
    // OAuth retorna por navegação GET a partir de accounts.google.com. Lax envia
    // o cookie nesse retorno; mutações continuam protegidas por CSRF explícito.
    'samesite' => 'Lax',
]);
session_start();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_IDLE_TIMEOUT_SECONDS = 43200; // 12h sem atividade encerra a sessão
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MINUTES = 60;
const RATE_HIT_RETENTION_SECONDS = 172800;
const RATE_HIT_CLEANUP_ODDS = 100;

function current_user_id(): ?int {
    if (($_SESSION['auth_provider'] ?? null) === 'supabase'
        && (int)($_SESSION['supabase_expires_at'] ?? 0) <= time()) {
        unset(
            $_SESSION['user_id'],
            $_SESSION['session_version'],
            $_SESSION['auth_provider'],
            $_SESSION['supabase_expires_at'],
            $_SESSION['csrf']
        );
        return null;
    }
    $userId = $_SESSION['user_id'] ?? null;
    $sessionVersion = $_SESSION['session_version'] ?? null;
    if (!is_int($userId) || $userId < 1 || !is_int($sessionVersion) || $sessionVersion < 1) {
        unset($_SESSION['user_id'], $_SESSION['session_version']);
        return null;
    }

    // Expiração por inatividade: sem request ha mais de SESSION_IDLE_TIMEOUT_SECONDS,
    // a sessão morre mesmo com o navegador aberto (PWA instalada, aba esquecida).
    $lastActivity = $_SESSION['last_activity'] ?? null;
    if (is_int($lastActivity) && (time() - $lastActivity) > SESSION_IDLE_TIMEOUT_SECONDS) {
        unset(
            $_SESSION['user_id'],
            $_SESSION['session_version'],
            $_SESSION['auth_provider'],
            $_SESSION['supabase_expires_at'],
            $_SESSION['csrf'],
            $_SESSION['last_activity']
        );
        return null;
    }
    $_SESSION['last_activity'] = time();

    // Uma consulta por usuario/versao em cada request basta. Se complete_login()
    // trocar qualquer um dos valores no mesmo request, a chave muda e revalida.
    static $validatedKey = null;
    $key = $userId . ':' . $sessionVersion;
    if ($validatedKey === $key) return $userId;

    $stmt = get_db()->prepare('SELECT session_version FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $storedVersion = $stmt->fetchColumn();
    if ($storedVersion === false || (int)$storedVersion !== $sessionVersion) {
        unset(
            $_SESSION['user_id'],
            $_SESSION['session_version'],
            $_SESSION['pending_2fa_user_id'],
            $_SESSION['pending_2fa_session_version'],
            $_SESSION['csrf']
        );
        return null;
    }

    $validatedKey = $key;
    return $userId;
}

function require_login(): int {
    $uid = current_user_id();
    if ($uid === null) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'unauthorized']);
        exit;
    }
    return $uid;
}

function require_login_page(): int {
    $uid = current_user_id();
    if ($uid === null) {
        header('Location: login.php');
        exit;
    }
    return $uid;
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'invalid csrf token']);
        exit;
    }
}

/** Campo hidden pra formulários HTML (login/registro). */
function csrf_field(): string {
    return '<input type="hidden" name="csrf" value="' . htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}

/** Valida o token vindo de um POST de formulário. */
function csrf_form_ok(): bool {
    $sent = (string)($_POST['csrf'] ?? '');
    return !empty($_SESSION['csrf']) && $sent !== '' && hash_equals($_SESSION['csrf'], $sent);
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Rate limit por um identificador explicito. O chamador deve usar um valor
 * opaco (por exemplo, o hash de um e-mail) quando o identificador for
 * sensivel.
 */
function rate_ok_for_subject(string $bucket, string $subject, int $max, int $windowSec): bool {
    if ($bucket === '' || strlen($bucket) > 48 || $subject === '' || strlen($subject) > 64) {
        throw new InvalidArgumentException('Invalid rate-limit key.');
    }
    if ($max < 1 || $windowSec < 1) {
        throw new InvalidArgumentException('Invalid rate-limit window.');
    }

    $db = get_db();
    if ($db->inTransaction()) {
        throw new RuntimeException('Rate limiting must run outside a business transaction.');
    }

    $now = time();
    try {
        $db->beginTransaction();

        // O UPSERT cria a chave ausente e tambem adquire o lock exclusivo da
        // linha existente. Assim duas requisicoes concorrentes nunca decidem
        // sobre o mesmo contador a partir de um SELECT obsoleto.
        $seed = $db->prepare('INSERT INTO rate_hits (bucket, subject, window_start, hits)
            VALUES (?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE subject = VALUES(subject)');
        $seed->execute([$bucket, $subject, $now]);

        $stmt = $db->prepare('SELECT window_start, hits FROM rate_hits
            WHERE bucket = ? AND subject = ? FOR UPDATE');
        $stmt->execute([$bucket, $subject]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new RuntimeException('Unable to lock rate-limit row.');
        }

        $windowExpired = ($now - (int)$row['window_start']) >= $windowSec;
        if ($windowExpired) {
            $update = $db->prepare('UPDATE rate_hits SET window_start = ?, hits = 1
                WHERE bucket = ? AND subject = ?');
            $update->execute([$now, $bucket, $subject]);
            $allowed = true;
        } elseif ((int)$row['hits'] >= $max) {
            $allowed = false;
        } else {
            $update = $db->prepare('UPDATE rate_hits SET hits = hits + 1
                WHERE bucket = ? AND subject = ?');
            $update->execute([$bucket, $subject]);
            $allowed = true;
        }

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    maybe_cleanup_rate_hits($db, $now);
    return $allowed;
}

/** Expurgo limitado e probabilistico para impedir crescimento indefinido. */
function maybe_cleanup_rate_hits(PDO $db, int $now): void {
    if (random_int(1, RATE_HIT_CLEANUP_ODDS) !== 1) return;

    try {
        $cutoff = max(0, $now - RATE_HIT_RETENTION_SECONDS);
        $stmt = $db->prepare('DELETE FROM rate_hits WHERE window_start < ? LIMIT 250');
        $stmt->execute([$cutoff]);
    } catch (Throwable $e) {
        // Limpeza oportunista nunca pode derrubar uma requisicao valida.
        error_log('Rate-limit cleanup failed: ' . $e->getMessage());
    }
}

/**
 * Rate limit generico por janela fixa. bucket = nome do endpoint.
 * subject = usuario logado, senao IP. Retorna true se dentro do limite.
 */
function rate_ok(string $bucket, int $max, int $windowSec): bool {
    $subject = current_user_id() !== null ? ('u' . current_user_id()) : ('ip:' . client_ip());
    return rate_ok_for_subject($bucket, $subject, $max, $windowSec);
}

/** Corta com HTTP 429 se estourar o limite. Chame depois de require_login, antes de processar. */
function require_rate_limit(string $bucket, int $max, int $windowSec): void {
    if (!rate_ok($bucket, $max, $windowSec)) {
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: ' . $windowSec);
        echo json_encode(['error' => 'too many requests']);
        exit;
    }
}

function is_locked_out(): bool {
    $stmt = get_db()->prepare('SELECT locked_until FROM login_attempts WHERE ip = ?');
    $stmt->execute([client_ip()]);
    $row = $stmt->fetch();
    return $row && $row['locked_until'] && strtotime($row['locked_until']) > time();
}

function record_failed_attempt(): void {
    $db = get_db();
    $ip = client_ip();
    $stmt = $db->prepare('SELECT attempts FROM login_attempts WHERE ip = ?');
    $stmt->execute([$ip]);
    $row = $stmt->fetch();
    $attempts = $row ? (int)$row['attempts'] + 1 : 1;
    $lockedUntil = null;
    if ($attempts >= MAX_LOGIN_ATTEMPTS) {
        $lockedUntil = date('Y-m-d H:i:s', time() + LOCKOUT_MINUTES * 60);
        $attempts = 0;
    }
    $stmt = $db->prepare('INSERT INTO login_attempts (ip, attempts, locked_until) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), locked_until = VALUES(locked_until)');
    $stmt->execute([$ip, $attempts, $lockedUntil]);
}

function reset_attempts(): void {
    $stmt = get_db()->prepare('DELETE FROM login_attempts WHERE ip = ?');
    $stmt->execute([client_ip()]);
}

/** Retorna 'ok' | '2fa_required' | 'locked' | 'invalid'. */
function attempt_login(string $username, string $password): string {
    $db = get_db();
    if (is_locked_out()) {
        try { audit_record($db, null, 'auth.login', 'denied', ['reason' => 'lockout']); } catch (Throwable) {}
        return 'locked';
    }
    $stmt = $db->prepare('SELECT id, password_hash, totp_enabled, session_version
        FROM users WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    if (!$user || $user['password_hash'] === null || !password_verify($password, $user['password_hash'])) {
        record_failed_attempt();
        try { audit_record($db, null, 'auth.login', 'failure', ['reason' => 'invalid_credentials']); } catch (Throwable) {}
        return 'invalid';
    }
    reset_attempts();
    if ((int)$user['totp_enabled'] === 1) {
        session_regenerate_id(true);
        $_SESSION['pending_2fa_user_id'] = (int)$user['id'];
        $_SESSION['pending_2fa_session_version'] = (int)$user['session_version'];
        try { audit_record($db, (int)$user['id'], 'auth.login', 'success', ['method' => 'password', '2fa_pending' => true]); } catch (Throwable) {}
        return '2fa_required';
    }
    try { audit_record($db, (int)$user['id'], 'auth.login', 'success', ['method' => 'password']); } catch (Throwable) {}
    complete_login((int)$user['id'], (int)$user['session_version']);
    return 'ok';
}

/** Sessão nova + CSRF novo ao virar usuário autenticado. */
function complete_login(int $userId, ?int $sessionVersion = null): void {
    if ($sessionVersion === null) {
        $stmt = get_db()->prepare('SELECT session_version FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $storedVersion = $stmt->fetchColumn();
        if ($storedVersion === false) {
            throw new RuntimeException('Cannot create a session for an unknown user.');
        }
        $sessionVersion = (int)$storedVersion;
    }
    if ($sessionVersion < 1) {
        throw new RuntimeException('Invalid user session version.');
    }

    session_regenerate_id(true);
    unset($_SESSION['csrf']);
    $_SESSION['user_id'] = $userId;
    $_SESSION['session_version'] = $sessionVersion;
    $_SESSION['last_activity'] = time();
    unset($_SESSION['auth_provider'], $_SESSION['supabase_expires_at']);
    unset($_SESSION['pending_2fa_user_id'], $_SESSION['pending_2fa_session_version']);
    complete_pending_supabase_link($userId);
}

function mark_supabase_session(SupabaseIdentity $identity): void {
    $_SESSION['auth_provider'] = 'supabase';
    $_SESSION['supabase_expires_at'] = $identity->expiresAt;
}

function stage_pending_supabase_link(SupabaseIdentity $identity): void {
    $metadata = [];
    foreach (['username', 'user_name', 'avatar_url', 'picture'] as $key) {
        $value = $identity->metadata[$key] ?? null;
        if (is_string($value) && strlen($value) <= 2048) $metadata[$key] = $value;
    }
    $_SESSION['pending_supabase_identity'] = [
        'subject' => $identity->subject,
        'email' => $identity->email,
        'email_verified' => $identity->emailVerified,
        'expires_at' => $identity->expiresAt,
        'aal' => $identity->assuranceLevel,
        'metadata' => $metadata,
        'has_verified_totp' => $identity->hasVerifiedTotp,
    ];
}

/** Vincula somente depois que a credencial local/2FA foi confirmada. */
function complete_pending_supabase_link(int $userId): bool {
    $pending = $_SESSION['pending_supabase_identity'] ?? null;
    if (!is_array($pending)) return false;
    unset($_SESSION['pending_supabase_identity']);
    if ((int)($pending['expires_at'] ?? 0) <= time()) return false;
    try {
        $identity = new SupabaseIdentity(
            (string)($pending['subject'] ?? ''),
            (string)($pending['email'] ?? ''),
            ($pending['email_verified'] ?? false) === true,
            (int)$pending['expires_at'],
            (string)($pending['aal'] ?? 'aal1'),
            is_array($pending['metadata'] ?? null) ? $pending['metadata'] : [],
            ($pending['has_verified_totp'] ?? false) === true,
        );
        (new SupabaseIdentityService(get_db()))->linkExisting($userId, $identity);
        mark_supabase_session($identity);
        return true;
    } catch (Throwable $e) {
        error_log('Supabase identity link failed (' . get_class($e) . ').');
        return false;
    }
}

/**
 * Confere o codigo TOTP (ou um codigo de backup) pra concluir um login
 * pendente de 2FA. Retorna 'ok' | 'locked' | 'invalid'. Tentativas erradas
 * contam no mesmo lockout por IP do login com senha — sem isso daria pra
 * forçar o codigo de 6 digitos na base da repetição.
 */
function attempt_2fa(string $code): string {
    $uid = $_SESSION['pending_2fa_user_id'] ?? null;
    $pendingVersion = $_SESSION['pending_2fa_session_version'] ?? null;
    if (!is_int($uid) || !is_int($pendingVersion)) {
        unset($_SESSION['pending_2fa_user_id'], $_SESSION['pending_2fa_session_version']);
        return 'invalid';
    }
    if (is_locked_out()) {
        try { audit_record(get_db(), $uid, 'auth.2fa', 'denied', ['reason' => 'lockout']); } catch (Throwable) {}
        return 'locked';
    }

    $db = get_db();
    $stmt = $db->prepare('SELECT totp_secret, session_version FROM users WHERE id = ?');
    $stmt->execute([$uid]);
    $user = $stmt->fetch();
    if (!$user || !$user['totp_secret'] || (int)$user['session_version'] !== $pendingVersion) {
        unset($_SESSION['pending_2fa_user_id'], $_SESSION['pending_2fa_session_version']);
        return 'invalid';
    }

    if (totp_verify_code($user['totp_secret'], $code)) {
        reset_attempts();
        try { audit_record($db, $uid, 'auth.2fa', 'success', ['method' => 'totp']); } catch (Throwable) {}
        complete_login((int)$uid, $pendingVersion);
        return 'ok';
    }

    $stmt = $db->prepare('SELECT id, code_hash FROM totp_backup_codes WHERE user_id = ? AND used_at IS NULL');
    $stmt->execute([$uid]);
    foreach ($stmt->fetchAll() as $row) {
        if (password_verify(trim($code), $row['code_hash'])) {
            $db->prepare('UPDATE totp_backup_codes SET used_at = NOW() WHERE id = ?')->execute([$row['id']]);
            reset_attempts();
            try { audit_record($db, $uid, 'auth.2fa', 'success', ['method' => 'backup_code']); } catch (Throwable) {}
            complete_login((int)$uid, $pendingVersion);
            return 'ok';
        }
    }
    record_failed_attempt();
    try { audit_record($db, $uid, 'auth.2fa', 'failure', ['reason' => 'invalid_code']); } catch (Throwable) {}
    return 'invalid';
}

function is_register_locked_out(): bool {
    $stmt = get_db()->prepare('SELECT locked_until FROM register_attempts WHERE ip = ?');
    $stmt->execute([client_ip()]);
    $row = $stmt->fetch();
    return $row && $row['locked_until'] && strtotime($row['locked_until']) > time();
}

function record_register_attempt(): void {
    $db = get_db();
    $ip = client_ip();
    $stmt = $db->prepare('SELECT attempts FROM register_attempts WHERE ip = ?');
    $stmt->execute([$ip]);
    $row = $stmt->fetch();
    $attempts = $row ? (int)$row['attempts'] + 1 : 1;
    $lockedUntil = null;
    if ($attempts >= 5) {
        $lockedUntil = date('Y-m-d H:i:s', time() + 60 * 60);
        $attempts = 0;
    }
    $stmt = $db->prepare('INSERT INTO register_attempts (ip, attempts, locked_until) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), locked_until = VALUES(locked_until)');
    $stmt->execute([$ip, $attempts, $lockedUntil]);
}

function password_reset_rate_subject(string $email): string {
    $normalized = strtolower(trim($email));
    return 'e:' . substr(hash('sha256', $normalized), 0, 62);
}

function password_reset_ip_rate_subject(): string {
    return 'i:' . substr(hash('sha256', client_ip()), 0, 62);
}

function password_reset_token_is_well_formed(string $token): bool {
    return preg_match('/\A[a-f0-9]{64}\z/D', $token) === 1;
}

function password_reset_token_hash(string $token): string {
    return hash('sha256', $token);
}

/** Valida hostname/IP sem confiar cegamente no cabecalho Host. */
function app_host_is_valid(string $host): bool {
    $plainHost = trim($host, '[]');
    if ($plainHost === '' || strlen($plainHost) > 253) return false;
    if (filter_var($plainHost, FILTER_VALIDATE_IP) !== false) return true;

    $host = rtrim(strtolower($plainHost), '.');
    if ($host === '' || strlen($host) > 253) return false;
    foreach (explode('.', $host) as $label) {
        if ($label === '' || strlen($label) > 63) return false;
        if (preg_match('/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/D', $label) !== 1) return false;
    }
    return true;
}

function app_host_is_local(string $host): bool {
    $plainHost = strtolower(trim($host, '[]'));
    if ($plainHost === 'localhost' || $plainHost === 'localhost.') return true;
    if ($plainHost === '::1') return true;
    if (filter_var($plainHost, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false) return false;

    $packed = inet_pton($plainHost);
    return is_string($packed) && strlen($packed) === 4 && ord($packed[0]) === 127;
}

/**
 * Base confiavel para links enviados por e-mail. Em producao, defina APP_URL
 * (por exemplo, https://app.exemplo.com). HTTP so e aceito em host local.
 */
function trusted_app_base_url(): ?string {
    if (defined('APP_URL') && is_string(APP_URL) && trim(APP_URL) !== '') {
        $url = rtrim(trim(APP_URL), '/');
        if (preg_match('/[\x00-\x20\x7f]/', $url)) return null;
        try {
            $parts = parse_url($url);
        } catch (ValueError $e) {
            return null;
        }
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) return null;
        if (isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) return null;
        $scheme = strtolower((string)$parts['scheme']);
        $host = (string)$parts['host'];
        if (!in_array($scheme, ['https', 'http'], true) || !app_host_is_valid($host)) return null;
        if (isset($parts['port']) && ((int)$parts['port'] < 1 || (int)$parts['port'] > 65535)) return null;
        if ($scheme !== 'https' && !app_host_is_local($host)) return null;
        return $url;
    }

    // HTTP_HOST so pode servir de conveniencia no servidor embutido do PHP.
    // Em Apache/FPM/produÃ§Ã£o, mesmo um Host sintaticamente valido continua
    // sendo entrada do cliente e nunca e uma origem canonica.
    if (PHP_SAPI !== 'cli-server') return null;

    $authority = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($authority === '' || preg_match('/\A(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?\z/D', $authority) !== 1) {
        return null;
    }
    try {
        $parts = parse_url('http://' . $authority);
    } catch (ValueError $e) {
        return null;
    }
    if (!is_array($parts) || empty($parts['host']) || !app_host_is_valid((string)$parts['host'])) return null;
    if (isset($parts['port']) && ((int)$parts['port'] < 1 || (int)$parts['port'] > 65535)) return null;

    // Fora do ambiente local, a origem precisa vir de APP_URL. Apenas validar
    // a sintaxe de Host nao cria uma allowlist e permitiria Host injection.
    if (!app_host_is_local((string)$parts['host'])) return null;
    $isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;
    return ($isHttps ? 'https://' : 'http://') . $authority;
}

/**
 * Cria um link apenas se a conta existir. O chamador nunca deve revelar o
 * resultado desta operacao ao navegador.
 */
function issue_password_reset_if_account_exists(string $email): void {
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) return;

    $db = get_db();
    $stmt = $db->prepare('SELECT id, email FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !is_string($user['email']) || !filter_var($user['email'], FILTER_VALIDATE_EMAIL)) return;

    $baseUrl = trusted_app_base_url();
    if ($baseUrl === null) {
        error_log('Password reset skipped: configure a valid HTTPS APP_URL.');
        return;
    }

    $token = bin2hex(random_bytes(PASSWORD_RESET_TOKEN_BYTES));
    $tokenHash = password_reset_token_hash($token);
    $userId = (int)$user['id'];

    try {
        $db->beginTransaction();
        $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')->execute([$userId]);
        $insert = $db->prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ' . PASSWORD_RESET_TTL_MINUTES . ' MINUTE))');
        $insert->execute([$userId, $tokenHash]);
        audit_record($db, $userId, 'auth.password_reset.requested', 'success');
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    $resetUrl = $baseUrl . '/reset-password.php?token=' . rawurlencode($token);
    send_transactional_email(
        (string)$user['email'],
        email_template_password_reset($resetUrl, PASSWORD_RESET_TTL_MINUTES),
        email_idempotency_key('password-reset', $userId . ':' . $tokenHash),
    );
}

function password_reset_token_is_active(string $token): bool {
    if (!password_reset_token_is_well_formed($token)) return false;
    $stmt = get_db()->prepare('SELECT id FROM password_reset_tokens
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1');
    $stmt->execute([password_reset_token_hash($token)]);
    return (bool)$stmt->fetch();
}

/** Consome o token atomicamente, atualiza a senha e invalida todos os links da conta. */
function consume_password_reset_token(string $token, string $newPassword): bool {
    if (!password_reset_token_is_well_formed($token) || mb_strlen($newPassword) < 8) return false;

    $db = get_db();
    $notificationEmail = null;
    try {
        $db->beginTransaction();
        $stmt = $db->prepare('SELECT prt.id, prt.user_id, u.email
            FROM password_reset_tokens prt
            INNER JOIN users u ON u.id = prt.user_id
            WHERE prt.token_hash = ? AND prt.used_at IS NULL AND prt.expires_at > UTC_TIMESTAMP()
            LIMIT 1 FOR UPDATE');
        $stmt->execute([password_reset_token_hash($token)]);
        $row = $stmt->fetch();
        if (!$row) {
            $db->rollBack();
            return false;
        }

        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        if (!is_string($passwordHash) || $passwordHash === '') {
            throw new RuntimeException('Unable to hash password.');
        }
        $db->prepare('UPDATE users
            SET password_hash = ?, session_version = session_version + 1
            WHERE id = ?')->execute([$passwordHash, (int)$row['user_id']]);
        $db->prepare('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP()
            WHERE user_id = ? AND used_at IS NULL')->execute([(int)$row['user_id']]);
        audit_record($db, (int)$row['user_id'], 'auth.password_reset.completed', 'success');
        $db->commit();
        $notificationEmail = is_string($row['email']) ? $row['email'] : null;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    if ($notificationEmail !== null && filter_var($notificationEmail, FILTER_VALIDATE_EMAIL) && !preg_match('/[\r\n]/', $notificationEmail)) {
        send_transactional_email(
            $notificationEmail,
            email_template_password_changed(),
            email_idempotency_key('password-changed', password_reset_token_hash($token)),
        );
    }
    return true;
}
