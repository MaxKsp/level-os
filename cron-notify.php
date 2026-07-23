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
require_once __DIR__ . '/finance.php';
require_once __DIR__ . '/app/Core/BackupCrypto.php';
require_once __DIR__ . '/app/Modules/Email/EmailBootstrap.php';

const NOTIFY_WINDOW_MIN = 10;

$token = PHP_SAPI === 'cli' ? (string)($argv[1] ?? '') : (string)($_GET['token'] ?? '');
if (!defined('CRON_SECRET') || CRON_SECRET === '' || !hash_equals(CRON_SECRET, $token)) {
    http_response_code(403);
    exit('forbidden');
}

date_default_timezone_set('America/Sao_Paulo');

$db = get_db();
$users = $db->query('SELECT id, username, email FROM users WHERE notify_email = 1 AND email IS NOT NULL')->fetchAll();

/** @return array{balance:float,invoices:float,income:float,expense:float,routine_count:int,training_count:int} */
function cron_monthly_summary(PDO $db, int $uid): array {
    $accounts = $db->prepare('SELECT COALESCE(SUM(saldo_cents),0) AS saldo, COALESCE(SUM(fatura_cents),0) AS fatura
        FROM accounts WHERE user_id = ?');
    $accounts->execute([$uid]);
    $accRow = $accounts->fetch(PDO::FETCH_ASSOC) ?: ['saldo' => 0, 'fatura' => 0];

    $sinceDate = (new DateTimeImmutable('-30 days'))->format('Y-m-d');
    $sinceDateTime = (new DateTimeImmutable('-30 days'))->format('Y-m-d H:i:s');

    $income = $db->prepare("SELECT COALESCE(SUM(value_cents),0) FROM transactions
        WHERE user_id = ? AND kind = 'income' AND tx_date >= ?");
    $income->execute([$uid, $sinceDate]);

    $expense = $db->prepare("SELECT COALESCE(SUM(value_cents),0) FROM transactions
        WHERE user_id = ? AND kind = 'expense' AND tx_date >= ?");
    $expense->execute([$uid, $sinceDate]);

    $routine = $db->prepare("SELECT COUNT(*) FROM xp_events WHERE user_id = ? AND type = 'rotina' AND created_at >= ?");
    $routine->execute([$uid, $sinceDateTime]);

    $training = $db->prepare("SELECT COUNT(*) FROM xp_events WHERE user_id = ? AND type = 'treino' AND created_at >= ?");
    $training->execute([$uid, $sinceDateTime]);

    return [
        'balance' => fin_cents_to_number((int)$accRow['saldo']),
        'invoices' => fin_cents_to_number((int)$accRow['fatura']),
        'income' => fin_cents_to_number((int)$income->fetchColumn()),
        'expense' => fin_cents_to_number((int)$expense->fetchColumn()),
        'routine_count' => (int)$routine->fetchColumn(),
        'training_count' => (int)$training->fetchColumn(),
    ];
}

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
    $dueLogKeys = [];
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
        $dueLogKeys[] = $logKey;
    }

    if (!$due) {
        continue;
    }

    $delivered = send_transactional_email(
        (string)$user['email'],
        email_template_task_reminder((string)$user['username'], $due),
        email_idempotency_key('task-reminder', (string)$user['id'] . ':' . implode('|', $dueLogKeys)),
    );
    if (!$delivered) continue;

    $sent += count($due);
    foreach ($dueLogKeys as $logKey) {
        $log[$logKey] = 1;
    }

    $up = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $up->execute([$user['id'], '_notified_log', json_encode($log)]);
}

/*
 * Backup mensal cifrado por e-mail. Opt-in explicito (default desativado) e
 * envio mensal, nao semanal — protege contra estourar o limite diario/de
 * payload do Resend. So roda com a chave LEVELOS_BACKUP_KEY configurada no
 * ambiente e ext-sodium disponivel — sem chave, fica desativado (nunca envia
 * JSON em texto puro).
 */
$backups = 0;
$backupKey = null;
try {
    $backupKey = backup_crypto_read_key();
} catch (BackupCryptoException) {
    // chave ausente/invalida: backup por e-mail permanece desativado
}

if ($backupKey !== null) {
    $todayIso = $now->format('Y-m-d');
    foreach ($users as $user) {
        try {
            // Opt-in explícito: default é desativado. Só envia quem ligou o
            // toggle em Perfil → Preferências → Notificações → Backup por e-mail.
            $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
            $stmt->execute([$user['id'], '_preferences_v1']);
            $prefsRaw = $stmt->fetchColumn();
            $prefs = is_string($prefsRaw) ? json_decode($prefsRaw, true) : [];
            $wantsBackup = is_array($prefs) && ($prefs['notifications']['backup'] ?? false) === true;
            if (!$wantsBackup) continue;

            // Mensal (30 dias), não semanal — controla payload e volume de envio.
            $stmt->execute([$user['id'], '_backup_email_sent']);
            $lastRaw = $stmt->fetchColumn();
            $last = is_string($lastRaw) ? (string)json_decode($lastRaw, true) : '';
            if ($last !== '' && strtotime($last) !== false && (time() - strtotime($last)) < 30 * 86400) {
                continue;
            }

            // Mesmo shape do api/export.php: kv publico + sets financeiros relacionais.
            $data = [];
            $kvStmt = $db->prepare("SELECT data_key, data_value FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%'");
            $kvStmt->execute([$user['id']]);
            foreach ($kvStmt->fetchAll() as $kvRow) {
                $data[$kvRow['data_key']] = json_decode($kvRow['data_value']);
            }
            foreach (FINANCE_SETS as $kvKey => $set) {
                $data[$kvKey] = finance_load_set($db, (int)$user['id'], $set);
            }
            $json = json_encode([
                'format' => 'level-os-user-backup',
                'version' => 2,
                'exported_at' => $now->format(DATE_ATOM),
                'data' => $data,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

            $handle = fopen('php://temp/maxmemory:8388608', 'r+b');
            if ($handle === false) continue;
            $writer = new BackupArtifactWriter($handle, $backupKey);
            $chunks = str_split($json, 262144);
            $total = count($chunks);
            foreach ($chunks as $i => $chunk) {
                $writer->writeFrame($chunk, $i === $total - 1);
            }
            rewind($handle);
            $artifact = stream_get_contents($handle);
            fclose($handle);
            if (!is_string($artifact) || $artifact === '') continue;

            $summary = cron_monthly_summary($db, (int)$user['id']);
            $delivered = send_transactional_email(
                (string)$user['email'],
                email_template_monthly_backup((string)$user['username'], $todayIso, $summary),
                email_idempotency_key('monthly-backup', $user['id'] . ':' . $todayIso),
                [['filename' => 'level-os-backup-' . $todayIso . '.lvbk', 'content' => base64_encode($artifact)]],
            );
            if (!$delivered) continue;

            $up = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
            $up->execute([$user['id'], '_backup_email_sent', json_encode($todayIso)]);
            $backups++;
        } catch (Throwable $e) {
            error_log('weekly backup failed for user ' . $user['id'] . ': ' . backup_exception_class($e));
        }
    }
}

header('Content-Type: text/plain');
$backupNote = $backupKey === null ? ' (backup desativado: chave nao configurada)' : '';
echo "ok - avisos enviados: $sent - backups enviados: $backups$backupNote\n";
