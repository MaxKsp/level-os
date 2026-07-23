<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';

final class GoogleCalendarRepository {
    public function __construct(private readonly PDO $db, private readonly TokenCrypto $crypto) {
    }

    /** @return array<string,mixed>|null */
    public function findConnection(int $userId, bool $forUpdate = false): ?array {
        $suffix = $forUpdate && $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->db->prepare(
            'SELECT user_id, access_token, refresh_token, expiry, scope, sync_token,
                    google_subject, account_email, sync_start, sync_end, cache_expires_at,
                    connected_at, last_synced_at, updated_at
             FROM google_calendar_tokens WHERE user_id = ? LIMIT 1' . $suffix
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function upsertConnection(
        int $userId,
        string $accessToken,
        string $refreshToken,
        string $expiry,
        string $scope,
        string $googleSubject,
        string $accountEmail,
        string $now,
    ): void {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $sql = 'INSERT INTO google_calendar_tokens
                    (user_id, access_token, refresh_token, expiry, scope, google_subject, account_email,
                     sync_token, sync_start, sync_end, cache_expires_at, connected_at, last_synced_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                      access_token = excluded.access_token, refresh_token = excluded.refresh_token,
                      expiry = excluded.expiry, scope = excluded.scope, google_subject = excluded.google_subject,
                      account_email = excluded.account_email, sync_token = NULL, sync_start = NULL,
                      sync_end = NULL, cache_expires_at = NULL, connected_at = excluded.connected_at,
                      last_synced_at = NULL, updated_at = excluded.updated_at';
        } else {
            $sql = 'INSERT INTO google_calendar_tokens
                    (user_id, access_token, refresh_token, expiry, scope, google_subject, account_email,
                     sync_token, sync_start, sync_end, cache_expires_at, connected_at, last_synced_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, ?)
                    ON DUPLICATE KEY UPDATE
                      access_token = VALUES(access_token), refresh_token = VALUES(refresh_token),
                      expiry = VALUES(expiry), scope = VALUES(scope), google_subject = VALUES(google_subject),
                      account_email = VALUES(account_email), sync_token = NULL, sync_start = NULL,
                      sync_end = NULL, cache_expires_at = NULL, connected_at = VALUES(connected_at),
                      last_synced_at = NULL, updated_at = VALUES(updated_at)';
        }
        $this->db->prepare($sql)->execute([
            $userId, $accessToken, $refreshToken, $expiry, $scope, $googleSubject, $accountEmail, $now, $now,
        ]);
        $this->db->prepare('DELETE FROM google_calendar_events WHERE user_id = ?')->execute([$userId]);
    }

    public function updateAccessToken(
        int $userId,
        string $accessToken,
        ?string $refreshToken,
        string $expiry,
        string $scope,
        string $now,
    ): void {
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_tokens
             SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expiry = ?, scope = ?, updated_at = ?
             WHERE user_id = ?'
        );
        $stmt->execute([$accessToken, $refreshToken, $expiry, $scope, $now, $userId]);
        if ($stmt->rowCount() === 0 && $this->findConnection($userId) === null) {
            throw new RuntimeException('Calendar connection disappeared.');
        }
    }

    public function deleteConnection(int $userId): void {
        $stmt = $this->db->prepare('DELETE FROM google_calendar_tokens WHERE user_id = ?');
        $stmt->execute([$userId]);
        // Defesa para instalações em que a FK ainda não tenha sido aplicada.
        $this->db->prepare('DELETE FROM google_calendar_events WHERE user_id = ?')->execute([$userId]);
    }

    public function tryAcquireSyncLease(int $userId, string $leaseToken, string $leaseUntil, string $now): bool {
        if (preg_match('/\A[a-f0-9]{32}\z/D', $leaseToken) !== 1) throw new InvalidArgumentException('Invalid sync lease.');
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_tokens SET sync_lease_token = ?, sync_lease_until = ?
             WHERE user_id = ? AND (sync_lease_until IS NULL OR sync_lease_until < ?)'
        );
        $stmt->execute([$leaseToken, $leaseUntil, $userId, $now]);
        return $stmt->rowCount() === 1;
    }

