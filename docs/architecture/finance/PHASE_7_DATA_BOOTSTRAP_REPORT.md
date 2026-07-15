# Phase 7 Data Bootstrap Report

Data: 2026-07-14

## Objetivo executado

Extrair apenas o bootstrap financeiro do `GET api/data.php?all=1` para um
modulo interno em `app/Modules/Finance/`, mantendo `api/data.php` como
endpoint publico responsavel por tudo mais.

## Escopo desta extracao

Criado `app/Modules/Finance/FinanceDataBootstrap.php` com:

- `finance_data_bootstrap(PDO $db, int $uid): array`
  - roda `finance_migrate_if_needed($db, $uid)` em modo best-effort (mesmo
    `try/catch` e mesma mensagem `error_log('migrate: ' . $e->getMessage())`)
  - devolve exatamente os quatro sets relacionais, na ordem de
    `FINANCE_SETS`: `expense_lines_v4`, `income_lines`, `ifood-entries`,
    `accounts_v2`, via `finance_load_set()`

## api/data.php apos a extracao

Continua responsavel por:

1. `GET`/`POST`/`405`
2. `require_login()`
3. `require_rate_limit('data', 200, 60)`
4. `session_write_close()` (so no `GET`, como antes)
5. leitura geral do `kv_store` (`SELECT ... WHERE user_id = ? AND data_key
   NOT LIKE '\_%'`)
6. merge final: monta `$out` a partir do `kv_store` e depois sobrescreve as
   quatro chaves financeiras com o retorno de `finance_data_bootstrap()`
7. `POST` intacto: mesma validacao, mesmo `UPSERT`, mesmas respostas
8. `405` para qualquer outro metodo

O `GET ?all=1` passou de chamar `finance_migrate_if_needed()` e o loop de
`FINANCE_SETS` diretamente para chamar `finance_data_bootstrap()` e iterar o
array devolvido no mesmo lugar do loop antigo. Nenhuma outra linha do
arquivo mudou.

## O que foi preservado

- `try/catch` da migracao e mensagem `error_log('migrate: ...')` identica
- filtro `data_key NOT LIKE '\_%'` na leitura do `kv_store`
- ordem de sobrescrita: `kv_store` primeiro, financeiro por cima (fonte de
  verdade = tabelas)
- contrato JSON do `GET ?all=1`, do `GET ?key=`, do `POST` e do `405`
- todos os status HTTP atuais (`200`, `400`, `413`, `405`, mais os herdados
  de `require_login`/`require_csrf`/`require_rate_limit`)
- comportamento do `POST` sem nenhuma alteracao de codigo

## O que nao foi tocado

- `api/finance.php`
- `assets/app.js`
- `finance.php`
- `app/Modules/Finance/FinanceRead.php`
- `app/Modules/Finance/FinanceWrite.php`
- `app/Modules/Finance/FinanceMigration.php`
- `schema.sql`
- `migrations/`
- `api/import-ofx.php`
- `auth.php`
- `plan.php`
- `ofx.php`

`db.php` segue com a guarda de testabilidade (`if (!function_exists('get_db'))`)
adicionada na correcao de lacuna da Fase 6; nao foi alterado de novo nesta
fase.

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO ou container foi criado.
`FinanceDataBootstrap.php` e uma funcao global simples, no mesmo estilo
procedural dos demais modulos de `app/Modules/Finance/`.

## Arquivos alterados

- `api/data.php` (modificado: `GET ?all=1` delega a migracao best-effort e
  o carregamento dos quatro sets para `finance_data_bootstrap()`)
- `app/Modules/Finance/FinanceDataBootstrap.php` (novo)
- `tests/cases/finance_data_bootstrap_test.php` (novo, unitario)
- `tests/cases/finance_data_adapter_test.php` (novo, smoke HTTP)
- `tests/helpers/http_smoke_client.php` (novo: `fapi_start_server`,
  `fapi_stop_server`, `fapi_wait_ready`, `fapi_request`, extraidos de
  `tests/cases/finance_api_adapter_test.php` pra reuso entre os dois smoke
  tests de adapter — sem essa extracao, os dois arquivos de teste
  declarariam as mesmas funcoes globais e o `require` do segundo dispararia
  "Cannot redeclare")
