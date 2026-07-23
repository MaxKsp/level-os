<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('prefs', 60, 60);
$db = get_db();

function prefs_load(PDO $db, int $uid): array {
    $userStmt = $db->prepare('SELECT notify_email FROM users WHERE id = ? LIMIT 1');
    $userStmt->execute([$uid]);
    $notifyEmail = (int)$userStmt->fetchColumn() === 1;
    $prefsStmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
    $prefsStmt->execute([$uid, '_preferences_v1']);
    $raw = $prefsStmt->fetchColumn();
    $stored = is_string($raw) ? json_decode($raw, true) : [];
    if (!is_array($stored)) $stored = [];
    return [
        'theme' => ($stored['theme'] ?? null) === 'light' ? 'light' : 'dark',
        'notifications' => is_array($stored['notifications'] ?? null) ? $stored['notifications'] : ['tasks' => true, 'finance' => true, 'backup' => false],
        'notify_email' => $notifyEmail,
        'onboarding_completed' => ($stored['onboarding_completed'] ?? false) === true,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    session_write_close();
    echo json_encode(prefs_load($db, $uid));
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
require_csrf();
$raw = file_get_contents('php://input', false, null, 0, 16385);
if (!is_string($raw) || strlen($raw) > 16384) {
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
$current = prefs_load($db, $uid);
$theme = isset($body['theme']) && in_array($body['theme'], ['dark', 'light'], true) ? $body['theme'] : $current['theme'];
$notificationsInput = is_array($body['notifications'] ?? null) ? $body['notifications'] : $current['notifications'];
$notifications = [
    'tasks' => (bool)($notificationsInput['tasks'] ?? true),
    'finance' => (bool)($notificationsInput['finance'] ?? true),
    'backup' => (bool)($notificationsInput['backup'] ?? false),
];
$notifyEmail = array_key_exists('notify_email', $body) ? (bool)$body['notify_email'] : (bool)$current['notify_email'];
$onboardingCompleted = array_key_exists('onboarding_completed', $body)
    ? (bool)$body['onboarding_completed']
    : (bool)$current['onboarding_completed'];
$stored = [
    'theme' => $theme,
    'notifications' => $notifications,
    'onboarding_completed' => $onboardingCompleted,
];

try {
    $db->beginTransaction();
    $db->prepare('UPDATE users SET notify_email = ? WHERE id = ?')->execute([$notifyEmail ? 1 : 0, $uid]);
    $save = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $save->execute([$uid, '_preferences_v1', json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    $db->commit();
    echo json_encode([...$stored, 'notify_email' => $notifyEmail]);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('prefs.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'preferences_save_failed']);
}
