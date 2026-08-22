<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

require_rate_limit('marketing_event', 20, 60);
$site = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
if ($site !== '' && !in_array($site, ['same-origin', 'same-site'], true)) {
    http_response_code(403);
    echo json_encode(['ok' => false]);
    exit;
}

$body = json_decode((string)file_get_contents('php://input'), true);
$allowed = ['cta_click', 'signup_started'];
$event = is_array($body) ? (string)($body['event'] ?? '') : '';
$path = is_array($body) ? (string)($body['path'] ?? '/') : '/';
if (!in_array($event, $allowed, true) || !preg_match('#^/[a-zA-Z0-9/_?&=.#-]{0,159}$#', $path)) {
    http_response_code(422);
    echo json_encode(['ok' => false]);
    exit;
}

try {
    $stmt = get_db()->prepare(
        'INSERT INTO marketing_events_daily (event_date, event_name, source_path, event_count)
         VALUES (UTC_DATE(), ?, ?, 1)
         ON DUPLICATE KEY UPDATE event_count = event_count + 1'
    );
    $stmt->execute([$event, $path]);
} catch (PDOException $e) {
    error_log('marketing telemetry unavailable (' . $e->getCode() . ')');
}

http_response_code(202);
echo json_encode(['ok' => true]);
