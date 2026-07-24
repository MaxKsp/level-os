<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

$uid = require_login();
$db = get_db();
$storageKey = 'profile_v1';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
    $stmt->execute([$uid, $storageKey]);
    $raw = $stmt->fetchColumn();
    $stored = is_string($raw) ? json_decode($raw, true) : [];
    $stored = is_array($stored) ? $stored : [];
    echo json_encode([
        'phone' => is_string($stored['phone'] ?? null) ? $stored['phone'] : '',
        'city' => is_string($stored['city'] ?? null) ? $stored['city'] : '',
        'bio' => is_string($stored['bio'] ?? null) ? $stored['bio'] : '',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}

require_csrf();
require_rate_limit('profile-write', 20, 60);
$raw = file_get_contents('php://input', false, null, 0, 8193);
if (!is_string($raw) || strlen($raw) > 8192) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload muito grande.']);
    exit;
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos.']);
    exit;
}

$limits = ['phone' => 32, 'city' => 120, 'bio' => 1000];
$profile = [];
foreach ($limits as $field => $limit) {
    $value = trim((string)($body[$field] ?? ''));
    if (mb_strlen($value) > $limit) {
        http_response_code(422);
        echo json_encode(['error' => 'Um dos campos excede o limite permitido.']);
        exit;
    }
    $profile[$field] = $value;
}

$encoded = json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
$stmt->execute([$uid, $storageKey, $encoded]);

echo json_encode($profile, JSON_UNESCAPED_UNICODE);
