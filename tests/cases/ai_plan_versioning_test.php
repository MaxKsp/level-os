<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Training/TrainingService.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Nutrition/NutritionPlanService.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantActionExecutor.php';

return static function (): void {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $schema = [
        'CREATE TABLE kv_store (user_id INTEGER,data_key TEXT,data_value TEXT,PRIMARY KEY(user_id,data_key))',
        'CREATE TABLE nutrition_plans (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,version_no INTEGER,status TEXT,goal TEXT,period_days INTEGER,budget_cents INTEGER,estimated_cost_cents INTEGER,payload_json TEXT,source TEXT,replaces_id INTEGER,created_at TEXT,activated_at TEXT,archived_at TEXT,UNIQUE(user_id,client_id),UNIQUE(user_id,version_no))',
        'CREATE TABLE training_workouts (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,name TEXT,focus TEXT,created_at TEXT,updated_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_workout_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT,workout_id INTEGER,user_id INTEGER,client_id TEXT,position INTEGER,name TEXT,modality TEXT,target_sets INTEGER,target_reps INTEGER,target_load_kg REAL,rest_sec INTEGER,progression_level TEXT,assisted_kg REAL,weighted_kg REAL,duration_sec INTEGER)',
        'CREATE TABLE body_measurements (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,measurement_type TEXT,value REAL,unit TEXT,measured_on TEXT,source TEXT,created_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,workout_id INTEGER,client_id TEXT,name TEXT,modality TEXT,session_date TEXT,duration_sec INTEGER,source TEXT,created_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_session_entries (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id INTEGER,user_id INTEGER,client_id TEXT,position INTEGER,exercise_name TEXT,modality TEXT,sets_count INTEGER,reps_count INTEGER,load_kg REAL,rest_sec INTEGER,distance_km REAL,duration_sec INTEGER,avg_hr INTEGER,progression_level TEXT,assisted_kg REAL,weighted_kg REAL)',
        'CREATE TABLE training_programs (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,version_no INTEGER,name TEXT,focus TEXT,days_per_week INTEGER,location TEXT,status TEXT,source TEXT,created_at TEXT,activated_at TEXT,archived_at TEXT,UNIQUE(user_id,client_id),UNIQUE(user_id,version_no))',
        'CREATE TABLE training_program_workouts (program_id INTEGER,workout_id INTEGER,user_id INTEGER,position INTEGER,PRIMARY KEY(program_id,workout_id))',
        'CREATE TABLE user_progress (user_id INTEGER PRIMARY KEY,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0,updated_at TEXT)',
        'CREATE TABLE xp_events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,type TEXT,amount INTEGER,ref TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,ref))',
        'CREATE TABLE achievements (code TEXT PRIMARY KEY,title TEXT,description TEXT,xp_bonus INTEGER,icon TEXT)',
        'CREATE TABLE user_achievements (user_id INTEGER,achievement_code TEXT,unlocked_at TEXT,PRIMARY KEY(user_id,achievement_code))',
    ];
    foreach ($schema as $sql) $db->exec($sql);

    $diet = [
        'goal'=>'emagrecimento', 'periodDays'=>1, 'budgetBRL'=>100.0, 'estimatedCostBRL'=>40.0,
        'days'=>[['day'=>1, 'meals'=>[['name'=>'Almoço','description'=>'Arroz, feijão e frango','estimatedCostBRL'=>40.0]]]],
        'createdAt'=>'2026-07-22T12:00:00-03:00', 'source'=>'assistant',
    ];
    $preview = (new AssistantActionExecutor($db))->preview(7, ['action'=>'create_diet_plan','arguments'=>$diet]);
    test_assert_same(0, (int)$db->query('SELECT COUNT(*) FROM nutrition_plans')->fetchColumn(), 'Previewing a diet must not persist it.');
    test_assert_same(1, $preview['plan']['periodDays'] ?? null, 'The preview must return the validated draft.');

    $first = nutrition_activate_plan($db, 7, $diet, 'assistant');
    $secondDiet = $diet;
    $secondDiet['goal'] = 'manutencao';
    $second = nutrition_activate_plan($db, 7, $secondDiet, 'assistant');
    $snapshot = nutrition_plan_snapshot($db, 7);
    test_assert_same('manutencao', $snapshot['plan']['goal'] ?? null, 'The approved replacement must become active.');
    test_assert_same(1, count($snapshot['history']), 'The previous diet must remain archived.');
    nutrition_undo_activation($db, 7, [
        'activatedId'=>$second['activatedId'], 'previousId'=>$second['previousId'], 'previousLegacy'=>$second['previousLegacy'],
    ]);
    test_assert_same('emagrecimento', nutrition_active_plan($db, 7)['goal'] ?? null, 'Undo must restore the prior diet version.');
    test_assert_same(null, nutrition_active_plan($db, 8), 'Diet versions must remain isolated by user.');

    nutrition_write_legacy_plan($db, 10, $diet);
    nutrition_activate_plan($db, 10, $secondDiet, 'assistant');
    $legacyDietSnapshot = nutrition_plan_snapshot($db, 10);
    test_assert_same(1, count($legacyDietSnapshot['history']), 'A legacy active diet must become a restorable archived version.');
    test_assert_same('emagrecimento', $legacyDietSnapshot['history'][0]['goal'] ?? null, 'The legacy diet payload must be preserved.');

    $program = [
        'focus'=>'hipertrofia', 'daysPerWeek'=>2, 'location'=>'academia',
        'workouts'=>[
            ['name'=>'Superior','focus'=>'Peito e costas','exercises'=>[['name'=>'Supino','modality'=>'forca','sets'=>4,'reps'=>10,'restSec'=>90]]],
            ['name'=>'Inferior','focus'=>'Pernas','exercises'=>[['name'=>'Agachamento','modality'=>'forca','sets'=>4,'reps'=>10,'restSec'=>90]]],
        ],
    ];
    $workoutPreview = (new AssistantActionExecutor($db))->preview(7, ['action'=>'create_workout_program','arguments'=>$program]);
    test_assert_same(0, (int)$db->query('SELECT COUNT(*) FROM training_workouts')->fetchColumn(), 'Previewing a program must not persist workouts.');
    test_assert_same(2, count($workoutPreview['workouts'] ?? []), 'The workout preview must expose every planned sheet.');

    $firstProgram = training_activate_program($db, 7, $program, ['mode'=>'replace_all']);
    $replacement = $program;
    $replacement['focus'] = 'forca';
    $replacement['workouts'] = [['name'=>'Força total','focus'=>'Corpo inteiro','exercises'=>[['name'=>'Terra','modality'=>'forca','sets'=>3,'reps'=>5,'restSec'=>150]]]];
    $secondProgram = training_activate_program($db, 7, $replacement, ['mode'=>'replace_all']);
    $training = training_snapshot($db, 7);
    test_assert_same(1, count($training['workouts']), 'Replacing a program must hide archived program sheets.');
    test_assert_same('Força total', $training['workouts'][0]['name'] ?? null, 'The approved program must be the visible program.');
    test_assert_same(1, count($training['programHistory']), 'The old program must remain restorable.');
    training_undo_program_activation($db, 7, [
        'newProgramId'=>$secondProgram['newProgramId'], 'previousProgramIds'=>$secondProgram['previousProgramIds'],
    ]);
    $restored = training_snapshot($db, 7);
    test_assert_same(2, count($restored['workouts']), 'Undo must restore every sheet from the previous program.');
    test_assert_same([], training_snapshot($db, 8)['programs'], 'Training programs must remain isolated by user.');

    training_save_workout($db, 9, [
        'id'=>'legacy_sheet','name'=>'Ficha antiga','focus'=>'Livre',
        'exercises'=>[['name'=>'Flexão','modality'=>'calistenia','sets'=>3,'reps'=>12,'restSec'=>60]],
    ]);
    $legacyReplacement = training_activate_program($db, 9, $replacement, ['mode'=>'replace_all']);
    $legacySnapshot = training_snapshot($db, 9);
    test_assert_same(1, count($legacySnapshot['workouts']), 'Replacing legacy loose sheets must hide them without deleting them.');
    test_assert_same(1, count($legacySnapshot['programHistory']), 'Legacy sheets must be wrapped in a restorable archived program.');
    training_undo_program_activation($db, 9, [
        'newProgramId'=>$legacyReplacement['newProgramId'], 'previousProgramIds'=>$legacyReplacement['previousProgramIds'],
    ]);
    test_assert_same('Ficha antiga', training_snapshot($db, 9)['workouts'][0]['name'] ?? null, 'Undo must restore legacy loose sheets.');
};
