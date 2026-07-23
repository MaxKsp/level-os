<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/DietPlanCostCalculator.php';

return static function (): void {
    test_assert_same(6_000, DietPlanCostCalculator::totalForPeriod([1_000, 2_000, 3_000], 3), 'Soma um cardápio completo.');
    test_assert_same(12_000, DietPlanCostCalculator::totalForPeriod([1_000, 2_000, 3_000], 6), 'Repete a sequência pelo período solicitado.');
    test_assert_same(7_000, DietPlanCostCalculator::totalForPeriod([1_000, 2_000, 3_000], 3 + 1), 'Usa o primeiro dia ao iniciar um novo ciclo.');

    $error = new DietPlanBudgetExceeded(42_000, 35_000);
    test_assert_same(42_000, $error->estimatedCents, 'Preserva o custo calculado para a correção automática.');
    test_assert_same(35_000, $error->budgetCents, 'Preserva o orçamento para a correção automática.');
};