    public function releaseSyncLease(int $userId, string $leaseToken): void {
        if (preg_match('/\A[a-f0-9]{32}\z/D', $leaseToken) !== 1) return;
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_tokens SET sync_lease_token = NULL, sync_lease_until = NULL
             WHERE user_id = ? AND sync_lease_token = ?'
        );
        $stmt->execute([$userId, $leaseToken]);
    }

    /** @param list<array<string,mixed>> $events */
    public function replaceMirror(
        int $userId,
        array $events,
        ?string $syncToken,
        string $syncStart,
        string $syncEnd,
        string $cacheExpiresAt,
        string $now,
    ): void {
        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            if ($this->findConnection($userId, true) === null) throw new RuntimeException('Calendar connection disappeared.');
            $this->db->prepare('DELETE FROM google_calendar_events WHERE user_id = ?')->execute([$userId]);
            $this->insertEvents($userId, $events, $now);
            $stmt = $this->db->prepare(
                'UPDATE google_calendar_tokens
                 SET sync_token = ?, sync_start = ?, sync_end = ?, cache_expires_at = ?,
                     last_synced_at = ?, updated_at = ? WHERE user_id = ?'
            );
            $stmt->execute([$syncToken, $syncStart, $syncEnd, $cacheExpiresAt, $now, $now, $userId]);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @param list<array<string,mixed>> $changes */
    public function applyDelta(
        int $userId,
        array $changes,
        string $syncToken,
        string $cacheExpiresAt,
        string $now,
    ): void {
        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            if ($this->findConnection($userId, true) === null) throw new RuntimeException('Calendar connection disappeared.');
            $delete = $this->db->prepare('DELETE FROM google_calendar_events WHERE user_id = ? AND event_hash = ?');
            $upserts = [];
            foreach ($changes as $change) {
                $hash = isset($change['event_hash']) ? (string)$change['event_hash'] : '';
                if (preg_match('/\A[a-f0-9]{64}\z/D', $hash) !== 1) continue;
                $delete->execute([$userId, $hash]);
                if (empty($change['cancelled'])) $upserts[] = $change;
            }
            $this->insertEvents($userId, $upserts, $now);
            $stmt = $this->db->prepare(
                'UPDATE google_calendar_tokens
                 SET sync_token = ?, cache_expires_at = ?, last_synced_at = ?, updated_at = ?
                 WHERE user_id = ?'
            );
            $stmt->execute([$syncToken, $cacheExpiresAt, $now, $now, $userId]);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function clearSync(int $userId, string $now): void {
        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM google_calendar_events WHERE user_id = ?')->execute([$userId]);
            $this->db->prepare(
                'UPDATE google_calendar_tokens SET sync_token = NULL, sync_start = NULL, sync_end = NULL,
                 cache_expires_at = NULL, last_synced_at = NULL, updated_at = ? WHERE user_id = ?'
            )->execute([$now, $userId]);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @return list<array<string,mixed>> */
    public function eventsBetween(int $userId, string $start, string $end): array {
        $stmt = $this->db->prepare(
            'SELECT event_hash, google_event_id, title, start_value, end_value, all_day, location, html_link
             FROM google_calendar_events
             WHERE user_id = ? AND starts_at < ? AND ends_at > ?
             ORDER BY starts_at ASC, all_day DESC, title ASC LIMIT 10000'
        );
        $stmt->execute([$userId, $end, $start]);
        $events = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $hash = (string)$row['event_hash'];
            $events[] = [
                'id' => $this->crypto->decrypt((string)$row['google_event_id'], $userId, 'google-calendar', $this->eventField('event_id', $hash)),
                'title' => $this->crypto->decrypt((string)$row['title'], $userId, 'google-calendar', $this->eventField('title', $hash)),
                'start' => (string)$row['start_value'],
                'end' => (string)$row['end_value'],
                'allDay' => (int)$row['all_day'] === 1,
                'location' => $row['location'] !== null
                    ? $this->crypto->decrypt((string)$row['location'], $userId, 'google-calendar', $this->eventField('location', $hash))
                    : null,
                'htmlLink' => $row['html_link'] !== null
                    ? $this->crypto->decrypt((string)$row['html_link'], $userId, 'google-calendar', $this->eventField('html_link', $hash))
                    : null,
                'source' => 'google',
                'readOnly' => true,
            ];
        }
        return $events;
    }

    /** @param list<array<string,mixed>> $events */
    private function insertEvents(int $userId, array $events, string $now): void {
        if ($events === []) return;
        $stmt = $this->db->prepare(
            'INSERT INTO google_calendar_events
             (user_id, event_hash, google_event_id, title, start_value, end_value, starts_at, ends_at,
              all_day, location, html_link, provider_updated_at, mirrored_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($events as $event) {
            $hash = (string)$event['event_hash'];
            $stmt->execute([
                $userId,
                $hash,
                $this->crypto->encrypt((string)$event['google_event_id'], $userId, 'google-calendar', $this->eventField('event_id', $hash)),
                $this->crypto->encrypt((string)$event['title'], $userId, 'google-calendar', $this->eventField('title', $hash)),
                (string)$event['start_value'],
                (string)$event['end_value'],
                (string)$event['starts_at'],
                (string)$event['ends_at'],
                !empty($event['all_day']) ? 1 : 0,
                isset($event['location']) && $event['location'] !== null
                    ? $this->crypto->encrypt((string)$event['location'], $userId, 'google-calendar', $this->eventField('location', $hash))
                    : null,
                isset($event['html_link']) && $event['html_link'] !== null
                    ? $this->crypto->encrypt((string)$event['html_link'], $userId, 'google-calendar', $this->eventField('html_link', $hash))
                    : null,
                $event['provider_updated_at'] ?? null,
                $now,
            ]);
        }
    }

    private function eventField(string $field, string $hash): string {
        if (preg_match('/\A[a-f0-9]{64}\z/D', $hash) !== 1) throw new RuntimeException('Invalid Calendar event key.');
        return $field . '_' . substr($hash, 0, 16);
    }
}
