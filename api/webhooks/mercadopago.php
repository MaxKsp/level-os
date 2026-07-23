<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/MercadoPagoClient.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/MercadoPagoWebhookSignature.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/SubscriptionPaymentService.php';

header('Content-Type: application/json; charset=utf-8');
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

// O bucket é deliberadamente amplo: notificações do provedor podem compartilhar IP.
require_rate_limit('mercadopago-webhook', 600, 60);
session_write_close();

$contentType = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if ($contentType !== 'application/json') {
    http_response_code(415);
    echo json_encode(['error' => 'unsupported_media_type']);
    exit;
}
$raw = file_get_contents('php://input', false, null, 0, 1048577);
if (!is_string($raw) || strlen($raw) > 1048576) {
    http_response_code(413);
    echo json_encode(['error' => 'payload_too_large']);
    exit;
}
try {
    $payload = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}

$dataId = mercadopago_webhook_data_id($_GET, (string)($_SERVER['QUERY_STRING'] ?? ''), $payload);
$bodyDataId = isset($payload['data']) && is_array($payload['data']) && is_scalar($payload['data']['id'] ?? null)
    ? (string)$payload['data']['id']
    : '';
if ($bodyDataId !== '' && $dataId !== '' && !hash_equals(strtolower($bodyDataId), strtolower($dataId))) {
    http_response_code(400);
    echo json_encode(['error' => 'resource_mismatch']);
    exit;
}
$signature = trim((string)($_SERVER['HTTP_X_SIGNATURE'] ?? ''));
$requestId = trim((string)($_SERVER['HTTP_X_REQUEST_ID'] ?? ''));
$webhookSecret = defined('MERCADOPAGO_WEBHOOK_SECRET') ? trim((string)MERCADOPAGO_WEBHOOK_SECRET) : '';
if (!mercadopago_verify_webhook_signature($signature, $requestId, $dataId, $webhookSecret, level_clock_epoch())) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_signature']);
    exit;
}

$accessToken = defined('MERCADOPAGO_ACCESS_TOKEN') ? trim((string)MERCADOPAGO_ACCESS_TOKEN) : '';
$topic = strtolower((string)($payload['type'] ?? $payload['topic'] ?? $_GET['type'] ?? ''));

/** @param mixed $value */
function mercadopago_amount_cents(mixed $value): ?int {
    if (!is_int($value) && !is_float($value) && !is_string($value)) return null;
    if (!is_numeric($value)) return null;
    $amount = (float)$value;
    if (!is_finite($amount) || $amount <= 0 || $amount > 1000000) return null;
    return (int)round($amount * 100, 0, PHP_ROUND_HALF_UP);
}

/** @param array<string,mixed> $payment */
function mercadopago_payment_method(array $payment): ?string {
    $methodId = strtolower((string)($payment['payment_method_id'] ?? ''));
    $type = strtolower((string)($payment['payment_type_id'] ?? ''));
    if ($methodId === 'pix' || $type === 'bank_transfer') return 'pix';
    if (in_array($type, ['credit_card', 'debit_card', 'prepaid_card'], true)) return 'card';
    return null;
}

/** @param array<string,mixed> $payment */
function mercadopago_preapproval_id(array $payment): ?string {
    $candidates = [
        $payment['metadata']['preapproval_id'] ?? null,
        $payment['point_of_interaction']['transaction_data']['subscription_id'] ?? null,
        $payment['subscription_id'] ?? null,
    ];
    foreach ($candidates as $candidate) {
        if (is_scalar($candidate) && (string)$candidate !== '') return (string)$candidate;
    }
    return null;
}

