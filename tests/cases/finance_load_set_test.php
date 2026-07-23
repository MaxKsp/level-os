<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

return function (): void {
    $uid = 23;

    // FINANCE_SETS: os quatro sets suportados, sem alteracao de chave/valor.
    test_assert_same(
        [
            'expense_lines_v4' => 'expense',
            'income_lines'     => 'income',
            'ifood-entries'    => 'income_var',
            'accounts_v2'      => 'accounts',
        ],
        FINANCE_SETS,
        'FINANCE_SETS must keep the four known kv-key to set mappings.'
    );

    // Ordenacao observavel por id (accounts): insercao fora de ordem
    // alfabetica de client_id, saida deve seguir ordem fisica (id), nao
    // ordem alfabetica de client_id.
    $db = make_sqlite_finance_db();
    $insAcc = $db->prepare('INSERT INTO accounts (user_id, client_id, label) VALUES (?, ?, ?)');
    $insAcc->execute([$uid, 'zzz_last', 'Inserida primeiro']);
    $insAcc->execute([$uid, 'aaa_first', 'Inserida segundo']);
    $insAcc->execute([$uid, 'mmm_mid', 'Inserida terceiro']);

    $accounts = finance_load_set($db, $uid, 'accounts');
    test_assert_same(
        ['zzz_last', 'aaa_first', 'mmm_mid'],
        array_column($accounts, 'id'),
        'Accounts must be ordered by physical id, not by client_id.'
    );

    // Ordenacao observavel por id (transactions/income): mesma garantia na
    // outra query de finance_load_set.
    $insTx = $db->prepare('INSERT INTO transactions (user_id, kind, client_id) VALUES (?, ?, ?)');
    $insTx->execute([$uid, 'income', 'inc_zzz']);
    $insTx->execute([$uid, 'income', 'inc_aaa']);
    $insTx->execute([$uid, 'income', 'inc_mmm']);

    $incomes = finance_load_set($db, $uid, 'income');
    test_assert_same(
        ['inc_zzz', 'inc_aaa', 'inc_mmm'],
        array_column($incomes, 'id'),
        'Income must be ordered by physical id, not by client_id.'
    );

    // client_id convertido para id publico, nos tres sets que expoe 'id'.
    test_assert_same('zzz_last', $accounts[0]['id'], 'Accounts id must come from client_id.');
    test_assert_same('inc_zzz', $incomes[0]['id'], 'Income id must come from client_id.');

    $insTx->execute([$uid, 'expense', 'exp_only']);
    $expenses = finance_load_set($db, $uid, 'expense');
    test_assert_same('exp_only', $expenses[0]['id'], 'Expense id must come from client_id.');

    // ifood-entries (income_var) nao expoe 'id' no shape publico.
    $insTx->execute([$uid, 'income_var', 'var_only']);
    $ifood = finance_load_set($db, $uid, 'income_var');
    test_assert_true(
        count($ifood) === 1 && !array_key_exists('id', $ifood[0]),
        'income_var must not expose an id field in the public shape.'
    );

    // Fallback de id quando client_id estiver ausente no payload de entrada:
    // finance_save_set gera um client_id via uniqid() quando 'id' nao vem no
    // registro; finance_load_set deve devolver esse id gerado, nao vazio, e
    // estavel entre leituras.
    $db2 = make_sqlite_finance_db();
    finance_save_set($db2, $uid, 'expense', [
        ['label' => 'Sem id no payload', 'value' => 10.0],
    ]);
    $loadedExpense = finance_load_set($db2, $uid, 'expense');
    test_assert_true(
        is_string($loadedExpense[0]['id']) && $loadedExpense[0]['id'] !== '',
        'Expense without incoming id must fall back to a generated non-empty id.'
    );
    test_assert_same(
        $loadedExpense[0]['id'],
        finance_load_set($db2, $uid, 'expense')[0]['id'],
        'Fallback id must be stable across reads, not regenerated each load.'
    );

    finance_save_set($db2, $uid, 'income', [
        ['label' => 'Sem id no payload', 'value' => 20.0],
    ]);
    $loadedIncome = finance_load_set($db2, $uid, 'income');
    test_assert_true(
        is_string($loadedIncome[0]['id']) && $loadedIncome[0]['id'] !== '',
        'Income without incoming id must fall back to a generated non-empty id.'
    );

    finance_save_set($db2, $uid, 'accounts', [
        ['label' => 'Sem id no payload'],
    ]);
    $loadedAccounts = finance_load_set($db2, $uid, 'accounts');
    test_assert_true(
        is_string($loadedAccounts[0]['id']) && $loadedAccounts[0]['id'] !== '',
        'Account without incoming id must fall back to a generated non-empty id.'
    );
};
