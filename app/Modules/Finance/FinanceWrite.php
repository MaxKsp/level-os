<?php
declare(strict_types=1);

/**
 * Nucleo de escrita relacional do Financeiro (Fase 4, recorte 1).
 * Extraido de finance.php sem mudar nome, assinatura ou comportamento:
 * replace total, client_id, fallback com uniqid() e transacao.
 * finance.php continua fachada compativel.
 */

/**
 * Substitui todo o set do usuário. Quando solicitado pela API, novos
 * lançamentos também geram XP dentro da mesma transação.
 */
function finance_save_set(PDO $db, int $uid, string $set, array $rows, bool $awardProgress = false): void {
    $ownTxn = !$db->inTransaction();
    if ($ownTxn) $db->beginTransaction();
    try {
        $existingClientIds = [];
        if ($awardProgress && $set !== 'accounts') {
            $existing = $db->prepare('SELECT client_id FROM transactions WHERE user_id = ? AND kind = ?');
            $existing->execute([$uid, $set]);
            $existingClientIds = array_fill_keys(array_map('strval', $existing->fetchAll(PDO::FETCH_COLUMN)), true);
        }
        $newClientIds = [];

        if ($set === 'accounts') {
            $db->prepare('DELETE FROM accounts WHERE user_id = ?')->execute([$uid]);
            $ins = $db->prepare('INSERT INTO accounts (user_id, client_id, label, tipo, saldo, saldo_cents, cheque_especial, cheque_especial_cents, limite, limite_cents, fatura, fatura_cents, fechamento, vencimento, bank, principal, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $a) {
                $fech = isset($a['fechamento']) && $a['fechamento'] !== null && (int)$a['fechamento']>=1 && (int)$a['fechamento']<=31 ? (int)$a['fechamento'] : null;
                $venc = isset($a['vencimento']) && $a['vencimento'] !== null && (int)$a['vencimento']>=1 && (int)$a['vencimento']<=31 ? (int)$a['vencimento'] : null;
                $saldoCents = fin_money_to_cents($a['saldo'] ?? 0);
                $chequeCents = fin_money_to_cents($a['chequeEspecial'] ?? 0);
                $limiteCents = fin_money_to_cents($a['limite'] ?? 0);
                $faturaCents = fin_money_to_cents($a['fatura'] ?? 0);
                $ins->execute([
                    $uid, (string)($a['id'] ?? uniqid('a')), $a['label'] ?? '', $a['tipo'] ?? 'conta',
                    fin_cents_to_decimal($saldoCents), $saldoCents,
                    fin_cents_to_decimal($chequeCents), $chequeCents,
                    fin_cents_to_decimal($limiteCents), $limiteCents,
                    fin_cents_to_decimal($faturaCents), $faturaCents,
                    $fech, $venc, $a['bank'] ?? null, !empty($a['principal']) ? 1 : 0,
                    isset($a['createdAt']) ? (int)$a['createdAt'] : null,
                ]);
            }
        } else {
            $db->prepare('DELETE FROM transactions WHERE user_id = ? AND kind = ?')->execute([$uid, $set]);
            $ins = $db->prepare('INSERT INTO transactions
                (user_id, kind, client_id, label, value, value_cents, tx_date, tx_time, category, method, bank, recurrence, income_type, end_date, salary_details, account_id, km, payday, parcelas, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($rows as $t) {
                if ($set === 'expense') {
                    $clientId = (string)($t['id'] ?? uniqid('t'));
                    $parc = isset($t['parcelas']) && (int)$t['parcelas'] >= 2 ? (int)$t['parcelas'] : null;
                    $valueCents = fin_money_to_cents($t['value'] ?? 0);
                    $ins->execute([$uid, 'expense', $clientId, $t['label'] ?? '', fin_cents_to_decimal($valueCents), $valueCents,
                        $t['date'] ?? null, $t['time'] ?? null, $t['categoria'] ?? null, $t['method'] ?? null,
                        $t['bank'] ?? null, $t['recorrencia'] ?? null, null, null, null, $t['accountId'] ?? null, null, null, $parc,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } elseif ($set === 'income') {
                    $clientId = (string)($t['id'] ?? uniqid('i'));
                    $pd = isset($t['payday']) && $t['payday'] !== null && (int)$t['payday'] >= 1 && (int)$t['payday'] <= 31 ? (int)$t['payday'] : null;
                    $valueCents = fin_money_to_cents($t['value'] ?? 0);
                    $salaryDetails = null;
                    if (isset($t['salaryDetails']) && is_array($t['salaryDetails'])) {
                        $encodedSalary = json_encode($t['salaryDetails'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        if (is_string($encodedSalary) && strlen($encodedSalary) <= 16384) $salaryDetails = $encodedSalary;
                    }
                    $ins->execute([$uid, 'income', $clientId, $t['label'] ?? '', fin_cents_to_decimal($valueCents), $valueCents,
                        $t['date'] ?? null, null, null, null, null, null, $t['type'] ?? null, $t['endDate'] ?? null, $salaryDetails, $t['accountId'] ?? null, null, $pd, null,
                        isset($t['createdAt']) ? (int)$t['createdAt'] : null]);
                } else { // income_var
                    $clientId = (string)($t['id'] ?? uniqid('v'));
                    $valueCents = fin_money_to_cents($t['valor'] ?? 0);
                    $ins->execute([$uid, 'income_var', $clientId, null, fin_cents_to_decimal($valueCents), $valueCents,
                        $t['date'] ?? null, null, null, null, null, null, null, null, null, null,
                        isset($t['km']) && $t['km'] !== null ? (int)$t['km'] : null, null, null,
                        null]);
                }
                $newClientIds[] = $clientId;
            }

            if ($awardProgress && function_exists('progress_award_event')) {
                foreach ($newClientIds as $clientId) {
                    if (isset($existingClientIds[$clientId])) continue;
                    try {
                        progress_award_event($db, $uid, 'financeiro', 'financeiro:' . $set . ':' . $clientId);
                    } catch (Throwable $progressError) {
                        // A migration de progressão pode ser aplicada imediatamente antes do deploy.
                        // Uma indisponibilidade dela nunca deve impedir o lançamento financeiro.
                        error_log('progress finance hook: ' . $progressError->getMessage());
                    }
                }
            }
        }
        if ($ownTxn) $db->commit();
    } catch (Throwable $e) {
        if ($ownTxn && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
