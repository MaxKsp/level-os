<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Core/Requirements.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Assistant/AssistantBootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
level_os_require_sodium_endpoint('assistant-quality');
require_rate_limit('assistant_quality', 30, 60);
require_paid_plan($uid, 'individual');
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'GET') {
    http_response_code(405); header('Allow: GET'); echo json_encode(['error'=>'method_not_allowed']); exit;
}
session_write_close();
try {
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
    echo json_encode(assistant_repository(get_db())->qualitySummary($uid, $days), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    error_log('assistant quality endpoint failed (' . get_class($error) . ').');
    http_response_code(500); echo json_encode(['error'=>'assistant_quality_failed']);
}
