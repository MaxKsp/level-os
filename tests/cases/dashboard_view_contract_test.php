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
    <script>window.CSRF_TOKEN = <?= json_encode(csrf_token(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
    <script>window.LEVEL_OS_AUTH_CONFIG = <?= json_encode(supabase_public_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
    <script>window.LEVEL_OS_SENTRY_DSN = <?= json_encode(sentry_public_dsn(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
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
        dashboard_view_render($fixtureRoot, 'csrf-test-token');
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
        str_contains($html, 'window.CSRF_TOKEN = "csrf-test-token";'),
        'Dashboard view must inject the JSON-encoded CSRF token.'
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