/** @param array<string,mixed> $resource */
function mercadopago_resource_is_trusted(array $resource, bool $requireLiveMode = true): bool {
    $environment = defined('MERCADOPAGO_ENVIRONMENT')
        ? strtolower(trim((string)MERCADOPAGO_ENVIRONMENT))
        : 'production';
    if (!in_array($environment, ['production', 'sandbox'], true)) return false;

    $liveMode = filter_var($resource['live_mode'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if (($requireLiveMode && $liveMode === null) || ($liveMode !== null && ($environment === 'production') !== $liveMode)) return false;

    $expectedApplication = defined('MERCADOPAGO_APPLICATION_ID')
        ? trim((string)MERCADOPAGO_APPLICATION_ID)
        : '';
    $expectedCollector = defined('MERCADOPAGO_COLLECTOR_ID')
        ? trim((string)MERCADOPAGO_COLLECTOR_ID)
        : '';
    if ($expectedApplication === '' || $expectedCollector === '') return false;

    return hash_equals($expectedApplication, (string)($resource['application_id'] ?? ''))
        && hash_equals($expectedCollector, (string)($resource['collector_id'] ?? ''));
}

/** @param mixed $value */
function mercadopago_iso_datetime(mixed $value): ?DateTimeImmutable {
    if (!is_string($value) || strlen($value) < 10 || strlen($value) > 64) return null;
    try {
        return (new DateTimeImmutable($value))->setTimezone(level_clock_utc_timezone());
    } catch (Throwable) {
        return null;
    }
}

try {
    $client = new MercadoPagoClient($accessToken);

    if ($topic === 'subscription_preapproval') {
        $preapproval = $client->getPreapproval($dataId);
        if (!mercadopago_resource_is_trusted($preapproval, false)) {
            error_log('Mercado Pago webhook ignored untrusted preapproval environment/account.');
            echo json_encode(['ok' => true, 'processed' => false]);
            exit;
        }
        $providerStatus = strtolower((string)($preapproval['status'] ?? 'unknown'));
        subscription_record_provider_status(get_db(), (string)($preapproval['id'] ?? $dataId), $providerStatus);
        echo json_encode(['ok' => true, 'processed' => false]);
        exit;
    }

    $externalId = null;
    $externalReference = null;
    $paymentId = '';
    if ($topic === 'subscription_authorized_payment') {
        $authorizedPayment = $client->getAuthorizedPayment($dataId);
        $externalId = isset($authorizedPayment['preapproval_id']) ? (string)$authorizedPayment['preapproval_id'] : null;
        $externalReference = isset($authorizedPayment['external_reference']) ? (string)$authorizedPayment['external_reference'] : null;
        if ($externalId === '') $externalId = null;
        if ($externalReference === '') $externalReference = null;
        $nestedPayment = isset($authorizedPayment['payment']) && is_array($authorizedPayment['payment'])
            ? $authorizedPayment['payment']
            : [];
        $paymentId = isset($nestedPayment['id']) ? (string)$nestedPayment['id'] : '';
        if ($paymentId === '') {
            echo json_encode(['ok' => true, 'processed' => false]);
            exit;
        }
    } elseif ($topic === 'payment') {
        $paymentId = $dataId;
    } else {
        echo json_encode(['ok' => true, 'processed' => false]);
        exit;
    }

    // A notificação só aponta o recurso; a decisão usa o GET autenticado atual.
    $payment = $client->getPayment($paymentId);
    if (!mercadopago_resource_is_trusted($payment)) {
        error_log('Mercado Pago webhook ignored untrusted payment environment/account.');
        echo json_encode(['ok' => true, 'processed' => false]);
        exit;
    }
    $paymentStatus = strtolower((string)($payment['status'] ?? ''));
    $externalId ??= mercadopago_preapproval_id($payment);
    $externalReference ??= isset($payment['external_reference']) ? (string)$payment['external_reference'] : null;
    if ($externalId === '') $externalId = null;
    if ($externalReference === '') $externalReference = null;
    if ($paymentStatus !== 'approved') {
        if ($externalId !== null) subscription_record_provider_status(get_db(), $externalId, $paymentStatus ?: 'unknown');
        echo json_encode(['ok' => true, 'processed' => false]);
        exit;
    }

    $currency = strtoupper((string)($payment['currency_id'] ?? ''));
    $amountCents = mercadopago_amount_cents($payment['transaction_amount'] ?? null);
    $paymentMethod = mercadopago_payment_method($payment);
    if ($currency !== 'BRL' || $amountCents === null || $paymentMethod === null) {
        error_log('Mercado Pago webhook rejected approved payment with invalid currency, amount or method.');
        echo json_encode(['ok' => true, 'processed' => false]);
        exit;
    }

    $canonicalEventId = 'mp:payment:' . $paymentId . ':approved';
    if (strlen($canonicalEventId) > 96) {
        $canonicalEventId = 'mp:payment:' . hash('sha256', $paymentId) . ':approved';
    }
    $approvedAt = mercadopago_iso_datetime($payment['date_approved'] ?? null);
    $providerPeriodEnd = null;
    if ($externalId !== null) {
        $preapproval = $client->getPreapproval($externalId);
        if (!mercadopago_resource_is_trusted($preapproval, false)) {
            error_log('Mercado Pago webhook rejected payment linked to an untrusted preapproval.');
            echo json_encode(['ok' => true, 'processed' => false]);
            exit;
        }
        $nextPayment = mercadopago_iso_datetime($preapproval['next_payment_date'] ?? null);
        $providerPeriodEnd = $nextPayment?->format('Y-m-d H:i:s');
    }

    $result = subscription_apply_paid_event(
        get_db(),
        $canonicalEventId,
        $paymentId,
        $externalId,
        $externalReference,
        $amountCents,
        $paymentMethod,
        level_clock_epoch(),
        $providerPeriodEnd,
        $approvedAt?->getTimestamp()
    );
    if ($result['status'] === 'not_found') {
        // O webhook pode vencer a finalização local do checkout; peça retry ao MP.
        throw new RuntimeException('Approved payment mapping not found yet.');
    }
    if (in_array($result['status'], ['invalid', 'mismatch'], true)) {
        error_log('Mercado Pago approved payment rejected by local contract: ' . $result['status']);
    }
    echo json_encode([
        'ok' => true,
        'processed' => $result['status'] === 'processed',
        'duplicate' => $result['status'] === 'duplicate',
    ]);
} catch (Throwable $e) {
    error_log('Mercado Pago webhook failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'webhook_processing_failed']);
}
