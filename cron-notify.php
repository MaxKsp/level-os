<?php
declare(strict_types=1);

/**
 * Envia e-mail avisando de tarefas da agenda que comecam nos proximos
 * NOTIFY_WINDOW_MIN minutos, pra usuarios com notify_email = 1.
 *
 * Configure no hPanel da Hostinger (Avancado -> Cron Jobs), a cada 10 min:
 *   php /home/SEU_USUARIO/public_html/cron-notify.php SEU_CRON_SECRET
 * ou via URL:
 *   https://SEU-DOMINIO/cron-notify.php?token=SEU_CRON_SECRET
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

const NOTIFY_WINDOW_MIN = 10;

$token = PHP_SAPI === 'cli' ? (string)($argv[1] ?? '') : (string)($_GET['token'] ?? '');
if (!defined('CRON_SECRET') || CRON_SECRET === '' || !hash_equals(CRON_SECRET, $token)) {
    http_response_code(403);
    exit('forbidden');
}

date_default_timezone_set('America/Sao_Paulo');

$db = get_db();
$users = $db->query('SELECT id, username, email FROM users WHERE notify_email = 1 AND email IS NOT NULL')->fetchAll();

$now = new DateTime();
$nowMin = (int)$now->format('H') * 60 + (int)$now->format('i');
$dow = (int)$now->format('w');
$todayKey = $now->format('Y-m-d');
$sent = 0;

foreach ($users as $user) {
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$user['id'], 'tasks_v6']);
    $row = $stmt->fetch();
    if (!$row) continue;
    $tasks = json_decode($row['data_value'], true);
    if (!is_array($tasks)) continue;

    $stmt->execute([$user['id'], '_notified_log']);
    $logRow = $stmt->fetch();
    $log = $logRow ? (json_decode($logRow['data_value'], true) ?: []) : [];
    // mantem o log so do dia atual pra nao crescer sem limite
    $log = array_filter($log, fn($k) => str_starts_with((string)$k, $todayKey), ARRAY_FILTER_USE_KEY);

    $due = [];
    foreach ($tasks as $t) {
        if (empty($t['time']) || empty($t['title'])) continue;
        // mesma semantica de dow do front: 'all', inteiro ou lista de inteiros
        $d = $t['dow'] ?? 'all';
        $matches = $d === 'all' || $d === $dow || (is_array($d) && in_array($dow, $d, true));
        if (isset($t['date']) && $t['date']) $matches = ($t['date'] === $todayKey);
        if (!$matches) continue;
        [$h, $m] = array_map('intval', explode(':', $t['time']));
        $taskMin = $h * 60 + $m;
        $diff = $taskMin - $nowMin;
        if ($diff < 0 || $diff > NOTIFY_WINDOW_MIN) continue;
        $logKey = $todayKey . ':' . ($t['id'] ?? ($t['title'] . $t['time']));
        if (isset($log[$logKey])) continue;
        $due[] = $t;
        $log[$logKey] = 1;
    }

    if (!$due) {
        continue;
    }

    $lines = array_map(fn($t) => '- ' . $t['time'] . ' — ' . $t['title'], $due);
    $bodyTxt = "Olá, {$user['username']}!\n\nVocê tem tarefa começando:\n\n"
        . implode("\n", $lines)
        . "\n\n— Orby";
    @mail($user['email'], 'Orby — tarefa começando', $bodyTxt);
    $sent += count($due);

    $up = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $up->execute([$user['id'], '_notified_log', json_encode($log)]);
}

header('Content-Type: text/plain');
echo "ok - avisos enviados: $sent\n";
