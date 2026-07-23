<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/MercadoPagoWebhookSignature.php';

return function (): void {
    $secret = 'test-secret-with-enough-entropy';
    $requestId = 'request-550e8400-e29b-41d4-a716';
    $dataId = 'ABC-123';
    $timestamp = 1_800_000_000;
    $manifest = 'id:abc-123;request-id:' . $requestId . ';ts:' . $timestamp . ';';
    $hash = hash_hmac('sha256', $manifest, $secret);

    test_assert_true(
        mercadopago_verify_webhook_signature("ts=$timestamp,v1=$hash", $requestId, $dataId, $secret, $timestamp),
        'A valid Mercado Pago manifest must pass.'
    );
    test_assert_true(
        mercadopago_verify_webhook_signature("v1:$hash, ts:$timestamp", $requestId, $dataId, $secret, $timestamp),
        'Header order and documented separators must not affect validation.'
    );
    test_assert_true(
        !mercadopago_verify_webhook_signature("ts=$timestamp,v1=" . str_repeat('0', 64), $requestId, $dataId, $secret, $timestamp),
        'An invalid HMAC must fail closed.'
    );
    test_assert_true(
        !mercadopago_verify_webhook_signature("ts=$timestamp,v1=$hash", $requestId, $dataId, $secret, $timestamp + 601),
        'A stale signed request must fail the replay window.'
    );

    test_assert_same(
        'ABC-123',
        mercadopago_webhook_data_id([], 'type=payment&data.id=ABC-123', ['data' => ['id' => 'different']]),
        'The signed query-string data.id is authoritative.'
    );
    test_assert_same(
        '42',
        mercadopago_webhook_data_id(['data_id' => '42'], '', null),
        'PHP-normalized data_id must be supported.'
    );
    test_assert_same(
        '99',
        mercadopago_webhook_data_id([], '', ['data' => ['id' => 99]]),
        'Payload data.id is a compatibility fallback when the query is absent.'
    );
};
