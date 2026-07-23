# Phase 18 — Extract Finance period calculations

## Escopo

Extraidas apenas as cinco funcoes: `periodRange()`, `prorate()`, `inRange()`,
`clampRangeToToday()` e `prorateElapsed()` de `assets/app.js` para
`app/Modules/Finance/Frontend/finance-period-calculation.js` (fonte canonica),
publicadas byte-a-byte em `assets/finance-period-calculation.js`.

Nenhuma reformatacao, limpeza ou correcao de regra de data foi aplicada; o
corpo de cada funcao foi copiado verbatim.

## Contratos tocados

- `assets/app.js`: remove as cinco declaracoes; `periodLabel()` permanece no
  lugar original, entre `finPeriod`/nav e `parcelaLabel()`.
- `assets/app.js` continua declarando `dnum()`, `addDays()` e `startOfWeek()`
  globalmente (linhas 267-269); o novo asset os referencia em tempo de
  chamada via semantica de script classico (sem module, sem IIFE, sem
  `'use strict'` isolando escopo).
- `index.php`: novo `<script>` para `assets/finance-period-calculation.js`
  adicionado apos `finance-annual-ir-calculation.js` e antes de `app.js`,
  seguindo a convencao existente de `?v=<?= @filemtime(...) ?>`.
- Nenhum outro arquivo de `allowedFiles` fora esses tres (mais o teste e este
  relatorio) foi alterado.

## Compatibilidade

- Nomes globais, assinaturas, coercao de entrada, formatos de retorno,
  construcao de `Date`, limites de semana a partir de domingo, comparacoes
  inclusivas, divisores mensais e comportamento de meses decorridos no ano
  foram preservados exatamente como estavam.
- `periodLabel()`, navegacao, `bucketPeriodTotals()`, ocorrencias de despesa,
  IR anual, projecoes, graficos, renderizacao, DOM, persistencia e OFX nao
  foram tocados.

## Validacao

Comandos a rodar (nao executados nesta sessao por falta de shell disponivel
nas ferramentas atuais):

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
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-period-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-period-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-period-calculation.js
node --check assets/finance-period-calculation.js
node --check tests/js/finance_period_calculation_test.js
```

Fonte canonica e asset publico foram escritos com conteudo identico
(mesma string, gravada duas vezes); o hash SHA256 deve bater.

## Verificacao manual (browser)

Pendente: abrir a pagina Financeiro sem erros de console/undefined-function,
navegar dia/semana/mes/ano e conferir totais, graficos, projecoes e IR anual
inalterados.

## Rollback

Reverter e so-codigo:

1. Restaurar as cinco declaracoes em `assets/app.js` (antes de `periodLabel()`
   / depois dela, conforme a ordem original).
2. Remover a linha `<script src="assets/finance-period-calculation.js...">`
   de `index.php`.
3. Apagar `app/Modules/Finance/Frontend/finance-period-calculation.js`,
   `assets/finance-period-calculation.js` e
   `tests/js/finance_period_calculation_test.js`.

Sem schema, migration ou reparo de dados envolvido.
