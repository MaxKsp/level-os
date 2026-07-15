# Phase 8 OFX Preview Report

Data: 2026-07-15

## Objetivo executado

Extrair a orquestracao de preview de `POST api/import-ofx.php` para
`app/Modules/Finance/FinanceOfxPreview.php`, mantendo `api/import-ofx.php`
como adapter publico.

## Escopo desta extracao

Criado `app/Modules/Finance/FinanceOfxPreview.php` com:

- `finance_ofx_preview(PDO $db, int $uid, string $content): array`
  - chama `parse_ofx($content)` (de `ofx.php`, nao alterado)
  - se o parser falhar, devolve `400` com a mensagem de erro do parser
  - marca duplicidade provavel: para cada linha normalizada, compara
    `(date, value)` contra `finance_load_set($db, $uid, 'expense')` e
    `finance_load_set($db, $uid, 'income')`
  - devolve `['status' => int, 'body' => array]` pro adapter responder
  - nunca escreve no banco: so chama `finance_load_set()` (leitura); nenhuma
    chamada a `finance_save_set()` ou qualquer `INSERT`/`UPDATE`

## api/import-ofx.php apos a extracao

Continua responsavel por:

1. bootstrap (`require_once auth.php`, `plan.php`, `finance.php`, `ofx.php`,
   `app/Modules/Finance/FinanceOfxPreview.php`)
2. autenticacao (`require_login()`)
3. rate limit (`require_rate_limit('import_ofx', 10, 60)`)
4. CSRF (`require_csrf()`)
5. gate de plano (`require_plan($uid, 'individual')`)
6. validacao de upload: presenca do campo `ofx`, `UPLOAD_ERR_OK`, limite de
   5 MB (`413`)
7. delegacao para `finance_ofx_preview()`
8. resposta HTTP (`http_response_code($result['status'])` +
   `echo json_encode($result['body'])`)

O bloco que fazia parsing + marcacao de duplicidade + `echo` foi substituido
por uma chamada a `finance_ofx_preview()` seguida da resposta padrao. Nenhuma
outra linha do arquivo mudou.

## O que foi preservado

- rota: `POST api/import-ofx.php`
- upload pelo campo `ofx`
- `require_login()`, `require_rate_limit('import_ofx', 10, 60)`,
  `require_csrf()`, `require_plan($uid, 'individual')`, nesta mesma ordem
- limite de 5 MB (`413 {"error": "arquivo muito grande (máx 5MB)"}`)
- resposta de sucesso: `200 {"ok": true, "rows": [...]}`
- shape de cada linha: `date`, `value`, `kind`, `desc`, `fitid`, `dup`
- duplicidade provavel por `(date, value)`, comparando so contra `expense`
  e `income`
- ausencia de escrita no banco: o preview so le, nunca grava
- confirmacao final permanece no cliente (`assets/app.js` decide o que
  gravar via `storeSet()`, sem nenhuma mudanca aqui)

## O que nao foi tocado

- `api/data.php`
- `api/finance.php`
- `assets/app.js`
- `finance.php`
- `app/Modules/Finance/FinanceRead.php`
- `app/Modules/Finance/FinanceWrite.php`
- `app/Modules/Finance/FinanceMigration.php`
- `app/Modules/Finance/FinanceApi.php`
- `app/Modules/Finance/FinanceDataBootstrap.php`
- `schema.sql`
- `migrations/`
- `auth.php`
- `db.php`
- `plan.php`
- `ofx.php` (nao foi necessario tocar; `parse_ofx()` e chamado como estava)

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO ou container foi criado.
`FinanceOfxPreview.php` e uma funcao global simples, no mesmo estilo
procedural dos demais modulos de `app/Modules/Finance/`.

## Arquivos alterados

- `api/import-ofx.php` (modificado: mantem bootstrap/auth/CSRF/rate
  limit/gate de plano/validacao de upload/resposta; delega parsing e
  marcacao de duplicidade para `FinanceOfxPreview`)
- `app/Modules/Finance/FinanceOfxPreview.php` (novo)
- `tests/cases/finance_ofx_preview_test.php` (novo, unitario)
- `tests/cases/finance_ofx_preview_adapter_test.php` (novo, smoke HTTP)
- `docs/architecture/finance/PHASE_8_OFX_PREVIEW_REPORT.md` (novo)

## Testes

### `tests/cases/finance_ofx_preview_test.php` (unitario, sqlite em memoria)

Chama `finance_ofx_preview()` direto, com um PDO sqlite injetado (mesmo
helper `make_sqlite_finance_db()` usado pelos demais testes de Finance),
sem passar por `auth.php`/`db.php`:

- OFX valido: `200`, `ok:true`, duas linhas, shape completo
  (`date, value, kind, desc, fitid, dup`) batendo com a fixture
  `tests/fixtures/sample.ofx`
- arquivo invalido: `400` com a mensagem atual do parser
  (`arquivo não parece ser OFX`)
