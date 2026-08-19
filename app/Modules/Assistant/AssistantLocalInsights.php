<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/finance.php';
require_once dirname(__DIR__) . '/Routine/RoutineService.php';
require_once dirname(__DIR__) . '/Training/TrainingService.php';
require_once dirname(__DIR__) . '/Nutrition/NutritionPlanService.php';
require_once dirname(__DIR__, 2) . '/Core/Clock.php';

final class AssistantLocalInsights {
    public function __construct(private readonly PDO $db) {}

    /** @return list<array<string,mixed>> */
    public function forModule(int $userId, string $module): array {
        if (!in_array($module, ['financeiro', 'agenda', 'treinos', 'alimentacao'], true)) return [];
        try {
            return match ($module) {
                'financeiro' => $this->finance($userId),
                'agenda' => $this->routine($userId),
                'treinos' => $this->training($userId),
                'alimentacao' => $this->nutrition($userId),
            };
        } catch (Throwable $error) {
            error_log('assistant local insight failed (' . get_class($error) . ', module=' . $module . ').');
            return [];
        }
    }

    /** @return list<array<string,mixed>> */
    private function finance(int $userId): array {
        $now = level_clock_today();
        $currentStart = $now->format('Y-m-01');
        $previousStartDate = $now->modify('first day of last month');
        $previousStart = $previousStartDate->format('Y-m-d');
        $elapsedDays = max(0, (int)$now->format('j') - 1);
        $previousEnd = $previousStartDate
            ->modify('+' . $elapsedDays . ' days')
            ->setTime(0, 0);
        $previousMonthEnd = $previousStartDate->modify('last day of this month');
        if ($previousEnd > $previousMonthEnd) $previousEnd = $previousMonthEnd;
        $stmt = $this->db->prepare("SELECT
            COALESCE(SUM(CASE WHEN tx_date BETWEEN ? AND ? THEN value_cents ELSE 0 END), 0) current_total,
            COALESCE(SUM(CASE WHEN tx_date BETWEEN ? AND ? THEN value_cents ELSE 0 END), 0) previous_total
            FROM transactions WHERE user_id = ? AND kind = 'expense' AND tx_date BETWEEN ? AND ?");
        $stmt->execute([
            $currentStart,
            $now->format('Y-m-d'),
            $previousStart,
            $previousEnd->format('Y-m-d'),
            $userId,
            $previousStart,
            $now->format('Y-m-d'),
        ]);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $current = (int)($totals['current_total'] ?? 0);
        $previous = (int)($totals['previous_total'] ?? 0);
        $items = [];
        if ($previous > 0 && $current > (int)round($previous * 1.2)) {
            $change = (int)round((($current - $previous) / $previous) * 100);
            $items[] = $this->item('finance-spending-rise', 'warning', 'Gastos acima da média',
                'Suas despesas estão ' . $change . '% acima do mesmo intervalo do mês anterior.', 'financeiro', '/financeiro?tab=dash');
        }
        foreach (finance_load_set($this->db, $userId, 'accounts') as $account) {
            $limit = fin_money_to_cents($account['limite'] ?? $account['limiteCartao'] ?? 0);
            $invoice = fin_money_to_cents($account['fatura'] ?? 0);
            if ($limit > 0 && $invoice / $limit >= 0.68) {
                $percentage = min(999, (int)round($invoice * 100 / $limit));
                $items[] = $this->item('finance-card-' . substr(hash('sha256', (string)($account['id'] ?? '')), 0, 10),
                    $percentage >= 90 ? 'danger' : 'warning', 'Fatura perto do limite',
                    (string)($account['label'] ?? 'Cartão') . ' já consumiu ' . $percentage . '% do limite.',
                    'financeiro', '/financeiro?tab=contas');
                if (count($items) >= 3) break;
            }
        }
        return $items;
    }

    /** @return list<array<string,mixed>> */
    private function routine(int $userId): array {
        $today = level_clock_today()->format('Y-m-d');
        $overdue = array_values(array_filter(routine_load_tasks($this->db, $userId), static fn(array $task): bool =>
            !($task['completed'] ?? false) && is_string($task['date'] ?? null) && (string)$task['date'] < $today));
        if ($overdue === []) return [];
        return [$this->item('routine-overdue', count($overdue) >= 3 ? 'danger' : 'warning', 'Tarefas atrasadas',
            count($overdue) . ' tarefa(s) passaram da data e ainda estão abertas.', 'agenda', '/agenda')];
    }

    /** @return list<array<string,mixed>> */
    private function training(int $userId): array {
        $snapshot = training_snapshot($this->db, $userId);
        if (($snapshot['workouts'] ?? []) === []) return [];
        $sessions = is_array($snapshot['sessions'] ?? null) ? $snapshot['sessions'] : [];
        $latest = is_array($sessions[0] ?? null) ? (string)($sessions[0]['date'] ?? '') : '';
        $cutoff = level_clock_today()->modify('-7 days')->format('Y-m-d');
        if ($latest !== '' && $latest >= $cutoff) return [];
        return [$this->item('training-interrupted', 'info', 'Retome seu ritmo',
            $latest === '' ? 'Você possui uma ficha, mas ainda não registrou nenhuma sessão.' : 'Seu último treino foi há mais de 7 dias.',
            'treinos', '/treinos')];
    }

    /** @return list<array<string,mixed>> */
    private function nutrition(int $userId): array {
        $plan = nutrition_active_plan($this->db, $userId);
        if (!is_array($plan)) return [];
        $budget = (float)($plan['budgetBRL'] ?? 0);
        $estimated = (float)($plan['estimatedCostBRL'] ?? 0);
        if ($budget <= 0 || $estimated <= $budget * 1.1) return [];
        return [$this->item('nutrition-budget', 'warning', 'Cardápio acima do orçamento',
            'O custo estimado está ' . (int)round((($estimated - $budget) / $budget) * 100) . '% acima da meta informada.',
            'alimentacao', '/alimentacao#nutrition-plan')];
    }

    /** @return array<string,mixed> */
    private function item(string $id, string $severity, string $title, string $message, string $module, string $path): array {
        return ['id'=>$id, 'severity'=>$severity, 'title'=>$title, 'message'=>$message,
            'module'=>$module, 'path'=>$path, 'source'=>'local_rules', 'asOf'=>level_clock_now()->format(DATE_ATOM)];
    }
}
