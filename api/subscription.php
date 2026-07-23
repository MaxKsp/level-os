<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('subscription', 60, 60);
session_write_close();

// So leitura, consulta unica. Mudanca de plano e server-side (webhook), nunca por aqui.
$snapshot = (new SubscriptionRepository(get_db()))->findByUserId($uid);
$response = (new SubscriptionPolicy(subscription_real_clock(...)))->describeForApi($snapshot);
$response['price_cents'] = defined('MERCADOPAGO_INDIVIDUAL_PRICE_CENTS')
    ? max(0, (int)MERCADOPAGO_INDIVIDUAL_PRICE_CENTS)
    : 1990;
echo json_encode($response);
