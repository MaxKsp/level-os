<?php
declare(strict_types=1);

/** Leitura financeira relacional com centavos inteiros como fonte canônica. */

const FINANCE_SETS = [
    'expense_lines_v4' => 'expense',
    'income_lines'     => 'income',
    'ifood-entries'    => 'income_var',
    'accounts_v2'      => 'accounts',
];

function fin_money_to_cents(mixed $value): int {
    if ($value === null || $value === '') return 0;
    if (is_int($value)) return $value * 100;
    if (is_float($value)) return (int)round($value * 100);
    if (!is_string($value)) throw new InvalidArgumentException('Invalid money value.');
    $normalized = str_replace(',', '.', trim($value));
    if (!preg_match('/\A-?\d+(?:\.\d{1,2})?\z/D', $normalized)) throw new InvalidArgumentException('Invalid money value.');
    $negative = str_starts_with($normalized, '-');
    $unsigned = ltrim($normalized, '-');
    [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
    if (strlen($whole) > 14) throw new InvalidArgumentException('Money value out of range.');
    $cents = ((int)$whole * 100) + (int)str_pad($fraction, 2, '0');
    return $negative ? -$cents : $cents;
}

function fin_cents_to_decimal(int $cents): string {
    $sign = $cents < 0 ? '-' : '';
    $absolute = abs($cents);
    return $sign . intdiv($absolute, 100) . '.' . str_pad((string)($absolute % 100), 2, '0', STR_PAD_LEFT);
}

function fin_cents_to_number(int $cents): float {
    return $cents / 100;
}

function fin_row_money(array $row, string $centsColumn, string $legacyColumn): float {
    if (array_key_exists($centsColumn, $row) && $row[$centsColumn] !== null) {
        return fin_cents_to_number((int)$row[$centsColumn]);
    }
    return fin_cents_to_number(fin_money_to_cents($row[$legacyColumn] ?? 0));
}

/** Compatibilidade para callers legados; toda conversão passa por centavos. */
function fin_num(mixed $value): float {
    return fin_cents_to_number(fin_money_to_cents($value));
}

function fin_trim_time(?string $time): ?string {
    return $time ? substr($time, 0, 5) : null;
}

/** @return array<string,mixed> */
function finance_account_from_row(array $row): array {
    return [
        'id' => $row['client_id'],
        'label' => $row['label'],
        'tipo' => $row['tipo'],
        'saldo' => fin_row_money($row, 'saldo_cents', 'saldo'),
        'chequeEspecial' => fin_row_money($row, 'cheque_especial_cents', 'cheque_especial'),
        'limite' => fin_row_money($row, 'limite_cents', 'limite'),
        'fatura' => fin_row_money($row, 'fatura_cents', 'fatura'),
        'fechamento' => isset($row['fechamento']) && $row['fechamento'] !== null ? (int)$row['fechamento'] : null,
        'vencimento' => isset($row['vencimento']) && $row['vencimento'] !== null ? (int)$row['vencimento'] : null,
        'bank' => $row['bank'],
        'principal' => (int)$row['principal'] === 1,
        'createdAt' => $row['created_at'] !== null ? (int)$row['created_at'] : null,
    ];
}

/** @return array<string,mixed> */
function finance_transaction_from_row(array $row, string $set): array {
    $value = fin_row_money($row, 'value_cents', 'value');
    if ($set === 'expense') {
        return [
            'id' => $row['client_id'], 'label' => $row['label'], 'value' => $value,
            'date' => $row['tx_date'], 'time' => fin_trim_time($row['tx_time']),
            'recorrencia' => $row['recurrence'], 'categoria' => $row['category'],
            'method' => $row['method'], 'bank' => $row['bank'], 'accountId' => $row['account_id'],
            'parcelas' => isset($row['parcelas']) && $row['parcelas'] !== null ? (int)$row['parcelas'] : null,
            'createdAt' => $row['created_at'] !== null ? (int)$row['created_at'] : null,
        ];
    }
    if ($set === 'income') {
        $salaryDetails = null;
        if (isset($row['salary_details']) && is_string($row['salary_details']) && $row['salary_details'] !== '') {
            $decoded = json_decode($row['salary_details'], true);
            if (is_array($decoded)) $salaryDetails = $decoded;
        }
        $income = [
            'id' => $row['client_id'], 'label' => $row['label'], 'value' => $value,
            'type' => $row['income_type'], 'date' => $row['tx_date'], 'endDate' => $row['end_date'],
            'payday' => isset($row['payday']) && $row['payday'] !== null ? (int)$row['payday'] : null,
            'accountId' => $row['account_id'],
            'createdAt' => $row['created_at'] !== null ? (int)$row['created_at'] : null,
        ];
        if ($salaryDetails !== null) $income['salaryDetails'] = $salaryDetails;
        return $income;
    }
    return [
        'date' => $row['tx_date'], 'valor' => $value,
        'km' => $row['km'] !== null ? (int)$row['km'] : null,
    ];
}

/** Carrega um set isolado mantendo o contrato histórico do frontend. */
function finance_load_set(PDO $db, int $uid, string $set): array {
    if ($set === 'accounts') {
        $stmt = $db->prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id LIMIT 1001');
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) > 1000) throw new OverflowException('Finance account limit exceeded.');
        return array_map(finance_account_from_row(...), $rows);
    }
    $stmt = $db->prepare('SELECT * FROM transactions WHERE user_id = ? AND kind = ? ORDER BY id LIMIT 5001');
    $stmt->execute([$uid, $set]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) > 5000) throw new OverflowException('Finance transaction limit exceeded.');
    return array_map(static fn(array $row): array => finance_transaction_from_row($row, $set), $rows);
}

/**
 * Bootstrap em duas queries fixas (contas + movimentos), sem uma consulta por
 * set e com limites explícitos de payload.
 */
function finance_load_all_sets(PDO $db, int $uid): array {
    $accounts = $db->prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id LIMIT 1001');
    $accounts->execute([$uid]);
    $accountRows = $accounts->fetchAll(PDO::FETCH_ASSOC);
    if (count($accountRows) > 1000) throw new OverflowException('Finance account limit exceeded.');

    $transactions = $db->prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id LIMIT 5001');
    $transactions->execute([$uid]);
    $transactionRows = $transactions->fetchAll(PDO::FETCH_ASSOC);
    if (count($transactionRows) > 5000) throw new OverflowException('Finance transaction limit exceeded.');

    $out = ['expense_lines_v4' => [], 'income_lines' => [], 'ifood-entries' => [], 'accounts_v2' => []];
    $out['accounts_v2'] = array_map(finance_account_from_row(...), $accountRows);
    $keyByKind = ['expense' => 'expense_lines_v4', 'income' => 'income_lines', 'income_var' => 'ifood-entries'];
    foreach ($transactionRows as $row) {
        $kind = (string)($row['kind'] ?? '');
        if (!isset($keyByKind[$kind])) continue;
        $out[$keyByKind[$kind]][] = finance_transaction_from_row($row, $kind);
    }
    return $out;
}
