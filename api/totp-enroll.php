<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../totp.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('totp', 20, 60);
require_csrf();

$db = get_db();
$stmt = $db->prepare('SELECT username FROM users WHERE id = ?');
$stmt->execute([$uid]);
$user = $stmt->fetch();

$secret = totp_generate_secret();
$stmt = $db->prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?');
$stmt->execute([$secret, $uid]);

echo json_encode([
    'secret' => $secret,
    'otpauth_uri' => totp_provisioning_uri($secret, $user['username']),
]);
