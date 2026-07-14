<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceAuxiliaryKv.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceDataBootstrap.php';

/**
 * Le todo o kv_store do usuario e aplica a mesma exclusao de chaves internas
 * que api/data.php faz em SQL (NOT LIKE '\_%'), sobrescrevendo com o
 * bootstrap financeiro por cima — mesmos passos do merge do GET ?all=1,
 * reproduzidos aqui em PHP puro pra nao depender de traducao de dialeto SQL
 * MySQL -> sqlite so pra um teste.
 */
function fakv_simulate_get_all(PDO $db, int $uid): array {
    $stmt = $db->prepare('SELECT data_key, data_value FROM kv_store WHERE user_id = ?');
    $stmt->execute([$uid]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        if (str_starts_with($row['data_key'], '_')) continue;
        $out[$row['data_key']] = json_decode($row['data_value'], true);
    }
    foreach (finance_data_bootstrap($db, $uid) as $kvKey => $value) {
        $out[$kvKey] = $value;
    }
    return $out;
}

return function (): void {
    $uid = 501;

    // Contrato: exatamente as oito chaves autorizadas.
    test_assert_same(
        ['vaults', 'transfers', 'budget_goals', 'custom_categories', 'anomaly_dismissed', 'income_meta', 'acc_view', 'bank_favorites'],
        FINANCE_AUX_KV_KEYS,
        'FINANCE_AUX_KV_KEYS must list exactly the eight authorized keys, in order.'
    );

    // Chave financeira valida delegada ao modulo: persiste no kv_store.
    $db = make_sqlite_finance_db();
    finance_auxiliary_kv_save($db, $uid, 'vaults', [['id' => 'v1', 'label' => 'Viagem', 'saldo' => 100]]);
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$uid, 'vaults']);
    $row = $stmt->fetch();
    test_assert_true($row !== false, 'A valid financial key must be persisted to kv_store.');
    test_assert_equals(
        [['id' => 'v1', 'label' => 'Viagem', 'saldo' => 100]],
        json_decode($row['data_value'], true),
        'The persisted value must match what was saved.'
    );

    // UPSERT preservado: salvar de novo a mesma chave substitui o valor, sem duplicar linha.
    finance_auxiliary_kv_save($db, $uid, 'vaults', [['id' => 'v1', 'label' => 'Viagem', 'saldo' => 250]]);
    $countStmt = $db->prepare('SELECT COUNT(*) AS c FROM kv_store WHERE user_id = ? AND data_key = ?');
    $countStmt->execute([$uid, 'vaults']);
    test_assert_same(1, (int)$countStmt->fetch()['c'], 'Saving the same key twice must upsert, not duplicate the row.');
    $reread = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $reread->execute([$uid, 'vaults']);
    test_assert_equals(
        [['id' => 'v1', 'label' => 'Viagem', 'saldo' => 250]],
        json_decode($reread->fetch()['data_value'], true),
        'The second save must overwrite the previous value.'
    );

    // Valor persistido e relido sem alteracao, inclusive shapes aninhados/tipos mistos.
    $complexValue = [
        'goals' => ['alimentacao' => 500.5, 'transporte' => 200],
        'notes' => null,
        'active' => true,
        'tags' => ['a', 'b', 'c'],
    ];
    finance_auxiliary_kv_save($db, $uid, 'budget_goals', $complexValue);
    $rereadComplex = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $rereadComplex->execute([$uid, 'budget_goals']);
    test_assert_equals($complexValue, json_decode($rereadComplex->fetch()['data_value'], true), 'Complex values must round-trip without alteration.');

    // Chave generica nao financeira continua fora da lista, ou seja, continua
    // roteada pro caminho legado inline em api/data.php (nao pro modulo).
    foreach (['workouts', 'workout_log', 'body_log', 'section_order', 'expense_lines_v4'] as $genericKey) {
        test_assert_true(
            !in_array($genericKey, FINANCE_AUX_KV_KEYS, true),
            "\"$genericKey\" must not be in FINANCE_AUX_KV_KEYS (stays on the legacy generic path)."
        );
    }

    // GET ?all=1 sem regressao: chave financeira auxiliar e chave generica
    // convivem no merge, chave interna (prefixo _) e excluida, e as quatro
    // chaves relacionais continuam vindo do bootstrap financeiro por cima.
    $dbMerge = make_sqlite_finance_db();
    finance_auxiliary_kv_save($dbMerge, $uid, 'vaults', [['id' => 'v1']]);
    finance_auxiliary_kv_save($dbMerge, $uid, 'workouts', ['plan' => 'ABC']);
    finance_auxiliary_kv_save($dbMerge, $uid, '_finance_migrated', 'already');

    $merged = fakv_simulate_get_all($dbMerge, $uid);
    test_assert_equals([['id' => 'v1']], $merged['vaults'] ?? null, 'Financial auxiliary keys must appear in the GET ?all=1 merge.');
    test_assert_equals(['plan' => 'ABC'], $merged['workouts'] ?? null, 'Generic keys must keep appearing in the GET ?all=1 merge, untouched.');
    test_assert_true(!array_key_exists('_finance_migrated', $merged), 'Internal keys must stay excluded from the GET ?all=1 merge.');
    foreach (['expense_lines_v4', 'income_lines', 'ifood-entries', 'accounts_v2'] as $relKey) {
        test_assert_true(array_key_exists($relKey, $merged), "The relational key \"$relKey\" must always be present in the merge.");
    }
};
