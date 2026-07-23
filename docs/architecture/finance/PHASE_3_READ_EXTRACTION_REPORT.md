# Phase 3 Read Extraction Report

Data: 2026-07-13

## Objetivo executado

Executar o primeiro recorte aprovado da Fase 3: extrair somente o nucleo de
leitura relacional puro de `finance.php` para `app/Modules/Finance/`, mantendo
`finance.php` como fachada compativel.

## Escopo desta extracao

Movido para `app/Modules/Finance/FinanceRead.php`:

- `FINANCE_SETS`
- `fin_num()`
- `fin_trim_time()`
- `finance_load_set()`

Mantido intacto em `finance.php` (nao movido, nao alterado):

- `finance_save_set()`
- `finance_migrate_if_needed()`

`finance.php` agora inclui `app/Modules/Finance/FinanceRead.php` via
`require_once` logo apos `db.php` e continua expondo as mesmas funcoes
globais, sem namespace, sem classe.

## O que foi preservado

- nome `finance_load_set()`
- assinatura atual: `finance_load_set(PDO $db, int $uid, string $set): array`
- shape de retorno identico para os quatro sets (`expense`, `income`,
  `income_var`, `accounts`)
- `ORDER BY id` nas duas queries (`accounts` e `transactions`)
- `client_id` como origem do campo `id` publico
- os quatro sets em `FINANCE_SETS` sem alteracao de chave ou valor

## O que nao foi tocado

- `api/finance.php`
- `api/data.php`
- `api/import-ofx.php`
- `assets/app.js`
- `schema.sql`
- `migrations/`
- `finance_save_set()`
- `finance_migrate_if_needed()`
- autenticacao, sessao, CSRF, plano, OFX

## Arquivos alterados

- `finance.php` (modificado: remove definicoes movidas, adiciona
  `require_once` do novo modulo)
- `app/Modules/Finance/FinanceRead.php` (novo)

## Validacao

- `php -l finance.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceRead.php`: sem erro de sintaxe
- `tests/run.php` antes da alteracao: 3/3 passou
- `tests/run.php` depois da alteracao: 3/3 passou
- `git diff --stat`: `finance.php` com 1 insercao, 65 remocoes; nenhum outro
  arquivo de producao tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhum endpoint foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova (classe, container, repository) foi criada
- rollback trivial: reverter `finance.php` e remover
  `app/Modules/Finance/FinanceRead.php`

## Proximo recorte (nao executado nesta fase)

`finance_save_set()` e `finance_migrate_if_needed()` seguem em `finance.php`
ate fase dedicada, conforme recomendacao do `FINANCE_EXTRACTION_RISKS.md`.
