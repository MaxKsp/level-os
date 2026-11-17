<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Email/EmailBootstrap.php';

return static function (): void {
    $appUrl = email_app_base_url();
    test_assert_true($appUrl !== null, 'The test configuration must provide a valid HTTPS APP_URL.');
    test_assert_same(
        'https://staging.example.test:8443',
        email_normalize_app_base_url(' https://STAGING.EXAMPLE.TEST:08443/ '),
        'APP_URL must normalize host casing, port and trailing slash.'
    );
    test_assert_same(
        'https://[2001:db8::1]:8443',
        email_normalize_app_base_url('https://[2001:DB8::1]:8443/'),
        'A bracketed IPv6 HTTPS origin must remain valid.'
    );
    foreach ([
        '',
        'http://example.com',
        '//example.com',
        'https://user:pass@example.com',
        'https://example.com/path',
        'https://example.com?next=/agenda',
        'https://example.com#fragment',
        "https://example.com/\nagenda",
        'https://bad host.example',
        'https://[::1]]',
        'https://[[::1]',
        'https://[example.com]',
        'https://example.com:',
        'https://example.com:00000',
        'https://example.com:70000',
    ] as $invalidAppUrl) {
        test_assert_same(null, email_normalize_app_base_url($invalidAppUrl), 'Unsafe APP_URL must be rejected: ' . json_encode($invalidAppUrl));
    }

    $root = test_repo_root();
    $templateSource = (string)file_get_contents($root . '/app/Modules/Email/EmailTemplates.php');
    $bootstrapSource = (string)file_get_contents($root . '/app/Modules/Email/EmailBootstrap.php');
    test_assert_true(!str_contains($templateSource, 'https://lvlos.com'), 'Templates must not contain a fixed production origin.');
    test_assert_true(!str_contains($bootstrapSource, 'HTTP_HOST'), 'E-mail origins must never derive from the request Host header.');

    $previousHost = $_SERVER['HTTP_HOST'] ?? null;
    try {
        $_SERVER['HTTP_HOST'] = 'attacker.example';
        $hostProtectedMessage = email_template_password_changed();
    } finally {
        if ($previousHost === null) {
            unset($_SERVER['HTTP_HOST']);
        } else {
            $_SERVER['HTTP_HOST'] = $previousHost;
        }
    }
    test_assert_true(
        !str_contains($hostProtectedMessage['html'], 'attacker.example')
            && str_contains($hostProtectedMessage['html'], $appUrl . '/forgot-password.php'),
        'A request Host header must not influence rendered e-mail links.'
    );

    $request = null;
    $mailer = new ResendMailer(
        're_test_abcdefghijklmnopqrstuvwxyz',
        'notifications@example.com',
        'Level OS',
        'support@example.com',
        static function (string $url, array $headers, string $body) use (&$request): array {
            $request = compact('url', 'headers', 'body');
            return ['status' => 200, 'body' => '{"id":"email_123"}'];
        },
    );

    $message = email_template_password_reset($appUrl . '/reset-password.php?token=abc', 60);
    $providerId = $mailer->send(
        'max@example.com',
        $message['subject'],
        $message['text'],
        $message['html'],
        email_idempotency_key('password-reset', 'user:1:token:abc'),
    );
    test_assert_same('email_123', $providerId, 'The provider message id must be returned.');
    test_assert_true(is_array($request), 'The transport must receive the Resend request.');
    test_assert_same('https://api.resend.com/emails', $request['url'], 'Only the fixed Resend endpoint may be used.');
    test_assert_true(
        in_array('Idempotency-Key: ' . email_idempotency_key('password-reset', 'user:1:token:abc'), $request['headers'], true),
        'Transactional sends must include a stable idempotency key.'
    );
    $payload = json_decode($request['body'], true, 16, JSON_THROW_ON_ERROR);
    test_assert_same('Level OS <notifications@example.com>', $payload['from'], 'The verified sender must be used.');
    test_assert_same(['max@example.com'], $payload['to'], 'The recipient must use the Resend array contract.');
    test_assert_same('support@example.com', $payload['reply_to'], 'Reply-to must be optional and explicit.');
    test_assert_true(str_contains($payload['text'], '60 minutos'), 'The plain-text fallback must be complete.');
    test_assert_true(str_contains($payload['html'], '#020504'), 'Transactional e-mails must use the Level OS OLED background.');
    test_assert_true(str_contains($payload['html'], '#31e6d4'), 'Transactional e-mails must use the Level OS aqua accent.');
    test_assert_true(str_contains($payload['html'], $appUrl . '/assets/icon-192.png'), 'Transactional e-mails must derive the brand mark from APP_URL.');
    test_assert_true(str_contains($payload['html'], 'role="presentation"'), 'E-mail layouts must use presentation tables for client compatibility.');
    test_assert_true(str_contains($payload['html'], 'Use o acesso seguro antes que ele expire.'), 'E-mail preheaders must describe the message.');

    $templates = [
        email_template_verification($appUrl . '/verify-email.php?token=abc'),
        email_template_password_changed(),
        email_template_monthly_backup('Max', '2026-08-22', [
            'balance' => 1200.5,
            'invoices' => 320.75,
            'income' => 4500.0,
            'expense' => 2300.25,
            'routine_count' => 18,
            'training_count' => 9,
        ]),
    ];
    foreach ($templates as $template) {
        test_assert_true(trim($template['subject']) !== '', 'Every e-mail must have a subject.');
        test_assert_true(trim($template['text']) !== '', 'Every e-mail must have a plain-text fallback.');
        test_assert_true(str_contains($template['html'], '<meta charset="utf-8">'), 'Every e-mail must declare UTF-8.');
        test_assert_true(str_contains($template['html'], 'LEVEL OS'), 'Every e-mail must carry the product identity.');
        test_assert_true(str_contains($template['html'], $appUrl), 'Every e-mail must identify its configured application origin.');
        test_assert_true(preg_match('//u', $template['subject'] . $template['text'] . $template['html']) === 1, 'E-mail content must be valid UTF-8.');
    }

    test_assert_true(
        str_contains($templates[0]['html'], 'ACESSO SEGURO')
            && str_contains($templates[0]['html'], 'Confirmar e-mail'),
        'Verification e-mail must clearly communicate the secure action.'
    );
    test_assert_true(
        str_contains($templates[1]['html'], 'ALTERAÇÃO CONFIRMADA')
            && str_contains($templates[1]['text'], 'Se não foi você')
            && str_contains($templates[1]['html'], $appUrl . '/forgot-password.php'),
        'Password change e-mail must include recovery guidance using APP_URL.'
    );
    test_assert_true(
        str_contains($templates[2]['html'], 'R$ 1.200,50')
            && str_contains($templates[2]['html'], 'Backup protegido em anexo'),
        'Monthly e-mail must present branded metrics and backup guidance.'
    );

    $taskMessage = email_template_task_reminder('Max <admin>', [[
        'time' => '09:30',
        'title' => '<script>alert(1)</script>',
    ]]);
    test_assert_true(!str_contains($taskMessage['html'], '<script>'), 'User content must be escaped in HTML templates.');
    test_assert_true(str_contains($taskMessage['html'], '&lt;script&gt;'), 'Escaped task content must remain readable.');
    test_assert_true(
        str_contains($taskMessage['html'], 'Abrir rotina')
            && str_contains($taskMessage['html'], $appUrl . '/agenda')
            && str_contains($taskMessage['text'], $appUrl . '/agenda'),
        'Task reminders must derive their module link from APP_URL.'
    );

    $invalidRecipientCaught = false;
    try {
        $mailer->send("victim@example.com\r\nBcc:evil@example.com", 'Subject', 'Text', '<p>Text</p>', 'event-test:12345678');
    } catch (InvalidArgumentException) {
        $invalidRecipientCaught = true;
    }
    test_assert_true($invalidRecipientCaught, 'Header injection in recipients must be rejected.');

    $providerFailureCaught = false;
    $failedMailer = new ResendMailer(
        're_test_abcdefghijklmnopqrstuvwxyz',
        'notifications@example.com',
        'Level OS',
        '',
        static fn(): array => ['status' => 429, 'body' => '{"message":"rate limited"}'],
    );
    try {
        $failedMailer->send('max@example.com', 'Subject', 'Text', '<p>Text</p>', 'event-test:12345678');
    } catch (EmailDeliveryException $e) {
        $providerFailureCaught = $e->getMessage() === 'E-mail provider unavailable.';
    }
    test_assert_true($providerFailureCaught, 'Provider errors must fail closed with a safe message.');

    foreach (['auth.php', 'register.php', 'cron-notify.php'] as $path) {
        $source = (string)file_get_contents($root . '/' . $path);
        test_assert_true(preg_match('/@?\bmail\s*\(/', $source) !== 1, $path . ' must not call PHP mail().');
    }
    $cronSource = (string)file_get_contents($root . '/cron-notify.php');
    test_assert_true(
        !str_contains($cronSource, 'Content-Disposition: attachment'),
        'The cron must not send a plaintext financial backup attachment.'
    );
};
