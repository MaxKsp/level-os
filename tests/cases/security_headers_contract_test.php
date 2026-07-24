<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = test_repo_root();
    $security = file_get_contents($root . '/app/Core/SecurityHeaders.php');
    $authView = file_get_contents($root . '/app/Shared/AuthView.php');
    $builder = file_get_contents($root . '/frontend/scripts/build-php-shell.mjs');
    $frontendShell = file_get_contents($root . '/frontend/index.html');
    $login = file_get_contents($root . '/login.php');
    $htaccess = file_get_contents($root . '/.htaccess');

    test_assert_true(is_string($security) && str_contains($security, "script-src 'self'"), 'CSP must only allow scripts from the application origin.');
    test_assert_true(!str_contains((string)$security, "script-src 'self' 'unsafe-inline'"), 'Script CSP must reject unsafe-inline.');
    test_assert_true(!preg_match('/<script(?![^>]*\bsrc=)/i', (string)$authView), 'Authentication views must not contain inline scripts.');
    test_assert_true(!preg_match('/<script(?![^>]*\bsrc=)/i', (string)$login), 'Login must not contain inline scripts.');
    test_assert_true(!str_contains((string)$builder, 'window.CSRF_TOKEN'), 'The React shell must use inert metadata instead of inline bootstrap code.');
    test_assert_true(str_contains((string)$builder, 'level-os-auth-config'), 'The production React shell must expose runtime configuration through metadata.');
    test_assert_true(str_contains((string)$htaccess, 'Header always set Content-Security-Policy'), 'Apache-compatible hosts must receive the complete CSP fallback.');
    test_assert_true(str_contains((string)$authView, 'http-equiv="Content-Security-Policy"'), 'Authentication pages must enforce CSP even when the hosting provider rewrites response headers.');
    test_assert_true(str_contains((string)$frontendShell, 'http-equiv="Content-Security-Policy"'), 'The React shell must enforce CSP even when the hosting provider rewrites response headers.');
};
