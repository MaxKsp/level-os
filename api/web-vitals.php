<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Clock.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
if ($fetchSite !== '' && !in_array($fetchSite, ['same-origin', 'same-site'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'cross_site_request']);
    exit;
}

$uid = require_login();
require_rate_limit('web-vitals', 30, 60);
$raw = file_get_contents('php://input', false, null, 0, 4097);
if (!is_string($raw) || strlen($raw) > 4096) {
    http_response_code(413);
    echo json_encode(['error' => 'payload_too_large']);
    exit;
}

$body = json_decode($raw, true);
$name = strtoupper(trim((string)($body['name'] ?? '')));
$value = filter_var($body['value'] ?? null, FILTER_VALIDATE_FLOAT);
$rating = strtolower(trim((string)($body['rating'] ?? 'unknown')));
$route = trim((string)($body['path'] ?? '/'));

if (!in_array($name, ['CLS', 'INP', 'LCP'], true)
    || !is_float($value) || !is_finite($value) || $value < 0 || $value > 600000
    || !in_array($rating, ['good', 'needs-improvement', 'poor'], true)
    || !preg_match('#^/[a-z0-9/_-]{0,190}$#i', $route)) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid_metric']);
    exit;
}

try {
    $stmt = get_db()->prepare(
        'INSERT INTO web_vitals_daily
           (user_id, metric_date, metric_name, route_path, sample_count, value_total, value_max, last_rating)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sample_count = sample_count + 1,
           value_total = value_total + VALUES(value_total),
           value_max = GREATEST(value_max, VALUES(value_max)),
           last_rating = VALUES(last_rating)'
    );
    $stmt->execute([$uid, level_clock_today()->format('Y-m-d'), $name, $route, $value, $value, $rating]);
    http_response_code(202);
    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    // Antes da migration chegar ao servidor, a telemetria nunca pode afetar o app.
    error_log('web vitals persistence unavailable (' . $e->getCode() . ')');
    http_response_code(202);
    echo json_encode(['ok' => false]);
}
