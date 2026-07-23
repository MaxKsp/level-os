<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';

const ROUTINE_TASKS_KEY = 'tasks_v6';

/** @return list<array<string,mixed>> */
function routine_load_tasks(PDO $db, int $uid): array {
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
    $stmt->execute([$uid, ROUTINE_TASKS_KEY]);
    $raw = $stmt->fetchColumn();
    if (!is_string($raw) || $raw === '') return [];
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) return [];
    return array_values(array_filter($decoded, 'is_array'));
}

/** @param list<array<string,mixed>> $tasks */
function routine_save_tasks(PDO $db, int $uid, array $tasks): void {
    if (count($tasks) > 5000) throw new OverflowException('Limite de tarefas excedido.');
    $encoded = json_encode(array_values($tasks), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($encoded) > 1024 * 1024) throw new OverflowException('Tarefas excedem o limite de armazenamento.');
    if ((string)$db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $sql = 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
            ON CONFLICT(user_id, data_key) DO UPDATE SET data_value = excluded.data_value';
    } else {
        $sql = 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)';
    }
    $db->prepare($sql)->execute([$uid, ROUTINE_TASKS_KEY, $encoded]);
}

/** @param array<string,mixed> $input @return array<string,mixed> */
function routine_add_task(PDO $db, int $uid, array $input, string $source = 'assistant'): array {
    $title = isset($input['title']) && is_string($input['title'])
        ? trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', $input['title'])) : '';
    if ($title === '' || mb_strlen($title) > 160) throw new InvalidArgumentException('Título da tarefa inválido.');
    $date = isset($input['date']) && is_string($input['date']) ? $input['date'] : '';
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date, level_clock_utc_timezone());
    if ($parsed === false || $parsed->format('Y-m-d') !== $date) throw new InvalidArgumentException('Data da tarefa inválida.');
    $time = isset($input['time']) && is_string($input['time']) ? $input['time'] : '';
    if (preg_match('/\A(?:[01]\d|2[0-3]):[0-5]\d\z/D', $time) !== 1) throw new InvalidArgumentException('Horário da tarefa inválido.');
    $id = isset($input['id']) && is_string($input['id']) && preg_match('/\A[a-zA-Z0-9_-]{1,80}\z/D', $input['id']) === 1
        ? $input['id'] : 'task_' . bin2hex(random_bytes(12));
    $tasks = routine_load_tasks($db, $uid);
    foreach ($tasks as $existing) {
        if (($existing['id'] ?? null) === $id) throw new InvalidArgumentException('Tarefa duplicada.');
    }
    $task = [
        'id' => $id, 'title' => $title, 'date' => $date, 'time' => $time,
        'subtitle' => 'Criada pelo assistente', 'category' => 'Geral',
        'completed' => false, 'source' => $source,
    ];
    $tasks[] = $task;
    routine_save_tasks($db, $uid, $tasks);
    return $task;
}

function routine_delete_task(PDO $db, int $uid, string $id): bool {
    if (preg_match('/\A[a-zA-Z0-9_-]{1,80}\z/D', $id) !== 1) return false;
    $tasks = routine_load_tasks($db, $uid);
    $next = array_values(array_filter($tasks, static fn(array $task): bool => (string)($task['id'] ?? '') !== $id));
    if (count($next) === count($tasks)) return false;
    routine_save_tasks($db, $uid, $next);
    return true;
}
