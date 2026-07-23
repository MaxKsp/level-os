<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Modules/Subscription/MercadoPagoClient.php';
require_once __DIR__ . '/../app/Modules/Subscription/SubscriptionRepository.php';
require_once __DIR__ . '/../app/Modules/Subscription/SubscriptionPolicy.php';
require_once __DIR__ . '/../app/Core/Clock.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
$db = get_db();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

/** @param array<string,mixed> $row */
function subscription_checkout_public(array $row): array {
    return [
        'provider' => 'mercadopago',
        'method' => in_array((string)$row['method'], ['pix', 'card'], true) ? (string)$row['method'] : 'card',
        'external_id' => (string)$row['external_id'],
        'status' => strtolower((string)$row['status']),
        'provider_status' => isset($row['provider_status']) ? (string)$row['provider_status'] : null,
        'checkout_url' => isset($row['checkout_url']) ? (string)$row['checkout_url'] : '',
        'payment_code' => isset($row['payment_code']) ? (string)$row['payment_code'] : '',
        'qr_code_data' => isset($row['qr_code_data']) ? (string)$row['qr_code_data'] : '',
        'expires_at' => $row['expires_at'] !== null ? (string)$row['expires_at'] : null,
        'amount_cents' => (int)$row['amount_cents'],
        'plan' => 'individual',
        'recurring' => (string)$row['method'] === 'card',
    ];
}

$publicColumns = 'id, method, external_id, status, provider_status, checkout_url, payment_code, qr_code_data, expires_at, amount_cents, plan';
$internalColumns = $publicColumns . ', resource_type, external_reference, updated_at';

