<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('assistant-undo');
require_rate_limit('assistant_undo', 30, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    http_response_code(405); header('Allow: POST'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 4097);
$body = is_string($raw) ? json_decode($raw, true) : null;
if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'invalid_payload']); exit; }
session_write_close();
try {
    echo json_encode(assistant_service(get_db())->undo($uid, (string)($body['actionToken'] ?? '')), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['error'=>'invalid_action_token']);
} catch (RuntimeException $e) {
    $known = in_array($e->getMessage(), ['undo_unavailable','undo_expired','undo_conflict'], true) ? $e->getMessage() : 'undo_failed';
    http_response_code($known === 'undo_expired' ? 410 : ($known === 'undo_conflict' ? 409 : 422));
    echo json_encode(['error'=>$known]);
} catch (Throwable $e) {
    error_log('assistant undo failed (' . get_class($e) . ').');
    http_response_code(500); echo json_encode(['error'=>'undo_failed']);
}
