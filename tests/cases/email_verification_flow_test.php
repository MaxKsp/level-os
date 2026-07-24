<?php
declare(strict_types=1);

return static function (): void {
    $root = dirname(__DIR__, 2);
    $authSource = (string)file_get_contents($root . '/auth.php');
    $registerSource = (string)file_get_contents($root . '/register.php');
    $resendSource = (string)file_get_contents($root . '/resend-verification.php');
    $loginSource = (string)file_get_contents($root . '/login.php');

    test_assert_same(
        email_verification_rate_subject(' User@Example.COM '),
        email_verification_rate_subject('user@example.com'),
        'Verification resend account rate keys must use normalized e-mail addresses.'
    );
    test_assert_true(
        !str_contains(email_verification_rate_subject('user@example.com'), 'example.com'),
        'Verification resend rate keys must not expose the e-mail address.'
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
