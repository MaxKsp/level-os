<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../app/Modules/Calendar/GoogleCalendarBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('calendar-disconnect');
require_rate_limit('calendar-disconnect', 10, 600);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
require_csrf();
session_write_close();

try {
    $service = google_calendar_service(get_db());
    $service->disconnect($uid);
    echo json_encode(['ok' => true, 'connection' => $service->connectionStatus($uid)]);
} catch (Throwable $e) {
    error_log('Google Calendar disconnect failed (' . get_class($e) . ').');
    http_response_code(500);
    echo json_encode(['error' => 'calendar_disconnect_failed']);
}
