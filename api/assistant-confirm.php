<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('assistant-confirm');
require_rate_limit('assistant_confirm', 30, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    http_response_code(405); header('Allow: POST'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
require_csrf();
require_paid_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 256 * 1024 + 1);
$raw = is_string($raw) ? $raw : '';
if (strlen($raw) > 256 * 1024) { http_response_code(413); echo json_encode(['error'=>'payload_too_large']); exit; }
$body = json_decode($raw, true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'invalid_payload']); exit; }
session_write_close();

try {
    $result = assistant_service(get_db())->resolveConfirmation(
        $uid,
        (string)($body['actionToken'] ?? ''),
        (string)($body['decision'] ?? ''),
        is_array($body['approval'] ?? null) ? $body['approval'] : [],
    );
    unset($result['provider']);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException) {
    http_response_code(422); echo json_encode(['error'=>'invalid_confirmation']);
} catch (RuntimeException $e) {
    $known = in_array($e->getMessage(), ['confirmation_unavailable','confirmation_expired','confirmation_conflict'], true)
        ? $e->getMessage() : 'confirmation_failed';
    http_response_code($known === 'confirmation_expired' ? 410 : ($known === 'confirmation_conflict' ? 409 : 422));
    echo json_encode(['error'=>$known, 'message'=>$known === 'confirmation_expired'
        ? 'Esta confirmação expirou. Envie o pedido novamente.'
        : 'Não foi possível confirmar esta ação.'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('assistant confirmation failed (' . get_class($e) . ').');
    http_response_code(500); echo json_encode(['error'=>'confirmation_failed']);
}
