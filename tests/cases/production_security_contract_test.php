<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = test_repo_root();
    $auth = (string)file_get_contents($root . '/auth.php');
    $logout = (string)file_get_contents($root . '/logout.php');

    test_assert_true(
        str_contains($auth, 'LEVELOS_SESSION_IDLE_SECONDS')
            && str_contains($auth, 'session_idle_timeout_seconds()'),
        'Authenticated sessions must expire after a configurable idle period.'
    );
    test_assert_true(
        str_contains($auth, 'function require_verified_email')
            && str_contains($auth, "'email_verification_required'"),
        'Sensitive actions must have a reusable verified-email gate.'
    );
    test_assert_true(
        str_contains($auth, 'function destroy_browser_session')
            && str_contains($auth, 'session_get_cookie_params()')
            && str_contains($logout, 'destroy_browser_session()'),
        'Logout must invalidate both server state and the browser session cookie.'
    );

    foreach ([
        'api/import.php',
        'api/export.php',
        'api/subscription-checkout.php',
        'api/totp-enroll.php',
        'api/totp-confirm.php',
        'api/totp-disable.php',
        'api/calendar-connect.php',
        'api/calendar-disconnect.php',
        'api/assistant-confirm.php',
        'api/assistant-undo.php',
        'api/assistant-history.php',
    ] as $endpoint) {
        $source = (string)file_get_contents($root . '/' . $endpoint);
        test_assert_true(
            str_contains($source, 'require_verified_email($uid)'),
            $endpoint . ' must reject sensitive actions from unverified accounts.'
        );
    }
};
