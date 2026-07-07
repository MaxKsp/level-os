<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../totp.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('totp', 20, 60);
require_csrf();

$body = json_decode(file_get_contents('php://input'), true);
$code = is_array($body) ? (string)($body['code'] ?? '') : '';

$db = get_db();
$stmt = $db->prepare('SELECT totp_secret FROM users WHERE id = ?');
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user || !$user['totp_secret'] || !totp_verify_code($user['totp_secret'], $code)) {
    http_response_code(400);
    echo json_encode(['error' => 'código inválido']);
    exit;
}

$db->beginTransaction();
$stmt = $db->prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?');
$stmt->execute([$uid]);
$db->prepare('DELETE FROM totp_backup_codes WHERE user_id = ?')->execute([$uid]);

$codes = totp_generate_backup_codes();
$insert = $db->prepare('INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?, ?)');
foreach ($codes as $backupCode) {
    $insert->execute([$uid, password_hash($backupCode, PASSWORD_DEFAULT)]);
}
$db->commit();

echo json_encode(['ok' => true, 'backup_codes' => $codes]);
