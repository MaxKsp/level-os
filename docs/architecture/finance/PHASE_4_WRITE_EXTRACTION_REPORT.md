# Phase 4 Write Extraction Report

Data: 2026-07-13

## Objetivo executado

Executar o recorte aprovado da Fase 4: extrair `finance_save_set()` de
`finance.php` para `app/Modules/Finance/FinanceWrite.php`, mantendo
`finance.php` como fachada compativel.

## Escopo desta extracao

Movido para `app/Modules/Finance/FinanceWrite.php`:

- `finance_save_set()`

Mantido intacto em `finance.php` (nao movido, nao alterado):

- `finance_migrate_if_needed()`

`finance.php` agora inclui, em ordem:

1. `db.php`
2. `app/Modules/Finance/FinanceRead.php` (Fase 3)
3. `app/Modules/Finance/FinanceWrite.php` (Fase 4, este recorte)

`FinanceWrite.php` depende de `fin_num()`, definida em `FinanceRead.php` e ja
carregada antes dele pela ordem de `require_once` em `finance.php`. Nenhuma
funcao nova foi criada; `FinanceWrite.php` reutiliza `fin_num()` existente em
vez de duplica-la.

## O que foi preservado

- assinatura publica: `finance_save_set(PDO $db, int $uid, string $set, array $rows): void`
- semantica de replace total (DELETE + reinsercao completa)
- `client_id` como origem do id persistido
- fallback de id com `uniqid()` quando o payload nao traz `id`
- `beginTransaction()` / `commit()` / `rollBack()`, incluindo deteccao de
  transacao ja aberta pelo chamador (`$ownTxn`)
- normalizacoes atuais (`fin_num`, limites de `fechamento`/`vencimento`/`payday`,
  regra de `parcelas`)
- comportamento observavel identico para os quatro sets

## O que nao foi tocado

- `finance_migrate_if_needed()`
- `api/`
- `assets/app.js`
- `schema.sql`
- `migrations/`
- `kv_store`
- `ofx.php`
- `auth.php`
- `plan.php`
- `db.php`

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO, container ou helper novo foi
criado. `FinanceWrite.php` e uma funcao global simples, no mesmo estilo
procedural de `finance.php` e `FinanceRead.php`.

## Arquivos alterados

- `finance.php` (modificado: remove `finance_save_set()`, adiciona
  `require_once` do novo modulo)
- `app/Modules/Finance/FinanceWrite.php` (novo)
- `tests/cases/finance_save_set_test.php` (novo)
- `docs/architecture/finance/PHASE_4_WRITE_EXTRACTION_REPORT.md` (novo)

Observacao: `CLAUDE.md` aparece modificado no working tree, mas essa mudanca
e anterior a esta tarefa e nao foi tocada por este recorte.

## Testes

`tests/cases/finance_save_set_test.php` cobre:

- persistencia correta e `client_id` nos quatro `FINANCE_SETS`
- replace total (segunda gravacao substitui a anterior por completo)
- fallback de id via `uniqid()` quando o payload nao traz `id`
- rollback automatico quando uma gravacao falha no meio (trigger sqlite
  forcando erro), preservando o set anterior intacto
- rollback quando o chamador ja possui transacao aberta: `finance_save_set`
  nao commita nem faz rollback por conta propria nesse caso

## Validacao

- `php -l finance.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceWrite.php`: sem erro de sintaxe
- `tests/run.php` antes da alteracao: 4/4 passou
- `tests/run.php` depois da alteracao: 5/5 passou
- `git diff --stat`: `finance.php` com 5 insercoes, 53 remocoes; nenhum outro
  arquivo de producao tocado

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhum endpoint foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `finance.php` e remover
  `app/Modules/Finance/FinanceWrite.php`

## Proximo recorte (nao executado nesta fase)

`finance_migrate_if_needed()` segue em `finance.php` ate fase dedicada,
conforme `FINANCE_EXTRACTION_RISKS.md`.
