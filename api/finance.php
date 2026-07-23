<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Finance/FinanceApi.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('finance', 200, 60);
require_csrf();
require_plan($uid, 'individual');

$raw = file_get_contents('php://input', false, null, 0, 4 * 1024 * 1024 + 1);
if (strlen($raw) > 4 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'payload too large']);
    exit;
}

$result = finance_api_save_set(get_db(), $uid, $raw);
http_response_code($result['status']);
echo json_encode($result['body']);
