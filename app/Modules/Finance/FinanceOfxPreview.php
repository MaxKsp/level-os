<?php
declare(strict_types=1);

/** OFX preview is read-only and scoped to the authenticated user. */
function finance_ofx_preview(PDO $db, int $uid, string $content): array {
    $parsed = parse_ofx($content);
    if (!$parsed['ok']) {
        return ['status' => 400, 'body' => ['error' => $parsed['error']]];
    }

    // Include variable incomes: OFX credits are persisted as income_var, not income.
    // Kind is part of the key so a deposit never hides a different withdrawal.
    $existing = [];
    foreach (['expense' => 'expense', 'income' => 'income', 'income_var' => 'income'] as $set => $kind) {
        foreach (finance_load_set($db, $uid, $set) as $record) {
            $date = $record['date'] ?? null;
            $value = $record['valor'] ?? $record['value'] ?? null;
            if (!is_string($date) || $date === '' || !is_numeric($value)) continue;
            $key = $kind . '|' . $date . '|' . number_format(abs((float)$value), 2, '.', '');
            $existing[$key] = true;
        }
    }

    $rows = [];
    $seenFitid = [];
    foreach ($parsed['rows'] as $row) {
        $key = $row['kind'] . '|' . ($row['date'] ?? '') . '|' . number_format($row['value'], 2, '.', '');
        $fitid = $row['fitid'] ?? null;
        $repeatedFitid = is_string($fitid) && $fitid !== '' && isset($seenFitid[$fitid]);
        if (is_string($fitid) && $fitid !== '') $seenFitid[$fitid] = true;
        $row['dup'] = isset($existing[$key]) || $repeatedFitid;
        $rows[] = $row;
    }
    return ['status' => 200, 'body' => ['ok' => true, 'rows' => $rows]];
}
