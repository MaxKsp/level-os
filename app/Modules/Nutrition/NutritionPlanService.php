<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';

/** @return array<string,mixed>|null */
function nutrition_legacy_plan(PDO $db, int $userId): ?array {
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
    $stmt->execute([$userId, 'nutrition_plan_v1']);
    $raw = $stmt->fetchColumn();
    if (!is_string($raw) || $raw === '') return null;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

/** @param array<string,mixed>|null $plan */
function nutrition_write_legacy_plan(PDO $db, int $userId, ?array $plan): void {
    $encoded = json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
    $sql = $driver === 'sqlite'
        ? 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?) ON CONFLICT(user_id, data_key) DO UPDATE SET data_value = excluded.data_value'
        : 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)';
    $db->prepare($sql)->execute([$userId, 'nutrition_plan_v1', $encoded]);
}

/** @return array<string,mixed> */
function nutrition_plan_public(array $row): array {
    $payload = json_decode((string)$row['payload_json'], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($payload)) throw new RuntimeException('nutrition_plan_corrupt');
    $payload['id'] = (string)$row['client_id'];
    $payload['version'] = (int)$row['version_no'];
    $payload['status'] = (string)$row['status'];
    $payload['source'] = (string)$row['source'];
    $payload['createdAt'] = (string)$row['created_at'];
    $payload['activatedAt'] = $row['activated_at'] !== null ? (string)$row['activated_at'] : null;
    return $payload;
}

