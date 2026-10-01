<?php
declare(strict_types=1);

const TRAINING_REFERENCE_FREE_DB_UPSTREAM =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const TRAINING_REFERENCE_FREE_DB_ASSET_BASE =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const TRAINING_REFERENCE_REPDB_UPSTREAM =
    'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json';
const TRAINING_REFERENCE_REPDB_ASSET_BASE =
    'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/';
const TRAINING_REFERENCE_TTL = 21600;
const TRAINING_REFERENCE_MAX_BYTES = 8_000_000;

/** @return array<string,mixed>|list<mixed> */
function training_reference_fetch_json(string $url, string $cacheName): array {
    $cache = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $cacheName;
    $raw = null;
    if (is_file($cache) && (time() - (int)filemtime($cache)) < TRAINING_REFERENCE_TTL) {
        $candidate = file_get_contents($cache, false, null, 0, TRAINING_REFERENCE_MAX_BYTES + 1);
        if (is_string($candidate) && strlen($candidate) <= TRAINING_REFERENCE_MAX_BYTES) $raw = $candidate;
    }
    if ($raw === null) {
        if (!function_exists('curl_init')) throw new RuntimeException('exercise_reference_transport_unavailable');
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>4, CURLOPT_TIMEOUT=>16,
            CURLOPT_FOLLOWLOCATION=>false, CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: LevelOS/1.0 (+https://lvlos.com)'],
        ]);
        $candidate = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if (!is_string($candidate) || $status !== 200 || strlen($candidate) > TRAINING_REFERENCE_MAX_BYTES) {
            if (is_file($cache)) $candidate = file_get_contents($cache, false, null, 0, TRAINING_REFERENCE_MAX_BYTES + 1);
            else throw new RuntimeException('exercise_reference_upstream_unavailable');
        }
        $raw = is_string($candidate) ? $candidate : throw new RuntimeException('exercise_reference_upstream_unavailable');
        @file_put_contents($cache . '.tmp', $raw, LOCK_EX);
        @rename($cache . '.tmp', $cache);
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) throw new RuntimeException('exercise_reference_invalid_response');
    return $decoded;
}

/** @return list<array<string,mixed>> */
function training_reference_free_rows(): array {
    $decoded = training_reference_fetch_json(TRAINING_REFERENCE_FREE_DB_UPSTREAM, 'levelos-free-exercise-db-v1.json');
    return array_values(array_filter($decoded, 'is_array'));
}
/** @return list<array<string,mixed>> */
function training_reference_repdb_rows(): array {
    $decoded = training_reference_fetch_json(TRAINING_REFERENCE_REPDB_UPSTREAM, 'levelos-repdb-exercise-v1.json');
    $rows = is_array($decoded['exercises'] ?? null) ? $decoded['exercises'] : [];
    return array_values(array_filter($rows, 'is_array'));
}

function training_reference_group_from_text(string $value): string {
    $haystack = training_knowledge_key($value);
    return match (true) {
        str_contains($haystack, 'chest') || str_contains($haystack, 'pector') => 'Peito',
        str_contains($haystack, 'back') || str_contains($haystack, 'latissimus')
            || str_contains($haystack, 'traps') => 'Costas',
        str_contains($haystack, 'shoulder') || str_contains($haystack, 'deltoid') => 'Ombros',
        str_contains($haystack, 'biceps') || str_contains($haystack, 'triceps')
            || str_contains($haystack, 'forearm') || str_contains($haystack, 'arm') => 'Braços',
        str_contains($haystack, 'abdominal') || str_contains($haystack, 'abs')
            || str_contains($haystack, 'core') || str_contains($haystack, 'oblique') => 'Core',
        str_contains($haystack, 'quad') || str_contains($haystack, 'hamstring')
            || str_contains($haystack, 'glute') || str_contains($haystack, 'calf')
            || str_contains($haystack, 'calves') || str_contains($haystack, 'adductor')
            || str_contains($haystack, 'abductor') || str_contains($haystack, 'leg') => 'Pernas',
        str_contains($haystack, 'cardio') => 'Cardio',
        default => 'Mobilidade',
    };
}
function training_reference_equipment_name(string $raw): string {
    $key = training_knowledge_key(str_replace('_', ' ', $raw));
    $map = [
        'barbell'=>'Barra', 'dumbbell'=>'Halteres', 'kettlebell'=>'Kettlebell', 'kettlebells'=>'Kettlebell',
        'cable'=>'Cabo / polia', 'machine'=>'Máquina', 'body only'=>'Peso corporal',
        'bodyweight'=>'Peso corporal', 'bands'=>'Elástico', 'resistance band'=>'Elástico',
        'bench'=>'Banco', 'pull up bar'=>'Barra fixa', 'ab wheel'=>'Roda abdominal',
        'medicine ball'=>'Bola medicinal', 'exercise ball'=>'Bola suíça', 'stability ball'=>'Bola suíça',
        'foam roll'=>'Rolo de liberação', 'e z curl bar'=>'Barra EZ', 'ez bar'=>'Barra EZ',
        'smith machine'=>'Smith', 'trap bar'=>'Trap bar', 'sled'=>'Trenó',
    ];
    if (isset($map[$key])) return $map[$key];
    if ($key === '' || $key === 'none') return 'Peso corporal';
    return mb_convert_case(str_replace('_', ' ', trim($raw)), MB_CASE_TITLE, 'UTF-8');
}

