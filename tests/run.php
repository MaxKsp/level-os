<?php
declare(strict_types=1);

$repoRoot = dirname(__DIR__);
$pattern = $repoRoot . '/tests/cases/*_test.php';
$files = glob($pattern) ?: [];
sort($files);
$filter = isset($argv[1]) ? trim((string)$argv[1]) : '';
if ($filter !== '') {
    $files = array_values(array_filter(
        $files,
        static fn(string $file): bool => str_contains(basename($file), $filter)
    ));
}

$passed = 0;
$failed = 0;

foreach ($files as $file) {
    $label = basename($file);
    try {
        $test = require $file;
        if (!is_callable($test)) {
            throw new RuntimeException('Test file did not return a callable.');
        }
        $test();
        $passed++;
        echo '[PASS] ' . $label . PHP_EOL;
    } catch (Throwable $e) {
        $failed++;
        echo '[FAIL] ' . $label . PHP_EOL;
        echo '  ' . $e->getMessage() . PHP_EOL;
    }
}

echo PHP_EOL;
echo 'Passed: ' . $passed . PHP_EOL;
echo 'Failed: ' . $failed . PHP_EOL;
echo 'Total:  ' . ($passed + $failed) . PHP_EOL;

exit($failed === 0 ? 0 : 1);
