<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

function fmf_seed_kv(PDO $db, int $uid, string $key, $value): void {
    $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)')
        ->execute([$uid, $key, json_encode($value)]);
}

function fmf_migrated_flag(PDO $db, int $uid): bool {
    $stmt = $db->prepare('SELECT 1 FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$uid, '_finance_migrated']);
    return (bool)$stmt->fetch();
}

return function (): void {
    $fixture = test_load_fixture('finance_sets.php');

    // Primeira migracao + multiplos sets: os quatro FINANCE_SETS de uma vez.
    $db = make_sqlite_finance_db();
    $uid = 101;
    foreach (FINANCE_SETS as $kvKey => $set) {
        fmf_seed_kv($db, $uid, $kvKey, $fixture[$kvKey]);
    }
    finance_migrate_if_needed($db, $uid);

    test_assert_equals($fixture['expense_lines_v4'], finance_load_set($db, $uid, 'expense'), 'First migration must populate expense.');
    test_assert_equals($fixture['income_lines'], finance_load_set($db, $uid, 'income'), 'First migration must populate income.');
    test_assert_equals($fixture['ifood-entries'], finance_load_set($db, $uid, 'income_var'), 'First migration must populate income_var.');
    test_assert_equals($fixture['accounts_v2'], finance_load_set($db, $uid, 'accounts'), 'First migration must populate accounts.');

    // Flag _finance_migrated.
    test_assert_true(fmf_migrated_flag($db, $uid), 'Migration must set the _finance_migrated flag.');

    // Segunda execucao sem duplicar dados: o flag ja setado deve bloquear
    // qualquer nova leitura do kv, mesmo que o kv tenha mudado desde entao.
    $db->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')
        ->execute([json_encode([$fixture['expense_lines_v4'][0], ['id' => 'exp_injected', 'label' => 'Nao deve entrar', 'value' => 1]]), $uid, 'expense_lines_v4']);

    finance_migrate_if_needed($db, $uid);

    test_assert_equals(
        $fixture['expense_lines_v4'],
        finance_load_set($db, $uid, 'expense'),
        'Second run after the flag is set must be a no-op, ignoring kv changes.'
    );

    // Usuario sem dados legados: nenhuma linha no kv_store, nem o flag.
    $dbEmpty = make_sqlite_finance_db();
    $uidEmpty = 102;
    finance_migrate_if_needed($dbEmpty, $uidEmpty);

    test_assert_same([], finance_load_set($dbEmpty, $uidEmpty, 'expense'), 'User without legacy data must end up with an empty expense set.');
    test_assert_same([], finance_load_set($dbEmpty, $uidEmpty, 'income'), 'User without legacy data must end up with an empty income set.');
    test_assert_same([], finance_load_set($dbEmpty, $uidEmpty, 'income_var'), 'User without legacy data must end up with an empty income_var set.');
    test_assert_same([], finance_load_set($dbEmpty, $uidEmpty, 'accounts'), 'User without legacy data must end up with an empty accounts set.');
    test_assert_true(fmf_migrated_flag($dbEmpty, $uidEmpty), 'User without legacy data must still get the _finance_migrated flag.');

    // Falha durante migracao: comportamento atual nao tem try/catch proprio
    // em finance_migrate_if_needed, entao um erro no meio do loop propaga,
    // os sets ja processados (com commit proprio em finance_save_set) ficam
    // persistidos, o set que falhou fica como estava antes, e o flag nao e
    // setado. Uma nova chamada reprocessa do zero (replace total evita
    // duplicacao) e conclui quando a causa da falha for removida.
    $dbFail = make_sqlite_finance_db();
    $uidFail = 103;
    foreach (FINANCE_SETS as $kvKey => $set) {
        fmf_seed_kv($dbFail, $uidFail, $kvKey, $fixture[$kvKey]);
    }
    $dbFail->exec(
        "CREATE TRIGGER fmf_block_accounts BEFORE INSERT ON accounts
         WHEN NEW.limite > 999999 BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );
    $poisoned = $fixture['accounts_v2'];
    $poisoned[] = ['id' => 'acc_poison', 'label' => 'Estoura', 'limite' => 9999999];
    $dbFail->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')
        ->execute([json_encode($poisoned), $uidFail, 'accounts_v2']);

    $threw = false;
    try {
        finance_migrate_if_needed($dbFail, $uidFail);
    } catch (Throwable $e) {
        $threw = true;
    }
    test_assert_true($threw, 'A failure mid-migration must propagate, not be swallowed.');
    test_assert_true(!fmf_migrated_flag($dbFail, $uidFail), 'A failed migration must not set the _finance_migrated flag.');

    test_assert_equals($fixture['expense_lines_v4'], finance_load_set($dbFail, $uidFail, 'expense'), 'Sets processed before the failure must remain committed.');
    test_assert_equals($fixture['income_lines'], finance_load_set($dbFail, $uidFail, 'income'), 'Sets processed before the failure must remain committed.');
    test_assert_equals($fixture['ifood-entries'], finance_load_set($dbFail, $uidFail, 'income_var'), 'Sets processed before the failure must remain committed.');
    test_assert_same([], finance_load_set($dbFail, $uidFail, 'accounts'), 'The set that failed must stay untouched, not partially written.');

    $dbFail->exec('DROP TRIGGER fmf_block_accounts');
    $dbFail->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')
        ->execute([json_encode($fixture['accounts_v2']), $uidFail, 'accounts_v2']);

    finance_migrate_if_needed($dbFail, $uidFail);

    test_assert_true(fmf_migrated_flag($dbFail, $uidFail), 'Retry after fixing the failure must complete and set the flag.');
    test_assert_equals($fixture['expense_lines_v4'], finance_load_set($dbFail, $uidFail, 'expense'), 'Retry must not duplicate already-migrated sets.');
    test_assert_equals($fixture['income_lines'], finance_load_set($dbFail, $uidFail, 'income'), 'Retry must not duplicate already-migrated sets.');
    test_assert_equals($fixture['ifood-entries'], finance_load_set($dbFail, $uidFail, 'income_var'), 'Retry must not duplicate already-migrated sets.');
    test_assert_equals($fixture['accounts_v2'], finance_load_set($dbFail, $uidFail, 'accounts'), 'Retry must migrate the previously failing set once fixed.');
};
