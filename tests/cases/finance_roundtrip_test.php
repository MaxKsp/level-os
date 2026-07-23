<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

return function (): void {
    $db = make_sqlite_finance_db();
    $uid = 7;
    $fixture = test_load_fixture('finance_sets.php');

    finance_save_set($db, $uid, 'expense', $fixture['expense_lines_v4']);
    finance_save_set($db, $uid, 'income', $fixture['income_lines']);
    finance_save_set($db, $uid, 'income_var', $fixture['ifood-entries']);
    finance_save_set($db, $uid, 'accounts', $fixture['accounts_v2']);

    test_assert_equals(
        $fixture['expense_lines_v4'],
        finance_load_set($db, $uid, 'expense'),
        'Expense round-trip must preserve current public shape.'
    );
    test_assert_equals(
        $fixture['income_lines'],
        finance_load_set($db, $uid, 'income'),
        'Income round-trip must preserve current public shape.'
    );
    test_assert_equals(
        $fixture['ifood-entries'],
        finance_load_set($db, $uid, 'income_var'),
        'Income var round-trip must preserve current public shape.'
    );
    test_assert_equals(
        $fixture['accounts_v2'],
        finance_load_set($db, $uid, 'accounts'),
        'Accounts round-trip must preserve current public shape.'
    );

    $replacement = [$fixture['expense_lines_v4'][1]];
    finance_save_set($db, $uid, 'expense', $replacement);
    test_assert_equals(
        $replacement,
        finance_load_set($db, $uid, 'expense'),
        'Saving a set must replace the full previous set.'
    );
};
