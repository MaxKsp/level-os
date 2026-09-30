<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Training/TrainingMachineVisionService.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('training-machine-recognition', 6, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'POST')) !== 'POST') {
    http_response_code(405); header('Allow: POST');
    echo json_encode(['error'=>'method_not_allowed']); exit;
}
require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 3_000_001);
if (!is_string($raw) || strlen($raw) > 3_000_000) {
    http_response_code(413); echo json_encode(['error'=>'image_payload_too_large']); exit;
}
$body = json_decode($raw, true);
if (!is_array($body) || !is_string($body['imageDataUrl'] ?? null)) {
    http_response_code(400); echo json_encode(['error'=>'invalid_image_payload']); exit;
}
session_write_close();

try {
    $result = training_machine_recognize((string)$body['imageDataUrl']);
    unset($result['provider']);
    echo json_encode(['ok'=>true] + $result + [
        'catalog'=>training_machine_public_catalog(),
        'notice'=>'Reconhecimento visual é uma sugestão. Confirme o aparelho antes de seguir qualquer orientação.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException $error) {
    http_response_code(422);
    echo json_encode(['error'=>'invalid_image','message'=>$error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (AssistantProvidersExhausted|LlmProviderException $error) {
    error_log('training machine recognition unavailable (' . get_class($error) . ').');
    http_response_code(503);
    echo json_encode(['error'=>'recognition_unavailable','message'=>'Reconhecimento visual indisponível agora.']);
} catch (Throwable $error) {
    error_log('training machine recognition failed (' . get_class($error) . ').');
    http_response_code(500);
    echo json_encode(['error'=>'recognition_failed','message'=>'Não foi possível analisar a foto.']);
}
