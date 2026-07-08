<?php
declare(strict_types=1);

/**
 * Armazenamento relacional dos dados financeiros (transactions/accounts).
 * Preserva o contrato de array do front: mesmas chaves e shapes que o kv
 * usava. client_id guarda o id string do front (genId), ids nao mudam.
 *
 * Chaves kv -> set relacional:
 *   expense_lines_v4 -> transactions kind=expense
 *   income_lines     -> transactions kind=income
 *   ifood-entries    -> transactions kind=income_var
 *   accounts_v2      -> accounts
 */

require_once __DIR__ . '/db.php';

const FINANCE_SETS = [
    'expense_lines_v4' => 'expense',
    'income_lines'     => 'income',
    'ifood-entries'    => 'income_var',
    'accounts_v2'      => 'accounts',
];

function fin_num($v): float { return $v === null || $v === '' ? 0.0 : (float)$v; }
function fin_trim_time(?string $t): ?string { return $t ? substr($t, 0, 5) : null; }

/** Carrega um set no shape que o front espera. $set = expense|income|income_var|accounts */
function finance_load_set(PDO $db, int $uid, string $set): array {
    if ($set === 'accounts') {
        $stmt = $db->prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id');
        $stmt->execute([$uid]);
        $out = [];
        foreach ($stmt->fetchAll() as $r) {
            $out[] = [
                'id' => $r['client_id'],
                'label' => $r['label'],
                'tipo' => $r['tipo'],
                'saldo' => fin_num($r['saldo']),
                'limite' => fin_num($r['limite']),
                'fatura' => fin_num($r['fatura']),
                'fechamento' => isset($r['fechamento']) && $r['fechamento'] !== null ? (int)$r['fechamento'] : null,
                'vencimento' => isset($r['vencimento']) && $r['vencimento'] !== null ? (int)$r['vencimento'] : null,
                'bank' => $r['bank'],
                'principal' => (int)$r['principal'] === 1,
                'createdAt' => $r['created_at'] !== null ? (int)$r['created_at'] : null,
            ];
        }
        return $out;
    }
    $stmt = $db->prepare('SELECT * FROM transactions WHERE user_id = ? AND kind = ? ORDER BY id');
    $stmt->execute([$uid, $set]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        if ($set === 'expense') {
            $out[] = [
                'id' => $r['client_id'], 'label' => $r['label'], 'value' => fin_num($r['value']),
                'date' => $r['tx_date'], 'time' => fin_trim_time($r['tx_time']),
                'recorrencia' => $r['recurrence'], 'categoria' => $r['category'],
                'method' => $r['method'], 'bank' => $r['bank'], 'accountId' => $r['account_id'],
                'createdAt' => $r['created_at'] !== null ? (int)$r['created_at'] : null,
            ];
        } elseif ($set === 'income') {
            $out[] = [
                'id' => $r['client_id'], 'label' => $r['label'], 'value' => fin_num($r['value']),
                'type' => $r['income_type'], 'endDate' => $r['end_date'],
                'payday' => isset($r['payday']) && $r['payday'] !== null ? (int)$r['payday'] : null,
                'createdAt' => $r['created_at'] !== null ? (int)$r['created_at'] : null,
            ];
        } else { // income_var (ifood)
            $out[] = [
                'date' => $r['tx_date'], 'valor' => fin_num($r['value']),
                'km' => $r['km'] !== null ? (int)$r['km'] : null,
            ];
        }
    }
    return $out;
}

/** Substitui todo o set do usuario (mesma semantica do storeSet(chave, arrayInteiro)). */
function finance_save_set(PDO $db, int $uid, string $set, array $rows): void {
    $ownTxn = !$db->inTransaction();
    if ($ownTxn) $db->beginTransaction();
    try {
        if ($set === 'accounts') {
            $db->prepare('DELETE FROM accounts WHERE user_id = ?')->execute([$uid]);
            $ins = $db->prepare('INSERT INTO accounts (user_id, client_id, label, tipo, saldo, limite, fatura, fechamento, vencimento, bank, principal, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $a) {
                $fech = isset($a['fechamento']) && $a['fechamento'] !== null && (int)$a['fechamento']>=1 && (int)$a['fechamento']<=31 ? (int)$a['fechamento'] : null;
                $venc = isset($a['vencimento']) && $a['vencimento'] !== null && (int)$a['vencimento']>=1 && (int)$a['vencimento']<=31 ? (int)$a['vencimento'] : null;
                $ins->execute([
                    $uid, (string)($a['id'] ?? uniqid('a')), $a['label'] ?? '', $a['tipo'] ?? 'conta',
                    fin_num($a['saldo'] ?? 0), fin_num($a['limite'] ?? 0), fin_num($a['fatura'] ?? 0),
                    $fech, $venc, $a['bank'] ?? null, !empty($a['principal']) ? 1 : 0,
                    isset($a['createdAt']) ? (int)$a['createdAt'] : null,
                ]);
            }
        } else {
            $db->prepare('DELETE FROM transactions WHERE user_id = ? AND kind = ?')->execute([$uid, $set]);
            $ins = $db->prepare('INSERT INTO transactions
                (user_id, kind, client_id, label, value, tx_date, tx_time, category, method, bank, recurrence, income_type, end_date, account_id, km, payday, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $t) {
                if ($set === 'expense') {
                    $ins->execute([$uid, 'expense', (string)($t['id'] ?? uniqid('t')), $t['label'] ?? '', fin_num($t['value'] ?? 0),
                        $t['date'] ?? null, $t['time'] ?? null, $t['categoria'] ?? null, $t['method'] ?? null,
                        $t['bank'] ?? null, $t['recorrencia'] ?? null, null, null, $t['accountId'] ?? null, null, null,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } elseif ($set === 'income') {
                    $pd = isset($t['payday']) && $t['payday'] !== null && (int)$t['payday'] >= 1 && (int)$t['payday'] <= 31 ? (int)$t['payday'] : null;
                    $ins->execute([$uid, 'income', (string)($t['id'] ?? uniqid('i')), $t['label'] ?? '', fin_num($t['value'] ?? 0),
                        null, null, null, null, null, null, $t['type'] ?? null, $t['endDate'] ?? null, null, null, $pd,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } else { // income_var
                    $ins->execute([$uid, 'income_var', uniqid('v'), null, fin_num($t['valor'] ?? 0),
                        $t['date'] ?? null, null, null, null, null, null, null, null, null,
                        isset($t['km']) && $t['km'] !== null ? (int)$t['km'] : null, null, null]);
                }
            }
        }
        if ($ownTxn) $db->commit();
    } catch (Throwable $e) {
        if ($ownTxn && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

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
