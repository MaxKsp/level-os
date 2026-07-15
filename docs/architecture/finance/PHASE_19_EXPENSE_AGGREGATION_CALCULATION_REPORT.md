# Phase 19 — Extract Finance expense aggregation calculation

## Escopo

Extraida apenas a funcao `bucketPeriodTotals()` de `assets/app.js` para
`app/Modules/Finance/Frontend/finance-expense-aggregation-calculation.js`
(fonte canonica), publicada byte-a-byte em
`assets/finance-expense-aggregation-calculation.js`.

Nenhuma reformatacao, limpeza ou correcao de regra foi aplicada; o corpo da
funcao (incluindo o comentario JSDoc acima dela) foi copiado verbatim.

## Contratos tocados

- `assets/app.js`: remove a declaracao de `bucketPeriodTotals()`; os quatro
  pontos de chamada existentes (`spentByCat`, `byBank`, `byMethod`,
  `byCategoria`) permanecem inalterados, chamando o global do jeito que
  sempre chamaram.
- `assets/app.js` continua declarando `expenseTimeOf()`, `expenseHourOf()`,
  `expenseOccurrencesInRange()` (via `finance-expense-occurrence-calculation.js`)
  e `prorateElapsed()` (via `finance-period-calculation.js`); o novo asset os
  referencia em tempo de chamada via semantica de script classico (sem
  module, sem IIFE, sem `'use strict'` isolando escopo).
- `index.php`: novo `<script>` para
  `assets/finance-expense-aggregation-calculation.js` adicionado apos
  `finance-expense-occurrence-calculation.js` e `finance-period-calculation.js`,
  e antes de `app.js`, seguindo a convencao existente de
  `?v=<?= @filemtime(...) ?>`.
- Nenhum outro arquivo de `allowedFiles` fora esses tres (mais o teste e este
  relatorio) foi alterado.

## Compatibilidade

- Nome global, assinatura, ordem de iteracao sobre `expLines`, ordem de
  invocacao de `keyFn` (uma vez por item, mesmo com zero ocorrencias),
  coercao de chave (`totals[key]`, sem normalizacao), coercao numerica
  (`Number(e.value||0)`), multiplicacao por ocorrencias, delegacao para
  `expenseOccurrencesInRange()` (despesas com data) e `prorateElapsed()`
  (despesas sem data), e forma do objeto retornado foram preservados
  exatamente como estavam.
- `periodLabel()`, `parcelaLabel()`, `expenseTimeOf()`, `expenseHourOf()`,
  calculos de ocorrencia e periodo, metas, graficos, renderizacao/UI, DOM,
  navegacao, persistencia, OFX, mutacoes de conta e backend nao foram
  tocados.

## Validacao

Comandos executados nesta sessao:

```powershell
C:\Users\Max\tools\php\php.exe tests\run.php
node tests/js/finance_account_movement_test.js
node tests/js/pay_fatura_account_test.js
node tests/js/account_transfer_test.js
node tests/js/ofx_import_confirmation_test.js
node tests/js/finance_anomaly_detection_test.js
node tests/js/finance_income_regime_calculation_test.js
node tests/js/finance_expense_occurrence_calculation_test.js
node tests/js/finance_annual_ir_calculation_test.js
node tests/js/finance_period_calculation_test.js
node tests/js/finance_expense_aggregation_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-expense-aggregation-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-expense-aggregation-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-expense-aggregation-calculation.js
node --check assets/finance-expense-aggregation-calculation.js
node --check tests/js/finance_expense_aggregation_calculation_test.js
```

Resultado: todos os 17 checks aprovados (`passed=true`). Hash SHA256 de
`app/Modules/Finance/Frontend/finance-expense-aggregation-calculation.js` e
`assets/finance-expense-aggregation-calculation.js` bateram, confirmando
publicacao byte-a-byte.

O novo teste (`tests/js/finance_expense_aggregation_calculation_test.js`)
carrega o asset publicado via `vm` e injeta stubs registrando chamadas para
`expenseOccurrencesInRange()` e `prorateElapsed()`, cobrindo: despesas
avulsas, recorrentes e parceladas com data; despesas sem data prorateadas;
buckets mistos; chaves repetidas e `undefined`; valores zero, ausentes e em
string numerica; entrada vazia; ordem/contagem de invocacao de `keyFn`
(inclusive item com data e zero ocorrencias); e delegacao correta para as
duas dependencias externas.

## Verificacao manual (browser)

Pendente: abrir a pagina Financeiro sem erros de console/undefined-function,
navegar dia/semana/mes/ano e conferir totais e graficos por categoria, banco
e metodo (resumo do topo e secoes que usam `bucketPeriodTotals()`)
inalterados.

## Rollback

Reverter e so-codigo:

1. Restaurar a declaracao de `bucketPeriodTotals()` em `assets/app.js` (antes
   de `const CATEGORIA_LABEL`, apos `expenseHourOf()`).
2. Remover a linha
   `<script src="assets/finance-expense-aggregation-calculation.js...">` de
   `index.php`.
3. Apagar `app/Modules/Finance/Frontend/finance-expense-aggregation-calculation.js`,
   `assets/finance-expense-aggregation-calculation.js` e
   `tests/js/finance_expense_aggregation_calculation_test.js`.

Sem schema, migration ou reparo de dados envolvido.
