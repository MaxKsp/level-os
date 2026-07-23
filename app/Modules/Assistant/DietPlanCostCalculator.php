<?php
declare(strict_types=1);

final class DietPlanBudgetExceeded extends InvalidArgumentException {
    public function __construct(
        public readonly int $estimatedCents,
        public readonly int $budgetCents,
    ) {
        parent::__construct('Plano estimado acima do orçamento informado.');
    }
}

final class DietPlanCostCalculator {
    /** @param list<int> $dailyCostsCents */
    public static function totalForPeriod(array $dailyCostsCents, int $periodDays): int {
        if ($dailyCostsCents === [] || $periodDays < 1) {
            throw new InvalidArgumentException('Período ou cardápio inválido.');
        }

        $total = 0;
        $dayCount = count($dailyCostsCents);
        for ($day = 0; $day < $periodDays; $day++) {
            $cost = $dailyCostsCents[$day % $dayCount] ?? -1;
            if (!is_int($cost) || $cost < 0) {
                throw new InvalidArgumentException('Custo diário inválido.');
            }
            $total += $cost;
        }
        return $total;
    }
}
