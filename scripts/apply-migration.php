<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
require_once $root . '/db.php';

$allowed = [
    '2026-08-09-assistant-quality.sql',
    '2026-08-22-web-vitals.sql',
    '2026-08-22-marketing-events.sql',
];
$requested = trim((string)($argv[1] ?? ''));

if (!in_array($requested, $allowed, true)) {
    fwrite(STDERR, "Use: php scripts/apply-migration.php <migration>\nPermitidas:\n- " . implode("\n- ", $allowed) . "\n");
    exit(2);
}

$path = $root . '/migrations/' . $requested;
$sql = file_get_contents($path);
if (!is_string($sql) || trim($sql) === '') {
    fwrite(STDERR, "Migration vazia ou ausente.\n");
    exit(2);
}

$db = get_db();
try {
    $db->exec($sql);
    fwrite(STDOUT, "Aplicada: {$requested}\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Falha ao aplicar {$requested}: {$e->getMessage()}\n");
    exit(1);
}