- `tests/cases/finance_api_adapter_test.php` (modificado: passa a usar o
  helper compartilhado no lugar das funcoes inline; nenhum caso de teste
  mudou)
- `tests/helpers/finance_api_router.php` (modificado: generalizado para
  servir tambem o smoke test de `api/data.php` — novo header de teste
  `X-Test-Seed-Kv` pra popular `kv_store` antes do request, e traducao do
  filtro `NOT LIKE '\_%'` para sqlite via `ESCAPE '\'`; comportamento
  anterior preservado quando os headers novos nao sao enviados)
- `docs/architecture/finance/PHASE_7_DATA_BOOTSTRAP_REPORT.md` (novo)

## Testes

### `tests/cases/finance_data_bootstrap_test.php` (unitario, sqlite em memoria)

- bootstrap financeiro extraido: com dados legados no `kv_store`, devolve
  exatamente as quatro chaves relacionais, no shape ja caracterizado por
  `finance_load_set()`
- idempotencia: uma segunda chamada nao muda nem duplica o resultado
- usuario sem dados legados: sem excecao, quatro chaves presentes e vazias
- migracao best-effort: uma falha no meio da migracao (trigger sqlite
  forcando erro em `accounts`) nao propaga para fora de
  `finance_data_bootstrap()`; os sets migrados antes da falha continuam
  presentes, o que falhou volta vazio

### `tests/cases/finance_data_adapter_test.php` (smoke HTTP, `php -S` real)

Reaproveita `tests/helpers/finance_api_router.php`, agora tambem usado por
este teste, apontando para `api/data.php` real:

- autenticacao continua ativa: sem sessao -> `401`
- merge do `GET ?all=1`: chave generica do kv passa direto; chaves
  prefixadas com `_` (incluindo `_finance_migrated`) sao filtradas; a chave
  financeira legada no kv e sobrescrita pelo valor vindo das tabelas
  (comprovado com um valor de kv propositalmente diferente do estado das
  tabelas)
- as quatro chaves relacionais sempre presentes no merge
- falha de migracao (trigger de banco) nao derruba o endpoint: `GET ?all=1`
  ainda responde `200` com JSON valido
- `POST` nao mudou: grava uma chave generica, responde `200 {"ok":true}`
- CSRF continua ativo no `POST`: token errado -> `403`
- `405` para metodo nao suportado, com o corpo de erro atual

A suite existente (`finance_roundtrip_test.php`, `finance_migration_test.php`,
`finance_migration_focus_test.php`, `finance_save_set_test.php`,
`finance_load_set_test.php`, `finance_api_save_set_test.php`,
`ofx_parser_test.php`) nao foi alterada em comportamento; apenas
`finance_api_adapter_test.php` teve as funcoes de cliente HTTP movidas para
o helper compartilhado, sem mudar nenhum caso de teste.

## Validacao

- `php -l` sem erro em: `api/data.php`, `FinanceDataBootstrap.php`,
  `finance_api_router.php`, `http_smoke_client.php`,
  `finance_api_adapter_test.php`, `finance_data_bootstrap_test.php`,
  `finance_data_adapter_test.php`
- `tests/run.php` antes da extracao: 8/8 passou
- `tests/run.php` depois da extracao: 10/10 passou, em tres execucoes
  seguidas (sem flakiness observada)
- `git diff --stat`: `api/data.php` com poucas linhas alteradas (troca do
  bloco de migracao+loop por uma chamada + iteracao do resultado); nenhum
  arquivo da lista de "nao alterar" foi tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhuma rota, metodo HTTP, status code ou shape JSON mudou
