<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/http_smoke_client.php';

/**
 * Smoke test do adapter HTTP real (api/finance.php).
 *
 * db.php e auth.php nao podem ser alterados nem terem get_db() sobrescrita
 * a partir dos testes, entao so da pra exercitar via HTTP real o que o
 * endpoint resolve antes de tocar no banco: o guard de autenticacao. A
 * cobertura de payload valido/invalido/limite/falha de persistencia mora em
 * tests/cases/finance_api_save_set_test.php, que chama finance_api_save_set()
 * direto com um PDO sqlite injetado, sem passar por auth.php/db.php.
 */

return function (): void {
    $repoRoot = test_repo_root();

    // Sem sessao (nenhum cookie enviado), o endpoint real corta com 401
    // antes de chamar get_db(). Processo isolado por chamada: sem servidor
    // persistente, sem cookie jar, sem estado compartilhado entre cenarios.
    $r = fapi_run_isolated_request($repoRoot, '/api/finance.php', 'POST', '{}', []);
    test_assert_same(401, $r['status'], 'Endpoint without a session must return 401.');
};
