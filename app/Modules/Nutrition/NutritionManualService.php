<?php
declare(strict_types=1);

require_once __DIR__ . '/NutritionPlanService.php';
require_once dirname(__DIR__) . '/Assistant/DietPlanCostCalculator.php';

final class NutritionManualConflictException extends RuntimeException {}

function nutrition_manual_text(mixed $raw, int $maximum, string $label, bool $required = true): string {
    if (!is_string($raw)) throw new InvalidArgumentException($label . ': informe um texto.');
    $text = trim($raw);
    if (($required && $text === '') || mb_strlen($text, 'UTF-8') > $maximum) {
        throw new InvalidArgumentException($label . ': revise o conteúdo (até ' . $maximum . ' caracteres).');
    }
    return $text;
}

function nutrition_manual_cents(mixed $raw, string $label): int {
    if (!is_int($raw) && !is_float($raw)) throw new InvalidArgumentException($label . ': informe um valor numérico.');
    $number = (float)$raw;
    if (!is_finite($number) || $number < 0 || $number > 1000000 || abs($number * 100 - round($number * 100)) > 0.00001) {
        throw new InvalidArgumentException($label . ': use um valor de 0 até 1.000.000, com no máximo 2 casas decimais.');
    }
    return (int)round($number * 100);
}

/** @param array<string,mixed> $input @return array<string,mixed> */
function nutrition_validate_manual_plan(array $input): array {
    $goal = $input['goal'] ?? null;
    if (!in_array($goal, ['emagrecimento', 'hipertrofia', 'manutencao'], true)) throw new InvalidArgumentException('Selecione um objetivo válido.');
    $period = $input['periodDays'] ?? null;
    if (!is_int($period) || $period < 1 || $period > 30) throw new InvalidArgumentException('Informe um período entre 1 e 30 dias.');
    $budget = nutrition_manual_cents($input['budgetBRL'] ?? null, 'Orçamento');
    $templateDays = $input['days'] ?? null;
    if (!is_array($templateDays) || !array_is_list($templateDays) || count($templateDays) < 1 || count($templateDays) > $period) {
        throw new InvalidArgumentException('Cadastre de 1 até o número de dias do período.');
    }
    $dailyCosts = [];
    $days = [];
    foreach ($templateDays as $index => $entry) {
        if (!is_array($entry) || ($entry['day'] ?? null) !== $index + 1 || !is_array($entry['meals'] ?? null)
            || !array_is_list($entry['meals']) || count($entry['meals']) < 1 || count($entry['meals']) > 8) {
            throw new InvalidArgumentException('Cada dia precisa ter entre 1 e 8 refeições e numeração sequencial.');
        }
        $cost = 0; $meals = [];
        foreach ($entry['meals'] as $meal) {
            if (!is_array($meal)) throw new InvalidArgumentException('Dados da refeição inválidos.');
            $mealCents = nutrition_manual_cents($meal['estimatedCostBRL'] ?? null, 'Custo da refeição');
            $meals[] = [
                'name'=>nutrition_manual_text($meal['name'] ?? null, 64, 'Nome da refeição'),
                'description'=>nutrition_manual_text($meal['description'] ?? null, 500, 'Descrição', false),
                'estimatedCostBRL'=>$mealCents / 100,
            ];
            $cost += $mealCents;
        }
        $days[] = ['day'=>$index + 1, 'meals'=>$meals];
        $dailyCosts[] = $cost;
    }
    $categories = ['hortifruti', 'proteina', 'mercearia', 'laticinios', 'padaria', 'bebidas', 'outros'];
    $shopping = $input['shoppingList'] ?? [];
    if (!is_array($shopping) || !array_is_list($shopping) || count($shopping) > 80) {
        throw new InvalidArgumentException('A lista de compras permite até 80 ingredientes.');
    }
    $normalizedShopping = [];
    foreach ($shopping as $ingredient) {
        if (!is_array($ingredient) || !in_array($ingredient['category'] ?? null, $categories, true)) {
            throw new InvalidArgumentException('Ingrediente ou categoria inválida.');
        }
        $normalizedShopping[] = [
            'item'=>nutrition_manual_text($ingredient['item'] ?? null, 64, 'Ingrediente'),
            'quantity'=>nutrition_manual_text($ingredient['quantity'] ?? null, 32, 'Quantidade'),
            'category'=>$ingredient['category'],
        ];
    }
    $draftId = $input['manualDraftId'] ?? null;
    if (!is_string($draftId) || preg_match('/\Amd_[a-zA-Z0-9_-]{8,80}\z/D', $draftId) !== 1) {
        throw new InvalidArgumentException('Identificador do rascunho inválido.');
    }
    $total = DietPlanCostCalculator::totalForPeriod($dailyCosts, $period);
    if ($total > 100000000) throw new InvalidArgumentException('Custo total muito elevado.');
    return [
        'goal'=>$goal, 'periodDays'=>$period, 'budgetBRL'=>$budget / 100,
        'estimatedCostBRL'=>$total / 100, 'days'=>$days, 'shoppingList'=>$normalizedShopping,
        'manualDraftId'=>$draftId, 'createdAt'=>level_clock_now()->format(DATE_ATOM), 'source'=>'manual',
    ];
}

/** @param array<string,mixed> $payload @return array<string,mixed> */
function nutrition_save_manual_plan(PDO $db, int $userId, array $payload): array {
    $expected = $payload['expectedActivePlanId'] ?? null;
    if (!array_key_exists('expectedActivePlanId', $payload) || ($expected !== null && (!is_string($expected)
        || preg_match('/\Anp_[a-f0-9]{20,29}\z/D', $expected) !== 1))) {
        throw new InvalidArgumentException('Atualize o plano antes de salvar.');
    }
    $plan = nutrition_validate_manual_plan($payload);
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $current = nutrition_active_plan($db, $userId);
        if (($current['manualDraftId'] ?? null) === $plan['manualDraftId']) {
            if ($own) $db->commit();
            return $current; // Repetição após resposta perdida: não criar versão duplicada.
        }
        $activeId = is_string($current['id'] ?? null) ? $current['id'] : null;
        if ($activeId !== $expected) {
            throw new NutritionManualConflictException('O plano ativo mudou. Atualize a página antes de salvar.');
        }
        if ($current !== null && ($payload['replaceConfirmed'] ?? null) !== true) {
            throw new InvalidArgumentException('Confirme a substituição do plano atual.');
        }
        $result = nutrition_activate_plan($db, $userId, $plan, 'manual')['plan'];
        if ($own) $db->commit();
        return $result;
    } catch (Throwable $error) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $error;
    }
}