if ($method === 'GET') {
    require_rate_limit('subscription-checkout-read', 60, 60);
    session_write_close();
    $stmt = $db->prepare(
        "SELECT $publicColumns
         FROM subscription_payments
         WHERE user_id = ? AND provider = 'mercadopago'
           AND (
             (status = 'pending' AND checkout_url IS NOT NULL AND checkout_url <> ''
              AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP()))
             OR (status = 'paid' AND paid_at >= UTC_TIMESTAMP() - INTERVAL 10 MINUTE)
             OR (status IN ('expired', 'cancelled') AND updated_at >= UTC_TIMESTAMP() - INTERVAL 10 MINUTE)
           )
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([$uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['payment' => $row === false ? null : subscription_checkout_public($row)]);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

require_rate_limit('subscription-checkout-write', 8, 60);
require_csrf();
session_write_close();
$raw = file_get_contents('php://input', false, null, 0, 16385);
if (!is_string($raw) || strlen($raw) > 16384) {
    http_response_code(413);
    echo json_encode(['error' => 'payload_too_large']);
    exit;
}
try {
    $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}
$requestedMethod = is_array($body) ? strtolower((string)($body['method'] ?? '')) : '';
if (!in_array($requestedMethod, ['pix', 'card'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_method']);
    exit;
}

$subscriptionSnapshot = (new SubscriptionRepository($db))->findByUserId($uid);
$subscriptionState = (new SubscriptionPolicy(static fn(): int => level_clock_epoch()))->describeForApi($subscriptionSnapshot);
if ($subscriptionState['access'] === true && $subscriptionState['in_trial'] === false) {
    http_response_code(409);
    echo json_encode(['error' => 'subscription_already_active']);
    exit;
}

$accessToken = defined('MERCADOPAGO_ACCESS_TOKEN') ? trim((string)MERCADOPAGO_ACCESS_TOKEN) : '';
$amountCents = defined('MERCADOPAGO_INDIVIDUAL_PRICE_CENTS')
    ? (int)MERCADOPAGO_INDIVIDUAL_PRICE_CENTS
    : 1990;
$appUrl = defined('APP_URL') ? rtrim(trim((string)APP_URL), '/') : '';
$backUrl = $appUrl . '/perfil#plan';
$notificationUrl = $appUrl . '/api/webhooks/mercadopago.php';

try {
    $client = new MercadoPagoClient($accessToken);

    // A row do usuário funciona como mutex. Persistir a intenção antes da
    // chamada externa evita dois mandatos e permite retry com a mesma chave.
    $db->beginTransaction();
    $user = $db->prepare('SELECT email FROM users WHERE id = ? LIMIT 1 FOR UPDATE');
    $user->execute([$uid]);
    $payerEmail = trim((string)($user->fetchColumn() ?: ''));
    if (filter_var($payerEmail, FILTER_VALIDATE_EMAIL) === false) {
        $db->rollBack();
        http_response_code(422);
        echo json_encode(['error' => 'payment_email_required']);
        exit;
    }

    $pending = $db->prepare(
        "SELECT $internalColumns
         FROM subscription_payments
         WHERE user_id = ? AND provider = 'mercadopago' AND method = ? AND status = 'pending'
           AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
         ORDER BY id DESC LIMIT 1 FOR UPDATE"
    );
    $pending->execute([$uid, $requestedMethod]);
    $intent = $pending->fetch(PDO::FETCH_ASSOC);
    if ($intent !== false && (string)($intent['checkout_url'] ?? '') !== '') {
        $db->commit();
        echo json_encode(['payment' => subscription_checkout_public($intent)]);
        exit;
    }

    if ($intent === false) {
        $externalReference = 'levelos-' . bin2hex(random_bytes(16));
        $intentExternalId = 'intent-' . $externalReference;
        $insertIntent = $db->prepare(
            "INSERT INTO subscription_payments
             (user_id, provider, method, resource_type, external_id, external_reference, plan,
              amount_cents, status, provider_status, checkout_url, expires_at)
             VALUES (?, 'mercadopago', ?, 'checkout_intent', ?, ?, 'individual', ?, 'pending', 'creating', NULL, NULL)"
        );
        $insertIntent->execute([$uid, $requestedMethod, $intentExternalId, $externalReference, $amountCents]);
        $intentId = (int)$db->lastInsertId();
    } else {
        $intentId = (int)$intent['id'];
        $externalReference = (string)$intent['external_reference'];
    }
    $db->commit();

    $idempotencyKey = 'levelos:' . $requestedMethod . ':' . hash('sha256', $externalReference);
    $paymentCode = '';
    $qrCodeData = '';
    $expiresAt = null;
    if ($requestedMethod === 'pix') {
        $provider = $client->createPixPayment(
            $amountCents,
            $externalReference,
            $payerEmail,
            $notificationUrl,
            $idempotencyKey
        );
        $transactionData = isset($provider['point_of_interaction']['transaction_data'])
            && is_array($provider['point_of_interaction']['transaction_data'])
                ? $provider['point_of_interaction']['transaction_data']
                : [];
        $checkoutUrl = (string)($transactionData['ticket_url'] ?? '');
        $paymentCode = (string)($transactionData['qr_code'] ?? '');
        $qrCodeData = (string)($transactionData['qr_code_base64'] ?? '');
        if (str_starts_with($qrCodeData, 'data:image/png;base64,')) {
            $qrCodeData = substr($qrCodeData, strlen('data:image/png;base64,'));
        }
        $providerExpiration = (string)($provider['date_of_expiration'] ?? '');
        if ($providerExpiration !== '') {
            try {
                $expiresAt = (new DateTimeImmutable($providerExpiration))
                    ->setTimezone(level_clock_utc_timezone())
                    ->format('Y-m-d H:i:s');
            } catch (Throwable) {
                $expiresAt = null;
            }
        }
        $resourceType = 'payment';
    } else {
        $provider = $client->createSubscription(
            $amountCents,
            $externalReference,
            $payerEmail,
            $backUrl,
            $idempotencyKey
        );
        $checkoutUrl = (string)($provider['init_point'] ?? '');
        $resourceType = 'preapproval';
    }
    $externalId = isset($provider['id']) ? (string)$provider['id'] : '';
    $providerStatus = isset($provider['status']) ? strtolower((string)$provider['status']) : 'pending';
    $urlParts = parse_url($checkoutUrl);
    if (
        !preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $externalId)
        || !is_array($urlParts)
        || strtolower((string)($urlParts['scheme'] ?? '')) !== 'https'
        || !isset($urlParts['host'])
        || strlen($checkoutUrl) > 2048
    ) {
        throw new RuntimeException('Invalid payment response.');
    }
    if ($requestedMethod === 'pix' && (
        strlen($paymentCode) < 32
        || strlen($paymentCode) > 4096
        || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $paymentCode)
        || strlen($qrCodeData) > 2097152
        || ($qrCodeData !== '' && base64_decode($qrCodeData, true) === false)
    )) {
        throw new RuntimeException('Invalid Pix payment response.');
    }

    $db->beginTransaction();
    $locked = $db->prepare(
        "SELECT $internalColumns FROM subscription_payments
         WHERE id = ? AND user_id = ? AND provider = 'mercadopago' LIMIT 1 FOR UPDATE"
    );
    $locked->execute([$intentId, $uid]);
    $current = $locked->fetch(PDO::FETCH_ASSOC);
    if ($current === false || !hash_equals((string)$current['external_reference'], $externalReference)) {
        throw new RuntimeException('Checkout intent mapping disappeared.');
    }
    if ((string)$current['resource_type'] === 'checkout_intent') {
        $finalize = $db->prepare(
            "UPDATE subscription_payments
             SET method = ?, resource_type = ?, external_id = ?, provider_status = ?,
                 checkout_url = ?, payment_code = ?, qr_code_data = ?, expires_at = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND resource_type = 'checkout_intent' AND status = 'pending'"
        );
        $finalize->execute([
            $requestedMethod,
            $resourceType,
            $externalId,
            mb_substr($providerStatus, 0, 32),
            $checkoutUrl,
            $paymentCode !== '' ? $paymentCode : null,
            $qrCodeData !== '' ? $qrCodeData : null,
            $expiresAt,
            $intentId,
            $uid,
        ]);
        $current = array_merge($current, [
            'method' => $requestedMethod,
            'resource_type' => $resourceType,
            'external_id' => $externalId,
            'provider_status' => $providerStatus,
            'checkout_url' => $checkoutUrl,
            'payment_code' => $paymentCode,
            'qr_code_data' => $qrCodeData,
            'expires_at' => $expiresAt,
        ]);
    } elseif (!hash_equals((string)$current['external_id'], $externalId)) {
        throw new RuntimeException('Idempotent provider response mismatch.');
    }
    $db->commit();
    echo json_encode(['payment' => subscription_checkout_public($current)]);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    if (isset($intentId)) {
        try {
            $db->prepare(
                "UPDATE subscription_payments SET provider_status = 'create_failed', updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ? AND resource_type = 'checkout_intent' AND status = 'pending'"
            )->execute([$intentId, $uid]);
        } catch (Throwable) {
            // O retry conserva a referência/idempotency key mesmo se este update falhar.
        }
    }
    error_log('Mercado Pago subscription checkout failed: ' . $e->getMessage());
    if ($e instanceof MercadoPagoApiException && in_array($e->httpStatus, [400, 401, 403], true)) {
        http_response_code(503);
        echo json_encode(['error' => 'payment_configuration_invalid']);
    } else {
        http_response_code(502);
        echo json_encode(['error' => 'payment_unavailable']);
    }
}
