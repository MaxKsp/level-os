<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/http_smoke_client.php';

/**
 * Smoke test do adapter HTTP real (api/import-ofx.php).
 *
 * Mesma restricao documentada na correcao de infraestrutura da Fase 7:
 * db.php nao pode ser alterado nem ter get_db() sobrescrita a partir dos
 * testes, e nao ha MySQL real acessivel neste ambiente. Em
 * api/import-ofx.php a ordem e require_login() -> require_rate_limit()
 * (que chama get_db() incondicionalmente) -> require_csrf() ->
 * require_plan() (tambem via get_db()) -> validacao de upload -> preview.
 * Ou seja, so o guard de autenticacao (401) e alcancavel via HTTP real sem
 * um banco de verdade; 403 (CSRF), 413 (upload grande), o gate de plano
 * (402) e o 200 de sucesso dependem de get_db() e ficam cobertos pelos
 * testes unitarios de finance_ofx_preview() em
 * tests/cases/finance_ofx_preview_test.php, que injetam um PDO sqlite
 * direto na funcao, sem passar por auth.php/db.php.
 */

return function (): void {
    $repoRoot = test_repo_root();

    // Sem sessao (nenhum cookie enviado), o endpoint real corta com 401
    // antes de chamar get_db(). Processo isolado por chamada: sem servidor
    // persistente, sem cookie jar, sem estado compartilhado entre cenarios.
    $r = fapi_run_isolated_request($repoRoot, '/api/import-ofx.php', 'POST', '', []);
    test_assert_same(401, $r['status'], 'Endpoint without a session must return 401.');
};
