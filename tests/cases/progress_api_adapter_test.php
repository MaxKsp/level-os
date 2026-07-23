<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/http_smoke_client.php';

return function (): void {
    $repoRoot = test_repo_root();

    $read = fapi_run_isolated_request($repoRoot, '/api/progress.php', 'GET', '', []);
    test_assert_same(401, $read['status'], 'Progress read without a session must return 401.');

    $write = fapi_run_isolated_request(
        $repoRoot,
        '/api/progress-event.php',
        'POST',
        json_encode(['type' => 'rotina', 'ref' => 'rotina:2026-07-17:task-1']),
        [],
    );
    test_assert_same(401, $write['status'], 'Progress write without a session must return 401 before accepting XP data.');
};
