<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('push_devices', 30, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

require_csrf();
$raw = file_get_contents('php://input', false, null, 0, 8193);
if (!is_string($raw) || strlen($raw) > 8192) {
    http_response_code(413);
    echo json_encode(['error' => 'payload_too_large']);
    exit;
}

$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}

$action = is_string($body['action'] ?? null) ? $body['action'] : '';
$platform = is_string($body['platform'] ?? null) ? $body['platform'] : '';
if (!in_array($platform, ['android', 'ios'], true)) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid_platform']);
    exit;
}

$db = get_db();
try {
    if ($action === 'unregister_all') {
        $stmt = $db->prepare(
            'UPDATE push_devices SET enabled = 0, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND platform = ?'
        );
        $stmt->execute([$uid, $platform]);
        session_write_close();
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action !== 'register') {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_action']);
        exit;
    }

    $token = is_string($body['token'] ?? null) ? trim($body['token']) : '';
    if (
        strlen($token) < 20
        || strlen($token) > 4096
        || preg_match('/[\x00-\x1F\x7F]/', $token) === 1
    ) {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_push_token']);
        exit;
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $db->prepare(
        'INSERT INTO push_devices
            (user_id, platform, token, token_hash, enabled, last_seen_at)
         VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            platform = VALUES(platform),
            token = VALUES(token),
            enabled = 1,
            last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([$uid, $platform, $token, $tokenHash]);
    session_write_close();
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    error_log('push-devices.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'push_device_save_failed']);
}
