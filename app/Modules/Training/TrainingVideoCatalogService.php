<?php
declare(strict_types=1);

/**
 * Catálogo local de exercícios com vídeo real. O snapshot vem do
 * rthepen/workout-database (metadados MIT). Os vídeos continuam hospedados
 * no YouTube e são apenas incorporados pelo Level OS.
 */
function training_video_catalog_group(array $row): string {
    $category = training_knowledge_key((string)($row['category'] ?? ''));
    $muscles = training_knowledge_key(implode(' ', array_merge(
        is_array($row['primary'] ?? null) ? $row['primary'] : [],
        is_array($row['secondary'] ?? null) ? $row['secondary'] : [],
    )));
    $haystack = $category . ' ' . $muscles;
    return match (true) {
        str_contains($haystack, 'cardio') || str_contains($haystack, 'cardiovascular') => 'Cardio',
        str_contains($haystack, 'chest') || str_contains($haystack, 'pectoral') => 'Peito',
        str_contains($haystack, 'back') || str_contains($haystack, 'latissimus')
            || str_contains($haystack, 'rhomboid') || str_contains($haystack, 'trapez')
            || str_contains($haystack, 'erector') => 'Costas',
        str_contains($haystack, 'shoulder') || str_contains($haystack, 'deltoid') => 'Ombros',
        str_contains($haystack, 'biceps') || str_contains($haystack, 'triceps')
            || str_contains($haystack, 'forearm') || str_contains($haystack, 'brachialis') => 'Braços',        str_contains($haystack, 'abs') || str_contains($haystack, 'core')
            || str_contains($haystack, 'oblique') || str_contains($haystack, 'abdominis') => 'Core',
        str_contains($haystack, 'leg') || str_contains($haystack, 'quad')
            || str_contains($haystack, 'hamstring') || str_contains($haystack, 'glute')
            || str_contains($haystack, 'calf') || str_contains($haystack, 'calves')
            || str_contains($haystack, 'adductor') || str_contains($haystack, 'abductor')
            || str_contains($haystack, 'iliopsoas') => 'Pernas',
        default => 'Mobilidade',
    };
}

function training_video_catalog_modality(array $row, string $group): string {
    if ($group === 'Cardio') return 'cardio';
    $equipment = training_knowledge_key((string)($row['equipment'] ?? ''));
    if (str_contains($equipment, 'bodyweight') || str_contains($equipment, 'body weight')) {
        return 'calistenia';
    }
    return 'forca';
}

/** @return list<array<string,mixed>> */
function training_video_catalog_rows(): array {
    static $rows = null;
    if (is_array($rows)) return $rows;
    if (!is_file(TRAINING_VIDEO_CATALOG_FILE)) {
        throw new RuntimeException('training_video_catalog_missing');
    }
    $raw = file_get_contents(TRAINING_VIDEO_CATALOG_FILE);
    if (!is_string($raw) || $raw === '' || strlen($raw) > 2_000_000) {
        throw new RuntimeException('training_video_catalog_invalid');
    }    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) throw new RuntimeException('training_video_catalog_invalid_json');
    $rows = array_values(array_filter($decoded, static fn($item): bool => is_array($item)));
    return $rows;
}

/** @return array<string,array<string,mixed>> */
function training_video_catalog_ptbr(): array {
    static $rows = null;
    if (is_array($rows)) return $rows;
    if (!is_file(TRAINING_VIDEO_PTBR_FILE)) return $rows = [];
    $decoded = json_decode((string)file_get_contents(TRAINING_VIDEO_PTBR_FILE), true);
    return $rows = is_array($decoded) ? $decoded : [];
}

/** @return array<string,array<string,mixed>> */
function training_video_catalog_ptbr_localization(): array {
    static $rows = null;
    if (is_array($rows)) return $rows;
    if (!is_file(TRAINING_VIDEO_PTBR_LOCALIZATION_FILE)) return $rows = [];
    $decoded = json_decode((string)file_get_contents(TRAINING_VIDEO_PTBR_LOCALIZATION_FILE), true);
    return $rows = is_array($decoded) ? $decoded : [];
}

/** @return list<string> */
function training_video_catalog_generic_ptbr_steps(string $group, string $equipment): array {
    if ($group === 'Cardio') return [
        'Ajuste o equipamento e comece em um ritmo leve para estabilizar a postura.',
        'Aumente a intensidade gradualmente, mantendo respiração e movimento sob controle.',
        'Evite mudanças bruscas de ritmo e reduza a intensidade se perder a técnica.',
        'Finalize desacelerando aos poucos antes de encerrar o exercício.',
    ];
    if ($group === 'Mobilidade') return [
        'Adote uma posição confortável e estável antes de iniciar o movimento.',
        'Movimente-se devagar e sem usar impulso, respeitando a amplitude sem dor.',
        'Mantenha a respiração contínua e evite compensações do tronco.',
        'Retorne à posição inicial de forma controlada e repita com a mesma qualidade.',
    ];
    return [
        'Ajuste ' . mb_strtolower($equipment, 'UTF-8') . ' e escolha uma carga que permita controlar o movimento.',
        'Mantenha o tronco estável e execute a fase principal sem usar impulso.',
        'Respeite uma amplitude confortável, sem perder o alinhamento das articulações.',
        'Retorne lentamente à posição inicial e repita mantendo a mesma técnica.',
    ];
}

