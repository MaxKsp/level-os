<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return function (): void {
    $root = test_repo_root();
    $checkout = (string)file_get_contents($root . '/api/subscription-checkout.php');
    $client = (string)file_get_contents($root . '/app/Modules/Subscription/MercadoPagoClient.php');
    $webhook = (string)file_get_contents($root . '/api/webhooks/mercadopago.php');
    $migration = (string)file_get_contents($root . '/migrations/2026-07-18-subscription-mercadopago.sql');
    $hardening = (string)file_get_contents($root . '/migrations/2026-07-18-platform-hardening.sql');
    $config = (string)file_get_contents($root . '/config.example.php');

    test_assert_true(str_contains($checkout, 'require_login()'), 'Checkout must require an authenticated user.');
    test_assert_true(str_contains($checkout, 'require_csrf()'), 'Checkout POST must validate CSRF.');
    test_assert_true(str_contains($checkout, "require_rate_limit('subscription-checkout-write'"), 'Checkout must be rate limited.');
    test_assert_true(str_contains($checkout, "'checkout_intent'"), 'Checkout must persist an intent before calling Mercado Pago.');
    test_assert_true(str_contains($checkout, 'FOR UPDATE'), 'Checkout must serialize concurrent requests for the same user.');
    test_assert_true(str_contains($checkout, "hash('sha256', \$externalReference)"), 'Provider idempotency must derive from the persisted reference.');
    test_assert_true(str_contains($checkout, "['pix', 'card']"), 'Checkout must accept an explicit Pix or card choice.');
    test_assert_true(str_contains($checkout, 'payment_code'), 'Checkout must expose the Pix copy-and-paste code.');
    test_assert_true(str_contains($checkout, 'qr_code_data'), 'Checkout must expose the validated Pix QR image.');

    test_assert_true(!str_contains($client, "'preapproval_plan_id'"), 'Hosted pending checkout must not mix in an associated plan.');
    test_assert_true(str_contains($client, "'auto_recurring'"), 'Hosted subscription must define its recurrence.');
    test_assert_true(str_contains($client, "'frequency_type' => 'months'"), 'Hosted subscription must recur monthly.');
    test_assert_true(str_contains($client, "'status' => 'pending'"), 'Hosted subscription must let Mercado Pago collect payment.');
    test_assert_true(str_contains($client, 'MercadoPagoApiException'), 'Provider failures must retain safe HTTP diagnostics.');
    test_assert_true(str_contains($client, 'createPixPayment'), 'Client must support a dedicated monthly Pix payment.');
    test_assert_true(str_contains($client, "'payment_method_id' => 'pix'"), 'Pix payment must be pinned to the Pix method.');
    test_assert_true(str_contains($client, "'/v1/payments'"), 'Pix must use the Mercado Pago payment endpoint.');
    test_assert_true(str_contains($client, 'CURLOPT_TIMEOUT => 6'), 'Provider calls must fit within the webhook acknowledgement window.');
    test_assert_true(str_contains($webhook, 'mercadopago_verify_webhook_signature'), 'Webhook signature validation is mandatory.');
    test_assert_true(str_contains($webhook, "MERCADOPAGO_ENVIRONMENT"), 'Webhook must distinguish sandbox from production.');
    test_assert_true(str_contains($webhook, "MERCADOPAGO_APPLICATION_ID"), 'Webhook must pin the Mercado Pago application.');
    test_assert_true(str_contains($webhook, "MERCADOPAGO_COLLECTOR_ID"), 'Webhook must pin the Mercado Pago collector.');

    test_assert_true(str_contains($migration, 'DATE_ADD(created_at, INTERVAL 30 DAY)'), 'Legacy users must receive the 30-day trial backfill.');
    test_assert_true(str_contains($migration, 'amount_cents = ROUND(amount * 100)'), 'Legacy decimal amounts must migrate to integer cents.');
    test_assert_true(strpos($hardening, 'ADD COLUMN trial_ends_at') < strpos($hardening, 'CREATE INDEX idx_subscriptions_trial_ends'), 'Lexicographic migration order must create trial_ends_at before its index.');

    foreach ([
        'MERCADOPAGO_ACCESS_TOKEN',
        'MERCADOPAGO_WEBHOOK_SECRET',
        'MERCADOPAGO_APPLICATION_ID',
        'MERCADOPAGO_COLLECTOR_ID',
    ] as $constant) {
        test_assert_true(str_contains($config, $constant), "Missing deployment setting: $constant");
    }
    test_assert_true(!str_contains(strtoupper($config), 'ABACATEPAY'), 'AbacatePay settings must be fully removed.');
};
