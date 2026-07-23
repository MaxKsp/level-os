<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';

const PROGRESS_LEVEL_BASE_XP = 120;
const PROGRESS_EVENT_XP = [
    'rotina' => 20,
    'treino' => 80,
    'financeiro' => 8,
];

function progress_driver(PDO $db): string {
    return (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
}

function progress_insert_ignore(PDO $db, string $mysql, string $sqlite, array $params = []): PDOStatement {
    $stmt = $db->prepare(progress_driver($db) === 'sqlite' ? $sqlite : $mysql);
    $stmt->execute($params);
    return $stmt;
}

function progress_ensure_user(PDO $db, int $uid): void {
    progress_insert_ignore(
        $db,
        'INSERT IGNORE INTO user_progress (user_id, level, xp) VALUES (?, 1, 0)',
        'INSERT OR IGNORE INTO user_progress (user_id, level, xp) VALUES (?, 1, 0)',
        [$uid],
    );
}

/** XP total acumulado necessário para iniciar o nível informado. */
function progress_level_threshold(int $level): int {
    $level = max(1, min(100, $level));
    $total = 0;
    for ($current = 1; $current < $level; $current++) {
        $total += (int)round(PROGRESS_LEVEL_BASE_XP * ($current ** 1.5));
    }
    return $total;
}

function progress_level_from_xp(int $xp): int {
    $level = 1;
    while ($level < 100 && $xp >= progress_level_threshold($level + 1)) {
        $level++;
    }
    return $level;
}

function progress_level_title(int $level): string {
    return match (true) {
        $level >= 25 => 'Lenda pessoal',
        $level >= 15 => 'Alta performance',
        $level >= 10 => 'Ascendente',
        $level >= 7 => 'Consistente',
        $level >= 4 => 'Em evolução',
        default => 'Iniciante',
    };
}

/** @return array{days:int,latest:?string} */
function progress_streak_snapshot(PDO $db, int $uid): array {
    $stmt = $db->prepare("SELECT DISTINCT DATE(created_at) AS active_date
        FROM xp_events
        WHERE user_id = ? AND type IN ('rotina','treino','financeiro')
        ORDER BY active_date DESC LIMIT 370");
    $stmt->execute([$uid]);
    $dates = array_values(array_filter(array_map(
        static fn(array $row): ?string => isset($row['active_date']) ? (string)$row['active_date'] : null,
        $stmt->fetchAll(PDO::FETCH_ASSOC),
    )));
    if ($dates === []) return ['days' => 0, 'latest' => null];

    $today = level_clock_today();
    $latest = new DateTimeImmutable($dates[0]);
    $yesterday = $today->modify('-1 day');
    if ($latest < $yesterday || $latest > $today) return ['days' => 0, 'latest' => $dates[0]];

    $expected = $latest;
    $days = 0;
    foreach ($dates as $date) {
        if ($date !== $expected->format('Y-m-d')) break;
        $days++;
        $expected = $expected->modify('-1 day');
    }
    return ['days' => $days, 'latest' => $dates[0]];
}

function progress_candidate_streak(PDO $db, int $uid): int {
    $snapshot = progress_streak_snapshot($db, $uid);
    $today = level_clock_today()->format('Y-m-d');
    if ($snapshot['latest'] === $today) return max(1, $snapshot['days']);
    $yesterday = level_clock_today()->modify('-1 day')->format('Y-m-d');
    return $snapshot['latest'] === $yesterday ? $snapshot['days'] + 1 : 1;
}

function progress_event_amount(PDO $db, int $uid, string $type): int {
    $base = PROGRESS_EVENT_XP[$type] ?? 0;
    if ($base <= 0) throw new InvalidArgumentException('Tipo de evento inválido.');
    $streak = progress_candidate_streak($db, $uid);
    $multiplier = 1 + min(5, max(0, $streak - 1)) * 0.10;
    return (int)round($base * $multiplier);
}

/** @return array<string,int> */
function progress_event_counts(PDO $db, int $uid): array {
    $stmt = $db->prepare('SELECT type, COUNT(*) AS total FROM xp_events WHERE user_id = ? GROUP BY type');
    $stmt->execute([$uid]);
    $counts = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $counts[(string)$row['type']] = (int)$row['total'];
    }
    return $counts;
}

/** @return array{category:string,current:int,goal:int} */
function progress_achievement_meta(string $code, array $counts, int $xp, int $level, int $streak): array {
    return match ($code) {
        'primeiro_passo' => ['category' => 'rotina', 'current' => (int)($counts['rotina'] ?? 0), 'goal' => 1],
        'rotina_10' => ['category' => 'rotina', 'current' => (int)($counts['rotina'] ?? 0), 'goal' => 10],
        'rotina_50' => ['category' => 'rotina', 'current' => (int)($counts['rotina'] ?? 0), 'goal' => 50],
        'rotina_100' => ['category' => 'rotina', 'current' => (int)($counts['rotina'] ?? 0), 'goal' => 100],
        'rotina_250' => ['category' => 'rotina', 'current' => (int)($counts['rotina'] ?? 0), 'goal' => 250],
        'primeiro_treino' => ['category' => 'treino', 'current' => (int)($counts['treino'] ?? 0), 'goal' => 1],
        'treinos_5' => ['category' => 'treino', 'current' => (int)($counts['treino'] ?? 0), 'goal' => 5],
        'treinos_20' => ['category' => 'treino', 'current' => (int)($counts['treino'] ?? 0), 'goal' => 20],
        'treinos_50' => ['category' => 'treino', 'current' => (int)($counts['treino'] ?? 0), 'goal' => 50],
        'treinos_100' => ['category' => 'treino', 'current' => (int)($counts['treino'] ?? 0), 'goal' => 100],
        'controle_financeiro' => ['category' => 'financeiro', 'current' => (int)($counts['financeiro'] ?? 0), 'goal' => 1],
        'financeiro_10' => ['category' => 'financeiro', 'current' => (int)($counts['financeiro'] ?? 0), 'goal' => 10],
        'financeiro_50' => ['category' => 'financeiro', 'current' => (int)($counts['financeiro'] ?? 0), 'goal' => 50],
        'financeiro_100' => ['category' => 'financeiro', 'current' => (int)($counts['financeiro'] ?? 0), 'goal' => 100],
        'financeiro_250' => ['category' => 'financeiro', 'current' => (int)($counts['financeiro'] ?? 0), 'goal' => 250],
        'sequencia_3' => ['category' => 'consistencia', 'current' => $streak, 'goal' => 3],
        'sequencia_7' => ['category' => 'consistencia', 'current' => $streak, 'goal' => 7],
        'sequencia_30' => ['category' => 'consistencia', 'current' => $streak, 'goal' => 30],
        'sequencia_60' => ['category' => 'consistencia', 'current' => $streak, 'goal' => 60],
        'sequencia_100' => ['category' => 'consistencia', 'current' => $streak, 'goal' => 100],
        'nivel_5' => ['category' => 'nivel', 'current' => $level, 'goal' => 5],
        'nivel_10' => ['category' => 'nivel', 'current' => $level, 'goal' => 10],
        'nivel_25' => ['category' => 'nivel', 'current' => $level, 'goal' => 25],
        'nivel_50' => ['category' => 'nivel', 'current' => $level, 'goal' => 50],
        'xp_1000' => ['category' => 'xp', 'current' => $xp, 'goal' => 1000],
        'xp_5000' => ['category' => 'xp', 'current' => $xp, 'goal' => 5000],
        'xp_10000' => ['category' => 'xp', 'current' => $xp, 'goal' => 10000],
        'xp_25000' => ['category' => 'xp', 'current' => $xp, 'goal' => 25000],
        'xp_50000' => ['category' => 'xp', 'current' => $xp, 'goal' => 50000],
        'equilibrio_10' => [
            'category' => 'geral',
            'current' => (int)(($counts['rotina'] ?? 0) >= 10)
                + (int)(($counts['financeiro'] ?? 0) >= 10)
                + (int)(($counts['treino'] ?? 0) >= 10),
            'goal' => 3,
        ],
        default => ['category' => 'geral', 'current' => 0, 'goal' => 1],
    };
}

function progress_achievement_earned(string $code, array $counts, int $xp, int $level, int $streak): bool {
    $meta = progress_achievement_meta($code, $counts, $xp, $level, $streak);
    return $meta['current'] >= $meta['goal'];
}

/** @return array<int,array<string,mixed>> */
function progress_unlock_achievements(PDO $db, int $uid, int &$xp): array {
    $catalog = $db->query('SELECT code, title, description, xp_bonus, icon FROM achievements ORDER BY code')->fetchAll(PDO::FETCH_ASSOC);
    $counts = progress_event_counts($db, $uid);
    $streak = progress_streak_snapshot($db, $uid)['days'];
    $level = progress_level_from_xp($xp);
    $unlocked = [];

    do {
        $added = false;
        $level = progress_level_from_xp($xp);
        foreach ($catalog as $achievement) {
            $code = (string)$achievement['code'];
            $meta = progress_achievement_meta($code, $counts, $xp, $level, $streak);
            if ($meta['current'] < $meta['goal']) continue;
            $insert = progress_insert_ignore(
                $db,
                'INSERT IGNORE INTO user_achievements (user_id, achievement_code) VALUES (?, ?)',
                'INSERT OR IGNORE INTO user_achievements (user_id, achievement_code) VALUES (?, ?)',
                [$uid, $code],
            );
            if ($insert->rowCount() !== 1) continue;

            $bonus = max(0, (int)$achievement['xp_bonus']);
            if ($bonus > 0) {
                $ref = 'conquista:' . $code;
                $event = progress_insert_ignore(
                    $db,
                    "INSERT IGNORE INTO xp_events (user_id, type, amount, ref) VALUES (?, 'conquista', ?, ?)",
                    "INSERT OR IGNORE INTO xp_events (user_id, type, amount, ref) VALUES (?, 'conquista', ?, ?)",
                    [$uid, $bonus, $ref],
                );
                if ($event->rowCount() === 1) $xp += $bonus;
            }
            $achievement['unlocked'] = true;
            $achievement['unlocked_at'] = level_clock_now()->format(DATE_ATOM);
            $achievement += $meta;
            $unlocked[] = $achievement;
            $added = true;
            $level = progress_level_from_xp($xp);
        }
    } while ($added);
    return $unlocked;
}

/**
 * Reconcilia conquistas adicionadas depois que o usuário já cumpriu o marco.
 * @return array<int,array<string,mixed>>
 */
function progress_reconcile_user(PDO $db, int $uid): array {
    $ownTransaction = !$db->inTransaction();
    if ($ownTransaction) $db->beginTransaction();
    try {
        progress_ensure_user($db, $uid);
        $sql = 'SELECT level, xp FROM user_progress WHERE user_id = ?' . (progress_driver($db) === 'mysql' ? ' FOR UPDATE' : '');
        $stmt = $db->prepare($sql);
        $stmt->execute([$uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['level' => 1, 'xp' => 0];
        $xp = max(0, (int)$row['xp']);
        $unlocked = progress_unlock_achievements($db, $uid, $xp);
        if ($unlocked !== []) {
            $update = $db->prepare('UPDATE user_progress SET level = ?, xp = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
            $update->execute([progress_level_from_xp($xp), $xp, $uid]);
        }
        if ($ownTransaction) $db->commit();
        return $unlocked;
    } catch (Throwable $e) {
        if ($ownTransaction && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @return array<string,mixed> */
function progress_get_state(PDO $db, int $uid): array {
    progress_ensure_user($db, $uid);
    $stmt = $db->prepare('SELECT level, xp, updated_at FROM user_progress WHERE user_id = ?');
    $stmt->execute([$uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['level' => 1, 'xp' => 0, 'updated_at' => null];
    $xp = max(0, (int)$row['xp']);
    $level = progress_level_from_xp($xp);
    if ((int)$row['level'] !== $level) {
        $syncLevel = $db->prepare('UPDATE user_progress SET level = ? WHERE user_id = ?');
        $syncLevel->execute([$level, $uid]);
    }
    $currentThreshold = progress_level_threshold($level);
    $nextThreshold = progress_level_threshold($level + 1);
    $span = max(1, $nextThreshold - $currentThreshold);
    $xpIntoLevel = max(0, $xp - $currentThreshold);

    $achievements = $db->prepare('SELECT a.code, a.title, a.description, a.xp_bonus, a.icon,
        CASE WHEN ua.achievement_code IS NULL THEN 0 ELSE 1 END AS unlocked,
        ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_code = a.code AND ua.user_id = ?
        ORDER BY unlocked DESC, ua.unlocked_at DESC, a.code');
    $achievements->execute([$uid]);
    $counts = progress_event_counts($db, $uid);
    $streak = progress_streak_snapshot($db, $uid)['days'];
    $achievementRows = array_map(static function(array $item) use ($counts, $xp, $level, $streak): array {
        $item['xp_bonus'] = (int)$item['xp_bonus'];
        $item['unlocked'] = (bool)$item['unlocked'];
        $item += progress_achievement_meta((string)$item['code'], $counts, $xp, $level, $streak);
        return $item;
    }, $achievements->fetchAll(PDO::FETCH_ASSOC));

    return [
        'level' => $level,
        'title' => progress_level_title($level),
        'xp' => $xp,
        'xp_into_level' => $xpIntoLevel,
        'xp_to_next' => max(0, $nextThreshold - $xp),
        'progress_pct' => min(100, round(($xpIntoLevel / $span) * 100, 1)),
        'streak' => $streak,
        'achievements' => $achievementRows,
        'updated_at' => $row['updated_at'],
    ];
}

/**
 * Registra um evento com valor definido no servidor e ref idempotente.
 * @return array{state:array<string,mixed>,delta:int,level_up:bool,duplicate:bool,unlocked:array<int,array<string,mixed>>}
 */
function progress_award_event(PDO $db, int $uid, string $type, string $ref): array {
    if (!array_key_exists($type, PROGRESS_EVENT_XP)) throw new InvalidArgumentException('Tipo de evento inválido.');
    if ($ref === '' || strlen($ref) > 191 || !preg_match('/^[a-zA-Z0-9:_-]+$/', $ref)) {
        throw new InvalidArgumentException('Referência de evento inválida.');
    }

    $ownTransaction = !$db->inTransaction();
    if ($ownTransaction) $db->beginTransaction();
    try {
        progress_ensure_user($db, $uid);
        $lockSql = 'SELECT level, xp FROM user_progress WHERE user_id = ?' . (progress_driver($db) === 'mysql' ? ' FOR UPDATE' : '');
        $lock = $db->prepare($lockSql);
        $lock->execute([$uid]);
        $before = $lock->fetch(PDO::FETCH_ASSOC) ?: ['level' => 1, 'xp' => 0];

        $beforeLevel = progress_level_from_xp((int)$before['xp']);
        $amount = progress_event_amount($db, $uid, $type);
        $insert = progress_insert_ignore(
            $db,
            'INSERT IGNORE INTO xp_events (user_id, type, amount, ref) VALUES (?, ?, ?, ?)',
            'INSERT OR IGNORE INTO xp_events (user_id, type, amount, ref) VALUES (?, ?, ?, ?)',
            [$uid, $type, $amount, $ref],
        );
        if ($insert->rowCount() !== 1) {
            $state = progress_get_state($db, $uid);
            if ($ownTransaction) $db->commit();
            return ['state' => $state, 'delta' => 0, 'level_up' => false, 'duplicate' => true, 'unlocked' => []];
        }
        $xp = max(0, (int)$before['xp']) + $amount;
        $unlocked = progress_unlock_achievements($db, $uid, $xp);
        $level = progress_level_from_xp($xp);
        $update = $db->prepare('UPDATE user_progress SET level = ?, xp = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
        $update->execute([$level, $xp, $uid]);

        $state = progress_get_state($db, $uid);
        if ($ownTransaction) $db->commit();
        return [
            'state' => $state,
            'delta' => $amount + array_sum(array_map(static fn(array $item): int => (int)$item['xp_bonus'], $unlocked)),
            'level_up' => $level > $beforeLevel,
            'duplicate' => false,
            'unlocked' => $unlocked,
        ];
    } catch (Throwable $e) {
        if ($ownTransaction && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/**
 * Remove um award idempotente durante undo e reconcilia XP/nível pela fonte
 * canônica xp_events. Conquistas já desbloqueadas permanecem monotônicas.
 */
function progress_revoke_event(PDO $db, int $uid, string $ref): bool {
    if ($ref === '' || strlen($ref) > 191 || !preg_match('/^[a-zA-Z0-9:_-]+$/', $ref)) {
        throw new InvalidArgumentException('Referência de evento inválida.');
    }
    $ownTransaction = !$db->inTransaction();
    if ($ownTransaction) $db->beginTransaction();
    try {
        progress_ensure_user($db, $uid);
        $lockSql = 'SELECT level, xp FROM user_progress WHERE user_id = ?' . (progress_driver($db) === 'mysql' ? ' FOR UPDATE' : '');
        $lock = $db->prepare($lockSql);
        $lock->execute([$uid]);
        $delete = $db->prepare('DELETE FROM xp_events WHERE user_id = ? AND ref = ?');
        $delete->execute([$uid, $ref]);
        if ($delete->rowCount() !== 1) {
            if ($ownTransaction) $db->commit();
            return false;
        }
        $sum = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM xp_events WHERE user_id = ?');
        $sum->execute([$uid]);
        $xp = max(0, (int)$sum->fetchColumn());
        $db->prepare('UPDATE user_progress SET level = ?, xp = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
            ->execute([progress_level_from_xp($xp), $xp, $uid]);
        if ($ownTransaction) $db->commit();
        return true;
    } catch (Throwable $e) {
        if ($ownTransaction && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