- login, rate limit, sessao, filtro de kv e merge final continuam em
  `api/data.php`
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `api/data.php` e remover
  `app/Modules/Finance/FinanceDataBootstrap.php`

## Proximo passo (fora deste recorte)

`GET api/data.php?key=` (leitura de uma chave avulsa) e o restante do
`POST` genérico seguem fora do dominio financeiro e nao foram tocados. O
piloto `Finance` (Fase 3 a 7) agora cobre: nucleo relacional, escrita,
migracao, adapter de `api/finance.php` e bootstrap financeiro de
`api/data.php`. O que resta documentado como fronteira financeira ainda em
kv (`vaults`, `transfers`, `budget_goals`, etc.) segue fora de escopo,
conforme `FINANCE_BOUNDARIES.md`.

## Correcao de infraestrutura de teste (alteracao indevida em db.php revertida)

Data: 2026-07-15

### O que aconteceu

A correcao de lacuna da Fase 6 (smoke test HTTP) tinha adicionado uma guarda
de testabilidade em `db.php` (`if (!function_exists('get_db'))`) pra permitir
que um router de teste predefinisse `get_db()` antes de `auth.php` carregar o
arquivo real. Essa alteracao em `db.php` foi revertida (fora desta tarefa,
tratada como alteracao indevida em arquivo critico) e **nao deve voltar**.

Sem a guarda, `db.php` volta a declarar `get_db()` de forma incondicional.
Como o router de teste (`tests/helpers/finance_api_router.php`) tambem
declarava uma funcao global `get_db()`, toda requisicao aos smoke tests
passou a disparar `Fatal error: Cannot redeclare get_db()` dentro do
`require_once` de `auth.php`. O servidor embutido do PHP (`php -S`), ao
encontrar esse fatal antes de qualquer `http_response_code()` explicito,
respondia `200` com o corpo do erro fatal em vez de `401` — daí as duas
falhas relatadas (`finance_api_adapter_test.php` e
`finance_data_adapter_test.php` esperando `401` sem sessao e recebendo `200`).

### Causa raiz

Colisao de declaracao de funcao global (`get_db()`) entre o router de teste
e o `db.php` real, nao reuso indevido de sessao/cookie. Confirmado
empiricamente reproduzindo a chamada fora da suite e lendo o log do
servidor embutido (`PHP Fatal error: Cannot redeclare get_db()...`).

### Restricao que passou a valer

Sem qualquer guarda em `db.php`, e sem poder alterar `auth.php`, nao existe
mais nenhum ponto de injecao para trocar `get_db()` por um PDO de teste a
partir de `tests/`. Nenhuma requisicao HTTP autenticada consegue mais
exercitar `api/finance.php` ou `api/data.php` de ponta a ponta sem uma
conexao MySQL real — e nao existe MySQL real acessivel neste ambiente
(confirmado manualmente: `new PDO('mysql:host=...')` com as credenciais de
`config.php` lanca `PDOException` de conexao recusada).

### Correcao aplicada (somente em tests/)

- **`tests/helpers/finance_api_router.php` removido.** Ele so existia pra
  sustentar a sobrescrita de `get_db()`/sessao, que nao e mais possivel sem
  tocar em `db.php`/`auth.php`. Nada mais referenciava esse arquivo.
- **`tests/helpers/http_smoke_client.php` reescrito.** Trocou o modelo
  "sobe um servidor, manda varias requisicoes" por
  `fapi_run_isolated_request()`: sobe um processo NOVO de `php -S` por
  chamada, faz **uma** requisicao HTTP real, derruba o processo, devolve o
  resultado. Cada cenario roda isolado, sem servidor persistente entre
  cenarios, sem cookie jar (nenhuma chamada envia `Cookie`), sem sessao
  ou variavel de ambiente carregada de uma chamada pra outra — cada
  `proc_open` recebe um comando e headers montados do zero.
