<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Finance/FinanceAuxiliaryKv.php';

/**
 * Contrato servidor de bank_favorites: o mesmo que o app web aplica em
 * toggleFavoriteBank/loadFinanceBootstrap (lista de ate cinco nomes de banco),
 * agora tambem exigido no POST /api/data.php para nao depender so do cliente.
 */
return function (): void {
    test_assert_true(
        function_exists('finance_bank_favorites_normalize'),
        'finance_bank_favorites_normalize must exist to validate bank_favorites server-side.'
    );

    // Valores que os clientes atuais enviam continuam aceitos sem alteracao.
    test_assert_same([], finance_bank_favorites_normalize([]), 'An empty list is valid.');
    test_assert_same(['Nubank', 'Inter'], finance_bank_favorites_normalize(['Nubank', 'Inter']), 'Catalog names must round-trip unchanged.');
    $five = ['Nubank', 'Inter', 'Itaú', 'Banco do Brasil', 'Caixa Econômica Federal'];
    test_assert_same($five, finance_bank_favorites_normalize($five), 'Five favorites is the limit and must pass.');
    $longest = str_repeat('Á', FINANCE_BANK_FAVORITE_MAX_CHARS);
    test_assert_same([$longest], finance_bank_favorites_normalize([$longest]), 'Names up to the char limit (multibyte) must pass.');

    // Normalizacao: espacos nas pontas e duplicatas (sem diferenciar caixa).
    test_assert_same(
        ['Nubank', 'Inter'],
        finance_bank_favorites_normalize(['  Nubank ', 'Inter', 'NUBANK']),
        'Names must be trimmed and case-insensitive duplicates dropped.'
    );

    // Formatos invalidos sao rejeitados (null => api/data.php responde 400).
    $invalid = [
        'string em vez de lista' => 'Nubank',
        'objeto em vez de lista' => ['a' => 'Nubank'],
        'null' => null,
        'numero' => 42,
        'mais de cinco' => ['A', 'B', 'C', 'D', 'E', 'F'],
        'item nao string' => ['Nubank', 7],
        'item lista aninhada' => [['Nubank']],
        'item vazio' => ['Nubank', '   '],
        'item longo demais' => [str_repeat('x', FINANCE_BANK_FAVORITE_MAX_CHARS + 1)],
        'caractere de controle' => ["Nu\u{0000}bank"],
        'quebra de linha' => ["Nu\nbank"],
        'UTF-8 invalido' => ["Nu\xC3bank"],
    ];
    foreach ($invalid as $label => $value) {
        test_assert_same(null, finance_bank_favorites_normalize($value), "bank_favorites must reject: $label.");
    }

    // O endpoint valida antes de gravar e devolve 400 quando invalido.
    $endpoint = (string)file_get_contents(dirname(__DIR__, 2) . '/api/data.php');
    test_assert_true(
        str_contains($endpoint, "finance_bank_favorites_normalize(\$body['value'])"),
        'api/data.php must validate bank_favorites before saving it.'
    );
};
