<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('subscription', 60, 60);
session_write_close();

// So leitura. Mudanca de plano e server-side (webhook), nunca por aqui.
$stmt = get_db()->prepare('SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ?');
$stmt->execute([$uid]);
$row = $stmt->fetch();

echo json_encode([
    'plan' => user_plan($uid),
    'status' => $row['status'] ?? 'active',
    'current_period_end' => $row['current_period_end'] ?? null,
]);
