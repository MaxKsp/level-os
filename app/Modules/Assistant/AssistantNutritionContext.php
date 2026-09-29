<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/Nutrition/NutritionPlanService.php';
require_once dirname(__DIR__) . '/Nutrition/NutritionWorkspaceService.php';

/**
 * Contexto explícito e mínimo da Rita. Não carrega informações financeiras,
 * sessões de treino, perfil clínico, outras contas nem localStorage do browser.
 */
final class AssistantNutritionContext {
    public function __construct(private readonly PDO $db) {}

    /** @return array<string,mixed> */
    public function forUser(int $userId): array {
        $snapshot = nutrition_plan_snapshot($this->db, $userId);
        $active = is_array($snapshot['plan'] ?? null) ? $snapshot['plan']
            : (is_array($snapshot['active'] ?? null) ? $snapshot['active'] : null);
        $context = [
            'asOf' => level_clock_today()->format('Y-m-d'),
            'source' => 'Level OS: banco de dados, usuário autenticado',
            'planStatus' => $active === null ? 'no_active_plan' : 'active',
            'actualMealsAndPurchases' => 'Dados reais: usar somente registros voluntários sincronizados; carrinho não comprova pagamento',
            'marketPrices' => 'unavailable: custos do plano são estimativas declaradas, não cotações reais',
        ];
        $context['previousVersions'] = array_map(static fn(array $item): array => [
            'version'=>(int)($item['version'] ?? 0),
            'goal'=>mb_substr((string)($item['goal'] ?? ''), 0, 50),
            'source'=>mb_substr((string)($item['source'] ?? ''), 0, 20),
        ], array_slice(is_array($snapshot['history'] ?? null) ? $snapshot['history'] : [], 0, 5));
        $context['workspace'] = $this->sharedWorkspace($userId, $active);
        if ($active === null) return $context + ['plan'=>null];
        $days = [];
        foreach (array_slice(is_array($active['days'] ?? null) ? $active['days'] : [], 0, 30) as $day) {
            if (!is_array($day)) continue;
            $meals = [];
            foreach (array_slice(is_array($day['meals'] ?? null) ? $day['meals'] : [], 0, 8) as $meal) {
                if (!is_array($meal)) continue;
                $meals[] = [
                    'name' => mb_substr((string)($meal['name'] ?? ''), 0, 64),
                    'description' => mb_substr((string)($meal['description'] ?? ''), 0, 200),
                    'estimatedCostBRL' => is_numeric($meal['estimatedCostBRL'] ?? null)
                        ? round((float)$meal['estimatedCostBRL'], 2) : null,
                ];
            }
            $days[] = ['day'=>(int)($day['day'] ?? count($days) + 1), 'meals'=>$meals];
        }
        $shopping = [];
        foreach (array_slice(is_array($active['shoppingList'] ?? null) ? $active['shoppingList'] : [], 0, 80) as $item) {
            if (!is_array($item)) continue;
            $shopping[] = [
                'item'=>mb_substr((string)($item['item'] ?? ''), 0, 64),
                'quantity'=>mb_substr((string)($item['quantity'] ?? ''), 0, 32),
                'category'=>mb_substr((string)($item['category'] ?? ''), 0, 30),
            ];
        }
        $context['plan'] = [
            'version'=>(int)($active['version'] ?? 0),
            'source'=>in_array($active['source'] ?? null, ['manual','assistant'], true) ? $active['source'] : 'legacy',
            'goal'=>mb_substr((string)($active['goal'] ?? ''), 0, 50),
            'periodDays'=>(int)($active['periodDays'] ?? 0),
            'budgetBRL'=>is_numeric($active['budgetBRL'] ?? null) ? (float)$active['budgetBRL'] : null,
            'estimatedCostBRL'=>is_numeric($active['estimatedCostBRL'] ?? null) ? (float)$active['estimatedCostBRL'] : null,
            'days'=>$days, 'shoppingList'=>$shopping,
        ];
        return $context;
    }
    /** Additional information is shared with the model only by explicit user opt-in. */
    private function sharedWorkspace(int $uid, ?array $active): array {
        $ws = (new NutritionWorkspaceService($this->db))->load($uid);
        $prefs = is_array($ws['preferences'] ?? null) ? $ws['preferences'] : [];
        if (($prefs['shareWithRita'] ?? false) !== true) {
            return ['sharing'=>'disabled', 'message'=>'Memória, despensa, diário e compras privados até autorização na aba Preferências.'];
        }
        $planId = is_array($active) ? (string)($active['id'] ?? 'legacy') : null;
        return ['sharing'=>'enabled', 'selfReported'=>true,
            'preferences'=>['favorites'=>array_slice($prefs['favorites'] ?? [], 0, 24),
                'avoids'=>array_slice($prefs['avoids'] ?? [], 0, 24),
                'notes'=>mb_substr((string)($prefs['notes'] ?? ''),0,500),
                'prepMinutes'=>(int)($prefs['prepMinutes'] ?? 30)],
            'pantry'=>array_slice($ws['pantry'] ?? [], 0, 60),
            'recipes'=>array_map(static fn(array $r): array => [
                'title'=>$r['title'], 'prepMinutes'=>$r['prepMinutes'], 'portions'=>$r['portions'],
                'ingredients'=>array_slice($r['ingredients'] ?? [],0,24),
            ], array_slice($ws['recipes'] ?? [],0,15)),
            'diary'=>array_slice($ws['diary'] ?? [], -20),
            'confirmedManualPurchases'=>array_slice($ws['purchases'] ?? [], -20),
            'familyPortionTotal'=>array_sum(array_column($ws['family'] ?? [], 'portionFactor')),
            'mealCheckins'=>$planId === null ? [] : ($ws['mealChecks'][$planId] ?? []),
            'cartNotPayment'=>$planId === null ? [] : ($ws['cartChecks'][$planId] ?? []),
            'limitations'=>'Registros declarados pelo próprio usuário; carrinho não comprova compra nem refeição marcada comprova ingestão.'];
    }
}
