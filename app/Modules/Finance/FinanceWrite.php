<?php
declare(strict_types=1);

/**
 * Nucleo de escrita relacional do Financeiro (Fase 4, recorte 1).
 * Extraido de finance.php sem mudar nome, assinatura ou comportamento:
 * replace total, client_id, fallback com uniqid() e transacao.
 * finance.php continua fachada compativel.
 */

/** Substitui todo o set do usuario (mesma semantica do storeSet(chave, arrayInteiro)). */
function finance_save_set(PDO $db, int $uid, string $set, array $rows): void {
    $ownTxn = !$db->inTransaction();
    if ($ownTxn) $db->beginTransaction();
    try {
        if ($set === 'accounts') {
            $db->prepare('DELETE FROM accounts WHERE user_id = ?')->execute([$uid]);
            $ins = $db->prepare('INSERT INTO accounts (user_id, client_id, label, tipo, saldo, cheque_especial, limite, fatura, fechamento, vencimento, bank, principal, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $a) {
                $fech = isset($a['fechamento']) && $a['fechamento'] !== null && (int)$a['fechamento']>=1 && (int)$a['fechamento']<=31 ? (int)$a['fechamento'] : null;
                $venc = isset($a['vencimento']) && $a['vencimento'] !== null && (int)$a['vencimento']>=1 && (int)$a['vencimento']<=31 ? (int)$a['vencimento'] : null;
                $ins->execute([
                    $uid, (string)($a['id'] ?? uniqid('a')), $a['label'] ?? '', $a['tipo'] ?? 'conta',
                    fin_num($a['saldo'] ?? 0), fin_num($a['chequeEspecial'] ?? 0), fin_num($a['limite'] ?? 0), fin_num($a['fatura'] ?? 0),
                    $fech, $venc, $a['bank'] ?? null, !empty($a['principal']) ? 1 : 0,
                    isset($a['createdAt']) ? (int)$a['createdAt'] : null,
                ]);
            }
        } else {
            $db->prepare('DELETE FROM transactions WHERE user_id = ? AND kind = ?')->execute([$uid, $set]);
            $ins = $db->prepare('INSERT INTO transactions
                (user_id, kind, client_id, label, value, tx_date, tx_time, category, method, bank, recurrence, income_type, end_date, account_id, km, payday, parcelas, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $t) {
                if ($set === 'expense') {
                    $parc = isset($t['parcelas']) && (int)$t['parcelas'] >= 2 ? (int)$t['parcelas'] : null;
                    $ins->execute([$uid, 'expense', (string)($t['id'] ?? uniqid('t')), $t['label'] ?? '', fin_num($t['value'] ?? 0),
                        $t['date'] ?? null, $t['time'] ?? null, $t['categoria'] ?? null, $t['method'] ?? null,
                        $t['bank'] ?? null, $t['recorrencia'] ?? null, null, null, $t['accountId'] ?? null, null, null, $parc,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } elseif ($set === 'income') {
                    $pd = isset($t['payday']) && $t['payday'] !== null && (int)$t['payday'] >= 1 && (int)$t['payday'] <= 31 ? (int)$t['payday'] : null;
                    $ins->execute([$uid, 'income', (string)($t['id'] ?? uniqid('i')), $t['label'] ?? '', fin_num($t['value'] ?? 0),
                        null, null, null, null, null, null, $t['type'] ?? null, $t['endDate'] ?? null, $t['accountId'] ?? null, null, $pd, null,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } else { // income_var
                    $ins->execute([$uid, 'income_var', uniqid('v'), null, fin_num($t['valor'] ?? 0),
                        $t['date'] ?? null, null, null, null, null, null, null, null, null,
                        isset($t['km']) && $t['km'] !== null ? (int)$t['km'] : null, null, null,
                        null]);
                }
            }
        }
        if ($ownTxn) $db->commit();
    } catch (Throwable $e) {
        if ($ownTxn && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
