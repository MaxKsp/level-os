<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = test_repo_root();
    $auth = (string)file_get_contents($root . '/auth.php');
    $index = (string)file_get_contents($root . '/index.php');

    test_assert_true(
        str_contains($auth, "const RETURNING_USER_COOKIE = 'levelos_returning'")
        && str_contains($auth, "'httponly' => true")
        && str_contains($auth, "'samesite' => 'Lax'"),
        'The returning-user marker must be an opaque, HttpOnly, same-site cookie.'
    );
    test_assert_true(
        str_contains($auth, 'remember_returning_user();'),
        'Every completed login must mark the browser as returning.'
    );
    test_assert_true(
        str_contains($index, 'if (has_returning_user_marker())')
        && str_contains($index, "header('Location: login.php')"),
        'A signed-out returning browser must go to login instead of the public landing page.'
    );
};
