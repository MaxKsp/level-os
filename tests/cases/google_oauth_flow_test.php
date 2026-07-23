<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Calendar/GoogleOAuthFlow.php';

return static function (): void {
    if (!isset($_SESSION) || !is_array($_SESSION)) {
        $_SESSION = [];
    }
    $previousFlows = $_SESSION['google_oauth_flows'] ?? null;
    $previousGrants = $_SESSION['google_calendar_start_grants'] ?? null;
    $hadFlows = array_key_exists('google_oauth_flows', $_SESSION);
    $hadGrants = array_key_exists('google_calendar_start_grants', $_SESSION);

    $expectInvalidArgument = static function (callable $operation, string $message): void {
        try {
            $operation();
        } catch (InvalidArgumentException) {
            return;
        }
        throw new RuntimeException($message);
    };

    try {
        unset($_SESSION['google_oauth_flows'], $_SESSION['google_calendar_start_grants']);
        $now = 1_700_000_000;

        $loginState = google_oauth_begin_flow('login', null, $now);
        test_assert_true(
            preg_match('/\A[a-f0-9]{64}\z/D', $loginState) === 1,
            'OAuth state must contain 256 bits encoded as lowercase hexadecimal.'
        );
        test_assert_true(
            !array_key_exists($loginState, (array)$_SESSION['google_oauth_flows']),
            'The raw OAuth state must not be persisted in the session.'
        );
        test_assert_true(
            isset($_SESSION['google_oauth_flows'][hash('sha256', $loginState)]),
            'OAuth state must be indexed by its digest.'
        );

        $loginFlow = google_oauth_consume_flow($loginState, $now + 1);
        test_assert_same('login', $loginFlow['mode'] ?? null, 'Login state must preserve its mode.');
        test_assert_same(null, $loginFlow['user_id'] ?? null, 'Login state must not invent a user id.');
        test_assert_same($now, $loginFlow['issued_at'] ?? null, 'Login state must preserve its issuance time.');
        test_assert_same(
            null,
            google_oauth_consume_flow($loginState, $now + 2),
            'OAuth state must be one-shot.'
        );

        // Independent states model two tabs and must not overwrite one another.
        $tabLogin = google_oauth_begin_flow('login', null, $now + 10);
        $tabCalendar = google_oauth_begin_flow('calendar', 42, $now + 11);
        test_assert_true($tabLogin !== $tabCalendar, 'Concurrent tabs must receive independent OAuth states.');
        test_assert_same(
            2,
            count((array)$_SESSION['google_oauth_flows']),
            'Concurrent OAuth states must coexist in the session.'
        );
        $calendarFlow = google_oauth_consume_flow($tabCalendar, $now + 12);
        test_assert_same('calendar', $calendarFlow['mode'] ?? null, 'Calendar state must preserve its mode.');
        test_assert_same(42, $calendarFlow['user_id'] ?? null, 'Calendar state must remain bound to its user.');
        test_assert_same(
            'login',
            google_oauth_consume_flow($tabLogin, $now + 13)['mode'] ?? null,
            'Consuming one tab must not invalidate another tab.'
        );

        $boundaryState = google_oauth_begin_flow('login', null, $now + 20);
        test_assert_true(
            google_oauth_consume_flow($boundaryState, $now + 20 + GOOGLE_OAUTH_FLOW_TTL_SECONDS) !== null,
            'OAuth state must remain valid at the documented TTL boundary.'
        );
        $expiredState = google_oauth_begin_flow('login', null, $now + 30);
        test_assert_same(
            null,
            google_oauth_consume_flow($expiredState, $now + 31 + GOOGLE_OAUTH_FLOW_TTL_SECONDS),
            'OAuth state must expire after its TTL.'
        );

        $validState = google_oauth_begin_flow('login', null, $now + 40);
        test_assert_same(null, google_oauth_consume_flow('not-a-state', $now + 41), 'Malformed state must be rejected.');
        test_assert_true(
            google_oauth_consume_flow($validState, $now + 42) !== null,
            'A malformed state attempt must not consume a different valid flow.'
        );

        $expectInvalidArgument(
            static fn() => google_oauth_begin_flow('unknown', null, $now),
            'Unknown OAuth modes must fail closed.'
        );
        $expectInvalidArgument(
            static fn() => google_oauth_begin_flow('calendar', null, $now),
            'Calendar OAuth must require an authenticated user id.'
        );
        $expectInvalidArgument(
            static fn() => google_oauth_begin_flow('calendar', 0, $now),
            'Calendar OAuth must reject an invalid user id.'
        );

        $nonce = google_calendar_issue_start_grant(42, $now + 50);
        test_assert_true(
            preg_match('/\A[a-f0-9]{48}\z/D', $nonce) === 1,
            'Calendar start nonce must contain 192 bits encoded as lowercase hexadecimal.'
        );
        test_assert_true(
            !array_key_exists($nonce, (array)$_SESSION['google_calendar_start_grants']),
            'The raw Calendar start nonce must not be persisted.'
        );
        test_assert_true(
            isset($_SESSION['google_calendar_start_grants'][hash('sha256', $nonce)]),
            'Calendar start grants must be indexed by a nonce digest.'
        );
        test_assert_true(
            !google_calendar_consume_start_grant($nonce, 7, $now + 51),
            'A Calendar start grant must reject a different user id.'
        );
        test_assert_true(
            !google_calendar_consume_start_grant($nonce, 42, $now + 52),
            'A rejected Calendar start grant must still be one-shot.'
        );

        $goodNonce = google_calendar_issue_start_grant(42, $now + 60);
        test_assert_true(
            google_calendar_consume_start_grant($goodNonce, 42, $now + 61),
            'A matching user must be able to consume a fresh Calendar start grant.'
        );
        test_assert_true(
            !google_calendar_consume_start_grant($goodNonce, 42, $now + 62),
            'Calendar start grants must not be replayable.'
        );

        $expiredNonce = google_calendar_issue_start_grant(42, $now + 70);
        test_assert_true(
            !google_calendar_consume_start_grant(
                $expiredNonce,
                42,
                $now + 71 + GOOGLE_CALENDAR_START_GRANT_TTL_SECONDS
            ),
            'Calendar start grants must expire after their shorter TTL.'
        );

        $expectInvalidArgument(
            static fn() => google_calendar_issue_start_grant(0, $now),
            'Calendar start grants must reject invalid users.'
        );
    } finally {
        if ($hadFlows) {
            $_SESSION['google_oauth_flows'] = $previousFlows;
        } else {
            unset($_SESSION['google_oauth_flows']);
        }
        if ($hadGrants) {
            $_SESSION['google_calendar_start_grants'] = $previousGrants;
        } else {
            unset($_SESSION['google_calendar_start_grants']);
        }
    }
};
