<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceDataBootstrap.php';

return function (): void {
    $uid = 201;
    $fixture = test_load_fixture('finance_sets.php');

    // Bootstrap financeiro extraido: migra e devolve exatamente os quatro
    // sets relacionais, no shape que finance_load_set ja produzia.
    $db = make_sqlite_finance_db();
    foreach (FINANCE_SETS as $kvKey => $set) {
        $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)')
            ->execute([$uid, $kvKey, json_encode($fixture[$kvKey])]);
    }

    $result = finance_data_bootstrap($db, $uid);

    test_assert_same(
        ['expense_lines_v4', 'income_lines', 'ifood-entries', 'accounts_v2'],
        array_keys($result),
        'finance_data_bootstrap must return exactly the four relational keys, in FINANCE_SETS order.'
    );
    test_assert_equals($fixture['expense_lines_v4'], $result['expense_lines_v4'], 'Bootstrap must migrate and load expense.');
    test_assert_equals($fixture['income_lines'], $result['income_lines'], 'Bootstrap must migrate and load income.');
    test_assert_equals($fixture['ifood-entries'], $result['ifood-entries'], 'Bootstrap must migrate and load income_var.');
    test_assert_equals($fixture['accounts_v2'], $result['accounts_v2'], 'Bootstrap must migrate and load accounts.');

    // Idempotencia: uma segunda chamada nao duplica (a migracao ja setou o flag).
    $second = finance_data_bootstrap($db, $uid);
    test_assert_equals($result, $second, 'A second bootstrap call must not change or duplicate already migrated data.');

    // Usuario sem dados legados: sem excecao, quatro chaves vazias.
    $dbEmpty = make_sqlite_finance_db();
    $emptyResult = finance_data_bootstrap($dbEmpty, 999);
    test_assert_same(
        ['expense_lines_v4', 'income_lines', 'ifood-entries', 'accounts_v2'],
        array_keys($emptyResult),
        'Bootstrap without legacy data must still return the four keys.'
    );
    test_assert_same([], $emptyResult['expense_lines_v4'], 'Bootstrap without legacy data must return an empty expense set.');
    test_assert_same([], $emptyResult['accounts_v2'], 'Bootstrap without legacy data must return an empty accounts set.');

    // Migracao best-effort: falha no meio da migracao nao propaga, e o
    // bootstrap ainda devolve as quatro chaves (com o que deu pra migrar).
    $dbFail = make_sqlite_finance_db();
    $uidFail = 202;
    foreach (FINANCE_SETS as $kvKey => $set) {
        $dbFail->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)')
            ->execute([$uidFail, $kvKey, json_encode($fixture[$kvKey])]);
    }
    $dbFail->exec(
        "CREATE TRIGGER fdbt_block_accounts BEFORE INSERT ON accounts
         WHEN NEW.limite > 999999 BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );
    $poisoned = $fixture['accounts_v2'];
    $poisoned[] = ['id' => 'acc_poison', 'label' => 'Estoura', 'limite' => 9999999];
    $dbFail->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')
        ->execute([json_encode($poisoned), $uidFail, 'accounts_v2']);

    $threw = false;
    $failResult = [];
    try {
        $failResult = finance_data_bootstrap($dbFail, $uidFail);
    } catch (Throwable $e) {
        $threw = true;
    }
    test_assert_true(!$threw, 'A migration failure must not propagate out of finance_data_bootstrap (best-effort).');
    test_assert_same(
        ['expense_lines_v4', 'income_lines', 'ifood-entries', 'accounts_v2'],
        array_keys($failResult),
        'Bootstrap must still return the four keys even when migration partially fails.'
    );
    test_assert_equals($fixture['expense_lines_v4'], $failResult['expense_lines_v4'], 'Sets migrated before the failure must still come back.');
    test_assert_same([], $failResult['accounts_v2'], 'The set that failed to migrate must come back empty, not crash the bootstrap.');
};
