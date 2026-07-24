<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = dirname(__DIR__, 2);
    $authSource = (string)file_get_contents($root . '/auth.php');
    $registerSource = (string)file_get_contents($root . '/register.php');
    $resendSource = (string)file_get_contents($root . '/resend-verification.php');
    $loginSource = (string)file_get_contents($root . '/login.php');

    test_assert_true(
        str_contains($authSource, 'strtolower(trim($email))')
            && str_contains($authSource, "hash('sha256', \$normalized)"),
        'Verification resend rate keys must normalize and hash e-mail addresses.'
    );
    test_assert_true(
        str_contains($authSource, 'function email_verification_ip_rate_subject'),
        'Verification resend must have an opaque IP rate-limit subject.'
    );
    test_assert_true(
        !str_contains($resendSource, 'is_register_locked_out()')
            && !str_contains($resendSource, 'record_register_attempt()'),
        'Verification resend must not share the registration lockout.'
    );
    test_assert_true(
        str_contains($resendSource, "'verify_resend_ip'")
            && str_contains($resendSource, "'verify_resend_email'"),
        'Verification resend must apply independent IP and account limits.'
    );
    test_assert_true(
        str_contains($registerSource, '$verificationDelivered = send_transactional_email(')
            && str_contains($registerSource, 'verification_delivery_failed'),
        'Registration must distinguish account creation from e-mail delivery.'
    );
    test_assert_true(
        str_contains($loginSource, "'verification_delivery_failed'"),
        'Login must explain how to recover when confirmation delivery fails.'
    );
};
