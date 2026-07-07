<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('prefs', 60, 60);
require_csrf();

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body) || !array_key_exists('notify_email', $body)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid payload']);
    exit;
}

$stmt = get_db()->prepare('UPDATE users SET notify_email = ? WHERE id = ?');
$stmt->execute([$body['notify_email'] ? 1 : 0, $uid]);

echo json_encode(['ok' => true]);
