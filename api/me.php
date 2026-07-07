<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('me', 60, 60);
session_write_close();

try {
    $stmt = get_db()->prepare('SELECT username, email, avatar, totp_enabled, notify_email, password_hash IS NOT NULL AS has_password FROM users WHERE id = ?');
    $stmt->execute([$uid]);
    $user = $stmt->fetch();

    echo json_encode([
        'username' => $user['username'],
        'email' => $user['email'],
        'avatar' => $user['avatar'],
        'totp_enabled' => (int)$user['totp_enabled'] === 1,
        'notify_email' => (int)$user['notify_email'] === 1,
        'has_password' => (int)$user['has_password'] === 1,
    ]);
} catch (Throwable $e) {
    error_log('me.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'erro no servidor — o banco de dados está atualizado? (ver schema.sql)']);
}
