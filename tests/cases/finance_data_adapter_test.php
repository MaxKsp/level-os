<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/http_smoke_client.php';

/**
 * Smoke test do adapter HTTP real (api/data.php).
 *
 * db.php e auth.php nao podem ser alterados nem terem get_db() sobrescrita
 * a partir dos testes, entao so da pra exercitar via HTTP real o que o
 * endpoint resolve antes de tocar no banco: o guard de autenticacao. A
 * cobertura do merge do GET ?all=1, do filtro de chaves internas e da
 * migracao best-effort mora em tests/cases/finance_data_bootstrap_test.php,
 * que chama finance_data_bootstrap() direto com um PDO sqlite injetado, sem
 * passar por auth.php/db.php. O restante do POST/GET generico de
 * api/data.php e comportamento legado que nao mudou nesta extracao.
 */

return function (): void {
    $repoRoot = test_repo_root();

    // Sem sessao (nenhum cookie enviado), o endpoint real corta com 401
    // antes de chamar get_db(). Processo isolado por chamada: sem servidor
    // persistente, sem cookie jar, sem estado compartilhado entre cenarios.
    $r = fapi_run_isolated_request($repoRoot, '/api/data.php?all=1', 'GET', '', []);
    test_assert_same(401, $r['status'], 'Endpoint without a session must return 401.');
};
