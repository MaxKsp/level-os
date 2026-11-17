<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Modules/Training/TrainingKnowledgeService.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, max-age=600, stale-while-revalidate=3600');
require_login();
require_rate_limit('training-library', 60, 60);
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['error'=>'method_not_allowed']);
    exit;
}
$query = is_string($_GET['q'] ?? null) ? trim((string)$_GET['q']) : '';
$group = is_string($_GET['group'] ?? null) ? trim((string)$_GET['group']) : '';
$equipment = is_string($_GET['equipment'] ?? null) ? trim((string)$_GET['equipment']) : '';
$limit = max(1, min(60, (int)($_GET['limit'] ?? 36)));
$offset = max(0, min(5000, (int)($_GET['offset'] ?? 0)));
$videoOnly = (string)($_GET['video'] ?? '') === '1';
session_write_close();

try {
    $result = training_knowledge_search($query, $group, $equipment, $limit, $offset, $videoOnly);
    $payload = json_encode(['ok'=>true] + $result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $etag = '"' . hash('sha256', $payload) . '"';
    header('ETag: ' . $etag);
    if (trim((string)($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
        http_response_code(304);
        exit;
    }
    echo $payload;
} catch (Throwable $error) {
    error_log('training library failed (' . get_class($error) . ').');
    http_response_code(503);
    echo json_encode(['error'=>'training_library_unavailable','message'=>'Biblioteca externa indisponível agora.']);
}
