<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = test_repo_root();
    $security = file_get_contents($root . '/app/Core/SecurityHeaders.php');
    $authView = file_get_contents($root . '/app/Shared/AuthView.php');
    $builder = file_get_contents($root . '/frontend/scripts/build-php-shell.mjs');

    test_assert_true(is_string($security) && str_contains($security, "'nonce-{\$nonce}'"), 'Dynamic CSP must authorize only the response nonce.');
    test_assert_true(!str_contains((string)$security, "script-src 'self' 'unsafe-inline'"), 'Dynamic script CSP must reject unsafe-inline.');
    test_assert_true(substr_count((string)$authView, 'nonce="<?= security_csp_nonce_attribute() ?>"') >= 3, 'Every inline authentication script must carry a nonce.');
    test_assert_true(str_contains((string)$builder, 'withNonces.replace') === false, 'Builder contract should not contain a stale transformation name.');
    test_assert_true(str_contains((string)$builder, 'withBootstrap.replace'), 'The production React shell must nonce Vite scripts.');
};
