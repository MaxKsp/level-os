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
};
