<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Core/Audit.php';
require_once __DIR__ . '/../app/Core/BackupCrypto.php';
require_once __DIR__ . '/../app/Core/Clock.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('import', 5, 60);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
require_csrf();
require_plan($uid, 'individual');

$contentType = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
$confirmed = strtolower(trim((string)($_SERVER['HTTP_X_CONFIRM_RESTORE'] ?? '')));
if (!in_array($contentType, ['application/json', 'application/octet-stream'], true) || !hash_equals('replace', $confirmed)) {
    http_response_code(400);
    echo json_encode(['error' => 'restore_confirmation_required']);
    exit;
}

$raw = file_get_contents('php://input', false, null, 0, 10 * 1024 * 1024 + 1);
if (!is_string($raw) || strlen($raw) > 10 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'backup_too_large']);
    exit;
}

// Artefato cifrado do backup semanal (magic ORBYBKP): decifra com a chave do
// servidor antes de seguir o fluxo normal de restauracao.
if (str_starts_with($raw, BACKUP_ARTIFACT_MAGIC)) {
    try {
        $key = backup_crypto_read_key();
        $handle = fopen('php://temp/maxmemory:8388608', 'r+b');
        if ($handle === false) throw new BackupCryptoException('unable to open a temporary stream');
        fwrite($handle, $raw);
        rewind($handle);
        $reader = new BackupArtifactReader($handle, $key);
        $plain = '';
        while (($frame = $reader->readFrame()) !== null) {
            $plain .= $frame['plaintext'];
            if (strlen($plain) > 10 * 1024 * 1024) throw new BackupCryptoException('backup artifact is too large');
        }
        fclose($handle);
        $raw = $plain;
    } catch (BackupCryptoException) {
        http_response_code(400);
        echo json_encode(['error' => 'encrypted_backup_invalid']);
        exit;
    }
}

try {
    $decoded = json_decode($raw, true, 128, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    $decoded = null;
}
$data = is_array($decoded) && ($decoded['format'] ?? null) === 'level-os-user-backup'
    && (int)($decoded['version'] ?? 0) === 2 && isset($decoded['data']) && is_array($decoded['data'])
    ? $decoded['data']
    : $decoded; // compatibilidade com exportações legadas, ainda sob confirmação explícita.

if (!is_array($data) || count($data) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_backup_file']);
    exit;
}
foreach (FINANCE_SETS as $key => $_set) {
    if (!array_key_exists($key, $data) || !is_array($data[$key]) || count($data[$key]) > 5000) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_backup_contract']);
        exit;
    }
}
foreach ($data as $key => $value) {
    if (!is_string($key) || $key === '' || strlen($key) > 255 || str_starts_with($key, '_')) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_backup_file']);
        exit;
    }
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded) || strlen($encoded) > 4 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'backup_item_too_large']);
        exit;
    }
}

$db = get_db();
$requestId = audit_request_id();
$db->beginTransaction();
try {
    // Restore substitui o escopo público deste usuário; chaves internas são preservadas.
    $deleteKv = $db->prepare("DELETE FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%'");
    $deleteKv->execute([$uid]);
    $saveKv = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    foreach ($data as $key => $value) {
        if (isset(FINANCE_SETS[$key])) {
            finance_save_set($db, $uid, FINANCE_SETS[$key], $value);
            continue;
        }
        $saveKv->execute([$uid, $key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    }
    $saveKv->execute([$uid, '_finance_migrated', json_encode(level_clock_now()->format(DATE_ATOM))]);
    audit_record($db, $uid, 'backup.restore', 'success', ['format_version' => 2, 'keys' => count($data)], $requestId);
    $db->commit();
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    try {
        $db->beginTransaction();
        audit_record($db, $uid, 'backup.restore', 'failure', ['format_version' => 2], $requestId);
        $db->commit();
    } catch (Throwable) {
        if ($db->inTransaction()) $db->rollBack();
    }
    error_log('backup restore failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'import_failed']);
}
