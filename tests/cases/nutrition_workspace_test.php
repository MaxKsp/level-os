<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Nutrition/NutritionWorkspaceService.php';
return static function (): void {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE kv_store (user_id INTEGER NOT NULL, data_key TEXT NOT NULL, data_value TEXT NOT NULL, PRIMARY KEY(user_id,data_key))');
    $db->exec('CREATE TABLE nutrition_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, client_id TEXT, version_no INTEGER,
        status TEXT, goal TEXT, period_days INTEGER, budget_cents INTEGER, estimated_cost_cents INTEGER,
        payload_json TEXT, source TEXT, replaces_id INTEGER, created_at TEXT, activated_at TEXT, archived_at TEXT,
        UNIQUE(user_id,client_id), UNIQUE(user_id,version_no))');
    $plan = ['goal'=>'manutencao','periodDays'=>2,'budgetBRL'=>100,'estimatedCostBRL'=>80,
        'days'=>[['day'=>1,'meals'=>[['name'=>'Almoço','description'=>'Frango e arroz','estimatedCostBRL'=>12]]]],
        'shoppingList'=>[['item'=>'Frango','quantity'=>'1 kg','category'=>'proteina']]];
    $active = nutrition_activate_plan($db,7,$plan)['plan'];
    nutrition_activate_plan($db,8,$plan);
    $service = new NutritionWorkspaceService($db);
    test_assert_same(0, $service->load(7)['revision'], 'Default workspace needs no migration.');
    $saved = $service->save(7, ['operation'=>'save_preferences','revision'=>0,'preferences'=>[
        'favorites'=>['Arroz','Feijão'],'avoids'=>['Cebola'],'notes'=>'Preparo rápido',
        'prepMinutes'=>30,'shareWithRita'=>true]]);
    test_assert_same(1,$saved['revision'],'Version increments for every successful mutation.');
    test_assert_same(false,$service->load(8)['preferences']['shareWithRita'],'Second account must be isolated.');
    $conflict = false;
    try { $service->save(7, ['operation'=>'save_pantry','revision'=>0,'items'=>[]]); }
    catch (NutritionWorkspaceConflict) { $conflict=true; }
    test_assert_true($conflict,'Stale writes must not overwrite another device.');
    $saved = $service->save(7,['operation'=>'save_pantry','revision'=>1,'items'=>[
        ['id'=>'p1','name'=>'Frango','quantity'=>1.5,'unit'=>'kg','category'=>'proteina','expiresOn'=>'2026-10-03']]]);
    test_assert_same('Frango',$saved['pantry'][0]['name'],'Pantry entries are saved with exact numeric units.');
    $saved = $service->save(7,['operation'=>'save_diary','revision'=>2,'items'=>[
        ['id'=>'d1','date'=>'2026-09-29','title'=>'Almoço','portion'=>'1 prato','note'=>'Com legumes']]]);
    $saved = $service->save(7,['operation'=>'save_purchases','revision'=>3,'items'=>[
        ['id'=>'c1','date'=>'2026-09-29','description'=>'Mercado','amountBRL'=>45.90,'category'=>'mercado']]]);
    test_assert_same(45.9,$saved['purchases'][0]['amountBRL'],'Real purchase amounts are user-entered and normalized.');
    $saved = $service->save(7,['operation'=>'mark_meal','revision'=>4,'planId'=>$active['id'],'slot'=>'1:0','status'=>'consumed']);
    test_assert_same('consumed',$saved['mealChecks'][$active['id']]['1:0'],'Check-ins are scoped to active plan.');
    $saved = $service->save(7,['operation'=>'mark_cart','revision'=>5,'planId'=>$active['id'],'index'=>0,'inCart'=>true]);
    test_assert_true($saved['cartChecks'][$active['id']]['0'],'Cart means in cart, never proof of payment.');
    $saved = $service->save(7,['operation'=>'save_family','revision'=>6,'items'=>[
        ['id'=>'f1','label'=>'Pessoa 1','portionFactor'=>1.2]]]);
    test_assert_same(1.2,$saved['family'][0]['portionFactor'],'Family portion factors validated.');
    $rejected = false;
    try { $service->save(7,['operation'=>'mark_meal','revision'=>7,'planId'=>$active['id'],'slot'=>'9:9','status'=>'consumed']); }
    catch (InvalidArgumentException) { $rejected = true; }
    test_assert_true($rejected, 'Invalid meal slots rejected.');
    test_assert_same(7, $service->load(7)['revision'], 'Invalid mutation does not increment revision.');
    $rejected = false;
    try { $service->save(7,['operation'=>'mark_cart','revision'=>7,'planId'=>'np_wrong','index'=>0,'inCart'=>true]); }
    catch (NutritionWorkspaceConflict) { $rejected = true; }
    test_assert_true($rejected, 'Stale plan cannot be changed.');
    $saved = $service->save(7,['operation'=>'import_legacy','revision'=>7,'planId'=>$active['id'],
        'mealChecks'=>['1:0'=>'skipped'],'cartIndices'=>[0]]);
    test_assert_same('consumed',$saved['mealChecks'][$active['id']]['1:0'],'Legacy import cannot replace synchronized data.');
    test_assert_same(0,count($service->load(8)['diary']),'Other user records remain isolated.');
    // Edição e baixa usam o mesmo identificador, sob revisão otimista da conta.
    $saved = $service->save(7,['operation'=>'save_pantry','revision'=>8,'items'=>[
        ['id'=>'p1','name'=>'Frango','quantity'=>1,'unit'=>'kg','category'=>'proteina','expiresOn'=>'2026-10-03']]]);
    test_assert_same('p1',$saved['pantry'][0]['id'],'Consumption never creates a duplicate stock row.');
    test_assert_same(1.0,$saved['pantry'][0]['quantity'],'Explicit partial stock deduction persists.');
    $rejected = false;
    try { $service->save(7,['operation'=>'save_pantry','revision'=>9,'items'=>[
        ['id'=>'p1','name'=>'Frango','quantity'=>-0.1,'unit'=>'kg','category'=>'proteina','expiresOn'=>null]]]); }
    catch (InvalidArgumentException) { $rejected = true; }
    test_assert_true($rejected,'Negative inventory cannot be persisted even by direct API calls.');
    test_assert_same(9,$service->load(7)['revision'],'Invalid stock updates cannot change workspace revision.');
    $rejected = false;
    try { $service->save(7,['operation'=>'save_pantry','revision'=>9,'items'=>[
        ['id'=>'p1','name'=>'Frango','quantity'=>1,'unit'=>'kg','category'=>'proteina','expiresOn'=>null],
        ['id'=>'p1','name'=>'Frango','quantity'=>1,'unit'=>'kg','category'=>'proteina','expiresOn'=>null]]]); }
    catch (InvalidArgumentException) { $rejected = true; }
    test_assert_true($rejected,'Duplicate item identifiers are rejected by the backend.');
    test_assert_same(0,count($service->load(8)['pantry']),'Stock changes cannot cross account boundaries.');
};
