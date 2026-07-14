<?php
declare(strict_types=1);

/**
 * Migracao kv -> tabelas do Financeiro (Fase 5, recorte 1).
 * Extraido de finance.php sem mudar nome, assinatura ou comportamento:
 * leitura do kv_store, idempotencia via flag _finance_migrated, UPSERT e
 * delegacao para finance_save_set(). finance.php continua fachada compativel.
 */

/** Migra kv -> tabelas uma vez por usuario. Idempotente (flag _finance_migrated). */
function finance_migrate_if_needed(PDO $db, int $uid): void {
    $stmt = $db->prepare('SELECT 1 FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$uid, '_finance_migrated']);
    if ($stmt->fetch()) return;

    foreach (FINANCE_SETS as $kvKey => $set) {
        $s = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
        $s->execute([$uid, $kvKey]);
        $row = $s->fetch();
        if ($row) {
            $arr = json_decode($row['data_value'], true);
            if (is_array($arr) && $arr) finance_save_set($db, $uid, $set, $arr);
        }
    }
    // marca migrado; nao apaga o kv antigo (fica de backup ate confiarmos)
    $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)')
       ->execute([$uid, '_finance_migrated', json_encode(date('c'))]);
}
