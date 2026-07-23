<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../finance.php';
require_once __DIR__ . '/../plan.php';
require_once __DIR__ . '/../app/Modules/Finance/FinanceDataBootstrap.php';
require_once __DIR__ . '/../app/Modules/Finance/FinanceAuxiliaryKv.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('data', 200, 60);
$db = get_db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Leitura não mexe na sessão: solta o lock pra não serializar
    // requisições paralelas do mesmo usuário.
    session_write_close();
    if (isset($_GET['all'])) {
        try {
            // Duas queries fixas no financeiro; KV também é carregado em lote.
            $financeData = finance_data_bootstrap($db, $uid);
            $stmt = $db->prepare("SELECT data_key, data_value FROM kv_store WHERE user_id = ? AND data_key NOT LIKE '\\_%' ORDER BY data_key LIMIT 501");
            $stmt->execute([$uid]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) > 500) throw new OverflowException('User data key limit exceeded.');
            $out = [];
            $payloadBytes = 0;
            foreach ($rows as $row) {
                $payloadBytes += strlen((string)$row['data_value']);
                if ($payloadBytes > 2 * 1024 * 1024) throw new OverflowException('User data payload limit exceeded.');
                $out[$row['data_key']] = json_decode((string)$row['data_value'], false, 512, JSON_THROW_ON_ERROR);
            }
            foreach ($financeData as $kvKey => $value) $out[$kvKey] = $value;
            echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (OverflowException) {
            http_response_code(413);
            echo json_encode(['error' => 'data_too_large']);
        } catch (Throwable $e) {
            error_log('data bootstrap failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'data_unavailable']);
        }
        exit;
    }

    $key = (string)($_GET['key'] ?? '');
    if ($key === '') {
        http_response_code(400);
        echo json_encode(['error' => 'missing key']);
        exit;
    }
    $stmt = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ?');
    $stmt->execute([$uid, $key]);
    $row = $stmt->fetch();
    echo json_encode(['value' => $row ? json_decode($row['data_value']) : null]);
    exit;
}

if ($method === 'POST') {
    require_csrf();
    require_plan($uid, 'individual');
    $raw = file_get_contents('php://input', false, null, 0, 2 * 1024 * 1024 + 1);
    if (strlen($raw) > 2 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'payload too large']);
        exit;
    }
    $body = json_decode($raw, true);
    $key = is_array($body) ? (string)($body['key'] ?? '') : '';
    if ($key === '' || strlen($key) > 255 || !is_array($body) || !array_key_exists('value', $body)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid payload']);
        exit;
    }
    if (in_array($key, FINANCE_AUX_KV_KEYS, true)) {
        finance_auxiliary_kv_save($db, $uid, $key, $body['value']);
    } else {
        $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
        $stmt->execute([$uid, $key, json_encode($body['value'])]);
    }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
