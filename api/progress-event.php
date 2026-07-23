<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Modules/Progress/ProgressService.php';
require_once __DIR__ . '/../plan.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('progress_event', 30, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method not allowed']);
    exit;
}
require_csrf();
require_plan($uid, 'individual');

$raw = file_get_contents('php://input', false, null, 0, 8193);
if (strlen($raw) > 8192) {
    http_response_code(413);
    echo json_encode(['error' => 'payload too large']);
    exit;
}
$body = json_decode($raw, true);
$type = is_array($body) ? (string)($body['type'] ?? '') : '';
$ref = is_array($body) ? (string)($body['ref'] ?? '') : '';

// Eventos financeiros só nascem da persistência financeira real; não do cliente.
if (!in_array($type, ['rotina', 'treino'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid progress event']);
    exit;
}

try {
    echo json_encode(progress_award_event(get_db(), $uid, $type, $ref));
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('progress-event.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Não foi possível registrar o progresso.']);
}
