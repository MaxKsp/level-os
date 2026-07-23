<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';
require_once dirname(__DIR__) . '/Progress/ProgressService.php';

const TRAINING_MODALITIES = ['forca', 'cardio', 'calistenia', 'mobilidade'];
const TRAINING_MEASUREMENT_UNITS = [
    'peso' => 'kg',
    'gordura' => '%',
    'altura' => 'cm',
    'cintura' => 'cm',
    'quadril' => 'cm',
    'braco' => 'cm',
    'coxa' => 'cm',
    'peito' => 'cm',
    'panturrilha' => 'cm',
];

function training_client_id(?string $value = null, string $prefix = 'tr'): string {
    $candidate = trim((string)$value);
    if ($candidate !== '' && strlen($candidate) <= 32 && preg_match('/\A[a-zA-Z0-9_-]+\z/D', $candidate) === 1) {
        return $candidate;
    }
    return substr($prefix . '_' . bin2hex(random_bytes(16)), 0, 32);
}

function training_text(mixed $value, int $max, bool $required = true): ?string {
    if (!is_string($value)) {
        if ($required) throw new InvalidArgumentException('Texto de treino inválido.');
        return null;
    }
    $clean = trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', $value));
    if ($clean === '') {
        if ($required) throw new InvalidArgumentException('Texto de treino obrigatório.');
        return null;
    }
    if (mb_strlen($clean) > $max) throw new InvalidArgumentException('Texto de treino muito longo.');
    return $clean;
}

function training_date(mixed $value): string {
    if (!is_string($value) || preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $value) !== 1) {
        throw new InvalidArgumentException('Data de treino inválida.');
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, level_clock_utc_timezone());
    if ($date === false || $date->format('Y-m-d') !== $value) throw new InvalidArgumentException('Data de treino inválida.');
    $today = level_clock_today();
    if ($date < $today->modify('-10 years') || $date > $today->modify('+1 year')) {
        throw new InvalidArgumentException('Data de treino fora do intervalo permitido.');
    }
    return $value;
}

function training_number(mixed $value, float $min, float $max, bool $required = false): ?float {
    if ($value === null || $value === '') {
        if ($required) throw new InvalidArgumentException('Valor de treino obrigatório.');
        return null;
    }
    if (!is_int($value) && !is_float($value) && !is_string($value)) throw new InvalidArgumentException('Valor de treino inválido.');
    $normalized = is_string($value) ? str_replace(',', '.', trim($value)) : $value;
    if (!is_numeric($normalized)) throw new InvalidArgumentException('Valor de treino inválido.');
    $number = (float)$normalized;
    if (!is_finite($number) || $number < $min || $number > $max) throw new InvalidArgumentException('Valor de treino fora do intervalo.');
    return round($number, 3);
}

function training_int(mixed $value, int $min, int $max, bool $required = false): ?int {
    $number = training_number($value, $min, $max, $required);
    if ($number === null) return null;
    if (floor($number) !== $number) throw new InvalidArgumentException('Inteiro de treino inválido.');
    return (int)$number;
}

function training_modality(mixed $value, string $fallback = 'forca'): string {
    $candidate = is_string($value) ? strtolower(trim($value)) : $fallback;
    if (!in_array($candidate, TRAINING_MODALITIES, true)) throw new InvalidArgumentException('Modalidade inválida.');
    return $candidate;
}

function training_program_support_available(PDO $db): bool {
    static $cache = [];
    $key = spl_object_id($db);
    if (array_key_exists($key, $cache)) return $cache[$key];
    try {
        $driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $stmt = $db->query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'training_programs' LIMIT 1");
            return $cache[$key] = $stmt !== false && $stmt->fetchColumn() !== false;
        }
        $stmt = $db->query("SHOW TABLES LIKE 'training_programs'");
        return $cache[$key] = $stmt !== false && $stmt->fetchColumn() !== false;
    } catch (Throwable) {
        return $cache[$key] = false;
    }
}