- marcacao de dup: apos gravar uma despesa com o mesmo `(date, value)` do
  primeiro lancamento do OFX (via `finance_save_set()`, fora do preview), o
  preview marca aquela linha como `dup:true` e a outra como `dup:false`
- confirmacao de que o preview nao grava no banco: depois de tres chamadas a
  `finance_ofx_preview()`, `finance_load_set()` para `expense`, `income`,
  `income_var` e `accounts` segue refletindo so a insercao explicita feita
  pelo teste — nenhuma linha nova apareceu

### `tests/cases/finance_ofx_preview_adapter_test.php` (smoke HTTP, `php -S` real)

Reaproveita `tests/helpers/http_smoke_client.php` (criado na correcao de
infraestrutura da Fase 7): `fapi_run_isolated_request()` sobe um processo
novo do servidor embutido do PHP por chamada, faz uma requisicao real, e
derruba o processo — sem servidor persistente, sem cookie jar, sem sessao
ou estado compartilhado entre cenarios.

- autenticacao continua ativa: `POST api/import-ofx.php` sem sessao (sem
  cookie) -> `401`, sem tocar em `get_db()`

`ofx_parser_test.php` nao foi alterado e continua passando, testando
`parse_ofx()` diretamente contra a mesma fixture.

## Lacunas HTTP/E2E remanescentes

Mesma restricao estrutural documentada na correcao de infraestrutura da
Fase 7 (`PHASE_7_DATA_BOOTSTRAP_REPORT.md`): `db.php` nao pode ser alterado
nem ter `get_db()` sobrescrita a partir dos testes, e nao ha MySQL real
acessivel neste ambiente (confirmado: `new PDO('mysql:host=...')` com as
credenciais de `config.php` lanca `PDOException` de conexao recusada).

Em `api/import-ofx.php`, a ordem e `require_login()` ->
`require_rate_limit()` (chama `get_db()` incondicionalmente) ->
`require_csrf()` -> `require_plan()` (tambem via `get_db()`, consulta
`subscriptions`) -> validacao de upload -> preview. Ou seja, **qualquer**
cenario autenticado precisa de um `get_db()` que funcione de verdade.

Por isso, via HTTP real, so o guard de autenticacao (`401`) e
tecnicamente viavel sem alterar producao. Os seguintes cenarios **nao tem
cobertura E2E automatizada**, so cobertura unitaria (via injecao direta de
PDO sqlite, sem passar por `auth.php`/`db.php`/`plan.php`):

- `403` (CSRF invalido) — bloqueado por `require_rate_limit()` antes de
  chegar em `require_csrf()`
- `413` (upload acima de 5 MB) — bloqueado pela mesma razao, antes mesmo de
  chegar na checagem de tamanho
- `402`/gate de plano (`require_plan()`) — depende de uma consulta real a
  `subscriptions`
- `200` de sucesso com upload real via HTTP (multipart/`$_FILES`) — depende
  de `get_db()` funcionar em `require_rate_limit()` antes de chegar no
  preview

Essas lacunas sao conhecidas e aceitas enquanto `db.php` nao tiver nenhum
ponto de injecao de teste. Validar manualmente esses fluxos (login real +
upload real de um `.ofx`) antes de qualquer mudanca que toque CSRF, rate
limit, gate de plano ou o shape de `POST api/import-ofx.php`, conforme a
Manual Validation Policy de `DEFINITION_OF_DONE.md`.

## Validacao

- `php -l api/import-ofx.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceOfxPreview.php`: sem erro de sintaxe
- `php -l` sem erro em `tests/cases/finance_ofx_preview_test.php` e
  `tests/cases/finance_ofx_preview_adapter_test.php`
- `tests/run.php` antes da extracao: 10/10 passou
- `tests/run.php` depois da extracao: 12/12 passou, em tres execucoes
  seguidas (sem flakiness observada)
- `git diff --stat`: `api/import-ofx.php` com 4 insercoes, 23 remocoes;
  nenhum arquivo da lista de "nao alterar" foi tocado; `ofx.php` nao foi
  tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhuma rota, metodo HTTP, status code ou shape JSON mudou
- login, rate limit, CSRF, gate de plano e validacao de upload continuam em
  `api/import-ofx.php`
- nenhuma escrita no banco foi introduzida no preview
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `api/import-ofx.php` e remover
  `app/Modules/Finance/FinanceOfxPreview.php`

## Estado do piloto Finance apos a Fase 8

O piloto `Finance` (Fases 3 a 8) cobre agora: nucleo relacional
(`FinanceRead`), escrita (`FinanceWrite`), migracao (`FinanceMigration`),
adapter de `api/finance.php` (`FinanceApi`), bootstrap financeiro de
`api/data.php` (`FinanceDataBootstrap`) e preview de OFX
(`FinanceOfxPreview`). O que resta fora do dominio relacional — cofrinhos,
transferencias, metas, categorias, simulador CLT/PJ, favoritos de banco,
tudo ainda em `kv_store` — segue fora de escopo, conforme
`FINANCE_BOUNDARIES.md`.
