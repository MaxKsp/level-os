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
        'CREATE TABLE training_session_entries (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id INTEGER,user_id INTEGER,client_id TEXT,position INTEGER,exercise_name TEXT,modality TEXT,sets_count INTEGER,reps_count INTEGER,load_kg REAL,rest_sec INTEGER,distance_km REAL,duration_sec INTEGER,avg_hr INTEGER,progression_level TEXT,assisted_kg REAL,weighted_kg REAL,rpe REAL,rir INTEGER)',
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
    training_log_session($db, 11, [
        'id'=>'ts_sets','name'=>'Supino por séries','modality'=>'forca','date'=>level_clock_today()->format('Y-m-d'),
        'exercises'=>[
            ['id'=>'set_one','name'=>'Supino','modality'=>'forca','sets'=>1,'reps'=>8,'loadKg'=>60,'rpe'=>7.5,'rir'=>2],
            ['id'=>'set_two','name'=>'Supino','modality'=>'forca','sets'=>1,'reps'=>7,'loadKg'=>62.5,'rpe'=>8,'rir'=>1],
        ],
    ]);
    $snapshot = training_snapshot($db, 11);
    $sets = current(array_filter($snapshot['sessions'], static fn(array $row): bool => $row['id'] === 'ts_sets'))['exercises'];
    test_assert_same(7.5, $sets[0]['rpe'], 'Recorded RPE must survive snapshot.');
    test_assert_same(2, $sets[0]['rir'], 'Recorded RIR must survive snapshot.');
    test_assert_same(62.5, $sets[1]['loadKg'], 'Individual set load must survive snapshot.');
    $invalid = false;
    try { training_normalize_exercise(['name'=>'Supino','sets'=>1,'reps'=>8,'rpe'=>7.3], false, 0); }
    catch (InvalidArgumentException) { $invalid = true; }
    test_assert_true($invalid, 'RPE must accept only half-point steps.');
    test_assert_same(1, count($snapshot['workouts']), 'Snapshot must expose user workouts.');
    test_assert_same(1, count($snapshot['measurements']), 'Snapshot must expose body measurements.');
    test_assert_same(2, count($snapshot['sessions']), 'Snapshot must expose session history.');
    $cardio = current(array_filter($snapshot['sessions'], static fn(array $row): bool => $row['id'] === 'ts_cardio'));
    test_assert_same(5.0, $cardio['exercises'][0]['distanceKm'], 'Cardio distance must round-trip.');
    test_assert_same([], training_snapshot($db, 12)['sessions'], 'Training data must remain isolated by user id.');

    $legacy = new PDO('sqlite::memory:');
    $legacy->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $legacy->exec('CREATE TABLE training_session_entries (id INTEGER PRIMARY KEY, weighted_kg REAL)');
    test_assert_same(false, training_effort_supported($legacy), 'Pre-migration table must remain detectable.');
    $migrationRequired = false;
    try {
        if (!training_effort_supported($legacy)) {
            $entry = training_normalize_exercise(['name'=>'Supino','modality'=>'forca','sets'=>1,'reps'=>8,'rpe'=>8], false, 0);
            if ($entry['rpe'] !== null) throw new InvalidArgumentException('Registro RPE/RIR exige atualização do banco de dados.');
        }
    } catch (InvalidArgumentException) { $migrationRequired = true; }
    test_assert_true($migrationRequired, 'Effort metrics must not be silently discarded in legacy schema.');

    // Se o revogador de XP falhar, o histórico não pode sumir parcialmente.
    $db->exec("CREATE TRIGGER reject_set_revoke BEFORE DELETE ON xp_events
        WHEN OLD.ref = 'treino:session:ts_sets' BEGIN SELECT RAISE(ABORT, 'revoke refused'); END");
    $rolledBack = false;
    try { training_delete_session($db, 11, 'ts_sets', true); }
    catch (PDOException) { $rolledBack = true; }
    test_assert_true($rolledBack, 'Forced XP revoke failure must fail the operation.');
    test_assert_same(1, (int)$db->query("SELECT COUNT(*) FROM training_sessions WHERE user_id=11 AND client_id='ts_sets'")->fetchColumn(),
        'Session delete must rollback when XP cannot be reconciled.');
    $db->exec('DROP TRIGGER reject_set_revoke');

    $xpBefore = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE user_id=11")->fetchColumn();
    training_delete_session($db, 11, 'ts_cardio', true);
    $xpAfter = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE user_id=11")->fetchColumn();
    test_assert_true($xpAfter < $xpBefore, 'Undoing a session must reconcile its XP event.');
};
