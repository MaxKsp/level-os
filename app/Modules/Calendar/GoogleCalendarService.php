<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';
require_once dirname(__DIR__, 2) . '/Core/Audit.php';
require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';
require_once __DIR__ . '/GoogleProviderException.php';
require_once __DIR__ . '/GoogleOAuthClient.php';
require_once __DIR__ . '/GoogleCalendarClient.php';
require_once __DIR__ . '/GoogleCalendarRepository.php';

final class GoogleCalendarService {
    private const PROVIDER = 'google-calendar';
    private const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
    private const CACHE_TTL_SECONDS = 120;
    private const MAX_PAGES = 8;
    private const MAX_EVENTS = 10000;
    private const SYNC_LEASE_SECONDS = 120;
    private const SYNC_DEADLINE_SECONDS = 25;
    private const EVENT_FIELDS = 'items(id,status,summary,start,end,location,htmlLink,updated),nextPageToken,nextSyncToken,timeZone';

    public function __construct(
        private readonly PDO $db,
        private readonly GoogleCalendarRepository $repository,
        private readonly GoogleOAuthClient $oauth,
        private readonly GoogleCalendarClient $calendar,
        private readonly TokenCrypto $crypto,
    ) {
    }

    /** @return array{status:string,accountEmail:?string,connectedAt:?string,syncedAt:?string} */
    public function connectionStatus(int $userId): array {
        $row = $this->repository->findConnection($userId);
        if ($row === null) return $this->disconnectedStatus();
        try {
            $this->crypto->decrypt((string)$row['refresh_token'], $userId, self::PROVIDER, 'refresh');
            $status = 'connected';
        } catch (Throwable) {
            $status = 'reconnect_required';
        }
        return [
            'status' => $status,
            'accountEmail' => isset($row['account_email']) ? (string)$row['account_email'] : null,
            'connectedAt' => $this->sqlToIso($row['connected_at'] ?? null),
            'syncedAt' => $this->sqlToIso($row['last_synced_at'] ?? null),
        ];
    }