function training_reference_modality(string $category, string $equipment): string {
    $categoryKey = training_knowledge_key($category);
    if (str_contains($categoryKey, 'cardio')) return 'cardio';
    if (str_contains($categoryKey, 'stretch')) return 'mobilidade';
    $equipmentKey = training_knowledge_key($equipment);
    if ($equipmentKey === '' || str_contains($equipmentKey, 'body')) return 'calistenia';
    return 'forca';
}
function training_reference_asset_url(string $base, string $path): ?string {
    $path = trim(str_replace('\\', '/', $path));
    if ($path === '' || str_contains($path, '..') || str_contains($path, '://') || str_starts_with($path, '/')) return null;
    if (!preg_match('/^[A-Za-z0-9_\-\.\/ %()]+$/', $path)) return null;
    $segments = array_map('rawurlencode', explode('/', $path));
    return $base . implode('/', $segments);
}

/** @return array<string,mixed>|null */
function training_reference_normalize_free(array $row): ?array {
    $name = training_knowledge_text($row['name'] ?? '', 120);
    $id = training_knowledge_text($row['id'] ?? '', 140);
    $images = is_array($row['images'] ?? null) ? $row['images'] : [];
    $motionFrames = [];
    foreach ($images as $path) {
        if (!is_string($path)) continue;
        $url = training_reference_asset_url(TRAINING_REFERENCE_FREE_DB_ASSET_BASE, $path);
        if ($url !== null) $motionFrames[$url] = true;
    }
    $imageUrl = array_key_first($motionFrames);
    if ($name === '' || $id === '' || $imageUrl === null) return null;
    $primary = is_array($row['primaryMuscles'] ?? null) ? $row['primaryMuscles'] : [];
    $secondary = is_array($row['secondaryMuscles'] ?? null) ? $row['secondaryMuscles'] : [];
    $category = training_knowledge_text($row['category'] ?? '', 80);
    $equipmentRaw = training_knowledge_text($row['equipment'] ?? '', 80);
    $instructionRows = is_array($row['instructions'] ?? null) ? $row['instructions'] : [];
    $steps = array_values(array_filter(array_map(
        static fn($v): string => training_knowledge_text($v, 420), $instructionRows,
    ), static fn(string $v): bool => mb_strlen($v, 'UTF-8') >= 12));
    $instructions = implode(' ', $steps);
    return [
        'id'=>'free-' . $id, 'name'=>$name, 'language'=>'fallback',
        'group'=>training_reference_group_from_text($category . ' ' . implode(' ', $primary) . ' ' . implode(' ', $secondary)),
        'modality'=>training_reference_modality($category, $equipmentRaw),
        'equipment'=>[training_reference_equipment_name($equipmentRaw)],
        'instructions'=>training_knowledge_text($instructions, 2400),
        'steps'=>array_slice($steps, 0, 8),
        'motionFrames'=>array_slice(array_keys($motionFrames), 0, 4),
        'imageUrl'=>$imageUrl, 'imageLicense'=>'Unlicense / Public Domain',
        'imageLicenseUrl'=>'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md',
        'imageAuthor'=>'free-exercise-db contributors', 'video'=>null,
        'source'=>'free-exercise-db',
        'sourceUrl'=>'https://github.com/yuhonas/free-exercise-db/blob/main/exercises/' . rawurlencode($id) . '.json',
        'license'=>'Unlicense / Public Domain',
        'licenseUrl'=>'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md',
        'author'=>'free-exercise-db contributors',
    ];
}

