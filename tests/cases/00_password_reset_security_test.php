<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/auth.php';

return static function (): void {
    $token = str_repeat('ab', PASSWORD_RESET_TOKEN_BYTES);
    test_assert_true(password_reset_token_is_well_formed($token), 'A 256-bit lowercase hex token must be accepted.');
    test_assert_true(!password_reset_token_is_well_formed(strtoupper($token)), 'Uppercase and non-canonical tokens must be rejected.');
    test_assert_true(!password_reset_token_is_well_formed(substr($token, 2)), 'Short reset tokens must be rejected.');
    test_assert_same(hash('sha256', $token), password_reset_token_hash($token), 'Only the SHA-256 token digest is persisted.');

    $subject = password_reset_rate_subject(' User@Example.COM ');
    test_assert_same(64, strlen($subject), 'The opaque account rate-limit key must fit the database contract.');
    test_assert_true(!str_contains($subject, 'example.com'), 'The account rate-limit key must not expose the e-mail.');
    test_assert_same($subject, password_reset_rate_subject('user@example.com'), 'E-mail normalization must be stable.');

    foreach (['localhost', '127.0.0.1', '::1', 'app.orby.com.br'] as $host) {
        test_assert_true(app_host_is_valid($host), 'Expected a valid host: ' . $host);
    }
    foreach (['', 'evil.com/path', "evil.com\r\nX-Test: injected", '-bad.example', 'bad..example'] as $host) {
        test_assert_true(!app_host_is_valid($host), 'Expected an invalid host: ' . json_encode($host));
    }
    test_assert_true(app_host_is_local('localhost'), 'localhost must be allowed for local reset links.');
    test_assert_true(app_host_is_local('127.0.0.1'), 'Loopback must be allowed for local reset links.');
    test_assert_true(app_host_is_local('127.10.20.30'), 'The IPv4 loopback range must be allowed locally.');
    test_assert_true(app_host_is_local('::1'), 'IPv6 loopback must be allowed locally.');
    test_assert_true(!app_host_is_local('8.8.8.8'), 'Public IPs must require the canonical APP_URL.');
    foreach (['10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', 'fc00::1', 'fe80::1'] as $host) {
        test_assert_true(!app_host_is_local($host), 'Private/reserved addresses must not authorize Host fallback: ' . $host);
    }
    test_assert_true(!app_host_is_local('app.orby.com.br'), 'Public hostnames must require the canonical APP_URL.');

    if (PHP_SAPI !== 'cli-server' && !defined('APP_URL')) {
        $previousHost = $_SERVER['HTTP_HOST'] ?? null;
        $_SERVER['HTTP_HOST'] = '127.0.0.1:8080';
        test_assert_same(null, trusted_app_base_url(), 'HTTP_HOST fallback must only exist in the PHP development server.');
        if ($previousHost === null) {
            unset($_SERVER['HTTP_HOST']);
        } else {
            $_SERVER['HTTP_HOST'] = $previousHost;
        }
    }

    $root = test_repo_root();
    $authSource = (string)file_get_contents($root . '/auth.php');
    $forgotSource = (string)file_get_contents($root . '/forgot-password.php');
    foreach (['register.php', 'auth-google-start.php', 'auth-google-callback.php'] as $originConsumer) {
        $source = (string)file_get_contents($root . '/' . $originConsumer);
        test_assert_true(
            str_contains($source, 'trusted_app_base_url()') && !str_contains($source, "\$_SERVER['HTTP_HOST']"),
            $originConsumer . ' must use only the canonical application origin.'
        );
    }
    test_assert_true(
        str_contains($authSource, 'WHERE bucket = ? AND subject = ? FOR UPDATE'),
        'The shared rate limiter must serialize decisions with a row lock.'
    );
    test_assert_true(
        str_contains($forgotSource, '$accountAllowed = $ipAllowed && rate_ok_for_subject('),
        'A blocked IP must not create arbitrary account limiter rows.'
    );
    test_assert_true(
        str_contains($authSource, 'session_version = session_version + 1'),
        'Password reset must invalidate all sessions issued with the old credential version.'
    );
    test_assert_true(
        str_contains($authSource, "\$_SESSION['pending_2fa_session_version']"),
        'Pending 2FA sessions must be bound to the credential version used at password verification.'
    );

    $schemaContract = require $root . '/config/schema-contract.php';
    $backupContract = require $root . '/config/backup-contract.php';
    test_assert_true(
        isset($schemaContract['users']['columns']['session_version']),
        'The schema contract must require users.session_version.'
    );
    test_assert_true(
        isset($schemaContract['password_reset_tokens']),
        'The schema contract must audit password_reset_tokens.'
    );
    test_assert_same(
        'ephemeral',
        $backupContract['tables']['password_reset_tokens']['kind'] ?? null,
        'Reset tokens must be explicitly excluded from persistent backups.'
    );
};