/** @return array<string,mixed>|null */
function nutrition_active_plan(PDO $db, int $userId): ?array {
    $stmt = $db->prepare("SELECT * FROM nutrition_plans WHERE user_id = ? AND status = 'active' ORDER BY version_no DESC, id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (is_array($row)) return nutrition_plan_public($row);
    return nutrition_legacy_plan($db, $userId);
}

/** @return array{plan:?array<string,mixed>,history:list<array<string,mixed>>} */
function nutrition_plan_snapshot(PDO $db, int $userId): array {
    $active = nutrition_active_plan($db, $userId);
    $stmt = $db->prepare("SELECT * FROM nutrition_plans WHERE user_id = ? AND status = 'archived' ORDER BY version_no DESC, id DESC LIMIT 20");
    $stmt->execute([$userId]);
    $history = array_map('nutrition_plan_public', $stmt->fetchAll(PDO::FETCH_ASSOC));
    return ['plan' => $active, 'history' => $history];
}

/**
 * @param array<string,mixed> $plan
 * @return array{plan:array<string,mixed>,activatedId:string,previousId:?string,previousLegacy:?array<string,mixed>}
 */
function nutrition_activate_plan(PDO $db, int $userId, array $plan, string $source = 'assistant'): array {
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $activeStmt = $db->prepare("SELECT id, client_id FROM nutrition_plans WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
        $activeStmt->execute([$userId]);
        $previous = $activeStmt->fetch(PDO::FETCH_ASSOC);
        $previousLegacy = $previous === false ? nutrition_legacy_plan($db, $userId) : null;
        $now = level_clock_utc_sql();
        if ($previous === false && is_array($previousLegacy) && is_array($previousLegacy['days'] ?? null)) {
            $legacyVersionStmt = $db->prepare('SELECT COALESCE(MAX(version_no), 0) FROM nutrition_plans WHERE user_id = ?');
            $legacyVersionStmt->execute([$userId]);
            $legacyVersion = (int)$legacyVersionStmt->fetchColumn() + 1;
            $legacyClientId = substr('np_' . bin2hex(random_bytes(16)), 0, 32);
            $legacyInsert = $db->prepare('INSERT INTO nutrition_plans
                (user_id, client_id, version_no, status, goal, period_days, budget_cents, estimated_cost_cents, payload_json, source, replaces_id, created_at, activated_at, archived_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)');
            $legacyInsert->execute([
                $userId, $legacyClientId, $legacyVersion, 'archived', (string)($previousLegacy['goal'] ?? 'manutencao'),
                max(1, (int)($previousLegacy['periodDays'] ?? count($previousLegacy['days']))),
                max(0, (int)round((float)($previousLegacy['budgetBRL'] ?? 0) * 100)),
                max(0, (int)round((float)($previousLegacy['estimatedCostBRL'] ?? 0) * 100)),
                json_encode($previousLegacy, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                (string)($previousLegacy['source'] ?? 'manual') === 'assistant' ? 'assistant' : 'manual',
                $now, $now, $now,
            ]);
            $previous = ['id'=>(int)$db->lastInsertId(), 'client_id'=>$legacyClientId];
            $previousLegacy = null;
        }
        $versionStmt = $db->prepare('SELECT COALESCE(MAX(version_no), 0) FROM nutrition_plans WHERE user_id = ?');
        $versionStmt->execute([$userId]);
        $version = (int)$versionStmt->fetchColumn() + 1;
        $db->prepare("UPDATE nutrition_plans SET status = 'archived', archived_at = ? WHERE user_id = ? AND status = 'active'")
            ->execute([$now, $userId]);
        $clientId = substr('np_' . bin2hex(random_bytes(16)), 0, 32);
        $payload = $plan;
        unset($payload['id'], $payload['version'], $payload['status'], $payload['activatedAt']);
        $insert = $db->prepare('INSERT INTO nutrition_plans
            (user_id, client_id, version_no, status, goal, period_days, budget_cents, estimated_cost_cents, payload_json, source, replaces_id, created_at, activated_at, archived_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)');
        $insert->execute([
            $userId, $clientId, $version, 'active', (string)$plan['goal'], (int)$plan['periodDays'],
            (int)round((float)$plan['budgetBRL'] * 100), (int)round((float)$plan['estimatedCostBRL'] * 100),
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            $source === 'assistant' ? 'assistant' : 'manual', $previous !== false ? (int)$previous['id'] : null, $now, $now,
        ]);
        $id = (int)$db->lastInsertId();
        $rowStmt = $db->prepare('SELECT * FROM nutrition_plans WHERE id = ? AND user_id = ?');
        $rowStmt->execute([$id, $userId]);
        $public = nutrition_plan_public((array)$rowStmt->fetch(PDO::FETCH_ASSOC));
        nutrition_write_legacy_plan($db, $userId, $public);
        if ($own) $db->commit();
        return [
            'plan' => $public,
            'activatedId' => $clientId,
            'previousId' => $previous !== false ? (string)$previous['client_id'] : null,
            'previousLegacy' => $previousLegacy,
        ];
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** @return array<string,mixed> */
function nutrition_restore_plan(PDO $db, int $userId, string $clientId): array {
    if (preg_match('/\Anp_[a-f0-9]{20,29}\z/D', $clientId) !== 1) throw new InvalidArgumentException('Plano invÃ¡lido.');
    $stmt = $db->prepare('SELECT * FROM nutrition_plans WHERE user_id = ? AND client_id = ? LIMIT 1');
    $stmt->execute([$userId, $clientId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) throw new InvalidArgumentException('Plano nÃ£o encontrado.');
    $plan = nutrition_plan_public($row);
    return nutrition_activate_plan($db, $userId, $plan, 'manual')['plan'];
}

function nutrition_archive_active_plan(PDO $db, int $userId): void {
    $now = level_clock_utc_sql();
    $db->prepare("UPDATE nutrition_plans SET status = 'archived', archived_at = ? WHERE user_id = ? AND status = 'active'")
        ->execute([$now, $userId]);
    nutrition_write_legacy_plan($db, $userId, null);
}

/** @param array<string,mixed> $undo */
function nutrition_undo_activation(PDO $db, int $userId, array $undo): void {
    $activated = (string)($undo['activatedId'] ?? '');
    $previous = is_string($undo['previousId'] ?? null) ? $undo['previousId'] : null;
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $now = level_clock_utc_sql();
        $stmt = $db->prepare("UPDATE nutrition_plans SET status = 'archived', archived_at = ? WHERE user_id = ? AND client_id = ? AND status = 'active'");
        $stmt->execute([$now, $userId, $activated]);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('undo_conflict');
        $restored = null;
        if ($previous !== null) {
            $restore = $db->prepare("UPDATE nutrition_plans SET status = 'active', activated_at = ?, archived_at = NULL WHERE user_id = ? AND client_id = ? AND status = 'archived'");
            $restore->execute([$now, $userId, $previous]);
            if ($restore->rowCount() !== 1) throw new RuntimeException('undo_conflict');
            $find = $db->prepare('SELECT * FROM nutrition_plans WHERE user_id = ? AND client_id = ?');
            $find->execute([$userId, $previous]);
            $restored = nutrition_plan_public((array)$find->fetch(PDO::FETCH_ASSOC));
        } elseif (is_array($undo['previousLegacy'] ?? null)) {
            $restored = $undo['previousLegacy'];
        }
        nutrition_write_legacy_plan($db, $userId, $restored);
        if ($own) $db->commit();
    } catch (Throwable $e) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
