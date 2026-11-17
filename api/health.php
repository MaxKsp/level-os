<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$checks = [
    'database' => false,
    'crypto' => extension_loaded('sodium'),
    'assistant_quality' => false,
    'telemetry' => false,
];

try {
    $db = get_db();
    $checks['database'] = (int)$db->query('SELECT 1')->fetchColumn() === 1;

    $table = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $table->execute(['assistant_quality_daily']);
    $checks['assistant_quality'] = (int)$table->fetchColumn() === 1;
    $table->execute(['web_vitals_daily']);
    $checks['telemetry'] = (int)$table->fetchColumn() === 1;
} catch (Throwable $e) {
    error_log('health check failed: ' . $e->getMessage());
}

$requiredHealthy = $checks['database'] && $checks['crypto'] && $checks['assistant_quality'];
http_response_code($requiredHealthy ? 200 : 503);

echo json_encode([
    'status' => $requiredHealthy ? ($checks['telemetry'] ? 'ok' : 'degraded') : 'unavailable',
    'checks' => $checks,
    'time' => gmdate('c'),
], JSON_UNESCAPED_SLASHES);
