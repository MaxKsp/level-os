<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../app/Modules/Calendar/GoogleOAuthFlow.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('calendar-connect');
require_rate_limit('calendar-connect', 6, 600);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
require_csrf();

try {
    $nonce = google_calendar_issue_start_grant($uid);
    echo json_encode([
        'authorizationUrl' => '/auth-google-start.php?calendar=' . rawurlencode($nonce),
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'calendar_connect_unavailable']);
}
