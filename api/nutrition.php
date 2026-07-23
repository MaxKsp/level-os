<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Nutrition/NutritionPlanService.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('nutrition', 90, 60);
$db = get_db();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    session_write_close();
    try {
        echo json_encode(nutrition_plan_snapshot($db, $uid), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    } catch (Throwable $e) {
        error_log('nutrition read failed (' . get_class($e) . ').');
        http_response_code(500); echo json_encode(['error'=>'nutrition_unavailable']);
    }
    exit;
}
if ($method !== 'POST') {
    http_response_code(405); header('Allow: GET, POST'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 8193);
$body = is_string($raw) ? json_decode($raw, true) : null;
if (!is_array($body) || !is_string($body['operation'] ?? null)) {
    http_response_code(400); echo json_encode(['error'=>'invalid_nutrition_payload']); exit;
}
session_write_close();
try {
    $result = match ((string)$body['operation']) {
        'archive_active' => (function () use ($db, $uid): array { nutrition_archive_active_plan($db, $uid); return ['archived'=>true]; })(),
        'restore_plan' => ['plan'=>nutrition_restore_plan($db, $uid, (string)($body['id'] ?? ''))],
        default => throw new InvalidArgumentException('Operação inválida.'),
    };
    echo json_encode(['ok'=>true, 'result'=>$result], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['error'=>'invalid_nutrition_action', 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('nutrition write failed (' . get_class($e) . ').');
    http_response_code(500); echo json_encode(['error'=>'nutrition_write_failed']);
}
