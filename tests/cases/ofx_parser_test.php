<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return function (): void {
    $ofx = file_get_contents(test_repo_root() . '/tests/fixtures/sample.ofx');
    test_assert_true($ofx !== false, 'Sample OFX fixture must be readable.');

    $parsed = parse_ofx($ofx);

    test_assert_true($parsed['ok'] === true, 'OFX parser must accept the sample fixture.');
    test_assert_same(2, count($parsed['rows']), 'Sample OFX must produce two normalized rows.');

    test_assert_equals(
        [
            'date' => '2026-07-10',
            'value' => 54.90,
            'kind' => 'expense',
            'desc' => 'Mercado Central',
            'fitid' => 'OFX001',
        ],
        $parsed['rows'][0],
        'First OFX row must match current normalization rules.'
    );

    test_assert_equals(
        [
            'date' => '2026-07-11',
            'value' => 1200.00,
            'kind' => 'income',
            'desc' => 'Pagamento cliente XPTO',
            'fitid' => 'OFX002',
        ],
        $parsed['rows'][1],
        'Second OFX row must match current normalization rules.'
    );
    // Regressao: TRNAMT com separador de milhar nao pode virar centavos (-1.234,56 chegava como 1.23).
    $amountCases = [
        ['-1234.56', 1234.56, 'expense'],
        ['-1234,56', 1234.56, 'expense'],
        ['-1.234,56', 1234.56, 'expense'],
        ['-1,234.56', 1234.56, 'expense'],
        ['1.234.567,89', 1234567.89, 'income'],
        ['2.500', 2.5, 'income'],
        ['1.234.567', 1234567.0, 'income'],
        ['1200', 1200.0, 'income'],
    ];
    foreach ($amountCases as [$rawAmount, $expectedValue, $expectedKind]) {
        $case = parse_ofx("<OFX><STMTTRN><TRNTYPE>X<DTPOSTED>20260710<TRNAMT>$rawAmount<FITID>A1<NAME>Teste</STMTTRN></OFX>");
        test_assert_true($case['ok'] === true, "OFX TRNAMT $rawAmount must parse.");
        test_assert_same($expectedValue, $case['rows'][0]['value'], "OFX TRNAMT $rawAmount must keep its magnitude.");
        test_assert_same($expectedKind, $case['rows'][0]['kind'], "OFX TRNAMT $rawAmount must keep its sign.");
    }

    // Fixture compartilhada com frontend/src/modules/finance/ofx.test.ts: os dois parsers devem concordar.
    $milhar = parse_ofx((string)file_get_contents(test_repo_root() . '/tests/fixtures/milhar.ofx'));
    test_assert_true($milhar['ok'] === true, 'Thousands OFX fixture must parse.');
    test_assert_same(
        [['MIL001', 1234.56, 'expense'], ['MIL002', 1234567.89, 'income'], ['MIL003', 1234.56, 'expense'], ['MIL005', 0.05, 'expense']],
        array_map(static fn(array $row): array => [$row['fitid'], $row['value'], $row['kind']], $milhar['rows']),
        'Thousands OFX fixture must keep cents and sign, and drop the trailing-minus TRNAMT.'
    );
    test_assert_same(
        ['ok' => false, 'error' => 'nenhum lançamento válido no arquivo'],
        parse_ofx('<OFX><STMTTRN><DTPOSTED>20260710<TRNAMT>abc<FITID>X</STMTTRN></OFX>'),
        'A TRNAMT without digits must not become a zero-value row.'
    );
};
