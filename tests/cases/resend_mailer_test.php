<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Email/EmailBootstrap.php';

return static function (): void {
    $request = null;
    $mailer = new ResendMailer(
        're_test_abcdefghijklmnopqrstuvwxyz',
        'notificacoes@lvlos.com',
        'Level OS',
        'suporte@lvlos.com',
        static function (string $url, array $headers, string $body) use (&$request): array {
            $request = compact('url', 'headers', 'body');
            return ['status' => 200, 'body' => '{"id":"email_123"}'];
        },
    );

    $message = email_template_password_reset('https://lvlos.com/reset-password.php?token=abc', 60);
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
    test_assert_same('Level OS <notificacoes@lvlos.com>', $payload['from'], 'The verified sender must be used.');
    test_assert_same(['max@example.com'], $payload['to'], 'The recipient must use the Resend array contract.');
    test_assert_same('suporte@lvlos.com', $payload['reply_to'], 'Reply-to must be optional and explicit.');
    test_assert_true(str_contains($payload['text'], '60 minutos'), 'The plain-text fallback must be complete.');

    $taskMessage = email_template_task_reminder('Max <admin>', [[
        'time' => '09:30',
        'title' => '<script>alert(1)</script>',
    ]]);
    test_assert_true(!str_contains($taskMessage['html'], '<script>'), 'User content must be escaped in HTML templates.');
    test_assert_true(str_contains($taskMessage['html'], '&lt;script&gt;'), 'Escaped task content must remain readable.');

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
        'notificacoes@lvlos.com',
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

    $root = test_repo_root();
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
