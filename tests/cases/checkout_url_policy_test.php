<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/CheckoutUrlPolicy.php';

return static function (): void {
    foreach ([
        'https://www.mercadopago.com.br/subscriptions/checkout?id=123',
        'https://mercadopago.com.br/payments/abc',
        'https://www.mercadopago.com/payments/ticket',
    ] as $url) test_assert_true(subscription_checkout_url_is_allowed($url), 'URL oficial deve ser aceita.');

    foreach ([
        'http://www.mercadopago.com.br/checkout',
        'https://mercadopago.com.br.evil.example/checkout',
        'https://evil.example/?next=mercadopago.com.br',
        'https://www.mercadopago.com.br@evil.example/checkout',
        'https://user@www.mercadopago.com.br/checkout',
        'https://www.mercadopago.com.br:444/checkout',
        'https://127.0.0.1/checkout',
        '//www.mercadopago.com.br/checkout',
        'https://www.mercadopago.com.br/checkout#frag',
        "https://www.mercadopago.com.br/\r\nInjected",
        '',
    ] as $url) test_assert_true(!subscription_checkout_url_is_allowed($url), 'Checkout externo/ambíguo deve falhar fechado.');
    test_assert_true(!subscription_checkout_url_is_allowed('https://www.mercadopago.com.br/' . str_repeat('a', 2100)), 'URLs longas devem ser recusadas.');
};
