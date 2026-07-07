<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

$uid = require_login();
require_rate_limit('export', 10, 60);
session_write_close();
$stmt = get_db()->prepare("SELECT data_key, data_value FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%'");
$stmt->execute([$uid]);

$out = [];
foreach ($stmt->fetchAll() as $row) {
    $out[$row['data_key']] = json_decode($row['data_value']);
}

header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="orby-backup-' . date('Y-m-d') . '.json"');
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
