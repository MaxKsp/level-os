<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantLocalInsights.php';

return static function (): void {
    $db = make_sqlite_finance_db();
    $today = level_clock_today();
    $currentDate = $today->format('Y-m-d');
    $previousDate = $today->modify('first day of last month')->format('Y-m-d');
    $insert = $db->prepare('INSERT INTO transactions
        (user_id, kind, client_id, label, value, value_cents, tx_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)');
    $insert->execute([7, 'expense', 'previous-user-7', 'Mercado', 100.0, 10000, $previousDate]);
    $insert->execute([7, 'expense', 'current-user-7', 'Mercado', 135.0, 13500, $currentDate]);
    $insert->execute([8, 'expense', 'other-user', 'Outro usuário', 9999.0, 999900, $currentDate]);

    $items = (new AssistantLocalInsights($db))->forModule(7, 'financeiro');
    test_assert_true(count($items) >= 1, 'Regras locais devem detectar aumento relevante sem chamar IA.');
    test_assert_same('finance-spending-rise', $items[0]['id'] ?? null, 'O insight financeiro deve usar um identificador estável.');
    test_assert_true(str_contains((string)($items[0]['message'] ?? ''), '35%'), 'O cálculo deve comparar apenas os dados do usuário atual.');
    test_assert_same('local_rules', $items[0]['source'] ?? null, 'Insights proativos devem declarar sua origem local e gratuita.');
};