/** @return list<array<string,mixed>> */
function training_video_catalog_items(): array {
    static $items = null;
    if (is_array($items)) return $items;
    $items = [];
    $ptbr = training_video_catalog_ptbr();
    $localizedRows = training_video_catalog_ptbr_localization();
    foreach (training_video_catalog_rows() as $row) {
        $rowId = training_knowledge_text($row['id'] ?? '', 100);
        $override = is_array($ptbr[$rowId] ?? null) ? $ptbr[$rowId] : [];
        $localized = is_array($localizedRows[$rowId] ?? null) ? $localizedRows[$rowId] : [];
        $video = is_array($row['video'] ?? null) ? $row['video'] : [];
        $youtubeId = trim((string)($override['youtubeId'] ?? $video['youtubeId'] ?? ''));
        if (preg_match('/\A[A-Za-z0-9_-]{8,16}\z/D', $youtubeId) !== 1) continue;
        $group = training_video_catalog_group($row);
        $equipment = training_knowledge_equipment_name((string)($row['equipment'] ?? ''));
        if ($equipment === '') $equipment = 'Equipamento não informado';

        $sourceSteps = is_array($override['steps'] ?? null)
            ? $override['steps']
            : (is_array($localized['steps'] ?? null)
                ? $localized['steps']
                : training_video_catalog_generic_ptbr_steps($group, $equipment));
        $steps = [];
        foreach ($sourceSteps as $step) {
            $clean = training_knowledge_text($step, 420);
            if ($clean !== '') $steps[] = $clean;
            if (count($steps) >= 10) break;
        }
        if ($steps === []) $steps = training_video_catalog_generic_ptbr_steps($group, $equipment);

        $cues = [];
        $sourceCues = is_array($localized['cues'] ?? null) ? $localized['cues'] : [];
        foreach ($sourceCues as $cue) {
            $clean = training_knowledge_text($cue, 320);
            if ($clean !== '') $cues[] = $clean;
            if (count($cues) >= 6) break;
        }

        $aliases = array_values(array_filter(array_map(
            static fn($alias): string => training_knowledge_text($alias, 120),
            is_array($row['aliases'] ?? null) ? $row['aliases'] : [],
        )));
        $displayName = training_knowledge_text(
            $override['name'] ?? $localized['name'] ?? $row['name'] ?? '', 120
        );
        $isPtBrVideo = training_knowledge_text($override['youtubeId'] ?? '', 20) !== '';
        $videoAuthor = $isPtBrVideo
            ? training_knowledge_text($override['channel'] ?? 'Smart Fit', 100)
            : training_knowledge_text($video['channel'] ?? '', 100);
        $watchUrl = 'https://www.youtube.com/watch?v=' . $youtubeId;
        $items[] = [
            'id'=>'workoutdb-' . training_knowledge_text($row['id'] ?? '', 100),
            'name'=>$displayName,
            'language'=>'pt-BR',
            'group'=>$group,
            'modality'=>training_video_catalog_modality($row, $group),
            'equipment'=>[$equipment],
            'instructions'=>implode(' ', $steps),
            'steps'=>$steps,
            'formCues'=>$cues,
            'motionFrames'=>[],
            'imageUrl'=>'https://i.ytimg.com/vi/' . $youtubeId . '/mqdefault.jpg',
            'imageLicense'=>'',
            'imageLicenseUrl'=>'',
            'imageAuthor'=>$videoAuthor,
            'video'=>[
                'provider'=>'youtube',
                'youtubeId'=>$youtubeId,
                'url'=>$watchUrl,
                'startSeconds'=>max(0, (int)($video['startSeconds'] ?? 0)),
                'durationSec'=>max(0, (int)($video['durationSeconds'] ?? 0)),
                'type'=>training_knowledge_text($video['type'] ?? '', 30),
                'language'=>$isPtBrVideo ? 'pt-BR' : training_knowledge_text($video['language'] ?? '', 20),
                'author'=>$videoAuthor,
            ],            'source'=>'workout-db',
            'sourceUrl'=>TRAINING_VIDEO_CATALOG_SOURCE,
            'license'=>'MIT (metadados)',
            'licenseUrl'=>TRAINING_VIDEO_CATALOG_SOURCE . '/blob/main/LICENSE',
            'author'=>'Workout Database contributors',
            '_search'=>training_knowledge_key(implode(' ', [
                (string)($row['name'] ?? ''),
                implode(' ', $aliases),
                (string)($row['equipment'] ?? ''),
                (string)($row['category'] ?? ''),
                implode(' ', is_array($row['primary'] ?? null) ? $row['primary'] : []),
                implode(' ', is_array($row['secondary'] ?? null) ? $row['secondary'] : []),
                implode(' ', $steps),
                implode(' ', $cues),
            ])),
        ];
    }
    usort($items, static fn(array $a, array $b): int =>
        ((($b['video']['language'] ?? '') === 'pt-BR') <=> (($a['video']['language'] ?? '') === 'pt-BR'))
        ?: strcasecmp((string)$a['name'], (string)$b['name']));
    return $items;
}
