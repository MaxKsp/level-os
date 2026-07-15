<?php
declare(strict_types=1);

$repoRoot = dirname(__DIR__);

require_once $repoRoot . '/finance.php';
require_once $repoRoot . '/ofx.php';

function test_repo_root(): string {
    return dirname(__DIR__);
}

function test_assert_true(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function test_assert_same($expected, $actual, string $message): void {
    if ($expected !== $actual) {
        throw new RuntimeException(
            $message . "\nExpected: " . var_export($expected, true) .
            "\nActual:   " . var_export($actual, true)
        );
    }
}

function test_assert_equals($expected, $actual, string $message): void {
    if ($expected != $actual) {
        throw new RuntimeException(
            $message . "\nExpected: " . var_export($expected, true) .
            "\nActual:   " . var_export($actual, true)
        );
    }
}

function test_load_fixture(string $name) {
    $path = test_repo_root() . '/tests/fixtures/' . $name;
    if (!is_file($path)) {
        throw new RuntimeException('Fixture not found: ' . $name);
    }
    return require $path;
}
