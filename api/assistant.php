<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('assistant');
require_rate_limit('assistant', 20, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    http_response_code(405); header('Allow: POST'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 16 * 1024 + 1);
if (!is_string($raw) || strlen($raw) > 16 * 1024) { http_response_code(413); echo json_encode(['error'=>'payload_too_large']); exit; }
$body = json_decode($raw, true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'invalid_payload']); exit; }
session_write_close();
try {
    $module = is_string($body['module'] ?? null) ? $body['module'] : '';
    if (!in_array($module, ['financeiro', 'agenda', 'treinos', 'alimentacao'], true)) $module = null;
    $result = assistant_service(get_db())->handle($uid, (string)($body['requestId'] ?? ''), (string)($body['text'] ?? ''), $module);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (AssistantProvidersExhausted $e) {
    $kinds = $e->failureKinds();
    if (in_array('quota', $kinds, true)) {
        http_response_code(429);
        header('Retry-After: 300');
        echo json_encode(['error'=>'assistant_provider_limit','message'=>'O limite dos provedores de IA foi atingido. Tente novamente mais tarde.'], JSON_UNESCAPED_UNICODE);
    } elseif ($kinds !== [] && count(array_diff($kinds, ['auth','model','request'])) === 0) {
        http_response_code(503);
        echo json_encode(['error'=>'assistant_configuration_error','message'=>'O Agente de IA precisa de uma configuração válida do provedor.'], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(503);
        echo json_encode(['error'=>'assistant_unavailable','message'=>'O Agente de IA está temporariamente indisponível. Tente novamente em alguns minutos.'], JSON_UNESCAPED_UNICODE);
    }
} catch (AssistantUsageLimitExceeded $e) {
    http_response_code(429); header('Retry-After: 3600'); echo json_encode(['error'=>'assistant_daily_limit','message'=>'O limite diário do Agente de IA foi atingido. Consultas locais continuam disponíveis; novas gerações serão liberadas no próximo dia.'], JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException|AssistantRouteException $e) {
    http_response_code(422); echo json_encode(['error'=>'invalid_assistant_action','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $e) {
    $code = $e->getMessage() === 'assistant_request_in_progress' ? 409 : 500;
    http_response_code($code); echo json_encode(['error'=>$code === 409 ? 'request_in_progress' : 'assistant_failed']);
} catch (Throwable $e) {
    error_log('assistant failed (' . get_class($e) . ').');
    http_response_code(500); echo json_encode(['error'=>'assistant_failed']);
}
