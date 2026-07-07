<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../finance.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('finance', 200, 60);
require_csrf();

$raw = file_get_contents('php://input', false, null, 0, 4 * 1024 * 1024 + 1);
if (strlen($raw) > 4 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'payload too large']);
    exit;
}
$body = json_decode($raw, true);
$key = is_array($body) ? (string)($body['key'] ?? '') : '';
$set = FINANCE_SETS[$key] ?? null;
if ($set === null || !is_array($body) || !array_key_exists('value', $body) || !is_array($body['value'])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid finance payload']);
    exit;
}
if (count($body['value']) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'too many rows']);
    exit;
}

try {
    finance_save_set(get_db(), $uid, $set, $body['value']);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    error_log('finance.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'erro ao salvar — banco atualizado? (ver migrations)']);
}
