<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Modules/Calendar/GoogleOAuthFlow.php';
require_once __DIR__ . '/app/Modules/Calendar/GoogleCalendarBootstrap.php';

function google_start_fail(string $message, int $status = 400): never {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

if (!defined('GOOGLE_CLIENT_ID') || trim((string)GOOGLE_CLIENT_ID) === ''
    || !defined('GOOGLE_CLIENT_SECRET') || trim((string)GOOGLE_CLIENT_SECRET) === '') {
    google_start_fail('A integração com o Google ainda não foi configurada neste servidor.', 500);
}

$baseUrl = trusted_app_base_url();
if ($baseUrl === null) {
    google_start_fail('Origem pública do Level OS não configurada. Defina APP_URL.', 500);
}
$redirectUri = $baseUrl . '/auth-google-callback.php';
$calendarGrant = isset($_GET['calendar']) ? (string)$_GET['calendar'] : '';
$mode = 'login';
$userId = null;
$loginHint = null;
$scopes = ['openid', 'email', 'profile'];
$offline = false;

if ($calendarGrant !== '') {
    $userId = current_user_id();
    if ($userId === null || !google_calendar_consume_start_grant($calendarGrant, $userId)) {
        google_start_fail('A solicitação para conectar o Google Calendar expirou. Tente novamente pelo Perfil.');
    }
    $mode = 'calendar';
    $offline = true;
    $scopes = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'];
    $stmt = get_db()->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $email = $stmt->fetchColumn();
    $loginHint = is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false ? $email : null;
}

try {
    $state = google_oauth_begin_flow($mode, $userId);
    $authorizationUrl = google_oauth_client()->authorizationUrl(
        $redirectUri, $state, $scopes, $offline, $loginHint
    );
} catch (Throwable) {
    google_start_fail('Não foi possível iniciar a conexão com o Google.');
}

session_write_close();
header('Cache-Control: no-store');
header('Location: ' . $authorizationUrl, true, 302);
exit;
