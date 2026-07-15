# Phase 2 Report

Data: 2026-07-13

## Objetivo executado

Caracterizar o comportamento atual do Financeiro da Orby antes de qualquer
extracao para `app/Modules/Finance`.

Escopo desta continuacao:

1. contratos publicos do Financeiro
2. matriz de compatibilidade
3. analise de infraestrutura de testes
4. fixtures deterministicas
5. riscos de extracao
6. recomendacao do primeiro recorte
7. suite minima executavel sem alterar producao

## Entregas

- `docs/architecture/finance/FINANCE_PUBLIC_CONTRACTS.md`
- `docs/architecture/finance/FINANCE_COMPATIBILITY_MATRIX.md`
- `docs/architecture/finance/FINANCE_EXTRACTION_RISKS.md`
- `tests/run.php`
- `tests/bootstrap.php`
- `tests/fixtures/finance_sets.php`
- `tests/fixtures/sample.ofx`
- `tests/helpers/sqlite_finance_schema.php`
- `tests/cases/finance_roundtrip_test.php`
- `tests/cases/finance_migration_test.php`
- `tests/cases/ofx_parser_test.php`

## Decisao sobre testes

Nao existia infraestrutura de testes no repositorio.

Foi criada uma suite minima de caracterizacao em PHP puro, sem framework, para
manter compatibilidade com a stack atual e evitar alterar producao.

Escopo da suite:

- round-trip dos quatro sets relacionais
- semantica de replace total
- migracao kv -> relacional com idempotencia
- parser OFX

Ficaram fora, por enquanto:

- fluxos completos de endpoint HTTP
- regras cliente-side do `assets/app.js`
- smoke browser

## Primeiro recorte recomendado

Primeiro recorte pequeno, reversivel e testavel:

**extrair apenas o nucleo relacional puro hoje contido em `finance.php`,
mantendo `finance.php` como fachada compatível.**

Justificativa:

- menor unidade coesa no PHP
- sem necessidade de tocar no front
- sem mistura com assinatura
- parcialmente protegida pela suite criada nesta fase

## Garantias desta fase

- nenhum arquivo de producao foi modificado
- nenhum contrato publico foi alterado
- nenhum bug foi corrigido
- nenhuma regra foi movida para `app/Modules/Finance`
