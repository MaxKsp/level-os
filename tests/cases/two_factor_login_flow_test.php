<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

return static function (): void {
    $root = dirname(__DIR__, 2);
    $auth = (string)file_get_contents($root . '/auth.php');
    $login = (string)file_get_contents($root . '/login.php');
    $googleCallback = (string)file_get_contents($root . '/auth-google-callback.php');
    $supabaseExchange = (string)file_get_contents($root . '/api/auth-supabase-exchange.php');
    $view = (string)file_get_contents($root . '/app/Shared/AuthView.php');
    $otpScript = (string)file_get_contents($root . '/assets/auth-otp.js');

    test_assert_true(
        str_contains($auth, 'const PENDING_2FA_TIMEOUT_SECONDS = 600'),
        'A pending 2FA challenge must expire after a short, explicit interval.'
    );
    foreach (['stage_pending_2fa', 'has_pending_2fa', 'pending_2fa_issued_at'] as $contract) {
        test_assert_true(str_contains($auth, $contract), 'The 2FA lifecycle must include ' . $contract);
    }
    test_assert_true(
        str_contains($auth, "if (!has_pending_2fa()) return 'expired';"),
        'An expired or absent challenge must never authenticate the user.'
    );
    test_assert_true(
        str_contains($auth, "complete_login((int)\$uid, \$pendingVersion)"),
        'The authenticated session must only be created after a valid second factor.'
    );
    test_assert_true(
        str_contains($googleCallback, 'stage_pending_2fa($userId, $sessionVersion)'),
        'Legacy Google login must also stop at the second-factor challenge.'
    );
    test_assert_true(
        str_contains($supabaseExchange, "\$identity->assuranceLevel !== 'aal2'")
        && str_contains($supabaseExchange, "'supabase_mfa_required'"),
        'Supabase identities with verified TOTP must provide an AAL2 session.'
    );
    test_assert_true(
        str_contains($login, 'data-otp-input')
        && str_contains($login, 'autocomplete="one-time-code"')
        && str_contains($login, 'has_pending_2fa()'),
        'The login page must expose the accessible OTP pattern only for a valid challenge.'
    );
    test_assert_true(str_contains($view, 'assets/auth-otp.js'), 'Authentication pages must load the OTP enhancer.');
    foreach (['paste', 'ArrowLeft', 'ArrowRight', 'otpStatus'] as $contract) {
        test_assert_true(str_contains($otpScript, $contract), 'The OTP enhancer must support ' . $contract);
    }
};
