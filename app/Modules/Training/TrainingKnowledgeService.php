<?php
declare(strict_types=1);

/**
 * Catálogo educacional combinado. Wger fornece traduções/vídeos; Free Exercise DB
 * e RepDB ampliam a cobertura de imagens. Só publicamos exercícios com imagem de
 * referência e preservamos licença/autoria de cada fonte.
 */
const TRAINING_KNOWLEDGE_UPSTREAM = 'https://wger.de/api/v2/exerciseinfo/?limit=1000';
const TRAINING_KNOWLEDGE_TTL = 21600;
const TRAINING_KNOWLEDGE_MAX_BYTES = 12_000_000;
const TRAINING_VIDEO_CATALOG_FILE = __DIR__ . '/data/workout-video-catalog.json';
const TRAINING_VIDEO_CATALOG_SOURCE = 'https://github.com/rthepen/workout-database';

require_once __DIR__ . '/TrainingReferenceCatalogService.php';
require_once __DIR__ . '/TrainingVideoCatalogService.php';

function training_knowledge_text(mixed $value, int $max = 4000): string {
    if (!is_string($value)) return '';
    $plain = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $plain = trim((string)preg_replace('/\s+/u', ' ', $plain));
    return mb_substr($plain, 0, $max, 'UTF-8');
}

/** @return list<string> */
function training_knowledge_steps_from_text(string $text): array {
    $plain = training_knowledge_text($text, 2400);
    if ($plain === '') return [];
    $parts = preg_split('/(?<=[.!?])\s+/u', $plain) ?: [];
    $steps = [];
    foreach ($parts as $part) {
        $step = training_knowledge_text((string)$part, 420);
        $step = trim((string)preg_replace('/^(?:step|passo)\s*:?\s*\d+\s*[:.\-)]+\s*/iu', '', $step));
        if (mb_strlen($step, 'UTF-8') >= 12) $steps[] = $step;
        if (count($steps) >= 8) break;
    }
    return $steps;
}

function training_knowledge_key(string $value): string {
    $value = mb_strtolower(trim($value), 'UTF-8');
    $value = strtr($value, [
        'á'=>'a','à'=>'a','â'=>'a','ã'=>'a','ä'=>'a',
        'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
        'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i',
        'ó'=>'o','ò'=>'o','ô'=>'o','õ'=>'o','ö'=>'o',
        'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c',
    ]);
    if (class_exists('Transliterator')) {
        $converted = transliterator_transliterate('Any-Latin; Latin-ASCII', $value);
        if (is_string($converted)) $value = $converted;
    } elseif (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (is_string($converted)) $value = $converted;
    }
    return trim((string)preg_replace('/[^a-z0-9]+/i', ' ', $value));
}

function training_knowledge_equipment_name(string $raw): string {
    $map = [
        'barbell'=>'Barra', 'dumbbell'=>'Halteres', 'kettlebell'=>'Kettlebell',
        'bench'=>'Banco', 'pull-up bar'=>'Barra fixa', 'pull up bar'=>'Barra fixa',
        'gym mat'=>'Colchonete', 'mat'=>'Colchonete', 'bodyweight'=>'Peso corporal',
        'bodyweight exercise'=>'Peso corporal', 'body weight'=>'Peso corporal', 'none (bodyweight exercise)'=>'Peso corporal',
        'cable'=>'Cabo / polia', 'cable machine'=>'Cabo / polia', 'sz-bar'=>'Barra EZ', 'swiss ball'=>'Bola suíça',
        'dumbbells'=>'Halteres', 'resistance band'=>'Faixa elástica', 'ab wheel'=>'Roda abdominal',
        'leverage machine'=>'Máquina articulada', 'cardio equipment'=>'Equipamento de cardio',
        'spinning bike'=>'Bicicleta spinning', 'trx suspension'=>'TRX', 'jump rope'=>'Corda',
        'medicine ball'=>'Medicine ball', 'plyo box'=>'Caixa pliométrica', 'battle rope'=>'Corda naval',
    ];
    $key = training_knowledge_key($raw);
    return $map[$key] ?? training_knowledge_text($raw, 80);
}

