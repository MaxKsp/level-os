<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../totp.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_verified_email($uid);
require_rate_limit('totp', 20, 60);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}
require_csrf();

$db = get_db();
$stmt = $db->prepare('SELECT username, totp_enabled FROM users WHERE id = ?');
$stmt->execute([$uid]);
$user = $stmt->fetch();
if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Perfil não encontrado.']);
    exit;
}
if ((int)$user['totp_enabled'] === 1) {
    // Nunca desabilitar o fator atual como efeito colateral de um novo QR Code.
    http_response_code(409);
    echo json_encode(['error' => 'O 2FA existente deve ser desativado com reautenticação antes de uma nova configuração.']);
    exit;
}

$secret = totp_generate_secret();
totp_secret_ensure_storage($db);
$encryptedSecret = totp_secret_encrypt($secret, $uid);
$stmt = $db->prepare('UPDATE users SET totp_secret = ? WHERE id = ? AND totp_enabled = 0');
$stmt->execute([$encryptedSecret, $uid]);
if ($stmt->rowCount() !== 1) {
    http_response_code(409);
    echo json_encode(['error' => 'O status do 2FA mudou. Recarregue a página.']);
    exit;
}

echo json_encode([
    'secret' => $secret,
    'otpauth_uri' => totp_provisioning_uri($secret, $user['username']),
]);
