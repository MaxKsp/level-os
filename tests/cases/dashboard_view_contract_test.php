<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Shared/DashboardView.php';

return static function (): void {
    $root = test_repo_root();
    $fixtureRoot = sys_get_temp_dir() . '/level-os-dashboard-view-' . bin2hex(random_bytes(8));
    $fixtureDist = $fixtureRoot . '/frontend/dist';

    if (!mkdir($fixtureDist, 0777, true) && !is_dir($fixtureDist)) {
        throw new RuntimeException('Unable to create the dashboard view fixture.');
    }

    $fixtureShell = <<<'PHP'
<?php require_once __DIR__ . '/auth.php'; ?>
<!doctype html>
<html lang="pt-BR">
<head>
    <link rel="icon" href="/favicon.svg">
    <script type="module" src="/frontend-assets/index.js"></script>
    <meta name="level-os-csrf" content="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
    <meta name="level-os-user-scope" content="<?= htmlspecialchars((string)$userId, ENT_QUOTES, 'UTF-8') ?>">
    <meta name="level-os-auth-config" content="<?= htmlspecialchars((string)json_encode(supabase_public_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT), ENT_QUOTES, 'UTF-8') ?>">
    <meta name="level-os-sentry-dsn" content="<?= htmlspecialchars((string)(sentry_public_dsn() ?? ''), ENT_QUOTES, 'UTF-8') ?>">
</head>
<body><div id="root"></div></body>
</html>
PHP;

    file_put_contents($fixtureDist . '/index.php', $fixtureShell);

    test_assert_true(
        dashboard_asset_version($root, 'assets/auth.css') !== '0',
        'Existing static assets must receive a cache version.'
    );
    test_assert_same(
        '0',
        dashboard_asset_version($root, 'assets/does-not-exist.css'),
        'Missing assets must use the stable zero fallback.'
    );

    try {
        ob_start();
        dashboard_view_render($fixtureRoot, 'csrf-test-token', 42);
        $html = (string)ob_get_clean();
    } finally {
        @unlink($fixtureDist . '/index.php');
        @rmdir($fixtureDist);
        @rmdir($fixtureRoot . '/frontend');
        @rmdir($fixtureRoot);
    }

    test_assert_true(str_contains(strtolower($html), '<!doctype html>'), 'Dashboard view must render a complete document.');
    test_assert_true(str_contains($html, '<div id="root"></div>'), 'Dashboard view must prefer the React application shell.');
    test_assert_true(
        str_contains($html, 'name="level-os-csrf" content="csrf-test-token"'),
        'Dashboard view must inject the escaped CSRF token as inert metadata.'
    );
    test_assert_true(
        str_contains($html, 'name="level-os-user-scope" content="42"'),
        'Dashboard view must scope browser storage to the authenticated user.'
    );
    test_assert_true(
        str_contains($html, '/frontend/dist/frontend-assets/'),
        'Local dashboard view must point to the compiled React assets.'
    );
    test_assert_true(
        !str_contains($html, 'assets/app.js?v='),
        'Dashboard view must not load the legacy runtime when the React build exists.'
    );
};
