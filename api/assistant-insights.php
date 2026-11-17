<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantLocalInsights.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('assistant_insights', 30, 60);
require_paid_plan($uid, 'individual');
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'GET') {
    http_response_code(405); header('Allow: GET'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
$module = is_string($_GET['module'] ?? null) ? strtolower(trim((string)$_GET['module'])) : '';
if (!in_array($module, ['financeiro', 'agenda', 'treinos', 'alimentacao'], true)) {
    http_response_code(400); echo json_encode(['error'=>'invalid_module']); exit;
}
session_write_close();
try {
    echo json_encode(['items'=>(new AssistantLocalInsights(get_db()))->forModule($uid, $module),
        'source'=>'platform', 'asOf'=>level_clock_now()->format(DATE_ATOM)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    error_log('assistant insights endpoint failed (' . get_class($error) . ').');
    http_response_code(500); echo json_encode(['error'=>'assistant_insights_failed']);
}