/** @return array<string,mixed>|null */
function training_reference_normalize_repdb(array $row): ?array {
    $id = training_knowledge_text($row['id'] ?? '', 140);
    $name = training_knowledge_text($row['name_en'] ?? '', 120);
    $flat = is_array($row['images']['flat'] ?? null) ? $row['images']['flat'] : [];
    $motionFrames = [];
    foreach (['start','main','peak','end'] as $slot) {
        $path = is_string($flat[$slot] ?? null) ? $flat[$slot] : '';
        $url = training_reference_asset_url(TRAINING_REFERENCE_REPDB_ASSET_BASE, $path);
        if ($url !== null) $motionFrames[$url] = true;
    }
    $imageUrl = array_key_first($motionFrames);
    if ($id === '' || $name === '' || $imageUrl === null) return null;
    $primary = is_array($row['primary_muscles'] ?? null) ? $row['primary_muscles'] : [];
    $secondary = is_array($row['secondary_muscles'] ?? null) ? $row['secondary_muscles'] : [];
    $category = training_knowledge_text($row['category'] ?? '', 80);
    $equipmentRaw = training_knowledge_text($row['equipment'] ?? '', 80);
    $bodyPart = training_knowledge_text($row['body_part'] ?? '', 80);
    $instructionRows = is_array($row['instructions_en'] ?? null) ? $row['instructions_en'] : [];
    $steps = array_values(array_filter(array_map(
        static fn($v): string => training_knowledge_text($v, 420), $instructionRows,
    ), static fn(string $v): bool => mb_strlen($v, 'UTF-8') >= 12));
    $instructions = implode(' ', $steps);
    return [
        'id'=>'repdb-' . $id, 'name'=>$name, 'language'=>'fallback',
        'group'=>training_reference_group_from_text($category . ' ' . $bodyPart . ' ' . implode(' ', $primary) . ' ' . implode(' ', $secondary)),
        'modality'=>training_reference_modality($category, $equipmentRaw),
        'equipment'=>[training_reference_equipment_name($equipmentRaw)],
        'instructions'=>training_knowledge_text($instructions, 2400),
        'steps'=>array_slice($steps, 0, 8),
        'motionFrames'=>array_slice(array_keys($motionFrames), 0, 4),
        'imageUrl'=>$imageUrl, 'imageLicense'=>'RepDB Free Tier License v1.0',
        'imageLicenseUrl'=>'https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md',
        'imageAuthor'=>'RepDB', 'video'=>null, 'source'=>'repdb',
        'sourceUrl'=>'https://exercise-dataset.com/exercise/' . rawurlencode($id) . '/',
        'license'=>'RepDB Free Tier License v1.0',
        'licenseUrl'=>'https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md',
        'author'=>'RepDB',
    ];
}
/** @return list<array<string,mixed>> */
function training_reference_catalog(): array {
    $items = [];
    foreach (training_reference_repdb_rows() as $row) {
        $item = training_reference_normalize_repdb($row);
        if ($item !== null) $items[] = $item;
    }
    foreach (training_reference_free_rows() as $row) {
        $item = training_reference_normalize_free($row);
        if ($item !== null) $items[] = $item;
    }
    return $items;
}

/** @param list<array<string,mixed>> $items @return array<string,array<string,mixed>> */
function training_reference_image_index(array $items): array {
    $index = [];
    foreach ($items as $item) {
        $key = training_knowledge_key((string)($item['name'] ?? ''));
        if ($key === '' || empty($item['imageUrl'])) continue;
        if (!isset($index[$key]) || ($item['source'] ?? '') === 'repdb') $index[$key] = $item;
    }
    return $index;
}
