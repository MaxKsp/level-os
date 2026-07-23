<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Modules/Calendar/GoogleOAuthFlow.php';
require_once __DIR__ . '/app/Modules/Calendar/GoogleCalendarBootstrap.php';

header('Cache-Control: no-store');
header('Pragma: no-cache');
header('Referrer-Policy: no-referrer');

function google_fail(string $message): never {
    http_response_code(400);
    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Level OS</title></head>'
        . '<body style="font-family:sans-serif;background:#000;color:#EDEDED;display:flex;align-items:center;justify-content:center;min-height:100vh;">'
        . '<div><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p><p><a href="login.php" style="color:#31E6D4;">Voltar para o login</a></p></div>'
        . '</body></html>';
    exit;
}

function google_calendar_redirect(string $result): never {
    if (!in_array($result, ['connected', 'denied', 'error'], true)) $result = 'error';
    header('Location: /perfil?calendar=' . rawurlencode($result) . '#integrations', true, 302);
    exit;
}

if (!defined('GOOGLE_CLIENT_ID') || trim((string)GOOGLE_CLIENT_ID) === ''
    || !defined('GOOGLE_CLIENT_SECRET') || trim((string)GOOGLE_CLIENT_SECRET) === '') {
    google_fail('A integração com o Google ainda não foi configurada neste servidor.');
}

$flow = google_oauth_consume_flow((string)($_GET['state'] ?? ''));
if ($flow === null) {
    google_fail('Sessão de acesso com o Google expirada ou inválida. Tente novamente.');
}
$mode = $flow['mode'];
$expectedUserId = $flow['user_id'];
$calendarUserId = null;
if ($mode === 'calendar') {
    $calendarUserId = current_user_id();
    if ($calendarUserId === null || $expectedUserId === null || $calendarUserId !== $expectedUserId) {
        google_calendar_redirect('error');
    }
}

if (isset($_GET['error'])) {
    $providerError = (string)$_GET['error'];
    if ($mode === 'calendar') {
        $providerError === 'access_denied'
            ? google_calendar_redirect('denied')
            : google_calendar_redirect('error');
    }
    google_fail($providerError === 'access_denied'
        ? 'Acesso com o Google cancelado.'
        : 'O Google não conseguiu concluir a autorização. Tente novamente.');
}
$code = (string)($_GET['code'] ?? '');
if ($code === '') {
    $mode === 'calendar'
        ? google_calendar_redirect('denied')
        : google_fail('Acesso com o Google cancelado.');
}

$baseUrl = trusted_app_base_url();
if ($baseUrl === null) {
    $mode === 'calendar'
        ? google_calendar_redirect('error')
        : google_fail('Origem pública do Level OS não configurada. Defina APP_URL.');
}
$redirectUri = $baseUrl . '/auth-google-callback.php';
if ($mode === 'calendar') session_write_close();

try {
    $client = google_oauth_client();
    $tokenData = $client->exchangeCode($code, $redirectUri);
    $accessToken = isset($tokenData['access_token']) ? (string)$tokenData['access_token'] : '';
    $userInfo = $client->userInfo($accessToken);
} catch (Throwable $e) {
    error_log('Google OAuth callback failed (' . get_class($e) . ').');
    $mode === 'calendar'
        ? google_calendar_redirect('error')
        : google_fail('Não foi possível confirmar o acesso com o Google.');
}

if ($mode === 'calendar') {
    try {
        google_calendar_service(get_db())->completeConnection((int)$calendarUserId, $tokenData, $userInfo);
        google_calendar_redirect('connected');
    } catch (Throwable $e) {
        error_log('Google Calendar connection failed (' . get_class($e) . ').');
        google_calendar_redirect('error');
    }
}

$emailVerified = ($userInfo['email_verified'] ?? false) === true || ($userInfo['email_verified'] ?? '') === 'true';
if (!isset($userInfo['sub'], $userInfo['email']) || !$emailVerified) {
    google_fail('Não foi possível validar os dados da sua conta Google.');
}
$googleId = (string)$userInfo['sub'];
$email = strtolower(trim((string)$userInfo['email']));
if (!preg_match('/\A[a-zA-Z0-9._:-]{3,255}\z/D', $googleId)
    || filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 255) {
    google_fail('Não foi possível validar os dados da sua conta Google.');
}
$picture = isset($userInfo['picture']) && preg_match('#\Ahttps://lh3\.googleusercontent\.com/#D', (string)$userInfo['picture'])
    ? (string)$userInfo['picture'] : null;

$db = get_db();
$stmt = $db->prepare('SELECT id, totp_enabled, session_version FROM users WHERE google_id = ? LIMIT 1');
$stmt->execute([$googleId]);
$user = $stmt->fetch();
if (!$user) {
    $stmt = $db->prepare('SELECT id, totp_enabled, session_version FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) $db->prepare('UPDATE users SET google_id = ? WHERE id = ?')->execute([$googleId, $user['id']]);
}

if (!$user) {
    $baseUsername = preg_replace('/[^a-z0-9_]/', '', strtolower(explode('@', $email)[0])) ?: 'usuario';
    $username = mb_substr($baseUsername, 0, 56);
    $suffix = 0;
    $check = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    do {
        $check->execute([$username]);
        if (!$check->fetch()) break;
        $suffix++;
        $username = mb_substr($baseUsername, 0, max(1, 56 - strlen((string)$suffix))) . $suffix;
    } while ($suffix < 10000);
    $stmt = $db->prepare('INSERT INTO users (username, email, google_id, email_verified_at, avatar) VALUES (?, ?, ?, NOW(), ?)');
    $stmt->execute([$username, $email, $googleId, $picture]);
    $userId = (int)$db->lastInsertId();
    $totpEnabled = false;
    $sessionVersion = 1;
} else {
    $userId = (int)$user['id'];
    $totpEnabled = (int)$user['totp_enabled'] === 1;
    $sessionVersion = (int)$user['session_version'];
    if ($picture) $db->prepare('UPDATE users SET avatar = ? WHERE id = ? AND avatar IS NULL')->execute([$picture, $userId]);
}

if ($totpEnabled) {
    session_regenerate_id(true);
    $_SESSION['pending_2fa_user_id'] = $userId;
    $_SESSION['pending_2fa_session_version'] = $sessionVersion;
    header('Location: login.php');
} else {
    complete_login($userId, $sessionVersion);
    header('Location: index.php');
}
exit;
