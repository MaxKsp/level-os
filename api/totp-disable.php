<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('totp', 20, 60);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}
require_csrf();

$raw = file_get_contents('php://input', false, null, 0, 4097);
if (!is_string($raw) || strlen($raw) > 4096) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload muito grande.']);
    exit;
}
$body = json_decode($raw, true);
$password = is_array($body) ? (string)($body['password'] ?? '') : '';

$db = get_db();
$stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$uid]);
$user = $stmt->fetch();

if ($user && $user['password_hash'] !== null && !password_verify($password, $user['password_hash'])) {
    http_response_code(400);
    echo json_encode(['error' => 'senha incorreta']);
    exit;
}

$db->beginTransaction();
$db->prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?')->execute([$uid]);
$db->prepare('DELETE FROM totp_backup_codes WHERE user_id = ?')->execute([$uid]);
$db->commit();

echo json_encode(['ok' => true]);
