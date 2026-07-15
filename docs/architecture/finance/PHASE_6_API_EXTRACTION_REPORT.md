# Phase 6 API Extraction Report

Data: 2026-07-13

## Objetivo executado

Transformar `api/finance.php` em adapter fino, extraindo a logica de
orquestracao (validacao do payload, roteamento pelo `FINANCE_SETS`, limite de
linhas, chamada a `finance_save_set()` e tratamento de erro) para
`app/Modules/Finance/FinanceApi.php`.

## Escopo desta extracao

Criado `app/Modules/Finance/FinanceApi.php` com:

- `finance_api_save_set(PDO $db, int $uid, string $raw): array`
  - decodifica o JSON recebido
  - resolve `key` -> `set` via `FINANCE_SETS`
  - valida presenca e tipo de `value`
  - valida limite de 5000 linhas
  - chama `finance_save_set()`
  - captura falhas, loga (`error_log('finance.php: ' . ...)`, mensagem
    inalterada) e devolve o erro padrao
  - retorna `['status' => int, 'body' => array]`

## api/finance.php apos a extracao

Mantido como fachada publica, responsavel apenas por:

1. bootstrap (`require_once auth.php`, `finance.php`,
   `app/Modules/Finance/FinanceApi.php`)
2. autenticacao (`require_login()`, `require_rate_limit()`)
3. CSRF (`require_csrf()`)
4. leitura do request (`file_get_contents('php://input', ...)` com o mesmo
   guard de 4 MB e a mesma resposta `413`)
5. delegacao para `finance_api_save_set()`
6. resposta JSON (`http_response_code($result['status'])` +
   `echo json_encode($result['body'])`)

## O que foi preservado (contrato publico)

- caminho: `POST api/finance.php`
- payload de entrada: `{ key, value }`
- resposta de sucesso: `200 {"ok": true}`
- resposta de payload invalido: `400 {"error": "invalid finance payload"}`
- resposta de excesso de linhas: `400 {"error": "too many rows"}`
- resposta de payload grande: `413 {"error": "payload too large"}`
- resposta de falha de persistencia: `500 {"error": "erro ao salvar — banco
  atualizado? (ver migrations)"}`
- `require_login()`, `require_rate_limit('finance', 200, 60)`,
  `require_csrf()`, nesta mesma ordem
- limite de 4 MB de payload bruto e de 5000 linhas por set
- `Content-Type: application/json; charset=utf-8`
- mensagem de log (`error_log`) identica

## O que nao foi tocado

- `api/data.php`
- `finance.php`
- `app/Modules/Finance/FinanceRead.php`
- `app/Modules/Finance/FinanceWrite.php`
- `app/Modules/Finance/FinanceMigration.php`
- `assets/app.js`
- `schema.sql`
- `migrations/`
- `kv_store`
- contratos publicos (rotas, JSON, codigos HTTP)

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO ou container foi criado.
`FinanceApi.php` e uma funcao global simples, no mesmo estilo procedural dos
demais modulos de `app/Modules/Finance/`.

## Arquivos alterados

- `api/finance.php` (modificado: mantem bootstrap/auth/CSRF/leitura do
  request/resposta; delega orquestracao para `FinanceApi`)
- `app/Modules/Finance/FinanceApi.php` (novo)
- `tests/cases/finance_api_save_set_test.php` (novo)
- `docs/architecture/finance/PHASE_6_API_EXTRACTION_REPORT.md` (novo)

## Testes

`tests/cases/finance_api_save_set_test.php` cobre `finance_api_save_set()`
diretamente (sem HTTP, via chamada de funcao) para:

- payload valido nos quatro `FINANCE_SETS`, com persistencia confirmada via
  `finance_load_set()`
- JSON malformado -> `400 invalid finance payload`
- `key` desconhecida -> `400 invalid finance payload`
- `value` que nao e array -> `400 invalid finance payload`
- mais de 5000 linhas -> `400 too many rows`
- falha de persistencia (trigger sqlite forcando erro) -> `500` com a
  mensagem atual, e o set anterior permanece intacto (sem replace parcial)

A suite existente (`finance_roundtrip_test.php`,
`finance_migration_test.php`, `finance_migration_focus_test.php`,
`finance_save_set_test.php`, `finance_load_set_test.php`,
`ofx_parser_test.php`) nao foi alterada.

## Validacao

- `php -l api/finance.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceApi.php`: sem erro de sintaxe
- `tests/run.php` antes da alteracao: 6/6 passou
- `tests/run.php` depois da alteracao: 7/7 passou
- `git diff --stat`: `api/finance.php` com 4 insercoes, 21 remocoes; nenhum
  outro arquivo de producao tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhuma rota, metodo HTTP, status code ou shape JSON mudou
- CSRF, autenticacao, rate limit e leitura do request permanecem em
  `api/finance.php`
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `api/finance.php` e remover
  `app/Modules/Finance/FinanceApi.php`

## Proximo passo (fora deste recorte)

