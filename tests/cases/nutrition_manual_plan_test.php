<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Nutrition/NutritionManualService.php';

return static function (): void {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE kv_store (user_id INTEGER,data_key TEXT,data_value TEXT,PRIMARY KEY(user_id,data_key))');
    $db->exec('CREATE TABLE nutrition_plans (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,version_no INTEGER,status TEXT,goal TEXT,period_days INTEGER,budget_cents INTEGER,estimated_cost_cents INTEGER,payload_json TEXT,source TEXT,replaces_id INTEGER,created_at TEXT,activated_at TEXT,archived_at TEXT,UNIQUE(user_id,client_id),UNIQUE(user_id,version_no))');
    $form = [
        'goal'=>'manutencao', 'periodDays'=>3, 'budgetBRL'=>70.0,
        'estimatedCostBRL'=>999999.0, 'manualDraftId'=>'md_unique_manual_draft_00001',
        'expectedActivePlanId'=>null, 'replaceConfirmed'=>false,
        'days'=>[
            ['day'=>1,'meals'=>[['name'=>'Café','description'=>'Pão e fruta','estimatedCostBRL'=>10.25]]],
            ['day'=>2,'meals'=>[['name'=>'Almoço','description'=>'Arroz e feijão','estimatedCostBRL'=>21.50]]],
        ],
        'shoppingList'=>[['item'=>'Fruta','quantity'=>'3 unidades','category'=>'hortifruti']],
    ];
    $first = nutrition_save_manual_plan($db, 19, $form);
    test_assert_same('manual', $first['source'] ?? null, 'Manual plan must record manual source.');
    test_assert_same(4200, (int)round((float)($first['estimatedCostBRL'] ?? -1) * 100), 'Backend must compute period cost, ignoring client estimate.');
    test_assert_same(1, (int)$db->query('SELECT COUNT(*) FROM nutrition_plans')->fetchColumn(), 'First save creates one version.');
    $retry = nutrition_save_manual_plan($db, 19, $form);
    test_assert_same($first['id'], $retry['id'], 'Lost response/retry must return same active version.');
    test_assert_same(1, (int)$db->query('SELECT COUNT(*) FROM nutrition_plans')->fetchColumn(), 'Retry cannot create duplicates.');

    $replacement = $form;
    $replacement['manualDraftId'] = 'md_unique_manual_draft_00002';
    $replacement['expectedActivePlanId'] = $first['id'];
    $requiresConfirmation = false;
    try { nutrition_save_manual_plan($db, 19, $replacement); }
    catch (InvalidArgumentException) { $requiresConfirmation = true; }
    test_assert_true($requiresConfirmation, 'Replacing an active plan requires explicit confirmation.');
    $replacement['replaceConfirmed'] = true;
    $second = nutrition_save_manual_plan($db, 19, $replacement);
    test_assert_same(2, $second['version'] ?? null, 'Manual replacement creates an archived version.');
    test_assert_same($first['id'], nutrition_plan_snapshot($db, 19)['history'][0]['id'] ?? null, 'Prior version remains restorable.');
    test_assert_same(null, nutrition_active_plan($db, 20), 'User isolation must hold.');

    $stale = $replacement;
    $stale['manualDraftId'] = 'md_unique_manual_draft_00003';
    $stale['expectedActivePlanId'] = $first['id'];
    $conflict = false;
    try { nutrition_save_manual_plan($db, 19, $stale); }
    catch (NutritionManualConflictException) { $conflict = true; }
    test_assert_true($conflict, 'Old tab must not overwrite a newer active version.');
    $cases = [
        array_replace($form, ['periodDays'=>31]),
        array_replace($form, ['budgetBRL'=>'50']),
        array_replace($form, ['days'=>[['day'=>2,'meals'=>$form['days'][0]['meals']]]]),
        array_replace($form, ['days'=>[['day'=>1,'meals'=>[]]]]),
        array_replace($form, ['days'=>[['day'=>1,'meals'=>[['name'=>' ', 'description'=>'x','estimatedCostBRL'=>12]]]]]),
        array_replace($form, ['days'=>[['day'=>1,'meals'=>[['name'=>'Café','description'=>'x','estimatedCostBRL'=>12.345]]]]]),
        array_replace($form, ['shoppingList'=>[['item'=>'Fruta','quantity'=>'5','category'=>'unknown']]]),
    ];
    foreach ($cases as $invalid) {
        $caught = false;
        try { nutrition_validate_manual_plan($invalid); }
        catch (InvalidArgumentException) { $caught = true; }
        test_assert_true($caught, 'Malformed manual plan must be rejected.');
    }
    test_assert_same(2, (int)$db->query('SELECT COUNT(*) FROM nutrition_plans')->fetchColumn(), 'Invalid/conflicting requests must not create versions.');
};
