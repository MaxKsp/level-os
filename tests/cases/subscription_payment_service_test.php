<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/SubscriptionPaymentService.php';

return function (): void {
    test_assert_same(
        '2027-02-28 12:30:00',
        subscription_add_calendar_month_clamped((int)strtotime('2027-01-31 12:30:00 UTC')),
        'Monthly fallback must clamp January 31 to February month-end.'
    );
    test_assert_same(
        '2028-02-29 12:30:00',
        subscription_add_calendar_month_clamped((int)strtotime('2028-01-31 12:30:00 UTC')),
        'Monthly fallback must honor leap-year February.'
    );
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec("CREATE TABLE subscriptions (user_id INTEGER PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, current_period_end TEXT NULL, trial_ends_at TEXT NULL)");
    $db->exec("CREATE TABLE subscription_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        method TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        external_id TEXT NOT NULL,
        external_reference TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        status TEXT NOT NULL,
        provider_status TEXT NULL,
        paid_at TEXT NULL,
        updated_at TEXT NULL,
        UNIQUE(provider, resource_type, external_id)
    )");
    $db->exec("CREATE TABLE subscription_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider_event_id TEXT NULL UNIQUE,
        provider_payment_id TEXT NULL UNIQUE,
        event TEXT NOT NULL,
        detail TEXT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");
    $db->exec("CREATE TABLE audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NULL, event_type TEXT NOT NULL, outcome TEXT NOT NULL, request_id TEXT NOT NULL, ip_address TEXT NULL, user_agent TEXT NULL, metadata_json TEXT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");

    $insertPayment = $db->prepare("INSERT INTO subscription_payments
        (user_id, provider, method, resource_type, external_id, external_reference, plan, amount_cents, status)
        VALUES (?, 'mercadopago', ?, 'preapproval', ?, ?, ?, ?, 'pending')");
    $insertPayment->execute([7, 'card', 'preapproval-first', 'levelos-first', 'individual', 1990]);
    $now = 1_800_000_000;

    $first = subscription_apply_paid_event(
        $db,
        'mp:payment:pay_first:approved',
        'pay_first',
        'preapproval-first',
        'levelos-first',
        1990,
        'card',
        $now
    );
    test_assert_same('processed', $first['status'], 'First authoritative approved payment must be processed.');
    test_assert_same('individual', $first['plan'], 'The only paid plan must be individual.');
    test_assert_same('paid', $db->query("SELECT status FROM subscription_payments WHERE external_id = 'preapproval-first'")->fetchColumn(), 'Payment mapping must be marked paid.');
    test_assert_same('individual', $db->query('SELECT plan FROM subscriptions WHERE user_id = 7')->fetchColumn(), 'Only the service/webhook promotes the subscription.');
    test_assert_same(1, (int)$db->query('SELECT COUNT(*) FROM subscription_events')->fetchColumn(), 'Provider payment must be recorded once.');
    test_assert_same(1, (int)$db->query("SELECT COUNT(*) FROM audit_events WHERE event_type = 'subscription.plan_changed'")->fetchColumn(), 'The plan change must leave an audit record.');

    $duplicate = subscription_apply_paid_event(
        $db,
        'mp:payment:pay_first:approved',
        'pay_first',
        'preapproval-first',
        'levelos-first',
        1990,
        'card',
        $now
    );
    test_assert_same('duplicate', $duplicate['status'], 'A retry with the same canonical payment must be idempotent.');

    $crossTopicDuplicate = subscription_apply_paid_event(
        $db,
        'mp:notification:another-topic',
        'pay_first',
        'preapproval-first',
        'levelos-first',
        1990,
        'card',
        $now
    );
    test_assert_same('duplicate', $crossTopicDuplicate['status'], 'The same provider payment from another topic must not renew twice.');
    test_assert_same(1, (int)$db->query('SELECT COUNT(*) FROM subscription_events')->fetchColumn(), 'Cross-topic retry must not duplicate events.');

    $insertPayment->execute([10, 'card', 'preapproval-provider-period', 'levelos-provider-period', 'individual', 1990]);
    $providerPeriod = '2027-01-23 10:00:00';
    $providerResult = subscription_apply_paid_event(
        $db,
        'mp:payment:provider_period:approved',
        'pay_provider_period',
        'preapproval-provider-period',
        'levelos-provider-period',
        1990,
        'card',
        $now,
        $providerPeriod,
        $now - 3600
    );
    test_assert_same($providerPeriod, $providerResult['current_period_end'], 'Authoritative next_payment_date must define the paid period end.');

    $insertPayment->execute([8, 'pix', 'preapproval-other', 'levelos-other', 'individual', 1990]);
    $mismatchReference = subscription_apply_paid_event(
        $db,
        'mp:payment:forged:approved',
        'pay_forged',
        'preapproval-other',
        'levelos-forged',
        1990,
        'pix',
        $now
    );
    test_assert_same('not_found', $mismatchReference['status'], 'A mismatched merchant reference must not authorize another user.');
    test_assert_same(0, (int)$db->query('SELECT COUNT(*) FROM subscriptions WHERE user_id = 8')->fetchColumn(), 'Forged mapping must not modify a subscription.');

    $mismatchAmount = subscription_apply_paid_event(
        $db,
        'mp:payment:wrong_amount:approved',
        'pay_wrong_amount',
        'preapproval-other',
        'levelos-other',
        2990,
        'pix',
        $now
    );
    test_assert_same('mismatch', $mismatchAmount['status'], 'The approved amount must exactly match the server-side cents.');

    $insertPayment->execute([7, 'pix', 'preapproval-second', 'levelos-second', 'individual', 1990]);
    $second = subscription_apply_paid_event(
        $db,
        'mp:payment:pay_second:approved',
        'pay_second',
        'preapproval-second',
        'levelos-second',
        1990,
        'pix',
        $now
    );
    test_assert_same('processed', $second['status'], 'A new approved payment must renew the plan.');
    test_assert_true(strtotime((string)$second['current_period_end']) > strtotime((string)$first['current_period_end']), 'Renewal must extend the existing paid period.');

    $insertPayment->execute([9, 'card', 'preapproval-cancelled', 'levelos-cancelled', 'individual', 1990]);
    test_assert_true(subscription_record_provider_status($db, 'preapproval-cancelled', 'cancelled'), 'Provider status should update the matching mandate.');
    test_assert_same('cancelled', $db->query("SELECT status FROM subscription_payments WHERE external_id = 'preapproval-cancelled'")->fetchColumn(), 'A cancelled pending mandate should become terminal without granting access.');
    test_assert_same(0, (int)$db->query('SELECT COUNT(*) FROM subscriptions WHERE user_id = 9')->fetchColumn(), 'Provider mandate status alone must never promote a plan.');
};
