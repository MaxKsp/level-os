<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('assistant-history');
require_rate_limit('assistant_history', 60, 60);
require_plan($uid, 'individual');

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));
if (!in_array($method, ['GET', 'DELETE'], true)) {
    http_response_code(405); header('Allow: GET, DELETE'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
$agent = is_string($_GET['agent'] ?? null) ? strtolower(trim((string)$_GET['agent'])) : 'geral';
if (!in_array($agent, ['geral', 'financeiro', 'agenda', 'treinos', 'alimentacao'], true)) {
    http_response_code(400); echo json_encode(['error'=>'invalid_agent']); exit;
}
if ($method === 'DELETE') require_csrf();
session_write_close();

try {
    $repository = assistant_repository(get_db());
    if ($method === 'DELETE') {
        $deleted = $repository->clearHistory($uid, $agent);
        echo json_encode(['ok'=>true, 'deleted'=>$deleted], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    echo json_encode(['items'=>$repository->history($uid, $agent, $limit)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException) {
    http_response_code(400); echo json_encode(['error'=>'invalid_agent']);
} catch (Throwable $e) {
    error_log('assistant history failed (' . get_class($e) . ').');
    http_response_code(500); echo json_encode(['error'=>'assistant_history_failed']);
}
