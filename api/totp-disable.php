<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

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

$raw = file_get_contents('php://input', false, null, 0, 4097);
if (!is_string($raw) || strlen($raw) > 4096) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload muito grande.']);
    exit;
}
$body = json_decode($raw, true);
$password = is_array($body) ? (string)($body['password'] ?? '') : '';
$code = is_array($body) ? trim((string)($body['code'] ?? '')) : '';
function totp_disable_fail(PDO $db, int $status, string $message): never {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

$db = get_db();
$db->beginTransaction();
$stmt = $db->prepare('SELECT password_hash, totp_secret, totp_enabled
    FROM users WHERE id = ? FOR UPDATE');
$stmt->execute([$uid]);
$user = $stmt->fetch();
if (!$user || (int)$user['totp_enabled'] !== 1) {
    totp_disable_fail($db, 409, 'O 2FA não está ativo.');
}

$method = 'password';
if ($user['password_hash'] !== null) {
    if (!password_verify($password, (string)$user['password_hash'])) {
        totp_disable_fail($db, 400, 'Senha atual incorreta.');
    }
} else {
    // Login Google/passwordless exige o fator atual ou um recovery code.
    $method = 'totp';
    if ($code === '' || strlen($code) > 128) {
        totp_disable_fail($db, 400, 'Informe o código do autenticador ou de recuperação.');
    }
    try {
        $secret = totp_secret_decrypt((string)$user['totp_secret'], $uid);
    } catch (TokenCryptoException) {
        totp_disable_fail($db, 400, 'Não foi possível verificar o fator atual.');
    }
    $verified = totp_verify_code($secret, $code);
    if (!$verified) {
        $recovery = $db->prepare('SELECT id, code_hash FROM totp_backup_codes
            WHERE user_id = ? AND used_at IS NULL FOR UPDATE');
        $recovery->execute([$uid]);
        foreach ($recovery->fetchAll() as $item) {
            if (!password_verify($code, (string)$item['code_hash'])) continue;
            $claim = $db->prepare('UPDATE totp_backup_codes SET used_at = UTC_TIMESTAMP()
                WHERE id = ? AND user_id = ? AND used_at IS NULL');
            $claim->execute([$item['id'], $uid]);
            if ($claim->rowCount() === 1) { $verified = true; $method = 'recovery'; }
            break;
        }
    }
    if (!$verified) totp_disable_fail($db, 400, 'Código atual ou de recuperação inválido.');
}
$update = $db->prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL,
    session_version = session_version + 1 WHERE id = ? AND totp_enabled = 1');
$update->execute([$uid]);
if ($update->rowCount() !== 1) {
    totp_disable_fail($db, 409, 'O status do 2FA mudou. Tente novamente.');
}
$db->prepare('DELETE FROM totp_backup_codes WHERE user_id = ?')->execute([$uid]);
$version = $db->prepare('SELECT session_version FROM users WHERE id = ?');
$version->execute([$uid]);
$newSessionVersion = (int)$version->fetchColumn();
$db->commit();

// Apenas a sessão que fez o step-up continua; as anteriores perdem validade.
if (session_status() === PHP_SESSION_ACTIVE && ($_SESSION['user_id'] ?? null) === $uid) {
    session_regenerate_id(true);
    $_SESSION['session_version'] = $newSessionVersion;
    $_SESSION['last_activity'] = time();
}
try { audit_record($db, $uid, 'auth.mfa_disabled', 'success', ['method' => $method]); } catch (Throwable) {}

echo json_encode(['ok' => true]);
