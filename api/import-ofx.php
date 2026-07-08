<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../ofx.php';

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
$parsed = parse_ofx($content);
if (!$parsed['ok']) {
    http_response_code(400);
    echo json_encode(['error' => $parsed['error']]);
    exit;
}

// marca provaveis duplicatas: mesmo (date,value) ja existente nos lancamentos
$db = get_db();
$existing = [];
foreach (['expense', 'income'] as $set) {
    foreach (finance_load_set($db, $uid, $set) as $r) {
        $existing[($r['date'] ?? '') . '|' . number_format((float)($r['value'] ?? 0), 2, '.', '')] = true;
    }
}
$rows = [];
foreach ($parsed['rows'] as $r) {
    $key = ($r['date'] ?? '') . '|' . number_format($r['value'], 2, '.', '');
    $r['dup'] = isset($existing[$key]);
    $rows[] = $r;
}

echo json_encode(['ok' => true, 'rows' => $rows]);