`api/data.php` continua fora de escopo: sua parte financeira (leitura
combinada kv + relacional no bootstrap `?all=1`) segue como fronteira
documentada em `FINANCE_BOUNDARIES.md`, sem extracao nesta fase.

## Correcao de lacuna apontada na revisao

Data: 2026-07-14

### Lacuna identificada

`tests/cases/finance_api_save_set_test.php` cobria `finance_api_save_set()`
diretamente, mas nenhum teste executava `api/finance.php` de fato. Bootstrap,
`require_login()`, `require_rate_limit()`, `require_csrf()`, leitura de
`php://input`, o guard de 4 MB, `http_response_code()` e o `Content-Type` da
resposta ficaram sem cobertura automatizada.

### Correcao aplicada

Adicionado um smoke test que executa o arquivo real `api/finance.php` via
`php -S` (servidor embutido do PHP), fazendo requisicoes HTTP de verdade e
validando status code, corpo JSON e `Content-Type` da resposta.

Novo: `tests/cases/finance_api_adapter_test.php`.

- sobe `php -S 127.0.0.1:<porta> -t <raiz do repo> tests/helpers/finance_api_router.php`
  num processo separado (`proc_open`), com a raiz do repositorio como
  document root, servindo o `api/finance.php` real e sem modificacoes
- faz requisicoes HTTP reais com `file_get_contents` + `stream_context`,
  igual um cliente de verdade
- derruba o servidor ao final (`proc_terminate` + `proc_close`)

Novo: `tests/helpers/finance_api_router.php` (router de teste, nunca
carregado em producao):

- roda no mesmo processo/request do script servido, antes dele — mesmo
  mecanismo do `auto_prepend_file`, confirmado empiricamente com `php -S`
- predefine `get_db()` para devolver um sqlite em memoria (mesmo schema de
  `tests/helpers/sqlite_finance_schema.php`, mais a tabela `rate_hits` usada
  por `require_rate_limit()`), evitando qualquer dependencia de MySQL real
- controla o payload de `$_SESSION` via um `SessionHandlerInterface` fixo,
  escolhido pelo header de teste `X-Test-Session` (`anon` ou `authed`), pra
  exercitar `require_login()` e `require_csrf()` sem precisar de um login
  real
- injeta uma falha controlada de banco (trigger sqlite) quando o header de
  teste `X-Test-Db: poison` esta presente, pra exercitar o caminho `500` de
  `finance_api_save_set()` de ponta a ponta pelo endpoint real
- `X-Test-Session` e `X-Test-Db` sao headers lidos somente pelo router de
  teste; `api/finance.php` e `FinanceApi.php` nunca leem esses headers

### Mudanca minima de producao (justificada)

`db.php`: a declaracao de `get_db()` foi envolvida em
`if (!function_exists('get_db'))`. Sem isso, o router de teste nao consegue
predefinir `get_db()` antes de `auth.php` carregar `db.php` de verdade —
PHP aborta com "Cannot redeclare get_db()" (confirmado empiricamente).

Com a guarda:

- comportamento em producao e identico: `get_db()` so e declarada pela
  primeira vez, exatamente como antes, porque nada a predefine fora dos
  testes
- nenhuma assinatura, DSN, opcao de `PDO` ou fluxo mudou
- a mudanca e reversivel com uma linha (remover o `if`)

Nada mais em `db.php` foi tocado.

### O que este smoke test cobre

- payload valido -> `200`, corpo `{"ok":true}`, `Content-Type` JSON
- payload invalido (`key` desconhecida) -> `400 invalid finance payload`
- payload acima de 4 MB -> `413 payload too large`
- falha interna controlada no banco -> `500` com a mensagem atual
- autenticacao continua ativa: sem sessao -> `401`
- CSRF continua ativo: sessao valida com token errado -> `403`

### O que nao mudou

- `api/finance.php` continua adapter fino, sem nenhuma linha alterada nesta
  correcao
- `app/Modules/Finance/FinanceApi.php` nao foi tocado (sem redesenho)
- nenhum contrato publico, rota, status code ou shape JSON mudou
- `tests/cases/finance_api_save_set_test.php` e a suite existente nao foram
  alterados

### Arquivos alterados nesta correcao

- `db.php` (modificado: guarda de testabilidade em `get_db()`)
- `tests/helpers/finance_api_router.php` (novo, teste-only)
- `tests/cases/finance_api_adapter_test.php` (novo)
- `docs/architecture/finance/PHASE_6_API_EXTRACTION_REPORT.md` (esta secao)

### Validacao

- `php -l db.php`: sem erro de sintaxe
- `php -l tests/helpers/finance_api_router.php`: sem erro de sintaxe
- `php -l tests/cases/finance_api_adapter_test.php`: sem erro de sintaxe
- `tests/run.php`: 8/8 passou, em tres execucoes seguidas (sem flakiness
  observada)
- `git diff --stat`: `api/finance.php` (25 linhas, do recorte anterior) e
  `db.php` (25 linhas) alterados; demais itens sao arquivos novos
