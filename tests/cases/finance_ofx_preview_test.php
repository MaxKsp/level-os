<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceOfxPreview.php';

return function (): void {
    $uid = 401;
    $ofx = file_get_contents(test_repo_root() . '/tests/fixtures/sample.ofx');
    test_assert_true($ofx !== false, 'Sample OFX fixture must be readable.');

    // OFX valido: duas linhas normalizadas, sem dup (nada persistido ainda).
    $db = make_sqlite_finance_db();
    $result = finance_ofx_preview($db, $uid, $ofx);
    test_assert_same(200, $result['status'], 'A valid OFX file must return 200.');
    test_assert_same(['ok' => true], ['ok' => $result['body']['ok']], 'A valid OFX file must return ok:true.');
    test_assert_same(2, count($result['body']['rows']), 'A valid OFX file must produce two rows.');
    test_assert_equals(
        ['date' => '2026-07-10', 'value' => 54.90, 'kind' => 'expense', 'desc' => 'Mercado Central', 'fitid' => 'OFX001', 'dup' => false],
        $result['body']['rows'][0],
        'Row shape must include date, value, kind, desc, fitid and dup.'
    );
    test_assert_equals(
        ['date' => '2026-07-11', 'value' => 1200.00, 'kind' => 'income', 'desc' => 'Pagamento cliente XPTO', 'fitid' => 'OFX002', 'dup' => false],
        $result['body']['rows'][1],
        'Row shape must include date, value, kind, desc, fitid and dup.'
    );

    // Duplicated FITID inside a single bank file must not import twice.
    $repeatOfx = '<OFX><STMTTRN><DTPOSTED>20260715<TRNAMT>-20<FITID>SAME</STMTTRN>'
        . '<STMTTRN><DTPOSTED>20260715<TRNAMT>-30<FITID>SAME</STMTTRN></OFX>';
    $repeatPreview = finance_ofx_preview($db, $uid, $repeatOfx);
    test_assert_same(false, $repeatPreview['body']['rows'][0]['dup'], 'First occurrence must remain selectable.');
    test_assert_same(true, $repeatPreview['body']['rows'][1]['dup'], 'Repeated FITID in one import must be marked as duplicate.');

    // Arquivo invalido -> 400, com a mensagem atual do parser.
    $invalid = finance_ofx_preview($db, $uid, 'nao e um arquivo ofx');
    test_assert_same(400, $invalid['status'], 'An invalid file must return 400.');
    test_assert_equals(['error' => 'arquivo não parece ser OFX'], $invalid['body'], 'An invalid file must return the current parser error.');

    // Income imported from OFX lives in income_var; opposite direction is not duplicate.
    $directionDb = make_sqlite_finance_db();
    finance_save_set($directionDb, $uid, 'income_var', [
        ['id' => 'inc_ofx_1', 'label' => 'Credito importado', 'valor' => 54.90, 'date' => '2026-07-10'],
        ['id' => 'inc_ofx_2', 'label' => 'Credito repetido', 'valor' => 1200.00, 'date' => '2026-07-11'],
    ]);
    $directionPreview = finance_ofx_preview($directionDb, $uid, $ofx);
    test_assert_same(false, $directionPreview['body']['rows'][0]['dup'], 'An income must not hide an expense with the same date and value.');
    test_assert_same(true, $directionPreview['body']['rows'][1]['dup'], 'A previously imported variable income must be recognized on reimport.');

    // Marcacao de dup: ja existe uma despesa com o mesmo (date,value) do 1o lancamento.
    finance_save_set($db, $uid, 'expense', [
        ['id' => 'exp_existing', 'label' => 'Ja lancado', 'value' => 54.90, 'date' => '2026-07-10'],
    ]);
    $dupResult = finance_ofx_preview($db, $uid, $ofx);
    test_assert_same(true, $dupResult['body']['rows'][0]['dup'], 'A matching (date,value) must be marked as a probable duplicate.');
    test_assert_same(false, $dupResult['body']['rows'][1]['dup'], 'A non-matching row must not be marked as duplicate.');

    // Preview nunca grava no banco: so a insercao explicita acima (1 despesa,
    // 0 rendas) deve existir; os tres previews rodados nao mudaram nada.
    test_assert_same(1, count(finance_load_set($db, $uid, 'expense')), 'Preview must never write to the expense set.');
    test_assert_same(0, count(finance_load_set($db, $uid, 'income')), 'Preview must never write to the income set.');
    test_assert_same(0, count(finance_load_set($db, $uid, 'income_var')), 'Preview must never write to any relational set.');
    test_assert_same(0, count(finance_load_set($db, $uid, 'accounts')), 'Preview must never write to any relational set.');
};
