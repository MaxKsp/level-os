<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Calendar/GoogleOAuthClient.php';

return static function (): void {
    $root = test_repo_root();
    $requiredFiles = [
        'app/Core/TokenCrypto.php',
        'app/Modules/Calendar/GoogleOAuthFlow.php',
        'app/Modules/Calendar/GoogleHttpTransport.php',
        'app/Modules/Calendar/GoogleOAuthClient.php',
        'app/Modules/Calendar/GoogleCalendarClient.php',
        'app/Modules/Calendar/GoogleCalendarRepository.php',
        'app/Modules/Calendar/GoogleCalendarService.php',
        'app/Modules/Calendar/GoogleCalendarBootstrap.php',
        'api/calendar-connect.php',
        'api/calendar-disconnect.php',
        'api/calendar.php',
        'migrations/2026-07-18-google-calendar-readonly.sql',
    ];
    foreach ($requiredFiles as $relativePath) {
        test_assert_true(is_file($root . '/' . $relativePath), 'Missing Google Calendar file: ' . $relativePath);
    }

    $connect = (string)file_get_contents($root . '/api/calendar-connect.php');
    $disconnect = (string)file_get_contents($root . '/api/calendar-disconnect.php');
    $calendar = (string)file_get_contents($root . '/api/calendar.php');
    $start = (string)file_get_contents($root . '/auth-google-start.php');
    $callback = (string)file_get_contents($root . '/auth-google-callback.php');
    $auth = (string)file_get_contents($root . '/auth.php');
    $service = (string)file_get_contents($root . '/app/Modules/Calendar/GoogleCalendarService.php');
    $migration = (string)file_get_contents($root . '/migrations/2026-07-18-google-calendar-readonly.sql');
    $schemaSql = (string)file_get_contents($root . '/schema.sql');
    $config = (string)file_get_contents($root . '/config.example.php');

    foreach ([
        'calendar-connect.php' => [$connect, 'POST', 'calendar-connect'],
        'calendar-disconnect.php' => [$disconnect, 'POST', 'calendar-disconnect'],
    ] as $name => [$source, $expectedMethod, $rateBucket]) {
        test_assert_true(str_contains($source, 'require_login()'), $name . ' must require login.');
        test_assert_true(
            str_contains($source, "require_rate_limit('" . $rateBucket . "'"),
            $name . ' must have its own rate-limit bucket.'
        );
        test_assert_true(str_contains($source, "!== '" . $expectedMethod . "'"), $name . ' must reject other methods.');
        test_assert_true(str_contains($source, 'require_csrf()'), $name . ' must validate CSRF.');
    }
    test_assert_true(
        str_contains($connect, 'google_calendar_issue_start_grant($uid)'),
        'Calendar connect must issue a user-bound one-shot start grant.'
    );
    test_assert_true(
        str_contains($connect, "'/auth-google-start.php?calendar='"),
        'Calendar connect must return only the local OAuth start route.'
    );
    test_assert_true(
        str_contains($disconnect, 'session_write_close()'),
        'Calendar disconnect must release the session before provider I/O.'
    );

    test_assert_true(str_contains($calendar, 'require_login()'), 'Calendar reads must require login.');
    test_assert_true(
        str_contains($calendar, "require_rate_limit('calendar-read'"),
        'Calendar reads must be rate limited.'
    );
    test_assert_true(str_contains($calendar, "!== 'GET'"), 'Calendar reads must reject non-GET methods.');
    test_assert_true(!str_contains($calendar, 'require_csrf()'), 'Read-only GET must not require a CSRF token.');
    test_assert_true(
        str_contains($calendar, 'session_write_close()'),
        'Calendar reads must release the session before provider I/O.'
    );
    test_assert_true(
        str_contains($calendar, 'invalid_calendar_range') && str_contains($calendar, '370 * 86400'),
        'Calendar reads must validate and bound the requested range.'
    );

    test_assert_true(
        str_contains($auth, "'samesite' => 'Lax'"),
        'The OAuth callback requires a SameSite=Lax session cookie.'
    );
    test_assert_true(
        str_contains($start, "google_calendar_consume_start_grant(\$calendarGrant, \$userId)"),
        'The OAuth start route must consume the user-bound Calendar grant.'
    );
    test_assert_true(
        str_contains($start, "\$scopes = ['openid', 'email', 'profile']")
            && str_contains($start, "\$scopes = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly']"),
        'Login and Calendar authorization must use separate scope sets.'
    );
    test_assert_true(
        str_contains($callback, 'google_oauth_consume_flow(')
            && str_contains($callback, '$calendarUserId !== $expectedUserId'),
        'The callback must consume one-shot state and bind Calendar consent to the logged-in user.'
    );
    test_assert_true(
        str_contains($callback, 'completeConnection((int)$calendarUserId, $tokenData, $userInfo)'),
        'Calendar consent must complete the server-side connection branch.'
    );

    $oauth = new GoogleOAuthClient('test-client-id', 'test-client-secret');
    $redirectUri = 'https://level.example/auth-google-callback.php';
    $state = str_repeat('a', 64);
    parse_str((string)parse_url(
        $oauth->authorizationUrl($redirectUri, $state, ['openid', 'email', 'profile'], false),
        PHP_URL_QUERY
    ), $loginQuery);
    $loginScopes = explode(' ', (string)($loginQuery['scope'] ?? ''));
    test_assert_true(
        !in_array('https://www.googleapis.com/auth/calendar.readonly', $loginScopes, true),
        'Ordinary Google login must not request Calendar access.'
    );
    test_assert_same('select_account', $loginQuery['prompt'] ?? null, 'Ordinary login must only select an account.');
    test_assert_true(!isset($loginQuery['access_type']), 'Ordinary login must not request offline access.');
    test_assert_true(!isset($loginQuery['include_granted_scopes']), 'Ordinary login must not request incremental grants.');

    parse_str((string)parse_url(
        $oauth->authorizationUrl(
            $redirectUri,
            $state,
            ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
            true,
            'person@example.com'
        ),
        PHP_URL_QUERY
    ), $calendarQuery);
    $calendarScopes = explode(' ', (string)($calendarQuery['scope'] ?? ''));
    test_assert_true(
        in_array('https://www.googleapis.com/auth/calendar.readonly', $calendarScopes, true),
        'Calendar consent must request the least-privilege read-only scope.'
    );
    test_assert_same('offline', $calendarQuery['access_type'] ?? null, 'Calendar consent must request offline access.');
    test_assert_same('consent', $calendarQuery['prompt'] ?? null, 'Calendar connection must explicitly request consent.');
    test_assert_same('true', $calendarQuery['include_granted_scopes'] ?? null, 'Calendar consent must be incremental.');

    test_assert_true(
        substr_count($migration, 'CREATE TABLE IF NOT EXISTS google_calendar_') >= 2,
        'The Calendar migration must idempotently create token and event-cache tables.'
    );
    foreach (['google_calendar_tokens', 'google_calendar_events', 'sync_token', 'account_email', 'ON DELETE CASCADE'] as $fragment) {
        test_assert_true(str_contains($migration, $fragment), 'Calendar migration is missing: ' . $fragment);
        test_assert_true(str_contains($schemaSql, $fragment), 'schema.sql does not mirror: ' . $fragment);
    }

    $schemaContract = require $root . '/config/schema-contract.php';
    $backupContract = require $root . '/config/backup-contract.php';
    foreach (['google_calendar_tokens', 'google_calendar_events'] as $table) {
        test_assert_true(isset($schemaContract[$table]), 'Schema contract must audit ' . $table . '.');
        test_assert_same(
            'ephemeral',
            $backupContract['tables'][$table]['kind'] ?? null,
            $table . ' must be excluded from portable backups.'
        );
        test_assert_true(
            !in_array($table, (array)($backupContract['table_order'] ?? []), true),
            $table . ' must not be included in persistent backup order.'
        );
    }
    test_assert_true(
        in_array(
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
            $schemaContract['google_calendar_tokens']['foreign_keys'] ?? [],
            true
        ),
        'Calendar tokens must cascade from their owning user.'
    );
    test_assert_true(
        in_array(
            ['column' => 'user_id', 'ref_table' => 'google_calendar_tokens', 'ref_column' => 'user_id', 'on_delete' => 'CASCADE'],
            $schemaContract['google_calendar_events']['foreign_keys'] ?? [],
            true
        ),
        'Cached events must cascade from their Calendar connection.'
    );

    test_assert_true(
        str_contains($service, '$this->crypto->encrypt($accessToken')
            && str_contains($service, '$this->crypto->encrypt($refreshToken')
            && str_contains($service, '$this->crypto->encrypt($nextSyncToken'),
        'Access, refresh and sync tokens must be encrypted before persistence.'
    );
    foreach (['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'ORBY_GOOGLE_TOKEN_KEY'] as $setting) {
        test_assert_true(str_contains($config, $setting), 'Missing Google deployment setting: ' . $setting);
    }

    foreach ([
        'api/calendar-connect.php' => $connect,
        'api/calendar-disconnect.php' => $disconnect,
        'api/calendar.php' => $calendar,
    ] as $name => $source) {
        test_assert_true(
            stripos($source, 'access_token') === false && stripos($source, 'refresh_token') === false,
            $name . ' must not expose provider token fields.'
        );
    }

    $frontendRoot = $root . '/frontend/src';
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($frontendRoot, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if (!$file instanceof SplFileInfo || !$file->isFile()) continue;
        $path = $file->getPathname();
        if (!in_array(strtolower($file->getExtension()), ['ts', 'tsx'], true)) continue;
        $normalizedPath = str_replace('\\', '/', $path);
        if (str_contains($normalizedPath, '/src/test/') || str_contains($file->getFilename(), '.test.')) continue;
        // Supabase Auth e a fonte de identidade do navegador e, por contrato,
        // entrega seu access token ao bridge PHP. Isso nao autoriza expor os
        // tokens OAuth offline do Google Calendar em nenhuma outra area.
        if (str_contains($normalizedPath, '/src/auth/')) continue;
        $source = (string)file_get_contents($path);
        test_assert_true(
            stripos($source, 'access_token') === false && stripos($source, 'refresh_token') === false,
            'Frontend runtime source must not know provider token fields: ' . $file->getFilename()
        );
    }
};