/** @return array<string,mixed> */
function training_snapshot(PDO $db, int $uid): array {
    $programSupport = training_program_support_available($db);
    $visibility = $programSupport
        ? " AND (NOT EXISTS (SELECT 1 FROM training_program_workouts tpw WHERE tpw.workout_id = training_workouts.id)
            OR EXISTS (SELECT 1 FROM training_program_workouts tpw JOIN training_programs tp ON tp.id = tpw.program_id
                WHERE tpw.workout_id = training_workouts.id AND tp.user_id = training_workouts.user_id AND tp.status = 'active'))"
        : '';
    $workoutStmt = $db->prepare('SELECT id, client_id, name, focus, created_at, updated_at
        FROM training_workouts WHERE user_id = ?' . $visibility . ' ORDER BY updated_at DESC, id DESC LIMIT 201');
    $workoutStmt->execute([$uid]);
    $workoutRows = $workoutStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($workoutRows) > 200) throw new OverflowException('Limite de treinos excedido.');

    $exerciseStmt = $db->prepare('SELECT workout_id, client_id, position, name, modality, target_sets,
        target_reps, target_load_kg, rest_sec, progression_level, assisted_kg, weighted_kg, duration_sec
        FROM training_workout_exercises WHERE user_id = ? ORDER BY workout_id, position, id LIMIT 4001');
    $exerciseStmt->execute([$uid]);
    $exerciseRows = $exerciseStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($exerciseRows) > 4000) throw new OverflowException('Limite de exercícios excedido.');
    $byWorkout = [];
    foreach ($exerciseRows as $row) {
        $byWorkout[(string)$row['workout_id']][] = training_exercise_public($row, true);
    }
    $workouts = array_map(static fn(array $row): array => [
        'id' => (string)$row['client_id'],
        'name' => (string)$row['name'],
        'focus' => $row['focus'] !== null ? (string)$row['focus'] : '',
        'exercises' => $byWorkout[(string)$row['id']] ?? [],
        'createdAt' => (string)$row['created_at'],
        'updatedAt' => (string)$row['updated_at'],
    ], $workoutRows);

    $measurementStmt = $db->prepare('SELECT client_id, measurement_type, value, unit, measured_on, source, created_at
        FROM body_measurements WHERE user_id = ? ORDER BY measured_on DESC, id DESC LIMIT 1001');
    $measurementStmt->execute([$uid]);
    $measurementRows = $measurementStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($measurementRows) > 1000) throw new OverflowException('Limite de medidas excedido.');
    $measurements = array_map(static fn(array $row): array => [
        'id' => (string)$row['client_id'], 'type' => (string)$row['measurement_type'],
        'value' => (float)$row['value'], 'unit' => (string)$row['unit'],
        'date' => (string)$row['measured_on'], 'source' => (string)$row['source'],
    ], $measurementRows);

    $sessionStmt = $db->prepare('SELECT s.id, s.client_id, s.name, s.modality, s.session_date, s.duration_sec,
        s.source, w.client_id AS workout_client_id
        FROM training_sessions s LEFT JOIN training_workouts w ON w.id = s.workout_id AND w.user_id = s.user_id
        WHERE s.user_id = ? ORDER BY s.session_date DESC, s.id DESC LIMIT 501');
    $sessionStmt->execute([$uid]);
    $sessionRows = $sessionStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($sessionRows) > 500) throw new OverflowException('Limite de sessões excedido.');
    $entryStmt = $db->prepare('SELECT session_id, client_id, position, exercise_name, modality, sets_count,
        reps_count, load_kg, rest_sec, distance_km, duration_sec, avg_hr, progression_level, assisted_kg, weighted_kg
        FROM training_session_entries WHERE user_id = ? ORDER BY session_id, position, id LIMIT 10001');
    $entryStmt->execute([$uid]);
    $entryRows = $entryStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($entryRows) > 10000) throw new OverflowException('Limite de métricas excedido.');
    $bySession = [];
    foreach ($entryRows as $row) $bySession[(string)$row['session_id']][] = training_exercise_public($row, false);
    $sessions = array_map(static fn(array $row): array => [
        'id' => (string)$row['client_id'], 'workoutId' => $row['workout_client_id'] !== null ? (string)$row['workout_client_id'] : null,
        'name' => (string)$row['name'], 'modality' => (string)$row['modality'],
        'date' => (string)$row['session_date'], 'durationSec' => $row['duration_sec'] !== null ? (int)$row['duration_sec'] : null,
        'source' => (string)$row['source'], 'exercises' => $bySession[(string)$row['id']] ?? [],
    ], $sessionRows);

    $programs = $programSupport ? training_program_list($db, $uid, 'active', 10) : [];
    $programHistory = $programSupport ? training_program_list($db, $uid, 'archived', 20) : [];
    return ['workouts' => $workouts, 'measurements' => $measurements, 'sessions' => $sessions,
        'programs' => $programs, 'programHistory' => $programHistory];
}

