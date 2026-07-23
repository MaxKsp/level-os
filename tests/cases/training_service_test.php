<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Training/TrainingService.php';

return static function (): void {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $schema = [
        'CREATE TABLE training_workouts (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,name TEXT,focus TEXT,created_at TEXT,updated_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_workout_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT,workout_id INTEGER,user_id INTEGER,client_id TEXT,position INTEGER,name TEXT,modality TEXT,target_sets INTEGER,target_reps INTEGER,target_load_kg REAL,rest_sec INTEGER,progression_level TEXT,assisted_kg REAL,weighted_kg REAL,duration_sec INTEGER)',
        'CREATE TABLE body_measurements (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,client_id TEXT,measurement_type TEXT,value REAL,unit TEXT,measured_on TEXT,source TEXT,created_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,workout_id INTEGER,client_id TEXT,name TEXT,modality TEXT,session_date TEXT,duration_sec INTEGER,source TEXT,created_at TEXT,UNIQUE(user_id,client_id))',
        'CREATE TABLE training_session_entries (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id INTEGER,user_id INTEGER,client_id TEXT,position INTEGER,exercise_name TEXT,modality TEXT,sets_count INTEGER,reps_count INTEGER,load_kg REAL,rest_sec INTEGER,distance_km REAL,duration_sec INTEGER,avg_hr INTEGER,progression_level TEXT,assisted_kg REAL,weighted_kg REAL)',
        'CREATE TABLE user_progress (user_id INTEGER PRIMARY KEY,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0,updated_at TEXT)',
        'CREATE TABLE xp_events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,type TEXT,amount INTEGER,ref TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,ref))',
        'CREATE TABLE achievements (code TEXT PRIMARY KEY,title TEXT,description TEXT,xp_bonus INTEGER,icon TEXT)',
        'CREATE TABLE user_achievements (user_id INTEGER,achievement_code TEXT,unlocked_at TEXT,PRIMARY KEY(user_id,achievement_code))',
    ];
    foreach ($schema as $sql) $db->exec($sql);

    $workout = training_save_workout($db, 11, [
        'id'=>'wo_strength','name'=>'Superior','focus'=>'Força',
        'exercises'=>[['id'=>'bench','name'=>'Supino','modality'=>'forca','sets'=>4,'reps'=>8,'loadKg'=>80,'restSec'=>120]],
    ]);
    test_assert_same('wo_strength', $workout['id'], 'Workout client id must be preserved.');

    training_log_measurement($db, 11, ['id'=>'bm_weight','type'=>'peso','value'=>79.4,'unit'=>'kg','date'=>level_clock_today()->format('Y-m-d')]);
    training_log_session($db, 11, [
        'id'=>'ts_cardio','name'=>'Corrida','modality'=>'cardio','date'=>level_clock_today()->format('Y-m-d'),
        'exercises'=>[['name'=>'Corrida','modality'=>'cardio','distanceKm'=>5,'durationSec'=>1500,'avgHr'=>151]],
    ]);
    $snapshot = training_snapshot($db, 11);
    test_assert_same(1, count($snapshot['workouts']), 'Snapshot must expose user workouts.');
    test_assert_same(1, count($snapshot['measurements']), 'Snapshot must expose body measurements.');
    test_assert_same(1, count($snapshot['sessions']), 'Snapshot must expose session history.');
    test_assert_same(5.0, $snapshot['sessions'][0]['exercises'][0]['distanceKm'], 'Cardio distance must round-trip.');
    test_assert_same([], training_snapshot($db, 12)['sessions'], 'Training data must remain isolated by user id.');

    $xpBefore = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE user_id=11")->fetchColumn();
    training_delete_session($db, 11, 'ts_cardio', true);
    $xpAfter = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE user_id=11")->fetchColumn();
    test_assert_true($xpAfter < $xpBefore, 'Undoing a session must reconcile its XP event.');
};
