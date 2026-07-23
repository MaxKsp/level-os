<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../app/Core/Clock.php';

$uid = require_login();
require_rate_limit('export', 10, 60);
session_write_close();
$db = get_db();
$stmt = $db->prepare("SELECT data_key, data_value FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%'");
$stmt->execute([$uid]);

$out = [];
foreach ($stmt->fetchAll() as $row) {
    $out[$row['data_key']] = json_decode($row['data_value']);
}
// financeiro vem das tabelas (fonte de verdade), nao do kv antigo
foreach (FINANCE_SETS as $kvKey => $set) {
    $out[$kvKey] = finance_load_set($db, $uid, $set);
}

header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="level-os-backup-' . level_clock_today()->format('Y-m-d') . '.json"');
echo json_encode([
    'format' => 'level-os-user-backup',
    'version' => 2,
    'exported_at' => level_clock_now()->format(DATE_ATOM),
    'data' => $out,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