/** @return list<array<string,mixed>> */
function training_program_list(PDO $db, int $uid, string $status, int $limit): array {
    if (!in_array($status, ['active', 'archived'], true)) throw new InvalidArgumentException('Status de programa invÃ¡lido.');
    $limit = max(1, min(50, $limit));
    $stmt = $db->prepare("SELECT id, client_id, version_no, name, focus, days_per_week, location, status, source, created_at, activated_at
        FROM training_programs WHERE user_id = ? AND status = ? ORDER BY version_no DESC, id DESC LIMIT {$limit}");
    $stmt->execute([$uid, $status]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($rows === []) return [];
    $ids = array_map(static fn(array $row): int => (int)$row['id'], $rows);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $links = $db->prepare("SELECT tpw.program_id, w.client_id, w.name, w.focus
        FROM training_program_workouts tpw JOIN training_workouts w ON w.id = tpw.workout_id AND w.user_id = tpw.user_id
        WHERE tpw.user_id = ? AND tpw.program_id IN ({$placeholders}) ORDER BY tpw.program_id, tpw.position");
    $links->execute(array_merge([$uid], $ids));
    $byProgram = [];
    foreach ($links->fetchAll(PDO::FETCH_ASSOC) as $link) {
        $byProgram[(int)$link['program_id']][] = [
            'id'=>(string)$link['client_id'], 'name'=>(string)$link['name'], 'focus'=>(string)($link['focus'] ?? ''),
        ];
    }
    return array_map(static fn(array $row): array => [
        'id'=>(string)$row['client_id'], 'version'=>(int)$row['version_no'], 'name'=>(string)$row['name'],
        'focus'=>(string)$row['focus'], 'daysPerWeek'=>(int)$row['days_per_week'], 'location'=>(string)$row['location'],
        'status'=>(string)$row['status'], 'source'=>(string)$row['source'], 'createdAt'=>(string)$row['created_at'],
        'activatedAt'=>$row['activated_at'] !== null ? (string)$row['activated_at'] : null,
        'workouts'=>$byProgram[(int)$row['id']] ?? [],
    ], $rows);
}

/**
 * @param array<string,mixed> $args
 * @param array<string,mixed> $approval
 * @return array{program:array<string,mixed>,workouts:list<array<string,mixed>>,newProgramId:string,previousProgramIds:list<string>}
 */
function training_activate_program(PDO $db, int $uid, array $args, array $approval = []): array {
    $mode = is_string($approval['mode'] ?? null) ? $approval['mode'] : 'replace_all';
    if (!in_array($mode, ['replace_all', 'append', 'replace_selected'], true)) throw new InvalidArgumentException('Modo de substituiÃ§Ã£o invÃ¡lido.');
    $selected = is_array($approval['selectedWorkoutIds'] ?? null)
        ? array_values(array_filter($approval['selectedWorkoutIds'], static fn(mixed $id): bool => is_string($id) && preg_match('/\A[a-zA-Z0-9_-]{1,32}\z/D', $id) === 1))
        : [];
    if ($mode === 'replace_selected' && $selected === []) throw new InvalidArgumentException('Selecione ao menos uma ficha para substituir.');
    $planned = $args['workouts'] ?? null;
    if (!is_array($planned) || $planned === []) throw new InvalidArgumentException('Programa sem fichas.');
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $active = $db->prepare("SELECT id, client_id FROM training_programs WHERE user_id = ? AND status = 'active' ORDER BY id");
        $active->execute([$uid]);
        $previousRows = $active->fetchAll(PDO::FETCH_ASSOC);
        $now = level_clock_utc_sql();
        if ($mode !== 'append' && $previousRows === []) {
            $legacyStmt = $db->prepare('SELECT w.id FROM training_workouts w WHERE w.user_id = ?
                AND NOT EXISTS (SELECT 1 FROM training_program_workouts tpw WHERE tpw.workout_id = w.id) ORDER BY w.id');
            $legacyStmt->execute([$uid]);
            $legacyWorkoutIds = array_map('intval', $legacyStmt->fetchAll(PDO::FETCH_COLUMN));
            if ($legacyWorkoutIds !== []) {
                $legacyVersionStmt = $db->prepare('SELECT COALESCE(MAX(version_no), 0) FROM training_programs WHERE user_id = ?');
                $legacyVersionStmt->execute([$uid]);
                $legacyVersion = (int)$legacyVersionStmt->fetchColumn() + 1;
                $legacyClientId = substr('tp_' . bin2hex(random_bytes(16)), 0, 32);
                $legacyInsert = $db->prepare('INSERT INTO training_programs
                    (user_id, client_id, version_no, name, focus, days_per_week, location, status, source, created_at, activated_at, archived_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $legacyInsert->execute([$uid, $legacyClientId, $legacyVersion, 'Programa anterior', 'Fichas existentes',
                    min(7, count($legacyWorkoutIds)), 'academia', 'archived', 'manual', $now, $now, $now]);
                $legacyProgramId = (int)$db->lastInsertId();
                $legacyLink = $db->prepare('INSERT INTO training_program_workouts (program_id, workout_id, user_id, position) VALUES (?, ?, ?, ?)');
                foreach ($legacyWorkoutIds as $position => $workoutId) $legacyLink->execute([$legacyProgramId, $workoutId, $uid, $position]);
                $previousRows = [['id'=>$legacyProgramId, 'client_id'=>$legacyClientId]];
            }
        }
        $previousIds = array_map(static fn(array $row): string => (string)$row['client_id'], $previousRows);
        $carryWorkoutIds = [];
        if ($mode === 'replace_selected' && $previousRows !== []) {
            $programDbIds = array_map(static fn(array $row): int => (int)$row['id'], $previousRows);
            $ph = implode(',', array_fill(0, count($programDbIds), '?'));
            $carry = $db->prepare("SELECT DISTINCT w.id, w.client_id FROM training_program_workouts tpw
                JOIN training_workouts w ON w.id = tpw.workout_id AND w.user_id = tpw.user_id
                WHERE tpw.user_id = ? AND tpw.program_id IN ({$ph})");
            $carry->execute(array_merge([$uid], $programDbIds));
            foreach ($carry->fetchAll(PDO::FETCH_ASSOC) as $row) {
                if (!in_array((string)$row['client_id'], $selected, true)) $carryWorkoutIds[] = (int)$row['id'];
            }
        }
        if ($mode !== 'append') {
            $db->prepare("UPDATE training_programs SET status = 'archived', archived_at = ? WHERE user_id = ? AND status = 'active'")
                ->execute([$now, $uid]);
        }
        $workouts = [];
        foreach (array_values($planned) as $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Ficha invÃ¡lida.');
            $workouts[] = training_save_workout($db, $uid, $item + ['id'=>'as_wo_' . substr(bin2hex(random_bytes(12)), 0, 24)], 'assistant');
        }
        $versionStmt = $db->prepare('SELECT COALESCE(MAX(version_no), 0) FROM training_programs WHERE user_id = ?');
        $versionStmt->execute([$uid]);
        $version = (int)$versionStmt->fetchColumn() + 1;
        $clientId = substr('tp_' . bin2hex(random_bytes(16)), 0, 32);
        $focus = training_text($args['focus'] ?? null, 255);
        $name = training_text($args['name'] ?? ('Programa ' . $focus), 96);
        $days = training_int($args['daysPerWeek'] ?? null, 1, 7, true);
        $location = is_string($args['location'] ?? null) ? strtolower(trim($args['location'])) : '';
        if (!in_array($location, ['casa', 'academia'], true)) throw new InvalidArgumentException('Local invÃ¡lido.');
        $insert = $db->prepare('INSERT INTO training_programs
            (user_id, client_id, version_no, name, focus, days_per_week, location, status, source, created_at, activated_at, archived_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)');
        $insert->execute([$uid, $clientId, $version, $name, $focus, $days, $location, 'active', 'assistant', $now, $now]);
        $programId = (int)$db->lastInsertId();
        $link = $db->prepare('INSERT INTO training_program_workouts (program_id, workout_id, user_id, position) VALUES (?, ?, ?, ?)');
        $position = 0;
        foreach ($carryWorkoutIds as $workoutId) $link->execute([$programId, $workoutId, $uid, $position++]);
        foreach ($workouts as $workout) {
            $find = $db->prepare('SELECT id FROM training_workouts WHERE user_id = ? AND client_id = ? LIMIT 1');
            $find->execute([$uid, (string)$workout['id']]);
            $workoutId = $find->fetchColumn();
            if ($workoutId === false) throw new RuntimeException('training_program_link_failed');
            $link->execute([$programId, (int)$workoutId, $uid, $position++]);
        }
        $programs = training_program_list($db, $uid, 'active', 20);
        $program = current(array_filter($programs, static fn(array $item): bool => $item['id'] === $clientId));
        if (!is_array($program)) throw new RuntimeException('training_program_read_failed');
        if ($own) $db->commit();
        return ['program'=>$program, 'workouts'=>$workouts, 'newProgramId'=>$clientId, 'previousProgramIds'=>$previousIds];
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @return array<string,mixed> */
function training_restore_program(PDO $db, int $uid, string $clientId): array {
    if (preg_match('/\Atp_[a-f0-9]{20,29}\z/D', $clientId) !== 1) throw new InvalidArgumentException('Programa invÃ¡lido.');
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $now = level_clock_utc_sql();
        $db->prepare("UPDATE training_programs SET status = 'archived', archived_at = ? WHERE user_id = ? AND status = 'active'")
            ->execute([$now, $uid]);
        $restore = $db->prepare("UPDATE training_programs SET status = 'active', activated_at = ?, archived_at = NULL WHERE user_id = ? AND client_id = ? AND status = 'archived'");
        $restore->execute([$now, $uid, $clientId]);
        if ($restore->rowCount() !== 1) throw new InvalidArgumentException('Programa nÃ£o encontrado.');
        $program = training_program_list($db, $uid, 'active', 20)[0] ?? null;
        if (!is_array($program)) throw new RuntimeException('training_program_read_failed');
        if ($own) $db->commit();
        return $program;
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @param array<string,mixed> $undo */
function training_undo_program_activation(PDO $db, int $uid, array $undo): void {
    $newId = (string)($undo['newProgramId'] ?? '');
    $previous = is_array($undo['previousProgramIds'] ?? null) ? $undo['previousProgramIds'] : [];
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $now = level_clock_utc_sql();
        $stmt = $db->prepare("UPDATE training_programs SET status = 'archived', archived_at = ? WHERE user_id = ? AND client_id = ? AND status = 'active'");
        $stmt->execute([$now, $uid, $newId]);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('undo_conflict');
        $restore = $db->prepare("UPDATE training_programs SET status = 'active', activated_at = ?, archived_at = NULL WHERE user_id = ? AND client_id = ? AND status = 'archived'");
        foreach ($previous as $id) {
            if (!is_string($id)) continue;
            $restore->execute([$now, $uid, $id]);
        }
        if ($own) $db->commit();
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @return array<string,mixed> */
function training_exercise_public(array $row, bool $template): array {
    $out = [
        'id' => (string)$row['client_id'],
        'name' => (string)($row[$template ? 'name' : 'exercise_name'] ?? ''),
        'modality' => (string)$row['modality'],
    ];
    $map = $template
        ? ['sets' => 'target_sets', 'reps' => 'target_reps', 'loadKg' => 'target_load_kg']
        : ['sets' => 'sets_count', 'reps' => 'reps_count', 'loadKg' => 'load_kg'];
    foreach ($map as $public => $column) $out[$public] = $row[$column] !== null ? ($public === 'loadKg' ? (float)$row[$column] : (int)$row[$column]) : null;
    foreach (['restSec' => 'rest_sec', 'distanceKm' => 'distance_km', 'durationSec' => 'duration_sec', 'avgHr' => 'avg_hr',
                 'progressionLevel' => 'progression_level', 'assistedKg' => 'assisted_kg', 'weightedKg' => 'weighted_kg'] as $public => $column) {
        if (!array_key_exists($column, $row)) continue;
        $out[$public] = $row[$column] === null ? null : (in_array($column, ['progression_level'], true) ? (string)$row[$column] : (float)$row[$column]);
    }
    return $out;
}

/** @param array<string,mixed> $workout @return array<string,mixed> */
function training_save_workout(PDO $db, int $uid, array $workout, string $source = 'manual'): array {
    $clientId = training_client_id(isset($workout['id']) ? (string)$workout['id'] : null, 'wo');
    $name = training_text($workout['name'] ?? null, 96);
    $focus = training_text($workout['focus'] ?? null, 255, false);
    $exercises = $workout['exercises'] ?? null;
    if (!is_array($exercises) || $exercises === [] || count($exercises) > 60) throw new InvalidArgumentException('Treino precisa de 1 a 60 exercícios.');
    $normalized = [];
    foreach (array_values($exercises) as $index => $exercise) {
        if (!is_array($exercise)) throw new InvalidArgumentException('Exercício inválido.');
        $normalized[] = training_normalize_exercise($exercise, true, $index);
    }
    $now = level_clock_utc_sql();
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $find = $db->prepare('SELECT id FROM training_workouts WHERE user_id = ? AND client_id = ? LIMIT 1');
        $find->execute([$uid, $clientId]);
        $workoutId = $find->fetchColumn();
        if ($workoutId === false) {
            $insert = $db->prepare('INSERT INTO training_workouts (user_id, client_id, name, focus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
            $insert->execute([$uid, $clientId, $name, $focus, $now, $now]);
            $workoutId = (int)$db->lastInsertId();
        } else {
            $workoutId = (int)$workoutId;
            $db->prepare('UPDATE training_workouts SET name = ?, focus = ?, updated_at = ? WHERE id = ? AND user_id = ?')
                ->execute([$name, $focus, $now, $workoutId, $uid]);
            $db->prepare('DELETE FROM training_workout_exercises WHERE workout_id = ? AND user_id = ?')->execute([$workoutId, $uid]);
        }
        $insertExercise = $db->prepare('INSERT INTO training_workout_exercises
            (workout_id, user_id, client_id, position, name, modality, target_sets, target_reps, target_load_kg, rest_sec,
             progression_level, assisted_kg, weighted_kg, duration_sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($normalized as $exercise) {
            $insertExercise->execute([$workoutId, $uid, $exercise['id'], $exercise['position'], $exercise['name'], $exercise['modality'],
                $exercise['sets'], $exercise['reps'], $exercise['loadKg'], $exercise['restSec'], $exercise['progressionLevel'],
                $exercise['assistedKg'], $exercise['weightedKg'], $exercise['durationSec']]);
        }
        if ($own) $db->commit();
        return ['id' => $clientId, 'name' => $name, 'focus' => $focus ?? '', 'exercises' => array_map(static function(array $e): array { unset($e['position']); return $e; }, $normalized)];
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @param array<string,mixed> $exercise @return array<string,mixed> */
function training_normalize_exercise(array $exercise, bool $template, int $position): array {
    $modality = training_modality($exercise['modality'] ?? 'forca');
    $name = training_text($exercise['name'] ?? $exercise['exerciseName'] ?? null, 96);
    $sets = training_int($exercise['sets'] ?? null, 1, 100);
    $reps = training_int($exercise['reps'] ?? null, 1, 10000);
    $load = training_number($exercise['loadKg'] ?? null, 0, 2000);
    $rest = training_int($exercise['restSec'] ?? null, 0, 7200);
    $distance = training_number($exercise['distanceKm'] ?? null, 0, 1000);
    $duration = training_int($exercise['durationSec'] ?? null, 1, 172800);
    $avgHr = training_int($exercise['avgHr'] ?? null, 30, 240);
    $progression = training_text($exercise['progressionLevel'] ?? null, 64, false);
    $assisted = training_number($exercise['assistedKg'] ?? null, 0, 500);
    $weighted = training_number($exercise['weightedKg'] ?? null, 0, 500);
    if ($modality === 'cardio' && !$template && ($distance === null || $duration === null)) throw new InvalidArgumentException('Cardio exige distância e duração.');
    if ($modality === 'mobilidade' && !$template && $duration === null) throw new InvalidArgumentException('Mobilidade exige duração.');
    if ($modality === 'forca' && !$template && ($sets === null || $reps === null)) throw new InvalidArgumentException('Força exige séries e repetições.');
    return [
        'id' => training_client_id(isset($exercise['id']) ? (string)$exercise['id'] : null, 'ex'), 'position' => $position,
        'name' => $name, 'modality' => $modality, 'sets' => $sets, 'reps' => $reps, 'loadKg' => $load,
        'restSec' => $rest, 'distanceKm' => $distance, 'durationSec' => $duration, 'avgHr' => $avgHr,
        'progressionLevel' => $progression, 'assistedKg' => $assisted, 'weightedKg' => $weighted,
    ];
}

function training_delete_workout(PDO $db, int $uid, string $clientId): bool {
    $stmt = $db->prepare('DELETE FROM training_workouts WHERE user_id = ? AND client_id = ?');
    $stmt->execute([$uid, training_client_id($clientId)]);
    return $stmt->rowCount() === 1;
}

/** @param array<string,mixed> $input @return array<string,mixed> */
function training_log_measurement(PDO $db, int $uid, array $input, string $source = 'manual'): array {
    $type = is_string($input['type'] ?? null) ? strtolower(trim((string)$input['type'])) : '';
    $unit = is_string($input['unit'] ?? null) ? trim((string)$input['unit']) : '';
    if (!isset(TRAINING_MEASUREMENT_UNITS[$type]) || TRAINING_MEASUREMENT_UNITS[$type] !== $unit) throw new InvalidArgumentException('Tipo ou unidade de medida inválido.');
    $value = training_number($input['value'] ?? null, 0.01, 1000, true);
    $date = training_date($input['date'] ?? null);
    $clientId = training_client_id(isset($input['id']) ? (string)$input['id'] : null, 'bm');
    $stmt = $db->prepare('INSERT INTO body_measurements (user_id, client_id, measurement_type, value, unit, measured_on, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$uid, $clientId, $type, number_format((float)$value, 3, '.', ''), $unit, $date, $source === 'assistant' ? 'assistant' : 'manual', level_clock_utc_sql()]);
    return ['id' => $clientId, 'type' => $type, 'value' => $value, 'unit' => $unit, 'date' => $date, 'source' => $source === 'assistant' ? 'assistant' : 'manual'];
}

function training_delete_measurement(PDO $db, int $uid, string $clientId): bool {
    $stmt = $db->prepare('DELETE FROM body_measurements WHERE user_id = ? AND client_id = ?');
    $stmt->execute([$uid, training_client_id($clientId)]);
    return $stmt->rowCount() === 1;
}

/** @param array<string,mixed> $input @return array<string,mixed> */
function training_log_session(PDO $db, int $uid, array $input, string $source = 'manual', bool $awardXp = true): array {
    $clientId = training_client_id(isset($input['id']) ? (string)$input['id'] : null, 'ts');
    $date = training_date($input['date'] ?? level_clock_today()->format('Y-m-d'));
    $workoutClient = isset($input['workoutId']) && is_string($input['workoutId']) ? training_client_id($input['workoutId']) : null;
    $workoutId = null;
    $workoutName = null;
    if ($workoutClient !== null) {
        $find = $db->prepare('SELECT id, name FROM training_workouts WHERE user_id = ? AND client_id = ? LIMIT 1');
        $find->execute([$uid, $workoutClient]);
        $row = $find->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new InvalidArgumentException('Treino não encontrado.');
        $workoutId = (int)$row['id'];
        $workoutName = (string)$row['name'];
    }
    $entries = $input['exercises'] ?? null;
    if (!is_array($entries) || $entries === [] || count($entries) > 100) throw new InvalidArgumentException('Sessão precisa de métricas.');
    $normalized = [];
    foreach (array_values($entries) as $index => $entry) {
        if (!is_array($entry)) throw new InvalidArgumentException('Métrica de sessão inválida.');
        $normalized[] = training_normalize_exercise($entry, false, $index);
    }
    $modality = training_modality($input['modality'] ?? ($normalized[0]['modality'] ?? 'forca'));
    $name = training_text($input['name'] ?? $workoutName ?? 'Sessão de treino', 96);
    $duration = training_int($input['durationSec'] ?? null, 1, 172800);
    if ($duration === null) {
        $duration = array_reduce($normalized, static fn(?int $carry, array $entry): ?int => max($carry ?? 0, (int)($entry['durationSec'] ?? 0)), null);
        if ($duration === 0) $duration = null;
    }
    $now = level_clock_utc_sql();
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $insert = $db->prepare('INSERT INTO training_sessions (user_id, workout_id, client_id, name, modality, session_date, duration_sec, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $insert->execute([$uid, $workoutId, $clientId, $name, $modality, $date, $duration, $source === 'assistant' ? 'assistant' : 'manual', $now]);
        $sessionId = (int)$db->lastInsertId();
        $entryStmt = $db->prepare('INSERT INTO training_session_entries
            (session_id, user_id, client_id, position, exercise_name, modality, sets_count, reps_count, load_kg, rest_sec,
             distance_km, duration_sec, avg_hr, progression_level, assisted_kg, weighted_kg)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($normalized as $entry) {
            $entryStmt->execute([$sessionId, $uid, $entry['id'], $entry['position'], $entry['name'], $entry['modality'],
                $entry['sets'], $entry['reps'], $entry['loadKg'], $entry['restSec'], $entry['distanceKm'], $entry['durationSec'],
                $entry['avgHr'], $entry['progressionLevel'], $entry['assistedKg'], $entry['weightedKg']]);
        }
        if ($awardXp && function_exists('progress_award_event')) {
            progress_award_event($db, $uid, 'treino', 'treino:session:' . $clientId);
        }
        if ($own) $db->commit();
        return ['id' => $clientId, 'workoutId' => $workoutClient, 'name' => $name, 'modality' => $modality,
            'date' => $date, 'durationSec' => $duration, 'source' => $source === 'assistant' ? 'assistant' : 'manual',
            'exercises' => array_map(static function(array $e): array { unset($e['position']); return $e; }, $normalized)];
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

function training_delete_session(PDO $db, int $uid, string $clientId, bool $revokeXp = true): bool {
    $safeId = training_client_id($clientId);
    $stmt = $db->prepare('DELETE FROM training_sessions WHERE user_id = ? AND client_id = ?');
    $stmt->execute([$uid, $safeId]);
    if ($stmt->rowCount() === 1 && $revokeXp && function_exists('progress_revoke_event')) {
        progress_revoke_event($db, $uid, 'treino:session:' . $safeId);
    }
    return $stmt->rowCount() === 1;
}
