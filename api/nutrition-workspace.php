<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Nutrition/NutritionWorkspaceService.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('nutrition-workspace', 90, 60);
$db = get_db();
$service = new NutritionWorkspaceService($db);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'GET') {
    session_write_close();
    try { echo json_encode(['ok'=>true,'workspace'=>$service->load($uid)], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); }
    catch (Throwable $e) { error_log('workspace read failed: ' . get_class($e)); http_response_code(500); echo json_encode(['error'=>'workspace_unavailable']); }
    exit;
}
if ($method !== 'POST') { header('Allow: GET, POST'); http_response_code(405); echo json_encode(['error'=>'method_not_allowed']); exit; }
require_csrf();
require_plan($uid, 'individual');
$raw = file_get_contents('php://input', false, null, 0, 180001);
if (!is_string($raw) || strlen($raw) > 180000) { http_response_code(413); echo json_encode(['error'=>'payload_too_large']); exit; }
$body = json_decode($raw, true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'invalid_json']); exit; }
session_write_close();
try {
    $workspace = $service->save($uid, $body);
    echo json_encode(['ok'=>true,'workspace'=>$workspace], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (NutritionWorkspaceConflict $e) {
    http_response_code(409); echo json_encode(['error'=>'workspace_conflict','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
catch (InvalidArgumentException $exception) {
    http_response_code(422);
    echo json_encode(['error'=>'invalid_data','message'=>$exception->getMessage()], JSON_UNESCAPED_UNICODE);
}
catch (Throwable $exception) { error_log('workspace write failed: ' . get_class($exception)); http_response_code(500); echo json_encode(['error'=>'workspace_save_failed']); }
