<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceApi.php';

return function (): void {
    $uid = 51;
    $fixture = test_load_fixture('finance_sets.php');

    // Payload valido: mesmo status/shape do endpoint, para os quatro sets.
    $db = make_sqlite_finance_db();
    foreach (FINANCE_SETS as $kvKey => $set) {
        $raw = json_encode(['key' => $kvKey, 'value' => $fixture[$kvKey]]);
        $result = finance_api_save_set($db, $uid, $raw);
        test_assert_same(200, $result['status'], "Valid payload for $kvKey must return 200.");
        test_assert_same(['ok' => true], $result['body'], "Valid payload for $kvKey must return {ok:true}.");
    }
    test_assert_equals($fixture['expense_lines_v4'], finance_load_set($db, $uid, 'expense'), 'Adapter must persist expense via finance_save_set.');
    test_assert_equals($fixture['accounts_v2'], finance_load_set($db, $uid, 'accounts'), 'Adapter must persist accounts via finance_save_set.');

    // JSON invalido: body vira null, key desconhecida -> mesma mensagem do endpoint atual.
    $invalidJson = finance_api_save_set($db, $uid, 'not json');
    test_assert_same(400, $invalidJson['status'], 'Malformed JSON must return 400.');
    test_assert_same(['error' => 'invalid finance payload'], $invalidJson['body'], 'Malformed JSON must return the invalid payload message.');

    // Key desconhecida (fora de FINANCE_SETS).
    $unknownKey = finance_api_save_set($db, $uid, json_encode(['key' => 'nope', 'value' => []]));
    test_assert_same(400, $unknownKey['status'], 'Unknown key must return 400.');
    test_assert_same(['error' => 'invalid finance payload'], $unknownKey['body'], 'Unknown key must return the invalid payload message.');

    // value nao e array.
    $badValue = finance_api_save_set($db, $uid, json_encode(['key' => 'expense_lines_v4', 'value' => 'nope']));
    test_assert_same(400, $badValue['status'], 'Non-array value must return 400.');
    test_assert_same(['error' => 'invalid finance payload'], $badValue['body'], 'Non-array value must return the invalid payload message.');

    // Mais de 5000 linhas.
    $tooMany = array_fill(0, 5001, ['id' => 'x', 'label' => 'x', 'value' => 1]);
    $tooManyResult = finance_api_save_set($db, $uid, json_encode(['key' => 'expense_lines_v4', 'value' => $tooMany]));
    test_assert_same(400, $tooManyResult['status'], 'More than 5000 rows must return 400.');
    test_assert_same(['error' => 'too many rows'], $tooManyResult['body'], 'More than 5000 rows must return the row-limit message.');

    // Falha na persistencia (erro no banco): 500 com a mesma mensagem atual,
    // e o set anterior permanece intacto (finance_save_set ja garante rollback).
    $dbFail = make_sqlite_finance_db();
    finance_api_save_set($dbFail, $uid, json_encode(['key' => 'accounts_v2', 'value' => [$fixture['accounts_v2'][0]]]));
    $dbFail->exec(
        "CREATE TRIGGER fasst_block BEFORE INSERT ON accounts
         WHEN NEW.limite > 999999 BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );
    $failResult = finance_api_save_set($dbFail, $uid, json_encode([
        'key' => 'accounts_v2',
        'value' => [['id' => 'acc_bad', 'label' => 'Estoura', 'limite' => 9999999]],
    ]));
    test_assert_same(500, $failResult['status'], 'A save failure must return 500.');
    test_assert_same(
        ['error' => 'Não foi possível salvar os dados financeiros.'],
        $failResult['body'],
        'A save failure must return the current error message.'
    );
    test_assert_equals(
        [$fixture['accounts_v2'][0]],
        finance_load_set($dbFail, $uid, 'accounts'),
        'A save failure must not leave the set partially replaced.'
    );

    // O contrato em lote grava todos os sets na mesma transacao. Se o segundo
    // falhar, o primeiro tambem volta ao snapshot anterior.
    $dbBatch = make_sqlite_finance_db();
    $oldExpense = [$fixture['expense_lines_v4'][0]];
    finance_api_save_set($dbBatch, $uid, json_encode(['key' => 'expense_lines_v4', 'value' => $oldExpense]));
    finance_api_save_set($dbBatch, $uid, json_encode(['key' => 'accounts_v2', 'value' => [$fixture['accounts_v2'][0]]]));
    $dbBatch->exec(
        "CREATE TRIGGER fasst_batch_block BEFORE INSERT ON accounts
         WHEN NEW.limite > 999999 BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );
    $batchFailure = finance_api_save_set($dbBatch, $uid, json_encode(['sets' => [
        'expense_lines_v4' => [$fixture['expense_lines_v4'][1]],
        'accounts_v2' => [['id' => 'acc_bad', 'label' => 'Estoura', 'limite' => 9999999]],
    ]]));
    test_assert_same(500, $batchFailure['status'], 'A batch failure must return 500.');
    test_assert_equals($oldExpense, finance_load_set($dbBatch, $uid, 'expense'), 'A failed batch must roll back its first set.');
    test_assert_equals([$fixture['accounts_v2'][0]], finance_load_set($dbBatch, $uid, 'accounts'), 'A failed batch must preserve its second set.');

    $emptyBatch = finance_api_save_set($dbBatch, $uid, json_encode(['sets' => []]));
    test_assert_same(400, $emptyBatch['status'], 'An empty batch must be rejected.');
};
