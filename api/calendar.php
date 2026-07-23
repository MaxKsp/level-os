<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../app/Modules/Calendar/GoogleCalendarBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('calendar');
require_rate_limit('calendar-read', 120, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

/** RFC3339 estrito, aceitando a fração de segundo produzida por Date.toISOString(). */
function calendar_parse_rfc3339(string $value): ?DateTimeImmutable {
    if (strlen($value) > 64 || preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})\z/D', $value) !== 1) return null;
    $parsed = date_parse($value);
    if (($parsed['error_count'] ?? 1) > 0 || ($parsed['warning_count'] ?? 1) > 0) return null;
    try {
        return new DateTimeImmutable($value);
    } catch (Throwable) {
        return null;
    }
}

$startRaw = isset($_GET['start']) ? trim((string)$_GET['start']) : '';
$endRaw = isset($_GET['end']) ? trim((string)$_GET['end']) : '';
session_write_close();

try {
    $service = google_calendar_service(get_db());
    if ($startRaw === '' && $endRaw === '') {
        echo json_encode(['connection' => $service->connectionStatus($uid), 'events' => []]);
        exit;
    }
    $start = calendar_parse_rfc3339($startRaw);
    $end = calendar_parse_rfc3339($endRaw);
    $horizonNow = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $horizonStart = $horizonNow->modify('-5 years');
    $horizonEnd = $horizonNow->modify('+5 years');
    if ($start === null || $end === null || $end <= $start
        || ($end->getTimestamp() - $start->getTimestamp()) > 370 * 86400
        || $start < $horizonStart || $end > $horizonEnd) {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_calendar_range']);
        exit;
    }
    echo json_encode($service->eventsForRange($uid, $start, $end), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (GoogleProviderException $e) {
    if ($e->requiresReconnect()) {
        http_response_code(409);
        echo json_encode([
            'error' => 'calendar_reconnect_required',
            'connection' => ['status' => 'reconnect_required', 'accountEmail' => null, 'connectedAt' => null, 'syncedAt' => null],
            'events' => [],
        ]);
    } else {
        http_response_code(502);
        echo json_encode(['error' => 'calendar_provider_unavailable']);
    }
} catch (Throwable $e) {
    error_log('Google Calendar API failed (' . get_class($e) . ').');
    http_response_code(500);
    echo json_encode(['error' => 'calendar_unavailable']);
}