- **`tests/cases/finance_api_adapter_test.php` reduzido a um cenario:**
  requisicao sem sessao (sem cookie) em `POST /api/finance.php` deve
  devolver `401`. Esse e o unico caminho do endpoint real que nao toca em
  `get_db()` — `require_login()` corta antes de qualquer acesso a banco.
- **`tests/cases/finance_data_adapter_test.php` reduzido a um cenario:**
  a mesma checagem para `GET /api/data.php?all=1` sem sessao -> `401`.

### Por que os outros cenarios HTTP saem do smoke test

Em ambos os endpoints, a ordem e sempre `require_login()` ->
`require_rate_limit()` -> (CSRF/leitura do body). `require_rate_limit()`
chama `get_db()` incondicionalmente pra consultar `rate_hits` — ou seja,
**qualquer** cenario autenticado (CSRF errado, payload valido, payload
invalido, 413, 500, merge do `?all=1`, POST) precisa de um `get_db()` que
funcione de verdade. Sem guarda em `db.php` e sem MySQL real disponivel,
esses cenarios nao podem mais ser exercitados via HTTP real de forma
deterministica.

Essa cobertura nao foi perdida da suite — ela ja existia, em paralelo, nos
testes unitarios que chamam os modulos de Finance diretamente com um PDO
sqlite injetado, sem passar por `auth.php`/`db.php`:

- `tests/cases/finance_api_save_set_test.php` — payload valido/invalido/
  limite de linhas/falha de persistencia de `finance_api_save_set()`
- `tests/cases/finance_data_bootstrap_test.php` — bootstrap financeiro,
  migracao best-effort, quatro chaves, usuario sem dados legados
- `tests/cases/finance_save_set_test.php`,
  `tests/cases/finance_migration_focus_test.php`,
  `tests/cases/finance_migration_test.php` — replace total, rollback,
  idempotencia da migracao

### Lacuna que fica documentada

O guard HTTP real de CSRF, o `Content-Type` de resposta, o `413` de
`api/finance.php`, o `405` e o merge completo do `GET ?all=1` de
`api/data.php` **nao tem mais cobertura automatizada de ponta a ponta**
(so a logica interna, via unit tests). Essa e uma lacuna conhecida e aceita
enquanto `db.php` nao tiver nenhum ponto de injecao de teste — validar
manualmente esses fluxos (login real + requisicao real) antes de qualquer
mudanca que toque CSRF, rate limit ou o shape do `?all=1`, conforme a
Manual Validation Policy de `DEFINITION_OF_DONE.md`.

### `db.php`

**`db.php` permaneceu completamente intocado nesta correcao.** Nenhuma
linha foi adicionada, removida ou revertida por esta tarefa; ele segue no
estado em que foi restaurado (sem qualquer guarda de testabilidade), e a
infraestrutura de teste foi adaptada para nao depender de sobrescrever
`get_db()`.

### Arquivos alterados nesta correcao

- `tests/helpers/finance_api_router.php` (removido)
- `tests/helpers/http_smoke_client.php` (reescrito)
- `tests/cases/finance_api_adapter_test.php` (reduzido a um cenario)
- `tests/cases/finance_data_adapter_test.php` (reduzido a um cenario)
- `docs/architecture/finance/PHASE_7_DATA_BOOTSTRAP_REPORT.md` (esta secao)

Nenhum arquivo de producao foi tocado nesta correcao (nem `db.php`, nem
`auth.php`, nem `api/finance.php`, nem `api/data.php`).

### Validacao

- `php -l` sem erro em `tests/helpers/http_smoke_client.php`,
  `tests/cases/finance_api_adapter_test.php`,
  `tests/cases/finance_data_adapter_test.php`
- `tests/run.php`: 10/10 passou, em tres execucoes seguidas (sem
  flakiness observada, inclusive com portas aleatorias por chamada)
- `git status --short` confirma que `db.php` nao aparece como alterado
- `git diff --stat` mostra apenas `api/data.php` (recorte ja aprovado da
  Fase 7, nao alterado por esta correcao) e
  `tests/cases/finance_api_adapter_test.php`
