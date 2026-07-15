<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

return function (): void {
    $uid = 31;
    $fixture = test_load_fixture('finance_sets.php');

    // Persistencia correta + client_id, nos quatro FINANCE_SETS.
    $db = make_sqlite_finance_db();
    foreach (FINANCE_SETS as $kvKey => $set) {
        finance_save_set($db, $uid, $set, $fixture[$kvKey]);
    }
    test_assert_equals(
        $fixture['expense_lines_v4'],
        finance_load_set($db, $uid, 'expense'),
        'finance_save_set must persist expense rows exactly as saved.'
    );
    test_assert_equals(
        $fixture['income_lines'],
        finance_load_set($db, $uid, 'income'),
        'finance_save_set must persist income rows exactly as saved.'
    );
    test_assert_equals(
        $fixture['ifood-entries'],
        finance_load_set($db, $uid, 'income_var'),
        'finance_save_set must persist income_var rows exactly as saved.'
    );
    test_assert_equals(
        $fixture['accounts_v2'],
        finance_load_set($db, $uid, 'accounts'),
        'finance_save_set must persist accounts rows exactly as saved.'
    );
    test_assert_same(
        'exp_001',
        finance_load_set($db, $uid, 'expense')[0]['id'],
        'client_id from the payload must come back as the public id.'
    );

    // Replace total: salvar de novo substitui o set inteiro, nao faz merge.
    finance_save_set($db, $uid, 'expense', [$fixture['expense_lines_v4'][1]]);
    $afterReplace = finance_load_set($db, $uid, 'expense');
    test_assert_same(1, count($afterReplace), 'Saving a set must replace the previous set entirely.');
    test_assert_same('exp_002', $afterReplace[0]['id'], 'Only the newly saved row must remain after replace.');

    // Fallback de id: sem 'id' no payload, finance_save_set gera via uniqid().
    finance_save_set($db, $uid, 'income', [['label' => 'Sem id', 'value' => 5.0]]);
    $incomeNoId = finance_load_set($db, $uid, 'income');
    test_assert_true(
        is_string($incomeNoId[0]['id']) && $incomeNoId[0]['id'] !== '',
        'Missing incoming id must fall back to a non-empty generated id.'
    );

    finance_save_set($db, $uid, 'accounts', [['label' => 'Conta sem id']]);
    $accNoId = finance_load_set($db, $uid, 'accounts');
    test_assert_true(
        is_string($accNoId[0]['id']) && $accNoId[0]['id'] !== '',
        'Missing incoming account id must fall back to a non-empty generated id.'
    );

    // Rollback (transacao propria): erro no meio do replace nao deve deixar
    // o set em estado parcial; dado anterior permanece intacto.
    $dbFail = make_sqlite_finance_db();
    finance_save_set($dbFail, $uid, 'accounts', [$fixture['accounts_v2'][0]]);
    $dbFail->exec(
        "CREATE TRIGGER block_big_limite BEFORE INSERT ON accounts
         WHEN NEW.limite > 999999 BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );
    $threw = false;
    try {
        finance_save_set($dbFail, $uid, 'accounts', [
            ['id' => 'acc_ok', 'label' => 'Ok', 'limite' => 10],
            ['id' => 'acc_bad', 'label' => 'Estoura', 'limite' => 9999999],
        ]);
    } catch (Throwable $e) {
        $threw = true;
    }
    test_assert_true($threw, 'A failure mid-save must propagate instead of being swallowed.');
    test_assert_equals(
        [$fixture['accounts_v2'][0]],
        finance_load_set($dbFail, $uid, 'accounts'),
        'A failed save must roll back, leaving the previous set untouched (no partial replace).'
    );

    // Rollback (transacao do chamador): quando ja existe transacao aberta,
    // finance_save_set nao deve commitar nem rollback por conta propria.
    $dbNested = make_sqlite_finance_db();
    finance_save_set($dbNested, $uid, 'expense', [$fixture['expense_lines_v4'][0]]);

    $dbNested->beginTransaction();
    finance_save_set($dbNested, $uid, 'expense', [$fixture['expense_lines_v4'][1]]);
    $dbNested->rollBack();

    test_assert_equals(
        [$fixture['expense_lines_v4'][0]],
        finance_load_set($dbNested, $uid, 'expense'),
        'finance_save_set must not own commit/rollback when the caller already has an open transaction.'
    );
};
