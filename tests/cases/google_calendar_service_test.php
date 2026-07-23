<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Calendar/GoogleCalendarService.php';

final class CalendarTestTransport extends GoogleHttpTransport {
    /** @var array<string,list<array{status:int,body:string}>> */
    public array $queues = ['token' => [], 'calendar' => [], 'other' => []];
    /** @var list<string> */
    public array $requests = [];

    public function enqueue(string $route, int $status, array $body): void {
        $this->queues[$route][] = [
            'status' => $status,
            'body' => json_encode($body, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ];
    }

    public function request(string $method, string $url, array $headers = [], ?string $body = null, int $maxBytes = 2097152): array {
        $route = str_contains($url, '/token')
            ? 'token'
            : (str_contains($url, '/calendar/v3/') ? 'calendar' : 'other');
        $this->requests[] = $route . ':' . $method;
        if ($this->queues[$route] === []) throw new RuntimeException('Unexpected Google request: ' . $route);
        return array_shift($this->queues[$route]);
    }
}

return static function (): void {
    if (!extension_loaded('pdo_sqlite')) throw new RuntimeException('pdo_sqlite is required.');
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    $db->exec('CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NULL, event_type TEXT NOT NULL,
        outcome TEXT NOT NULL, request_id TEXT NOT NULL, ip_address TEXT NULL,
        user_agent TEXT NULL, metadata_json TEXT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )');
    $db->exec('CREATE TABLE google_calendar_tokens (
        user_id INTEGER PRIMARY KEY, access_token TEXT NOT NULL, refresh_token TEXT NOT NULL,
        expiry TEXT NOT NULL, scope TEXT NOT NULL, sync_token TEXT NULL,
        google_subject TEXT NOT NULL, account_email TEXT NOT NULL, sync_start TEXT NULL,
        sync_end TEXT NULL, cache_expires_at TEXT NULL, sync_lease_token TEXT NULL,
        sync_lease_until TEXT NULL, connected_at TEXT NOT NULL,
        last_synced_at TEXT NULL, updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');
    $db->exec('CREATE TABLE google_calendar_events (
        user_id INTEGER NOT NULL, event_hash TEXT NOT NULL, google_event_id TEXT NOT NULL,
        title TEXT NOT NULL, start_value TEXT NOT NULL, end_value TEXT NOT NULL,
        starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, all_day INTEGER NOT NULL,
        location TEXT NULL, html_link TEXT NULL, provider_updated_at TEXT NULL,
        mirrored_at TEXT NOT NULL, PRIMARY KEY (user_id, event_hash),
        FOREIGN KEY (user_id) REFERENCES google_calendar_tokens(user_id) ON DELETE CASCADE
    )');
    $db->exec('INSERT INTO users (id) VALUES (1), (2)');

    $transport = new CalendarTestTransport();
    $crypto = new TokenCrypto(base64_encode(random_bytes(32)));
    $repository = new GoogleCalendarRepository($db, $crypto);
    $oauth = new GoogleOAuthClient('client-id.apps.googleusercontent.com', 'client-secret-value', $transport);
    $calendar = new GoogleCalendarClient($transport);
    $service = new GoogleCalendarService($db, $repository, $oauth, $calendar, $crypto);
    $scope = 'openid email https://www.googleapis.com/auth/calendar.readonly';

    $service->completeConnection(1, [
        'access_token' => 'access-token-user-one',
        'refresh_token' => 'refresh-token-user-one',
        'expires_in' => 3600,
        'scope' => $scope,
    ], [
        'sub' => 'google-subject-user-one',
        'email' => 'one@example.com',
        'email_verified' => true,
    ]);
    $stored = $repository->findConnection(1);
    test_assert_true($stored !== null, 'Connection must be stored by user_id.');
    test_assert_true(!str_contains((string)$stored['access_token'], 'access-token-user-one'), 'Access token must be encrypted at rest.');
    test_assert_true(!str_contains((string)$stored['refresh_token'], 'refresh-token-user-one'), 'Refresh token must be encrypted at rest.');
    test_assert_same('connected', $service->connectionStatus(1)['status'], 'Valid encrypted tokens must report connected.');

    $transport->enqueue('calendar', 200, [
        'timeZone' => 'America/Sao_Paulo',
        'items' => [
            [
                'id' => 'timed-1', 'summary' => 'Consulta', 'status' => 'confirmed',
                'start' => ['dateTime' => '2026-07-18T10:00:00-03:00'],
                'end' => ['dateTime' => '2026-07-18T11:00:00-03:00'],
                'htmlLink' => 'https://www.google.com/calendar/event?eid=one',
            ],
            [
                'id' => 'all-day-1', 'summary' => 'Feriado', 'status' => 'confirmed',
                'start' => ['date' => '2026-07-19'], 'end' => ['date' => '2026-07-20'],
            ],
        ],
        'nextSyncToken' => 'sync-token-one',
    ]);
    $start = new DateTimeImmutable('2026-07-18T00:00:00-03:00');
    $end = new DateTimeImmutable('2026-07-21T00:00:00-03:00');
    $first = $service->eventsForRange(1, $start, $end);
    test_assert_same(2, count($first['events']), 'Full sync must mirror timed and all-day events.');
    test_assert_true($first['events'][0]['readOnly'] === true, 'Public events must remain read-only.');
    $mirroredSensitive = $db->query("SELECT google_event_id, title, location, html_link FROM google_calendar_events WHERE user_id = 1 AND event_hash = '" . hash('sha256', 'timed-1') . "'")->fetch(PDO::FETCH_ASSOC);
    test_assert_true(is_array($mirroredSensitive), 'The mirrored event must exist.');
    foreach (['google_event_id', 'title', 'html_link'] as $field) {
        test_assert_true(str_starts_with((string)$mirroredSensitive[$field], 'v1:'), 'Mirrored ' . $field . ' must be encrypted at rest.');
    }
    test_assert_true(!str_contains(json_encode($mirroredSensitive, JSON_THROW_ON_ERROR), 'Consulta'), 'Mirror ciphertext must not expose event titles.');
    $requestCount = count($transport->requests);
    $cached = $service->eventsForRange(1, $start, $end);
    test_assert_same(2, count($cached['events']), 'Fresh server cache must serve the complete mirror.');
    test_assert_same($requestCount, count($transport->requests), 'Fresh cache must avoid another Google call.');
    test_assert_same([], $repository->eventsBetween(2, '2026-07-18 00:00:00', '2026-07-22 00:00:00'), 'User B must not see user A events.');

    $db->exec("UPDATE google_calendar_tokens SET cache_expires_at = '2000-01-01 00:00:00' WHERE user_id = 1");
    $competingLease = str_repeat('a', 32);
    test_assert_true(
        $repository->tryAcquireSyncLease(1, $competingLease, level_clock_utc_sql(level_clock_epoch() + 120), level_clock_utc_sql()),
        'A sync lease must be acquired atomically.'
    );
    $beforeCompetingRead = count($transport->requests);
    $staleWhileSyncing = $service->eventsForRange(1, $start, $end);
    test_assert_same(2, count($staleWhileSyncing['events']), 'A concurrent read must serve the existing mirror.');
    test_assert_same($beforeCompetingRead, count($transport->requests), 'A concurrent read must not duplicate Google API calls.');
    $repository->releaseSyncLease(1, $competingLease);

    $transport->enqueue('calendar', 200, [
        'timeZone' => 'America/Sao_Paulo',
        'items' => [
            ['id' => 'timed-1', 'status' => 'cancelled'],
            [
                'id' => 'timed-2', 'summary' => 'Reunião', 'status' => 'confirmed',
                'start' => ['dateTime' => '2026-07-20T15:00:00-03:00'],
                'end' => ['dateTime' => '2026-07-20T16:00:00-03:00'],
            ],
        ],
        'nextSyncToken' => 'sync-token-two',
    ]);
    $delta = $service->eventsForRange(1, $start, $end);
    $ids = array_column($delta['events'], 'id');
    test_assert_true(!in_array('timed-1', $ids, true) && in_array('timed-2', $ids, true), 'Incremental sync must apply tombstones and updates.');

    $db->exec("UPDATE google_calendar_tokens SET cache_expires_at = '2000-01-01 00:00:00' WHERE user_id = 1");
    $transport->enqueue('calendar', 410, ['error' => ['status' => 'GONE']]);
    $transport->enqueue('calendar', 200, [
        'items' => [[
            'id' => 'after-410', 'summary' => 'Recuperado', 'status' => 'confirmed',
            'start' => ['dateTime' => '2026-07-18T12:00:00-03:00'],
            'end' => ['dateTime' => '2026-07-18T13:00:00-03:00'],
        ]],
        'nextSyncToken' => 'sync-token-after-410',
    ]);
    $recovered = $service->eventsForRange(1, $start, $end);
    test_assert_same(['after-410'], array_column($recovered['events'], 'id'), 'HTTP 410 must clear and rebuild the mirror.');

    $db->exec("UPDATE google_calendar_tokens SET expiry = '2000-01-01 00:00:00', cache_expires_at = '2000-01-01 00:00:00' WHERE user_id = 1");
    $transport->enqueue('token', 200, [
        'access_token' => 'rotated-access-token', 'expires_in' => 3600, 'scope' => $scope,
    ]);
    $transport->enqueue('calendar', 200, ['items' => [], 'nextSyncToken' => 'sync-after-refresh']);
    $service->eventsForRange(1, $start, $end);
    $refreshed = $repository->findConnection(1);
    test_assert_same(
        'rotated-access-token',
        $crypto->decrypt((string)$refreshed['access_token'], 1, 'google-calendar', 'access'),
        'Expired access tokens must refresh server-side.'
    );

    $db->exec("UPDATE google_calendar_tokens SET expiry = '2000-01-01 00:00:00', cache_expires_at = '2000-01-01 00:00:00' WHERE user_id = 1");
    $transport->enqueue('token', 400, ['error' => 'invalid_grant']);
    try {
        $service->eventsForRange(1, $start, $end);
        throw new RuntimeException('invalid_grant must fail.');
    } catch (GoogleProviderException $e) {
        test_assert_true($e->requiresReconnect(), 'invalid_grant must request reconnection.');
    }
    test_assert_same(null, $repository->findConnection(1), 'Revoked credentials must be removed for that user.');
};
