<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('data', 200, 60);
$db = get_db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Leitura não mexe na sessão: solta o lock pra não serializar
    // requisições paralelas do mesmo usuário.
    session_write_close();
    if (isset($_GET['all'])) {
        $stmt = $db->prepare("SELECT data_key, data_value FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%'");
        $stmt->execute([$uid]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['data_key']] = json_decode($row['data_value']);
        }
        echo json_encode($out);
        exit;
    }

    $key = (string)($_GET['key'] ?? '');
    if ($key === '') {
        http_response_code(400);
        echo json_encode(['error' => 'missing key']);
        exit;
    }
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$uid, $key]);
    $row = $stmt->fetch();
    echo json_encode(['value' => $row ? json_decode($row['data_value']) : null]);
    exit;
}

if ($method === 'POST') {
    require_csrf();
    $raw = file_get_contents('php://input', false, null, 0, 2 * 1024 * 1024 + 1);
    if (strlen($raw) > 2 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'payload too large']);
        exit;
    }
    $body = json_decode($raw, true);
    $key = is_array($body) ? (string)($body['key'] ?? '') : '';
    if ($key === '' || strlen($key) > 255 || !is_array($body) || !array_key_exists('value', $body)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid payload']);
        exit;
    }
    $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $stmt->execute([$uid, $key, json_encode($body['value'])]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