/** @return list<string> */
function training_knowledge_search_needles(string $query): array {
    $needle = training_knowledge_key(mb_substr($query, 0, 80, 'UTF-8'));
    if ($needle === '') return [];
    $aliases = [
        'supino'=>'bench press', 'agachamento'=>'squat', 'levantamento terra'=>'deadlift',
        'puxada'=>'pulldown', 'remada'=>'row', 'cadeira extensora'=>'leg extension',
        'extensora'=>'leg extension', 'cadeira flexora'=>'leg curl', 'flexora'=>'leg curl',
        'panturrilha'=>'calf raise', 'desenvolvimento'=>'shoulder press',
        'elevacao lateral'=>'lateral raise', 'rosca'=>'curl', 'triceps'=>'triceps',
        'afundo'=>'lunge', 'abdominal'=>'crunch', 'prancha'=>'plank',
        'flexao'=>'push up', 'barra fixa'=>'pull up', 'esteira'=>'treadmill',
        'bicicleta'=>'bike', 'escada'=>'stair', 'adutora'=>'adduction', 'abdutora'=>'abduction',
    ];
    $needles = [$needle];
    foreach ($aliases as $portuguese=>$english) {
        if (str_contains($needle, $portuguese)) $needles[] = $english;
    }
    return array_values(array_unique($needles));
}
function training_knowledge_group(array $row): string {
    $category = training_knowledge_key((string)($row['category']['name'] ?? ''));
    $muscles = implode(' ', array_map(
        static fn($item): string => training_knowledge_key((string)($item['name_en'] ?? $item['name'] ?? '')),
        array_merge(
            is_array($row['muscles'] ?? null) ? $row['muscles'] : [],
            is_array($row['muscles_secondary'] ?? null) ? $row['muscles_secondary'] : [],
        ),
    ));
    $haystack = $category . ' ' . $muscles;
    return match (true) {
        str_contains($haystack, 'chest') => 'Peito',
        str_contains($haystack, 'back') || str_contains($haystack, 'latissimus') => 'Costas',
        str_contains($haystack, 'shoulder') || str_contains($haystack, 'deltoid') => 'Ombros',
        str_contains($haystack, 'biceps') || str_contains($haystack, 'triceps')
            || str_contains($haystack, 'arm') => 'Braços',
        str_contains($haystack, 'abs') || str_contains($haystack, 'core')
            || str_contains($haystack, 'oblique') => 'Core',
        str_contains($haystack, 'calves') || str_contains($haystack, 'leg')
            || str_contains($haystack, 'glute') || str_contains($haystack, 'quad')
            || str_contains($haystack, 'hamstring') => 'Pernas',
        str_contains($haystack, 'cardio') => 'Cardio',
        default => 'Mobilidade',
    };
}

function training_knowledge_modality(array $row): string {
    $category = training_knowledge_key((string)($row['category']['name'] ?? ''));
    if (str_contains($category, 'cardio')) return 'cardio';
    if (str_contains($category, 'stretch')) return 'mobilidade';
    $equipment = implode(' ', array_map(
        static fn($item): string => training_knowledge_key((string)($item['name'] ?? '')),
        is_array($row['equipment'] ?? null) ? $row['equipment'] : [],
    ));
    return str_contains($equipment, 'bodyweight') || str_contains($equipment, 'body weight')
        ? 'calistenia' : 'forca';
}

/** @return array<string,mixed>|null */
function training_knowledge_translation(array $row): ?array {
    $translations = is_array($row['translations'] ?? null) ? $row['translations'] : [];
    foreach ([7, 2] as $language) {
        foreach ($translations as $entry) {
            if (is_array($entry) && (int)($entry['language'] ?? 0) === $language
                && training_knowledge_text($entry['name'] ?? '', 120) !== '') return $entry;
        }
    }
    foreach ($translations as $entry) {
        if (is_array($entry) && training_knowledge_text($entry['name'] ?? '', 120) !== '') return $entry;
    }
    return null;
}

