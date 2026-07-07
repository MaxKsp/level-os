<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('import', 5, 60);
require_csrf();

$raw = file_get_contents('php://input', false, null, 0, 10 * 1024 * 1024 + 1);
if (strlen($raw) > 10 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'backup too large']);
    exit;
}
$data = json_decode($raw, true);
if (!is_array($data) || count($data) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid backup file']);
    exit;
}
foreach ($data as $key => $value) {
    if (!is_string($key) || strlen($key) > 255) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid backup file']);
        exit;
    }
}

$db = get_db();
$db->beginTransaction();
try {
    $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    foreach ($data as $key => $value) {
        $stmt->execute([$uid, (string)$key, json_encode($value)]);
    }
    $db->commit();
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'import failed']);
}
