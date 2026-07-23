<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

return function (): void {
    $db = make_sqlite_finance_db();
    $uid = 11;
    $fixture = test_load_fixture('finance_sets.php');

    $ins = $db->prepare(
        'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)'
    );
    foreach (FINANCE_SETS as $kvKey => $set) {
        $ins->execute([$uid, $kvKey, json_encode($fixture[$kvKey])]);
    }

    finance_migrate_if_needed($db, $uid);

    test_assert_equals(
        $fixture['expense_lines_v4'],
        finance_load_set($db, $uid, 'expense'),
        'Migration must populate expense set from kv.'
    );
    test_assert_equals(
        $fixture['income_lines'],
        finance_load_set($db, $uid, 'income'),
        'Migration must populate income set from kv.'
    );
    test_assert_equals(
        $fixture['ifood-entries'],
        finance_load_set($db, $uid, 'income_var'),
        'Migration must populate income_var set from kv.'
    );
    test_assert_equals(
        $fixture['accounts_v2'],
        finance_load_set($db, $uid, 'accounts'),
        'Migration must populate accounts set from kv.'
    );

    $flagStmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $flagStmt->execute([$uid, '_finance_migrated']);
    test_assert_true((bool)$flagStmt->fetch(), 'Migration must create the _finance_migrated flag.');

    $originalCount = (int)$db->query('SELECT COUNT(*) FROM transactions')->fetchColumn();

    $db->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')
        ->execute([json_encode([]), $uid, 'expense_lines_v4']);

    finance_migrate_if_needed($db, $uid);

    $afterCount = (int)$db->query('SELECT COUNT(*) FROM transactions')->fetchColumn();
    test_assert_same(
        $originalCount,
        $afterCount,
        'Migration must be idempotent after the flag is set.'
    );
};
