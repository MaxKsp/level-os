# Phase 5 Migration Extraction Report

Data: 2026-07-13

## Objetivo executado

Executar o recorte aprovado da Fase 5 (Codex): extrair `finance_migrate_if_needed()`
de `finance.php` para `app/Modules/Finance/FinanceMigration.php`, mantendo
`finance.php` como fachada compativel.

## Escopo desta extracao

Movido para `app/Modules/Finance/FinanceMigration.php`:

- `finance_migrate_if_needed()`

`finance.php` agora inclui, em ordem:

1. `db.php`
2. `app/Modules/Finance/FinanceRead.php` (Fase 3)
3. `app/Modules/Finance/FinanceWrite.php` (Fase 4)
4. `app/Modules/Finance/FinanceMigration.php` (Fase 5, este recorte)

`FinanceMigration.php` depende de `FINANCE_SETS` (definida em
`FinanceRead.php`) e de `finance_save_set()` (definida em `FinanceWrite.php`),
ja carregadas antes dele pela ordem de `require_once` em `finance.php`.
Nenhuma alteracao foi feita em `FinanceWrite.php` ou `FinanceRead.php`; a
referencia e apenas a chamada global ja existente, sem mudanca de codigo
nesses arquivos.

## O que foi preservado

- assinatura publica: `finance_migrate_if_needed(PDO $db, int $uid): void`
- leitura do `kv_store` por `data_key` (`_finance_migrated` e cada chave de
  `FINANCE_SETS`)
- delegacao para `finance_save_set()` por set com dados
- checagem de idempotencia pela flag `_finance_migrated`
- `UPSERT` atual (`INSERT ... ON DUPLICATE KEY UPDATE`) para marcar a flag
- ausencia de `try/catch` proprio: uma falha em `finance_save_set()` continua
  propagando sem marcar a flag, e os sets ja processados antes da falha
  continuam persistidos (cada `finance_save_set()` comita a propria transacao)
- kv legado nao e apagado apos a migracao

## O que nao foi tocado

- `api/`
- `assets/app.js`
- `schema.sql`
- `migrations/`
- `ofx.php`
- `plan.php`
- `auth.php`
- `db.php`
- contratos JSON e endpoints
- `FinanceRead.php`
- `FinanceWrite.php`

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO, container ou helper de producao
novo foi criado. `FinanceMigration.php` e uma funcao global simples, no
mesmo estilo procedural dos modulos anteriores.

## Arquivos alterados

- `finance.php` (modificado: remove `finance_migrate_if_needed()`, adiciona
  `require_once` do novo modulo)
- `app/Modules/Finance/FinanceMigration.php` (novo)
- `tests/cases/finance_migration_focus_test.php` (novo)
- `docs/architecture/finance/PHASE_5_MIGRATION_EXTRACTION_REPORT.md` (novo)

## Testes

`tests/cases/finance_migration_focus_test.php` cobre:

- primeira migracao, com os quatro `FINANCE_SETS` de uma vez
- flag `_finance_migrated` criada apos a primeira migracao
- segunda execucao sem duplicar dados: apos a flag setada, uma nova chamada
  e no-op mesmo que o kv tenha mudado (prova que o corte e pela flag, nao
  por comparacao de estado)
- usuario sem dados legados: sets vazios, sem excecao, flag ainda assim
  criada
- falha durante a migracao (trigger sqlite forcando erro no ultimo set):
  excecao propaga, flag nao e setada, sets processados antes da falha
  permanecem persistidos, o set que falhou fica intocado; uma nova chamada
  apos corrigir a causa conclui a migracao sem duplicar os sets ja migrados

O arquivo existente `tests/cases/finance_migration_test.php` nao foi
alterado.

## Validacao

- `php -l finance.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceMigration.php`: sem erro de sintaxe
- `tests/run.php` antes da alteracao: 5/5 passou
- `tests/run.php` depois da alteracao: 6/6 passou
- `git diff --stat` (`finance.php`): 1 insercao, 21 remocoes; nenhum outro
  arquivo de producao tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhum endpoint foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `finance.php` e remover
  `app/Modules/Finance/FinanceMigration.php`

## Estado do nucleo relacional apos a Fase 5

`finance.php` agora e uma fachada pura: sem definicoes proprias, apenas
`require_once` dos tres modulos (`FinanceRead`, `FinanceWrite`,
`FinanceMigration`) em `app/Modules/Finance/`. Os alvos documentados em
`FINANCE_EXTRACTION_RISKS.md` para o primeiro recorte (`FINANCE_SETS`,
`fin_num()`, `fin_trim_time()`, `finance_load_set()`, `finance_save_set()`,
`finance_migrate_if_needed()`) estao todos extraidos.
