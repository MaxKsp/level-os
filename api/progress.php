<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Modules/Progress/ProgressService.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('progress_read', 120, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method not allowed']);
    exit;
}

session_write_close();
try {
    $db = get_db();
    progress_reconcile_user($db, $uid);
    echo json_encode(progress_get_state($db, $uid));
} catch (Throwable $e) {
    error_log('progress.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Não foi possível carregar a progressão.']);
}
