<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Training/TrainingService.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('training', 120, 60);
$db = get_db();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    session_write_close();
    try {
        echo json_encode(training_snapshot($db, $uid), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    } catch (Throwable $e) {
        error_log('training read failed (' . get_class($e) . ').');
        http_response_code(500);
        echo json_encode(['error' => 'training_unavailable']);
    }
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    header('Allow: GET, POST');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 256 * 1024 + 1);
if (!is_string($raw) || strlen($raw) > 256 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'payload_too_large']);
    exit;
}
$body = json_decode($raw, true);
if (!is_array($body) || !is_string($body['operation'] ?? null)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_training_payload']);
    exit;
}
session_write_close();

try {
    $operation = (string)$body['operation'];
    $result = match ($operation) {
        'save_workout' => training_save_workout($db, $uid, is_array($body['workout'] ?? null) ? $body['workout'] : throw new InvalidArgumentException()),
        'delete_workout' => ['deleted' => training_delete_workout($db, $uid, (string)($body['id'] ?? ''))],
        'log_measurement' => training_log_measurement($db, $uid, is_array($body['measurement'] ?? null) ? $body['measurement'] : throw new InvalidArgumentException()),
        'delete_measurement' => ['deleted' => training_delete_measurement($db, $uid, (string)($body['id'] ?? ''))],
        'log_session' => training_log_session($db, $uid, is_array($body['session'] ?? null) ? $body['session'] : throw new InvalidArgumentException()),
        'delete_session' => ['deleted' => training_delete_session($db, $uid, (string)($body['id'] ?? ''))],
        'restore_program' => ['program' => training_restore_program($db, $uid, (string)($body['id'] ?? ''))],
        default => throw new InvalidArgumentException('Operação de treino inválida.'),
    };
    echo json_encode(['ok' => true, 'result' => $result], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException $e) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid_training_action', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('training write failed (' . get_class($e) . ').');
    http_response_code(500);
    echo json_encode(['error' => 'training_write_failed']);
}
