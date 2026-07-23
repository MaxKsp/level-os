<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Auth/SupabaseAuthBootstrap.php';

function sat_jwt(array $claims): string {
    $encode = static fn(array $value): string => rtrim(strtr(base64_encode(json_encode($value, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    return $encode(['alg' => 'RS256', 'typ' => 'JWT']) . '.' . $encode($claims) . '.signature';
}

function sat_db(): PDO {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NULL,
        session_version INTEGER NOT NULL DEFAULT 1,
        email TEXT NULL UNIQUE,
        email_verified_at TEXT NULL,
        auth_provider TEXT NULL,
        auth_subject TEXT NULL,
        auth_linked_at TEXT NULL,
        avatar TEXT NULL,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        totp_secret TEXT NULL,
        UNIQUE (auth_provider, auth_subject)
    )');
    $db->exec('CREATE TABLE totp_backup_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, code_hash TEXT, used_at TEXT NULL)');
    $db->exec('CREATE TABLE subscriptions (user_id INTEGER PRIMARY KEY, plan TEXT, status TEXT, current_period_end TEXT, trial_ends_at TEXT)');
    $db->exec('CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NULL, event_type TEXT NOT NULL,
        outcome TEXT NOT NULL, request_id TEXT NOT NULL, ip_address TEXT NULL,
        user_agent TEXT NULL, metadata_json TEXT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )');
    return $db;
}

return static function (): void {
    $url = 'https://level-os-test.supabase.co';
    $subject = '11111111-2222-4333-8444-555555555555';
    $token = sat_jwt([
        'sub' => $subject,
        'iss' => $url . '/auth/v1',
        'aud' => 'authenticated',
        'exp' => time() + 3600,
        'aal' => 'aal1',
    ]);
    $request = null;
    $client = new SupabaseAuthClient(
        $url,
        'sb_publishable_test_abcdefghijklmnopqrstuvwxyz',
        static function (string $requestUrl, array $headers) use (&$request, $subject): array {
            $request = ['url' => $requestUrl, 'headers' => $headers];
            return ['status' => 200, 'body' => json_encode([
                'id' => $subject,
                'email' => 'MAX@EXAMPLE.COM',
                'email_confirmed_at' => '2026-07-20T12:00:00Z',
                'user_metadata' => ['username' => 'Max.Test', 'avatar_url' => 'https://lh3.googleusercontent.com/avatar'],
                'factors' => [['factor_type' => 'totp', 'status' => 'verified']],
            ], JSON_THROW_ON_ERROR)];
        },
    );
    $identity = $client->verifyAccessToken($token);
    test_assert_same($subject, $identity->subject, 'The canonical Supabase subject must be used.');
    test_assert_same('max@example.com', $identity->email, 'E-mail must be normalized.');
    test_assert_true($identity->emailVerified, 'A confirmed Supabase e-mail must be recognized.');
    test_assert_true($identity->hasVerifiedTotp, 'Verified managed TOTP factors must be detected.');
    test_assert_same($url . '/auth/v1/user', $request['url'], 'Token validation must use the fixed Auth user endpoint.');
    test_assert_true(in_array('Authorization: Bearer ' . $token, $request['headers'], true), 'The access token must be sent only as Bearer auth.');

    $badClaimsCaught = false;
    try {
        $client->verifyAccessToken(sat_jwt([
            'sub' => $subject, 'iss' => 'https://evil.example/auth/v1',
            'aud' => 'authenticated', 'exp' => time() + 3600,
        ]));
    } catch (SupabaseAuthException) {
        $badClaimsCaught = true;
    }
    test_assert_true($badClaimsCaught, 'Issuer mismatch must be rejected after server validation.');

    $db = sat_db();
    $service = new SupabaseIdentityService($db);
    $created = $service->resolve($identity);
    test_assert_true($created['created'], 'A new verified Supabase identity must create a local account.');
    test_assert_same(1, (int)$db->query('SELECT COUNT(*) FROM subscriptions')->fetchColumn(), 'A new identity must receive the trial subscription.');
    test_assert_same('supabase', $db->query('SELECT auth_provider FROM users')->fetchColumn(), 'The local user must store only the provider mapping.');
    test_assert_same(null, $db->query('SELECT password_hash FROM users')->fetchColumn(), 'Supabase users must not receive a local password.');
    $again = $service->resolve($identity);
    test_assert_true(!$again['created'] && $again['user_id'] === $created['user_id'], 'Provider retries must resolve idempotently.');

    $db->exec("INSERT INTO users (username, password_hash, email, email_verified_at) VALUES ('legacy', 'hash', 'legacy@example.com', CURRENT_TIMESTAMP)");
    $legacyId = (int)$db->lastInsertId();
    $legacyIdentity = new SupabaseIdentity(
        'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        'legacy@example.com',
        true,
        time() + 3600,
        'aal1',
        [],
    );
    $linkRequired = false;
    try {
        $service->resolve($legacyIdentity);
    } catch (SupabaseAccountLinkRequiredException) {
        $linkRequired = true;
    }
    test_assert_true($linkRequired, 'Matching e-mail alone must never auto-link a legacy account.');
    $service->linkExisting($legacyId, $legacyIdentity);
    $stmt = $db->prepare('SELECT auth_subject FROM users WHERE id = ?');
    $stmt->execute([$legacyId]);
    test_assert_same($legacyIdentity->subject, $stmt->fetchColumn(), 'A locally authenticated account may be linked explicitly.');

    $db->exec("UPDATE users SET totp_enabled = 1, totp_secret = 'legacy-secret' WHERE id = " . $legacyId);
    $db->exec("INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (" . $legacyId . ", 'legacy-code')");
    $service->retireLegacyTotp($legacyId);
    test_assert_same(0, (int)$db->query('SELECT totp_enabled FROM users WHERE id = ' . $legacyId)->fetchColumn(), 'Verified managed MFA must retire the legacy factor.');
    test_assert_same(0, (int)$db->query('SELECT COUNT(*) FROM totp_backup_codes WHERE user_id = ' . $legacyId)->fetchColumn(), 'Legacy backup codes must be removed with the factor.');

    $root = test_repo_root();
    $migration = (string)file_get_contents($root . '/migrations/2026-07-20-supabase-auth.sql');
    $endpoint = (string)file_get_contents($root . '/api/auth-supabase-exchange.php');
    $loginPage = (string)file_get_contents($root . '/login.php');
    test_assert_true(str_contains($migration, 'information_schema.COLUMNS'), 'The auth migration must be idempotent.');
    foreach (['require_csrf()', 'rate_ok_for_subject(', 'verifyAccessToken(', 'retireLegacyTotp(', 'complete_login('] as $guard) {
        test_assert_true(str_contains($endpoint, $guard), 'The session exchange must include ' . $guard);
    }
    test_assert_true(
        str_contains($endpoint, '$currentUserId = current_user_id()')
            && str_contains($endpoint, '$currentUserId !== $resolved'),
        'An already authenticated matching PHP session must not rotate its CSRF token.',
    );
    test_assert_true(
        str_contains($endpoint, "header('X-CSRF-Token: ' . csrf_token())"),
        'A regenerated PHP session must return its fresh CSRF token to the browser.',
    );
    test_assert_true(!str_contains($endpoint, 'SERVICE_ROLE'), 'The service-role key must never enter the browser session flow.');
    test_assert_true(
        substr_count($loginPage, 'data-supabase-login') >= 2,
        'Both the regular login and MFA forms must initialize the Supabase login controller.',
    );
    test_assert_true(str_contains($loginPage, 'data-supabase-google'), 'The Google button must be intercepted by Supabase OAuth.');
};