    /** @param array<string,mixed> $tokenData @param array<string,mixed> $userInfo */
    public function completeConnection(int $userId, array $tokenData, array $userInfo): void {
        $accessToken = isset($tokenData['access_token']) ? (string)$tokenData['access_token'] : '';
        $scope = isset($tokenData['scope']) ? trim((string)$tokenData['scope']) : '';
        $expiresIn = isset($tokenData['expires_in']) ? (int)$tokenData['expires_in'] : 0;
        $subject = isset($userInfo['sub']) ? trim((string)$userInfo['sub']) : '';
        $email = isset($userInfo['email']) ? strtolower(trim((string)$userInfo['email'])) : '';
        $emailVerified = ($userInfo['email_verified'] ?? false) === true || ($userInfo['email_verified'] ?? '') === 'true';
        if (
            !$this->validProviderToken($accessToken)
            || !$this->scopeContains($scope, self::READ_SCOPE)
            || $expiresIn < 60
            || $expiresIn > 86400
            || !preg_match('/\A[a-zA-Z0-9._:-]{3,255}\z/D', $subject)
            || !$emailVerified
            || filter_var($email, FILTER_VALIDATE_EMAIL) === false
            || strlen($email) > 255
        ) {
            throw new GoogleProviderException('Google Calendar consent was incomplete.');
        }

        $refreshToken = isset($tokenData['refresh_token']) ? (string)$tokenData['refresh_token'] : '';
        if (!$this->validProviderToken($refreshToken)) {
            $existing = $this->repository->findConnection($userId);
            $sameAccount = $existing !== null
                && hash_equals((string)($existing['google_subject'] ?? ''), $subject)
                && strcasecmp((string)($existing['account_email'] ?? ''), $email) === 0;
            if (!$sameAccount) throw new GoogleProviderException('Google did not return offline access.');
            $refreshToken = $this->crypto->decrypt((string)$existing['refresh_token'], $userId, self::PROVIDER, 'refresh');
        }

        $nowEpoch = level_clock_epoch();
        $now = level_clock_utc_sql($nowEpoch);
        $expiry = level_clock_utc_sql($nowEpoch + $expiresIn);
        $accessCipher = $this->crypto->encrypt($accessToken, $userId, self::PROVIDER, 'access');
        $refreshCipher = $this->crypto->encrypt($refreshToken, $userId, self::PROVIDER, 'refresh');

        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            $this->repository->upsertConnection(
                $userId, $accessCipher, $refreshCipher, $expiry, $scope, $subject, $email, $now
            );
            audit_record($this->db, $userId, 'calendar.connected', 'success', ['provider' => 'google']);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function disconnect(int $userId): void {
        $row = $this->repository->findConnection($userId);
        if ($row !== null) {
            try {
                $refreshToken = $this->crypto->decrypt((string)$row['refresh_token'], $userId, self::PROVIDER, 'refresh');
                $this->oauth->revoke($refreshToken);
            } catch (Throwable) {
                // Revogação é best-effort; apagar localmente continua obrigatório.
            }
        }
        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            $this->repository->deleteConnection($userId);
            audit_record($this->db, $userId, 'calendar.disconnected', 'success', ['provider' => 'google']);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @return array{connection:array<string,mixed>,events:list<array<string,mixed>>} */
    public function eventsForRange(int $userId, DateTimeImmutable $start, DateTimeImmutable $end): array {
        $row = $this->repository->findConnection($userId);
        if ($row === null) return ['connection' => $this->disconnectedStatus(), 'events' => []];

        $startUtc = $start->setTimezone(level_clock_utc_timezone());
        $endUtc = $end->setTimezone(level_clock_utc_timezone());
        $nowEpoch = level_clock_epoch();
        $covers = $this->rowCoversRange($row, $startUtc, $endUtc);
        $cacheFresh = $covers && $this->sqlEpoch($row['cache_expires_at'] ?? null) > $nowEpoch;

        if (!$cacheFresh) {
            $leaseToken = bin2hex(random_bytes(16));
            $leaseNow = level_clock_utc_sql($nowEpoch);
            $leaseAcquired = $this->repository->tryAcquireSyncLease(
                $userId,
                $leaseToken,
                level_clock_utc_sql($nowEpoch + self::SYNC_LEASE_SECONDS),
                $leaseNow,
            );
            if (!$leaseAcquired) {
                // Outro request do mesmo usuário já está atualizando o espelho.
                // Se há baseline para o intervalo, sirva-o sem chamar o Google.
                if ($covers) {
                    return [
                        'connection' => $this->connectionStatus($userId),
                        'events' => $this->repository->eventsBetween(
                            $userId,
                            $startUtc->format('Y-m-d H:i:s'),
                            $endUtc->format('Y-m-d H:i:s'),
                        ),
                    ];
                }
                throw new GoogleProviderException('Google Calendar sync is already running.', 503, 'sync_busy');
            }
            try {
                // Releitura após adquirir a lease evita um segundo sync quando o
                // primeiro request terminou entre o SELECT e o UPDATE atômico.
                $row = $this->repository->findConnection($userId);
                if ($row === null) throw new GoogleProviderException('Google Calendar is disconnected.', 401, 'invalid_grant');
                $covers = $this->rowCoversRange($row, $startUtc, $endUtc);
                $cacheFresh = $covers && $this->sqlEpoch($row['cache_expires_at'] ?? null) > level_clock_epoch();
                if (!$cacheFresh && (!$covers || empty($row['sync_token']))) {
                    $mirrorStart = $startUtc->modify('-31 days');
                    $mirrorEnd = $endUtc->modify('+31 days');
                    $this->fullSync($userId, $mirrorStart, $mirrorEnd);
                } elseif (!$cacheFresh) {
                    $this->incrementalSync($userId, $row);
                }
            } catch (GoogleProviderException $e) {
                if ($e->requiresReconnect()) {
                    $this->invalidateConnection($userId);
                }
                throw $e;
            } finally {
                $this->repository->releaseSyncLease($userId, $leaseToken);
            }
        }

        return [
            'connection' => $this->connectionStatus($userId),
            'events' => $this->repository->eventsBetween(
                $userId,
                $startUtc->format('Y-m-d H:i:s'),
                $endUtc->format('Y-m-d H:i:s'),
            ),
        ];
    }

    private function fullSync(int $userId, DateTimeImmutable $mirrorStart, DateTimeImmutable $mirrorEnd): void {
        $events = [];
        $deadline = microtime(true) + self::SYNC_DEADLINE_SECONDS;
        $pageToken = null;
        $nextSyncToken = null;
        $timezone = LEVEL_OS_TIMEZONE;
        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            if (microtime(true) >= $deadline) throw new GoogleProviderException('Google Calendar sync deadline exceeded.');
            $query = [
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'timeMin' => $mirrorStart->format(DATE_RFC3339),
                'timeMax' => $mirrorEnd->format(DATE_RFC3339),
                'showDeleted' => 'true',
                'maxResults' => 2500,
                'fields' => self::EVENT_FIELDS,
            ];
            if ($pageToken !== null) $query['pageToken'] = $pageToken;
            $body = $this->listWithRefresh($userId, $query);
            if (isset($body['timeZone']) && is_string($body['timeZone'])) $timezone = $this->safeTimezone($body['timeZone']);
            foreach ((array)($body['items'] ?? []) as $item) {
                if (!is_array($item)) continue;
                $normalized = $this->normalizeEvent($item, $timezone, $mirrorStart, $mirrorEnd);
                if ($normalized !== null && empty($normalized['cancelled'])) $events[] = $normalized;
                if (count($events) > self::MAX_EVENTS) throw new GoogleProviderException('Google Calendar event limit exceeded.');
            }
            $pageToken = isset($body['nextPageToken']) && is_string($body['nextPageToken']) && $body['nextPageToken'] !== ''
                ? $body['nextPageToken'] : null;
            if ($pageToken === null) {
                $nextSyncToken = isset($body['nextSyncToken']) && is_string($body['nextSyncToken']) ? $body['nextSyncToken'] : null;
                break;
            }
        }
        if ($pageToken !== null) throw new GoogleProviderException('Google Calendar pagination limit exceeded.');
        $syncCipher = $nextSyncToken !== null && $nextSyncToken !== ''
            ? $this->crypto->encrypt($nextSyncToken, $userId, self::PROVIDER, 'sync')
            : null;
        $now = level_clock_utc_sql();
        $this->repository->replaceMirror(
            $userId,
            $events,
            $syncCipher,
            $mirrorStart->format('Y-m-d H:i:s'),
            $mirrorEnd->format('Y-m-d H:i:s'),
            level_clock_utc_sql(level_clock_epoch() + self::CACHE_TTL_SECONDS),
            $now,
        );
    }

    /** @param array<string,mixed> $row */
    private function incrementalSync(int $userId, array $row): void {
        $mirrorStart = $this->sqlDate((string)$row['sync_start']);
        $mirrorEnd = $this->sqlDate((string)$row['sync_end']);
        if ($mirrorStart === null || $mirrorEnd === null) {
            $this->repository->clearSync($userId, level_clock_utc_sql());
            throw new GoogleProviderException('Calendar sync state is invalid.');
        }
        try {
            $syncToken = $this->crypto->decrypt((string)$row['sync_token'], $userId, self::PROVIDER, 'sync');
        } catch (TokenCryptoException) {
            // O cursor é derivado e pode ser descartado sem tocar nos tokens OAuth.
            $this->fullSync($userId, $mirrorStart, $mirrorEnd);
            return;
        }
        $changes = [];
        $pageToken = null;
        $nextSyncToken = null;
        $timezone = LEVEL_OS_TIMEZONE;
        $deadline = microtime(true) + self::SYNC_DEADLINE_SECONDS;
        try {
            for ($page = 0; $page < self::MAX_PAGES; $page++) {
                if (microtime(true) >= $deadline) throw new GoogleProviderException('Google Calendar sync deadline exceeded.');
                $query = [
                    'syncToken' => $syncToken,
                    'singleEvents' => 'true',
                    'showDeleted' => 'true',
                    'maxResults' => 2500,
                    'fields' => self::EVENT_FIELDS,
                ];
                if ($pageToken !== null) $query['pageToken'] = $pageToken;
                $body = $this->listWithRefresh($userId, $query);
                if (isset($body['timeZone']) && is_string($body['timeZone'])) $timezone = $this->safeTimezone($body['timeZone']);
                foreach ((array)($body['items'] ?? []) as $item) {
                    if (!is_array($item)) continue;
                    $normalized = $this->normalizeEvent($item, $timezone, $mirrorStart, $mirrorEnd);
                    if ($normalized !== null) $changes[] = $normalized;
                    if (count($changes) > self::MAX_EVENTS) throw new GoogleProviderException('Google Calendar event limit exceeded.');
                }
                $pageToken = isset($body['nextPageToken']) && is_string($body['nextPageToken']) && $body['nextPageToken'] !== ''
                    ? $body['nextPageToken'] : null;
                if ($pageToken === null) {
                    $nextSyncToken = isset($body['nextSyncToken']) && is_string($body['nextSyncToken']) ? $body['nextSyncToken'] : null;
                    break;
                }
            }
        } catch (GoogleProviderException $e) {
            if ($e->httpStatus === 410 || $e->providerCode === 'GONE') {
                // Mantém o último mirror disponível até o novo snapshot estar
                // completo; replaceMirror() troca dados+cursor atomicamente.
                $this->fullSync($userId, $mirrorStart, $mirrorEnd);
                return;
            }
            throw $e;
        }
        if ($pageToken !== null || $nextSyncToken === null || $nextSyncToken === '') {
            throw new GoogleProviderException('Google Calendar incremental sync was incomplete.');
        }
        $this->repository->applyDelta(
            $userId,
            $changes,
            $this->crypto->encrypt($nextSyncToken, $userId, self::PROVIDER, 'sync'),
            level_clock_utc_sql(level_clock_epoch() + self::CACHE_TTL_SECONDS),
            level_clock_utc_sql(),
        );
    }

    /** @param array<string,string|int|bool> $query @return array<string,mixed> */
    private function listWithRefresh(int $userId, array $query): array {
        $accessToken = $this->validAccessToken($userId, false);
        try {
            return $this->calendar->listPrimaryEvents($accessToken, $query);
        } catch (GoogleProviderException $e) {
            if ($e->httpStatus !== 401) throw $e;
        }
        $accessToken = $this->validAccessToken($userId, true);
        try {
            return $this->calendar->listPrimaryEvents($accessToken, $query);
        } catch (GoogleProviderException $e) {
            if ($e->httpStatus === 401) {
                throw new GoogleProviderException('Google Calendar authorization was revoked.', 401, 'invalid_grant');
            }
            throw $e;
        }
    }

    private function validAccessToken(int $userId, bool $forceRefresh): string {
        $row = $this->repository->findConnection($userId);
        if ($row === null) throw new GoogleProviderException('Google Calendar is disconnected.', 401, 'invalid_grant');
        $expiry = $this->sqlEpoch($row['expiry'] ?? null);
        if (!$forceRefresh && $expiry > level_clock_epoch() + 90) {
            return $this->crypto->decrypt((string)$row['access_token'], $userId, self::PROVIDER, 'access');
        }
        $refreshToken = $this->crypto->decrypt((string)$row['refresh_token'], $userId, self::PROVIDER, 'refresh');
        $tokenData = $this->oauth->refreshAccessToken($refreshToken);
        $accessToken = isset($tokenData['access_token']) ? (string)$tokenData['access_token'] : '';
        $expiresIn = isset($tokenData['expires_in']) ? (int)$tokenData['expires_in'] : 0;
        $scope = isset($tokenData['scope']) && is_string($tokenData['scope']) && trim($tokenData['scope']) !== ''
            ? trim($tokenData['scope']) : (string)$row['scope'];
        if (!$this->validProviderToken($accessToken) || $expiresIn < 60 || $expiresIn > 86400 || !$this->scopeContains($scope, self::READ_SCOPE)) {
            throw new GoogleProviderException('Google token refresh failed.');
        }
        $rotatedRefresh = isset($tokenData['refresh_token']) && $this->validProviderToken((string)$tokenData['refresh_token'])
            ? (string)$tokenData['refresh_token'] : null;
        $this->repository->updateAccessToken(
            $userId,
            $this->crypto->encrypt($accessToken, $userId, self::PROVIDER, 'access'),
            $rotatedRefresh !== null ? $this->crypto->encrypt($rotatedRefresh, $userId, self::PROVIDER, 'refresh') : null,
            level_clock_utc_sql(level_clock_epoch() + $expiresIn),
            $scope,
            level_clock_utc_sql(),
        );
        return $accessToken;
    }

    /** @param array<string,mixed> $item @return array<string,mixed>|null */
    private function normalizeEvent(
        array $item,
        string $calendarTimezone,
        DateTimeImmutable $mirrorStart,
        DateTimeImmutable $mirrorEnd,
    ): ?array {
        $id = isset($item['id']) ? (string)$item['id'] : '';
        if ($id === '' || strlen($id) > 1024 || preg_match('/[\x00-\x1F\x7F]/', $id)) return null;
        $hash = hash('sha256', $id);
        if (($item['status'] ?? '') === 'cancelled') return ['event_hash' => $hash, 'cancelled' => true];

        $allDay = isset($item['start']['date']);
        try {
            if ($allDay) {
                $zone = new DateTimeZone($this->safeTimezone($calendarTimezone));
                $startValue = (string)$item['start']['date'];
                $endValue = isset($item['end']['date']) ? (string)$item['end']['date'] : '';
                if (!$this->validDateOnly($startValue)) return null;
                if (!$this->validDateOnly($endValue)) {
                    $endValue = (new DateTimeImmutable($startValue, $zone))->modify('+1 day')->format('Y-m-d');
                }
                $startDate = new DateTimeImmutable($startValue . ' 00:00:00', $zone);
                $endDate = new DateTimeImmutable($endValue . ' 00:00:00', $zone);
            } else {
                $startRaw = isset($item['start']['dateTime']) ? (string)$item['start']['dateTime'] : '';
                $endRaw = isset($item['end']['dateTime']) ? (string)$item['end']['dateTime'] : '';
                if ($startRaw === '' || strlen($startRaw) > 64) return null;
                $startDate = new DateTimeImmutable($startRaw);
                $endDate = $endRaw !== '' && strlen($endRaw) <= 64 ? new DateTimeImmutable($endRaw) : $startDate->modify('+1 hour');
                $startValue = $startDate->setTimezone(level_clock_utc_timezone())->format('Y-m-d\TH:i:s\Z');
                $endValue = $endDate->setTimezone(level_clock_utc_timezone())->format('Y-m-d\TH:i:s\Z');
            }
        } catch (Throwable) {
            return null;
        }
        if ($endDate <= $startDate) {
            $endDate = $allDay ? $startDate->modify('+1 day') : $startDate->modify('+1 hour');
            $endValue = $allDay
                ? $endDate->format('Y-m-d')
                : $endDate->setTimezone(level_clock_utc_timezone())->format('Y-m-d\TH:i:s\Z');
        }
        $startUtc = $startDate->setTimezone(level_clock_utc_timezone());
        $endUtc = $endDate->setTimezone(level_clock_utc_timezone());
        $outsideMirror = $startUtc >= $mirrorEnd || $endUtc <= $mirrorStart;
        if ($outsideMirror) return ['event_hash' => $hash, 'cancelled' => true];

        $title = $this->cleanText(isset($item['summary']) ? (string)$item['summary'] : '', 255);
        if ($title === '') $title = 'Sem título';
        $location = $this->cleanText(isset($item['location']) ? (string)$item['location'] : '', 512);
        $htmlLink = isset($item['htmlLink']) ? $this->safeGoogleLink((string)$item['htmlLink']) : null;
        $providerUpdated = null;
        if (isset($item['updated']) && is_string($item['updated'])) {
            try {
                $providerUpdated = (new DateTimeImmutable($item['updated']))->setTimezone(level_clock_utc_timezone())->format('Y-m-d H:i:s');
            } catch (Throwable) {
                $providerUpdated = null;
            }
        }
        return [
            'event_hash' => $hash,
            'google_event_id' => $id,
            'title' => $title,
            'start_value' => $startValue,
            'end_value' => $endValue,
            'starts_at' => $startUtc->format('Y-m-d H:i:s'),
            'ends_at' => $endUtc->format('Y-m-d H:i:s'),
            'all_day' => $allDay,
            'location' => $location !== '' ? $location : null,
            'html_link' => $htmlLink,
            'provider_updated_at' => $providerUpdated,
            'cancelled' => false,
        ];
    }

    private function invalidateConnection(int $userId): void {
        $ownTransaction = !$this->db->inTransaction();
        if ($ownTransaction) $this->db->beginTransaction();
        try {
            $this->repository->deleteConnection($userId);
            audit_record($this->db, $userId, 'calendar.reconnect_required', 'failure', ['provider' => 'google']);
            if ($ownTransaction) $this->db->commit();
        } catch (Throwable $e) {
            if ($ownTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @param array<string,mixed> $row */
    private function rowCoversRange(array $row, DateTimeImmutable $start, DateTimeImmutable $end): bool {
        $syncStart = $this->sqlDate(isset($row['sync_start']) ? (string)$row['sync_start'] : '');
        $syncEnd = $this->sqlDate(isset($row['sync_end']) ? (string)$row['sync_end'] : '');
        return $syncStart !== null && $syncEnd !== null && $syncStart <= $start && $syncEnd >= $end;
    }

    private function validProviderToken(string $token): bool {
        return $token !== '' && strlen($token) <= 16384 && preg_match('/[\r\n]/', $token) !== 1;
    }

    private function scopeContains(string $scope, string $required): bool {
        return in_array($required, preg_split('/\s+/', trim($scope)) ?: [], true);
    }

    private function validDateOnly(string $value): bool {
        if (preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $value) !== 1) return false;
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, level_clock_utc_timezone());
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function safeTimezone(string $value): string {
        static $known = null;
        $known ??= array_fill_keys(DateTimeZone::listIdentifiers(), true);
        return isset($known[$value]) ? $value : LEVEL_OS_TIMEZONE;
    }

    private function safeGoogleLink(string $value): ?string {
        if (strlen($value) > 2048) return null;
        $parts = parse_url($value);
        $host = is_array($parts) ? strtolower((string)($parts['host'] ?? '')) : '';
        return is_array($parts)
            && strtolower((string)($parts['scheme'] ?? '')) === 'https'
            && in_array($host, ['www.google.com', 'calendar.google.com'], true)
                ? $value : null;
    }

    private function cleanText(string $value, int $max): string {
        $value = trim((string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value));
        return mb_substr($value, 0, $max);
    }

    private function sqlDate(string $value): ?DateTimeImmutable {
        if (preg_match('/\A\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\z/D', $value) !== 1) return null;
        $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value, level_clock_utc_timezone());
        return $date === false ? null : $date;
    }

    private function sqlEpoch(mixed $value): int {
        return is_string($value) ? ($this->sqlDate($value)?->getTimestamp() ?? 0) : 0;
    }

    private function sqlToIso(mixed $value): ?string {
        $date = is_string($value) ? $this->sqlDate($value) : null;
        return $date?->format('Y-m-d\TH:i:s\Z');
    }

    /** @return array{status:string,accountEmail:null,connectedAt:null,syncedAt:null} */
    private function disconnectedStatus(): array {
        return ['status' => 'disconnected', 'accountEmail' => null, 'connectedAt' => null, 'syncedAt' => null];
    }
}
