<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$uid = require_login();
require_rate_limit('me', 60, 60);

$stmt = get_db()->prepare(
    'SELECT event_type, outcome, ip_address, created_at
     FROM audit_events
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 30'
);
$stmt->execute([$uid]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['events' => $rows], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
