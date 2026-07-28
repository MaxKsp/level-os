<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Auth/MobileSessionService.php';

return static function (): void {
    $root = test_repo_root();
    $service = (string)file_get_contents($root . '/app/Modules/Auth/MobileSessionService.php');
    $auth = (string)file_get_contents($root . '/auth.php');
    $endpoint = (string)file_get_contents($root . '/api/mobile-session.php');
    $mobileApi = (string)file_get_contents($root . '/mobile/src/lib/api.ts');
    $migration = (string)file_get_contents($root . '/migrations/2026-07-28-mobile-sessions.sql');
    $schema = (string)file_get_contents($root . '/schema.sql');
    $schemaContract = require $root . '/config/schema-contract.php';
    $backupContract = require $root . '/config/backup-contract.php';

    test_assert_true(
        str_contains($service, "hash('sha256', \$token)"),
        'The server must store only a stable hash of the native token.'
    );
    test_assert_true(
        str_contains($service, 'u.session_version = ms.session_version'),
        'Password/session-version changes must invalidate native sessions.'
    );
    test_assert_true(
        substr_count($service, '$db->prepare(') >= 4,
        'Native-session persistence must use prepared statements.'
    );
    test_assert_true(
        str_contains($service, 'level_os_mobile_session_ensure_schema($db)')
            && str_contains($service, 'CREATE TABLE IF NOT EXISTS mobile_sessions'),
        'Self-hosted installs must bootstrap the idempotent session schema before issuing a token.'
    );
    test_assert_true(
        str_contains($auth, 'level_os_mobile_session_current(get_db())'),
        'Every authenticated API must resolve the native session before the PHP cookie.'
    );
    test_assert_true(
        substr_count($auth, "level_os_mobile_session_request_token() !== ''") >= 2,
        'Requests without a native token must not open a database connection before the auth guard.'
    );
    test_assert_true(
        str_contains($endpoint, "'mobile_token' => \$mobileToken"),
        'The authentication bridge must return the opaque native session token.'
    );
    foreach ([
        'X-Level-Mobile-Session',
        'level_os_mobile_session',
        'secureStorage.setItem',
        'secureStorage.removeItem',
    ] as $contract) {
        test_assert_true(
            str_contains($mobileApi, $contract),
            'The mobile API client is missing its session contract: ' . $contract
        );
    }
    test_assert_true(
        str_contains($migration, 'CREATE TABLE IF NOT EXISTS mobile_sessions')
            && str_contains($schema, 'CREATE TABLE IF NOT EXISTS mobile_sessions'),
        'The native-session migration must be idempotent and mirrored in schema.sql.'
    );
    test_assert_true(
        isset($schemaContract['mobile_sessions']),
        'The production schema auditor must include mobile_sessions.'
    );
    test_assert_same(
        'ephemeral',
        $backupContract['tables']['mobile_sessions']['kind'] ?? null,
        'Device sessions must never be exported in portable backups.'
    );

    $raw = LEVEL_OS_MOBILE_SESSION_PREFIX
        . rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    test_assert_same(48, strlen($raw), 'A native session token must have 256 bits of entropy plus its prefix.');
    test_assert_same(64, strlen(level_os_mobile_session_hash($raw)), 'Only a SHA-256 hash may be persisted.');
};
