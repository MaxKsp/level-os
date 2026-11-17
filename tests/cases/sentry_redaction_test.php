<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Core/SentryClient.php';

return static function (): void {
    $root = test_repo_root();
    $previousUri = $_SERVER['REQUEST_URI'] ?? null;
    $previousMethod = $_SERVER['REQUEST_METHOD'] ?? null;
    $sensitiveMarker = 'synthetic-sensitive-marker';

    try {
        $_SERVER['REQUEST_URI'] = '/reset-password.php?token=' . $sensitiveMarker . '&code=private';
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $event = sentry_exception_event(new RuntimeException('SQLSTATE path token=' . $sensitiveMarker));
        $encoded = json_encode($event, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

        test_assert_same('/reset-password.php', $event['request']['url'] ?? null, 'Sentry must receive only the request path without query or fragment.');
        test_assert_true(!str_contains($encoded, $sensitiveMarker), 'Sentry payload must not contain exception details or query secrets.');
        test_assert_true(!str_contains($encoded, str_replace('\\', '/', $root)), 'Sentry stack frames must not contain absolute repository paths.');
        test_assert_true(str_contains($encoded, 'app:///tests/cases/sentry_redaction_test.php'), 'Application stack frames must remain useful as relative paths.');

        $safeLog = security_log_line('auth.synthetic', new RuntimeException($sensitiveMarker));
        test_assert_true(str_contains($safeLog, 'event=auth.synthetic'), 'Safe logs must preserve a stable event name.');
        test_assert_true(str_contains($safeLog, 'exception=RuntimeException'), 'Safe logs must preserve only the exception class.');
        test_assert_true(!str_contains($safeLog, $sensitiveMarker), 'Safe logs must never include exception messages.');

        $scriptPath = tempnam(sys_get_temp_dir(), 'level-os-sentry-script-');
        $logPath = tempnam(sys_get_temp_dir(), 'level-os-sentry-log-');
        if (!is_string($scriptPath) || !is_string($logPath)) throw new RuntimeException('Unable to create Sentry test files.');
        try {
            $script = '<?php declare(strict_types=1); '
                . 'ini_set("display_errors", "0"); ini_set("log_errors", "1"); '
                . 'ini_set("error_log", ' . var_export($logPath, true) . '); '
                . 'require ' . var_export($root . '/app/Core/SentryClient.php', true) . '; '
                . 'set_exception_handler("sentry_handle_uncaught_exception"); '
                . 'throw new RuntimeException(' . var_export($sensitiveMarker, true) . ');';
            file_put_contents($scriptPath, $script);
            $output = [];
            $status = 0;
            exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($scriptPath) . ' 2>&1', $output, $status);
            $errorLog = (string)file_get_contents($logPath);
            test_assert_same(0, $status, 'The sanitized uncaught-exception handler must terminate without rethrowing.');
            test_assert_true(!str_contains(implode("\n", $output), $sensitiveMarker), 'Unhandled exception detail must not reach process output.');
            test_assert_true(!str_contains($errorLog, $sensitiveMarker), 'Unhandled exception detail must not be re-logged by PHP.');
            test_assert_true(str_contains($errorLog, 'event=application.uncaught'), 'Unhandled exceptions must keep a safe operational event.');
        } finally {
            @unlink($scriptPath);
            @unlink($logPath);
        }
    } finally {
        if ($previousUri === null) unset($_SERVER['REQUEST_URI']); else $_SERVER['REQUEST_URI'] = $previousUri;
        if ($previousMethod === null) unset($_SERVER['REQUEST_METHOD']); else $_SERVER['REQUEST_METHOD'] = $previousMethod;
    }

};
