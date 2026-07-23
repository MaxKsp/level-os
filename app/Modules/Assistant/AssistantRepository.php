<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';
require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';

final class AssistantRepository {
    private const CRYPTO_PROVIDER = 'assistant';
    private const AGENT_KEYS = ['geral', 'financeiro', 'agenda', 'treinos', 'alimentacao'];

    public function __construct(private readonly PDO $db, private readonly TokenCrypto $crypto) {
    }

    /** @return array<string,mixed> */
    public function reserve(int $userId, string $requestId): array {
        $token = bin2hex(random_bytes(16));
        try {
            $stmt = $this->db->prepare('INSERT INTO assistant_actions
                (user_id, action_token, request_id, action_type, provider, status, created_at)
                VALUES (?, ?, ?, ?, NULL, ?, ?)');
            $stmt->execute([$userId, $token, $requestId, 'pending', 'routing', level_clock_utc_sql()]);
        } catch (PDOException $e) {
            $existing = $this->findByRequest($userId, $requestId);
            if ($existing !== null) return $existing;
            throw $e;
        }
        return $this->findByRequest($userId, $requestId) ?? throw new RuntimeException('Assistant reservation disappeared.');
    }

    /** @return array<string,mixed>|null */
    public function findByRequest(int $userId, string $requestId, bool $forUpdate = false): ?array {
        $suffix = $forUpdate && $this->driver() === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->db->prepare('SELECT * FROM assistant_actions WHERE user_id = ? AND request_id = ? LIMIT 1' . $suffix);
        $stmt->execute([$userId, $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /** @return array<string,mixed>|null */
    public function findByToken(int $userId, string $actionToken, bool $forUpdate = false): ?array {
        $suffix = $forUpdate && $this->driver() === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->db->prepare('SELECT * FROM assistant_actions WHERE user_id = ? AND action_token = ? LIMIT 1' . $suffix);
        $stmt->execute([$userId, $actionToken]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /** @param array<string,mixed> $response @param array<string,mixed>|null $undo */
    public function complete(
        int $userId,
        string $requestId,
        string $action,
        ?string $provider,
        string $status,
        array $response,
        ?array $undo,
        ?string $undoExpiresAt,
        string $summary,
    ): void {
        $responseCipher = $this->encryptJson($response, $userId, 'response');
        $undoCipher = $undo !== null ? $this->encryptJson($undo, $userId, 'undo') : null;
        $stmt = $this->db->prepare('UPDATE assistant_actions SET action_type = ?, provider = ?, status = ?,
            response_payload = ?, undo_payload = ?, undo_expires_at = ?, result_summary = ?
            WHERE user_id = ? AND request_id = ? AND status = ?');
        $stmt->execute([$action, $provider, $status, $responseCipher, $undoCipher, $undoExpiresAt,
            mb_substr($summary, 0, 255), $userId, $requestId, 'routing']);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('Assistant action could not be completed.');
    }

    public function fail(int $userId, string $requestId, ?string $provider, string $summary): void {
        $stmt = $this->db->prepare('UPDATE assistant_actions SET provider = ?, status = ?, result_summary = ?
            WHERE user_id = ? AND request_id = ? AND status = ?');
        $stmt->execute([$provider, 'failed', mb_substr($summary, 0, 255), $userId, $requestId, 'routing']);
    }

    /** @return array<string,mixed>|null */
    public function responseFromRow(array $row, int $userId): ?array {
        if (!is_string($row['response_payload'] ?? null) || $row['response_payload'] === '') return null;
        return $this->decryptJson((string)$row['response_payload'], $userId, 'response');
    }

    /** @return array<string,mixed>|null */
    public function undoFromRow(array $row, int $userId): ?array {
        if (!is_string($row['undo_payload'] ?? null) || $row['undo_payload'] === '') return null;
        return $this->decryptJson((string)$row['undo_payload'], $userId, 'undo');
    }

    /** @return array{provider:string,route:array<string,mixed>}|null */
    public function cachedRoute(int $userId, string $cacheKey): ?array {
        $stmt = $this->db->prepare('SELECT provider, route_payload FROM assistant_route_cache
            WHERE user_id = ? AND cache_key = ? AND expires_at > ? LIMIT 1');
        $stmt->execute([$userId, $cacheKey, level_clock_utc_sql()]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        try {
            return ['provider' => (string)$row['provider'], 'route' => $this->decryptJson((string)$row['route_payload'], $userId, 'route')];
        } catch (Throwable) {
            $this->db->prepare('DELETE FROM assistant_route_cache WHERE user_id = ? AND cache_key = ?')->execute([$userId, $cacheKey]);
            return null;
        }
    }

    /** @param array<string,mixed> $route */
    public function cacheRoute(int $userId, string $cacheKey, string $provider, array $route, int $ttlSeconds = 45): void {
        $cipher = $this->encryptJson($route, $userId, 'route');
        $expires = level_clock_utc_sql(level_clock_epoch() + max(10, min(120, $ttlSeconds)));
        $now = level_clock_utc_sql();
        if ($this->driver() === 'sqlite') {
            $sql = 'INSERT INTO assistant_route_cache (user_id, cache_key, provider, route_payload, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, cache_key) DO UPDATE SET
                provider = excluded.provider, route_payload = excluded.route_payload, expires_at = excluded.expires_at, created_at = excluded.created_at';
        } else {
            $sql = 'INSERT INTO assistant_route_cache (user_id, cache_key, provider, route_payload, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE provider = VALUES(provider), route_payload = VALUES(route_payload),
                expires_at = VALUES(expires_at), created_at = VALUES(created_at)';
        }
        $this->db->prepare($sql)->execute([$userId, $cacheKey, $provider, $cipher, $expires, $now]);
    }

    public function markUndone(int $userId, string $actionToken, array $response): void {
        $stmt = $this->db->prepare('UPDATE assistant_actions SET status = ?, undone_at = ?, response_payload = ?, undo_payload = NULL
            WHERE user_id = ? AND action_token = ? AND status = ?');
        $stmt->execute(['undone', level_clock_utc_sql(), $this->encryptJson($response, $userId, 'response'), $userId, $actionToken, 'applied']);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('Assistant undo status changed concurrently.');
    }

    /** @param array<string,mixed> $response @param array<string,mixed>|null $undo */
    public function resolveConfirmation(
        int $userId,
        string $actionToken,
        string $status,
        array $response,
        ?array $undo,
        ?string $undoExpiresAt,
        string $summary,
    ): void {
        if (!in_array($status, ['applied', 'answered', 'cancelled'], true)) {
            throw new InvalidArgumentException('Invalid confirmation status.');
        }
        $responseCipher = $this->encryptJson($response, $userId, 'response');
        $undoCipher = $undo !== null ? $this->encryptJson($undo, $userId, 'undo') : null;
        $stmt = $this->db->prepare('UPDATE assistant_actions SET status = ?, response_payload = ?, undo_payload = ?,
            undo_expires_at = ?, result_summary = ? WHERE user_id = ? AND action_token = ? AND status = ?');
        $stmt->execute([$status, $responseCipher, $undoCipher, $undoExpiresAt, mb_substr($summary, 0, 255),
            $userId, $actionToken, 'confirmation']);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('confirmation_conflict');
    }

    /** @param array<string,mixed> $response @param array<string,mixed> $usage */
    public function saveHistory(
        int $userId,
        string $agentKey,
        string $requestId,
        string $userText,
        array $response,
        array $usage = [],
        ?string $routingText = null,
    ): void {
        $agentKey = self::agentKey($agentKey);
        $existing = $this->db->prepare('SELECT id FROM assistant_history WHERE user_id = ? AND request_id = ? LIMIT 1');
        $existing->execute([$userId, $requestId]);
        if ($existing->fetchColumn() !== false) return;

        $promptTokens = max(0, (int)($usage['prompt_tokens'] ?? 0));
        $completionTokens = max(0, (int)($usage['completion_tokens'] ?? 0));
        $totalTokens = max($promptTokens + $completionTokens, (int)($usage['total_tokens'] ?? 0));
        $userPayload = $this->encryptJson([
            'text' => $userText,
            'routingText' => $routingText ?? $userText,
        ], $userId, 'history-user');
        $responsePayload = $this->encryptJson($response, $userId, 'history-response');
        try {
            $stmt = $this->db->prepare('INSERT INTO assistant_history
                (user_id, agent_key, request_id, user_payload, response_payload, prompt_tokens, completion_tokens, total_tokens, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $agentKey, $requestId, $userPayload, $responsePayload,
                $promptTokens, $completionTokens, $totalTokens, level_clock_utc_sql()]);
        } catch (PDOException $e) {
            $existing->execute([$userId, $requestId]);
            if ($existing->fetchColumn() !== false) return;
            throw $e;
        }
        $this->recordUsage($userId, $promptTokens, $completionTokens, $totalTokens);
        $this->pruneHistory($userId);
    }

    public function continuationText(int $userId, string $agentKey, string $newText): string {
        $agentKey = self::agentKey($agentKey);
        $newText = trim($newText);
        $stmt = $this->db->prepare('SELECT user_payload, response_payload
            FROM assistant_history WHERE user_id = ? AND agent_key = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$userId, $agentKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) return $newText;

        try {
            $user = $this->decryptJson((string)$row['user_payload'], $userId, 'history-user');
            $response = $this->decryptJson((string)$row['response_payload'], $userId, 'history-response');
        } catch (Throwable) {
            return $newText;
        }
        if (($response['status'] ?? null) !== 'clarification') return $newText;

        $previous = is_string($user['routingText'] ?? null)
            ? trim((string)$user['routingText'])
            : trim((string)($user['text'] ?? ''));
        if ($previous === '') return $newText;

        $combined = $previous . "\nComplemento do usuário: " . $newText;
        return mb_substr($combined, -6000, null, 'UTF-8');
    }

    /** @return list<array<string,mixed>> */
    public function history(int $userId, string $agentKey, int $limit = 50): array {
        $agentKey = self::agentKey($agentKey);
        $limit = max(1, min(100, $limit));
        $stmt = $this->db->prepare('SELECT request_id, user_payload, response_payload, created_at
            FROM assistant_history WHERE user_id = ? AND agent_key = ? ORDER BY id DESC LIMIT ' . $limit);
        $stmt->execute([$userId, $agentKey]);
        $items = [];
        foreach (array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
            try {
                $user = $this->decryptJson((string)$row['user_payload'], $userId, 'history-user');
                $response = $this->decryptJson((string)$row['response_payload'], $userId, 'history-response');
            } catch (Throwable) {
                continue;
            }
            $text = is_string($user['text'] ?? null) ? trim((string)$user['text']) : '';
            if ($text === '' || !is_string($response['message'] ?? null)) continue;
            unset($response['provider']);
            $items[] = [
                'requestId' => (string)$row['request_id'],
                'createdAt' => (string)$row['created_at'] . 'Z',
                'userText' => $text,
                'response' => $response,
            ];
        }
        return $items;
    }

    public function clearHistory(int $userId, string $agentKey): int {
        $stmt = $this->db->prepare('DELETE FROM assistant_history WHERE user_id = ? AND agent_key = ?');
        $stmt->execute([$userId, self::agentKey($agentKey)]);
        return $stmt->rowCount();
    }

    /** @param array<string,mixed> $response */
    public function updateHistoryResponse(int $userId, string $requestId, array $response): void {
        $stmt = $this->db->prepare('UPDATE assistant_history SET response_payload = ? WHERE user_id = ? AND request_id = ?');
        $stmt->execute([$this->encryptJson($response, $userId, 'history-response'), $userId, $requestId]);
    }

    public function dailyTokenUsage(int $userId): int {
        $stmt = $this->db->prepare('SELECT total_tokens FROM assistant_usage_daily WHERE user_id = ? AND usage_date = ?');
        $stmt->execute([$userId, level_clock_today()->format('Y-m-d')]);
        return max(0, (int)$stmt->fetchColumn());
    }

    private function encryptJson(array $value, int $userId, string $field): string {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        return $this->crypto->encrypt($json, $userId, self::CRYPTO_PROVIDER, $field);
    }

    /** @return array<string,mixed> */
    private function decryptJson(string $cipher, int $userId, string $field): array {
        $decoded = json_decode($this->crypto->decrypt($cipher, $userId, self::CRYPTO_PROVIDER, $field), true, 128, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) throw new RuntimeException('Invalid assistant payload.');
        return $decoded;
    }

    private static function agentKey(string $agentKey): string {
        $agentKey = strtolower(trim($agentKey));
        if (!in_array($agentKey, self::AGENT_KEYS, true)) throw new InvalidArgumentException('Invalid assistant agent.');
        return $agentKey;
    }

    private function pruneHistory(int $userId): void {
        $days = (int)(getenv('LEVELOS_ASSISTANT_HISTORY_DAYS') ?: 90);
        $days = max(7, min(365, $days));
        $cutoff = level_clock_utc_sql(level_clock_epoch() - ($days * 86400));
        $stmt = $this->db->prepare('DELETE FROM assistant_history WHERE user_id = ? AND created_at < ?');
        $stmt->execute([$userId, $cutoff]);
    }

    private function recordUsage(int $userId, int $promptTokens, int $completionTokens, int $totalTokens): void {
        $date = level_clock_today()->format('Y-m-d');
        if ($this->driver() === 'sqlite') {
            $sql = 'INSERT INTO assistant_usage_daily
                (user_id, usage_date, prompt_tokens, completion_tokens, total_tokens, request_count)
                VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(user_id, usage_date) DO UPDATE SET
                prompt_tokens = prompt_tokens + excluded.prompt_tokens,
                completion_tokens = completion_tokens + excluded.completion_tokens,
                total_tokens = total_tokens + excluded.total_tokens,
                request_count = request_count + 1';
        } else {
            $sql = 'INSERT INTO assistant_usage_daily
                (user_id, usage_date, prompt_tokens, completion_tokens, total_tokens, request_count)
                VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE
                prompt_tokens = prompt_tokens + VALUES(prompt_tokens),
                completion_tokens = completion_tokens + VALUES(completion_tokens),
                total_tokens = total_tokens + VALUES(total_tokens),
                request_count = request_count + 1';
        }
        $this->db->prepare($sql)->execute([$userId, $date, $promptTokens, $completionTokens, $totalTokens]);
    }

    private function driver(): string { return (string)$this->db->getAttribute(PDO::ATTR_DRIVER_NAME); }
}
