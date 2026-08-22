<?php
declare(strict_types=1);

/**
 * Verificação automatizada do checklist de produção.
 * Não abre config.php nem imprime segredos. Saída != 0 bloqueia o CI.
 */

$root = dirname(__DIR__);
$checks = [];

function readiness_check(array &$checks, string $name, bool $passed, string $detail): void {
    $checks[] = compact('name', 'passed', 'detail');
}

function readiness_contains(string $path, string $needle): bool {
    $contents = is_file($path) ? file_get_contents($path) : false;
    return is_string($contents) && str_contains($contents, $needle);
}

$requiredExtensions = ['pdo', 'mbstring', 'json', 'curl', 'sodium', 'dom'];
foreach ($requiredExtensions as $extension) {
    readiness_check(
        $checks,
        'PHP extension: ' . $extension,
        extension_loaded($extension),
        extension_loaded($extension) ? 'available' : 'missing'
    );
}

$migration = $root . '/migrations/2026-08-09-assistant-quality.sql';
readiness_check($checks, 'assistant quality migration', is_file($migration), 'migration file is required');
readiness_check(
    $checks,
    'assistant quality mirrored in schema.sql',
    readiness_contains($root . '/schema.sql', 'CREATE TABLE IF NOT EXISTS assistant_quality_daily'),
    'schema.sql must mirror the migration'
);
readiness_check(
    $checks,
    'web vitals migration',
    is_file($root . '/migrations/2026-08-22-web-vitals.sql')
        && readiness_contains($root . '/schema.sql', 'CREATE TABLE IF NOT EXISTS web_vitals_daily'),
    'migration and schema.sql must stay aligned'
);
readiness_check(
    $checks,
    'marketing events migration',
    is_file($root . '/migrations/2026-08-22-marketing-events.sql')
        && readiness_contains($root . '/schema.sql', 'CREATE TABLE IF NOT EXISTS marketing_events_daily'),
    'conversion telemetry migration and schema.sql must stay aligned'
);
foreach (['assistant_quality_daily', 'web_vitals_daily', 'marketing_events_daily'] as $table) {
    readiness_check(
        $checks,
        'schema and backup contracts: ' . $table,
        readiness_contains($root . '/config/schema-contract.php', "'" . $table . "' => [")
            && readiness_contains($root . '/config/backup-contract.php', "'" . $table . "' => ['kind' => 'ephemeral']"),
        'every operational table must be audited and explicitly classified for backup'
    );
}
readiness_check(
    $checks,
    'production health endpoint',
    is_file($root . '/api/health.php')
        && readiness_contains($root . '/.github/workflows/deploy.yml', '/api/health.php'),
    'deploy must verify database, crypto and required migrations'
);

$htaccess = $root . '/.htaccess';
foreach (['app', 'automation', 'config', 'docs', 'migrations', 'scripts', 'tests', 'tmp'] as $directory) {
    readiness_check(
        $checks,
        'public directory denied: ' . $directory,
        readiness_contains($htaccess, $directory),
        '.htaccess must deny internal application directories'
    );
}
readiness_check(
    $checks,
    'public dotfiles denied',
    readiness_contains($htaccess, "RewriteRule (^|/)\\.(?!well-known(?:/|$)) - [F,L,NC]"),
    'deployment metadata and other hidden files must never be served'
);

$deploy = $root . '/.github/workflows/deploy.yml';
foreach (['config/**', 'docs/**', 'migrations/**', 'scripts/**', 'tests/**', 'frontend/**'] as $exclude) {
    readiness_check(
        $checks,
        'deploy exclusion: ' . $exclude,
        readiness_contains($deploy, $exclude),
        'internal or source-only files must not be uploaded'
    );
}

foreach (['api/import.php', 'api/export.php', 'api/subscription-checkout.php', 'api/totp-enroll.php'] as $endpoint) {
    readiness_check(
        $checks,
        'verified email gate: ' . $endpoint,
        readiness_contains($root . '/' . $endpoint, 'require_verified_email($uid)'),
        'sensitive endpoint must require a verified address'
    );
}

foreach (['api/assistant-confirm.php', 'api/assistant-undo.php', 'api/assistant-history.php'] as $endpoint) {
    readiness_check(
        $checks,
        'assistant verified email gate: ' . $endpoint,
        readiness_contains($root . '/' . $endpoint, 'require_verified_email($uid)'),
        'assistant mutations and destructive history operations must require a verified address'
    );
}

readiness_check(
    $checks,
    'encrypted backup implementation',
    is_file($root . '/app/Core/BackupCrypto.php') && readiness_contains($root . '/cron-notify.php', 'BackupArtifactWriter'),
    'automatic backup must use the authenticated encrypted container'
);
readiness_check(
    $checks,
    'real restore round-trip test',
    is_file($root . '/tests/cases/backup_recovery_test.php')
        && readiness_contains($root . '/tests/cases/backup_recovery_test.php', 'DatabaseRestore'),
    'restore must be covered by an isolated transactional test'
);
readiness_check(
    $checks,
    'critical user journey smoke',
    is_file($root . '/scripts/critical-smoke.php')
        && is_file($root . '/tests/cases/production_security_contract_test.php'),
    'registration, confirmation, 2FA, finance, backup and logout must stay covered'
);

$distIndex = $root . '/frontend/dist/index.php';
if (is_dir($root . '/frontend/dist') || in_array('--built', $argv, true)) {
    readiness_check(
        $checks,
        'frontend production build',
        is_file($distIndex) && is_file($root . '/frontend/dist/landing.html'),
        'run npm run build before this check'
    );
}

$failed = array_values(array_filter($checks, static fn(array $check): bool => !$check['passed']));
foreach ($checks as $check) {
    printf("%s %-48s %s\n", $check['passed'] ? '[OK]' : '[FAIL]', $check['name'], $check['detail']);
}

printf("\nProduction readiness: %d passed, %d failed.\n", count($checks) - count($failed), count($failed));
exit($failed === [] ? 0 : 1);
