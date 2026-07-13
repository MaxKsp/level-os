<?php
declare(strict_types=1);

/**
 * Nucleo de leitura relacional do Financeiro (Fase 3, recorte 1).
 * Extraido de finance.php sem mudar nome, assinatura, shape de retorno,
 * ORDER BY id ou client_id. finance.php continua fachada compativel.
 */

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
                'chequeEspecial' => isset($r['cheque_especial']) ? fin_num($r['cheque_especial']) : 0,
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
                'parcelas' => isset($r['parcelas']) && $r['parcelas'] !== null ? (int)$r['parcelas'] : null,
                'createdAt' => $r['created_at'] !== null ? (int)$r['created_at'] : null,
            ];
        } elseif ($set === 'income') {
            $out[] = [
                'id' => $r['client_id'], 'label' => $r['label'], 'value' => fin_num($r['value']),
                'type' => $r['income_type'], 'endDate' => $r['end_date'],
                'payday' => isset($r['payday']) && $r['payday'] !== null ? (int)$r['payday'] : null,
                'accountId' => $r['account_id'],
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