function training_knowledge_english_name(array $row): string {
    $translations = is_array($row['translations'] ?? null) ? $row['translations'] : [];
    foreach ($translations as $entry) {
        if (is_array($entry) && (int)($entry['language'] ?? 0) === 2) {
            $name = training_knowledge_text($entry['name'] ?? '', 120);
            if ($name !== '') return $name;
        }
    }
    return '';
}

/** @return array{short:string,url:string} */
function training_knowledge_license_by_id(mixed $id): array {
    return match ((int)$id) {
        1 => ['short'=>'CC-BY-SA 3','url'=>'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
        2 => ['short'=>'CC-BY-SA 4','url'=>'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
        3 => ['short'=>'CC0','url'=>'https://creativecommons.org/publicdomain/zero/1.0/'],
        4 => ['short'=>'CC-BY 4','url'=>'https://creativecommons.org/licenses/by/4.0/'],
        5 => ['short'=>'ODbL','url'=>'https://opendatacommons.org/licenses/odbl/'],
        default => ['short'=>'','url'=>''],
    };
}

/** @return array<string,mixed>|null */
function training_knowledge_image(array $row): ?array {
    $images = is_array($row['images'] ?? null) ? $row['images'] : [];
    if ($images === []) return null;
    usort($images, static fn(array $a, array $b): int =>
        (int)($b['is_main'] ?? false) <=> (int)($a['is_main'] ?? false));
    $image = $images[0] ?? [];
    $url = (string)($image['thumbnails']['medium'] ?? $image['image'] ?? '');
    if (!str_starts_with($url, 'https://wger.de/')) return null;
    $license = training_knowledge_license_by_id($image['license'] ?? 0);
    return ['url'=>$url, 'license'=>$license['short'], 'licenseUrl'=>$license['url'],
        'author'=>training_knowledge_text($image['license_author'] ?? '', 100)];
}

/** @return array<string,mixed>|null */
/** @return list<string> */
function training_knowledge_motion_frames(array $row): array {
    $frames = [];
    foreach (is_array($row['images'] ?? null) ? $row['images'] : [] as $image) {
        if (!is_array($image)) continue;
        $url = (string)($image['thumbnails']['medium'] ?? $image['image'] ?? '');
        if (str_starts_with($url, 'https://wger.de/')) $frames[$url] = true;
    }
    return array_slice(array_keys($frames), 0, 4);
}

/** @return array<string,mixed>|null */
function training_knowledge_video(array $row): ?array {
    $videos = is_array($row['videos'] ?? null) ? $row['videos'] : [];
    if ($videos === []) return null;
    usort($videos, static function(array $a, array $b): int {
        $score = static fn(array $v): int =>
            (($v['is_main'] ?? false) ? 10 : 0) + (strtolower((string)($v['codec'] ?? '')) === 'h264' ? 5 : 0);
        return $score($b) <=> $score($a);
    });
    $video = $videos[0];
    $url = (string)($video['video'] ?? '');
    if (!str_starts_with($url, 'https://wger.de/')) return null;
    $license = training_knowledge_license_by_id($video['license'] ?? 0);
    return ['url'=>$url, 'durationSec'=>round((float)($video['duration'] ?? 0), 1),
        'author'=>training_knowledge_text($video['license_author'] ?? '', 100),
        'license'=>$license['short'], 'licenseUrl'=>$license['url']];
}
/** @return array<string,mixed>|null */
function training_knowledge_normalize(array $row): ?array {
    $translation = training_knowledge_translation($row);
    if ($translation === null) return null;
    $name = training_knowledge_text($translation['name'] ?? '', 120);
    if ($name === '') return null;
    $equipment = array_values(array_filter(array_map(
        static fn($item): string => is_array($item)
            ? training_knowledge_equipment_name((string)($item['name'] ?? '')) : '',
        is_array($row['equipment'] ?? null) ? $row['equipment'] : [],
    )));
    $license = is_array($row['license'] ?? null) ? $row['license'] : [];
    $image = training_knowledge_image($row);
    $instructions = training_knowledge_text(
        $translation['description_source'] ?? $translation['description'] ?? '', 2400);
    return [
        'id'=>'wger-' . (int)($row['id'] ?? 0), 'name'=>$name,
        'language'=>(int)($translation['language'] ?? 0) === 7 ? 'pt' : 'fallback',
        'group'=>training_knowledge_group($row), 'modality'=>training_knowledge_modality($row),
        'equipment'=>$equipment, 'instructions'=>$instructions,
        'steps'=>training_knowledge_steps_from_text($instructions),
        'motionFrames'=>training_knowledge_motion_frames($row),
        'imageUrl'=>$image['url'] ?? null,
        'imageLicense'=>$image['license'] ?? '', 'imageLicenseUrl'=>$image['licenseUrl'] ?? '',
        'imageAuthor'=>$image['author'] ?? '', 'video'=>training_knowledge_video($row),
        'source'=>'wger', 'sourceUrl'=>'https://wger.de/exercise/' . (int)($row['id'] ?? 0) . '/view',
        'license'=>training_knowledge_text($license['short_name'] ?? '', 80),
        'licenseUrl'=>training_knowledge_text($license['url'] ?? '', 300),
        'author'=>training_knowledge_text($translation['license_author'] ?? $row['license_author'] ?? '', 120),
    ];
}
/** @return array<int,array<string,mixed>> */
function training_knowledge_upstream_rows(): array {
    $cache = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'levelos-wger-exerciseinfo-v1.json';
    $raw = null;
    if (is_file($cache) && (time() - (int)filemtime($cache)) < TRAINING_KNOWLEDGE_TTL) {
        $candidate = file_get_contents($cache, false, null, 0, TRAINING_KNOWLEDGE_MAX_BYTES + 1);
        if (is_string($candidate) && strlen($candidate) <= TRAINING_KNOWLEDGE_MAX_BYTES) $raw = $candidate;
    }
    if ($raw === null) {
        if (!function_exists('curl_init')) throw new RuntimeException('exercise_library_transport_unavailable');
        $curl = curl_init(TRAINING_KNOWLEDGE_UPSTREAM);
        curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>4, CURLOPT_TIMEOUT=>14,
            CURLOPT_FOLLOWLOCATION=>false, CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: LevelOS/1.0 (+https://lvlos.com)']]);
        $candidate = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if (!is_string($candidate) || $status !== 200 || strlen($candidate) > TRAINING_KNOWLEDGE_MAX_BYTES) {
            if (is_file($cache)) $candidate = file_get_contents($cache, false, null, 0, TRAINING_KNOWLEDGE_MAX_BYTES + 1);
            else throw new RuntimeException('exercise_library_upstream_unavailable');
        }
        $raw = is_string($candidate) ? $candidate : throw new RuntimeException('exercise_library_upstream_unavailable');
        @file_put_contents($cache . '.tmp', $raw, LOCK_EX);
        @rename($cache . '.tmp', $cache);
    }
    $decoded = json_decode($raw, true);
    $rows = is_array($decoded['results'] ?? null) ? $decoded['results'] : null;
    if (!is_array($rows)) throw new RuntimeException('exercise_library_invalid_response');
    return array_values(array_filter($rows, 'is_array'));
}

/** @return list<array<string,mixed>> */
function training_knowledge_catalog_items(): array {
    $cache = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'levelos-training-catalog-v4.json';
    if (is_file($cache) && (time() - (int)filemtime($cache)) < TRAINING_KNOWLEDGE_TTL) {
        $raw = file_get_contents($cache, false, null, 0, TRAINING_KNOWLEDGE_MAX_BYTES + 1);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($decoded)) return array_values(array_filter($decoded, 'is_array'));
    }

    $references = training_reference_catalog();
    $imageIndex = training_reference_image_index($references);
    $itemsByKey = [];
    foreach (training_knowledge_upstream_rows() as $row) {
        $item = training_knowledge_normalize($row);
        if ($item === null) continue;
        $canonical = training_knowledge_key(training_knowledge_english_name($row) ?: (string)$item['name']);
        if (isset($imageIndex[$canonical])) {
            $fallback = $imageIndex[$canonical];
            if (empty($item['imageUrl'])) {
                foreach (['imageUrl','imageLicense','imageLicenseUrl','imageAuthor'] as $field) {
                    $item[$field] = $fallback[$field] ?? $item[$field] ?? null;
                }
            }
            if (count($item['motionFrames'] ?? []) < 2 && !empty($fallback['motionFrames'])) {
                $item['motionFrames'] = $fallback['motionFrames'];
            }
            if (empty($item['steps']) && !empty($fallback['steps'])) $item['steps'] = $fallback['steps'];
        }
        if (empty($item['imageUrl']) || empty($item['steps'])) continue;
        $itemsByKey[$canonical !== '' ? $canonical : training_knowledge_key((string)$item['name'])] = $item;
    }
    foreach ($references as $item) {
        if (empty($item['imageUrl']) || empty($item['steps'])) continue;
        $key = training_knowledge_key((string)$item['name']);
        if ($key !== '' && !isset($itemsByKey[$key])) $itemsByKey[$key] = $item;
    }
    $items = array_values($itemsByKey);
    $encoded = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (is_string($encoded) && strlen($encoded) <= TRAINING_KNOWLEDGE_MAX_BYTES) {
        @file_put_contents($cache . '.tmp', $encoded, LOCK_EX);
        @rename($cache . '.tmp', $cache);
    }
    return $items;
}

/** @return array<string,mixed> */
function training_knowledge_search(string $query, string $group, string $equipment, int $limit, int $offset, bool $videoOnly = false): array {
    $needles = training_knowledge_search_needles($query);
    $group = mb_substr(trim($group), 0, 40, 'UTF-8');
    $equipmentNeedle = training_knowledge_key(mb_substr($equipment, 0, 80, 'UTF-8'));
    $candidates = [];
    foreach (training_video_catalog_items() as $item) {
        if (($group !== '' && $group !== 'Todos' && $item['group'] !== $group)
            || empty($item['imageUrl']) || !is_array($item['video'] ?? null)) continue;
        if ($needles !== []) {
            $haystack = (string)($item['_search'] ?? training_knowledge_key(
                $item['name'] . ' ' . $item['group'] . ' ' . implode(' ', $item['equipment']) . ' ' . $item['instructions']
            ));
            if (!array_filter($needles, static fn(string $needle): bool => str_contains($haystack, $needle))) continue;
        }
        $candidates[] = $item;
    }
    $equipmentOptions = [];
    foreach ($candidates as $item) foreach ($item['equipment'] as $name) $equipmentOptions[$name] = true;
    $items = $equipmentNeedle === '' ? $candidates : array_values(array_filter($candidates,
        static fn(array $item): bool => str_contains(training_knowledge_key(implode(' ', $item['equipment'])), $equipmentNeedle)));
    // A biblioteca pública é video-first: nenhum card é publicado sem vídeo e passos.
    usort($items, static fn(array $a, array $b): int =>
        ((int)(($b['video']['type'] ?? '') === 'standard') <=> (int)(($a['video']['type'] ?? '') === 'standard'))
        ?: strcasecmp((string)$a['name'], (string)$b['name']));
    $options = array_keys($equipmentOptions); sort($options, SORT_NATURAL | SORT_FLAG_CASE);
    $total = count($items);
    $page = array_slice($items, max(0, $offset), max(1, min(60, $limit)));
    foreach ($page as &$item) unset($item['_search']);
    unset($item);
    return ['items'=>$page, 'total'=>$total, 'offset'=>max(0, $offset),
        'equipmentOptions'=>$options, 'videoRequired'=>true,
        'attribution'=>'Biblioteca em vídeo: Workout Database (metadados MIT) com tutoriais externos incorporados do YouTube. Cada exercício exibido possui vídeo real e execução em etapas.'];
}
