<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../ofx.php';
require_once __DIR__ . '/../app/Modules/Finance/FinanceOfxPreview.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('import_ofx', 10, 60);
require_csrf();
require_plan($uid, 'individual');

if (empty($_FILES['ofx']) || $_FILES['ofx']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'nenhum arquivo enviado']);
    exit;
}
if ($_FILES['ofx']['size'] > 5 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'arquivo muito grande (máx 5MB)']);
    exit;
}

$content = file_get_contents($_FILES['ofx']['tmp_name']);
$result = finance_ofx_preview(get_db(), $uid, $content);
http_response_code($result['status']);
echo json_encode($result['body']);
