<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../ofx.php';
require_once __DIR__ . '/../app/Modules/Finance/FinanceOfxPreview.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
require_rate_limit('import_ofx', 10, 60);
require_csrf();
require_plan($uid, 'individual');

$maxUploadBytes = 5 * 1024 * 1024;
$upload = $_FILES['ofx'] ?? null;
if (!is_array($upload)) {
    http_response_code(400);
    echo json_encode(['error' => 'nenhum arquivo enviado']);
    exit;
}
$error = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
    http_response_code(413);
    echo json_encode(['error' => 'arquivo muito grande (máx 5MB)']);
    exit;
}
if ($error !== UPLOAD_ERR_OK || !isset($upload['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'falha ao receber arquivo OFX']);
    exit;
}
if ((int)($upload['size'] ?? 0) > $maxUploadBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'arquivo muito grande (máx 5MB)']);
    exit;
}
$tmpName = (string)$upload['tmp_name'];
if (!is_uploaded_file($tmpName)) {
    http_response_code(400);
    echo json_encode(['error' => 'arquivo OFX inválido']);
    exit;
}
// Do not trust only the multipart-reported size; enforce a bounded read.
$content = @file_get_contents($tmpName, false, null, 0, $maxUploadBytes + 1);
if (!is_string($content) || $content === '') {
    http_response_code(400);
    echo json_encode(['error' => 'não foi possível ler o arquivo OFX']);
    exit;
}
if (strlen($content) > $maxUploadBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'arquivo muito grande (máx 5MB)']);
    exit;
}

$result = finance_ofx_preview(get_db(), $uid, $content);
http_response_code($result['status']);
echo json_encode($result['body']);
