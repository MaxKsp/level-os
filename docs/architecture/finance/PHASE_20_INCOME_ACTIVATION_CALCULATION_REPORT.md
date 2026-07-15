# Phase 20 — Extract Finance income activation calculation

## Escopo

Extraida apenas a funcao `isIncomeActive()` de `assets/app.js` para
`app/Modules/Finance/Frontend/finance-income-activation-calculation.js`
(fonte canonica), publicada byte-a-byte em
`assets/finance-income-activation-calculation.js`.

Nenhuma reformatacao, limpeza ou correcao de regra foi aplicada; o corpo da
funcao foi copiado verbatim (apenas um comentario JSDoc descritivo foi
adicionado acima dela, seguindo o padrao das fases anteriores).

## Contratos tocados

- `assets/app.js`: remove a declaracao de `isIncomeActive(line, now)`; os
  pontos de chamada existentes permanecem inalterados, chamando o global do
  jeito que sempre chamaram.
- `assets/app.js` continua declarando `dnum()`; o novo asset o referencia em
  tempo de chamada via semantica de script classico (sem module, sem IIFE,
  sem `'use strict'` isolando escopo).
- `index.php`: novo `<script>` para
  `assets/finance-income-activation-calculation.js` adicionado apos
  `finance-expense-aggregation-calculation.js` e antes de `app.js`, seguindo
  a convencao existente de `?v=<?= @filemtime(...) ?>`.
- Nenhum outro arquivo de `allowedFiles` fora esses tres (mais o teste e este
  relatorio) foi alterado.

## Compatibilidade

- Nome global, assinatura `isIncomeActive(line, now)`, regra de renda
  temporaria (`line.type !== 'temporaria'`), regra de `endDate` ausente,
  construcao de `new Date(line.endDate+'T00:00:00')` (meia-noite local) e
  comparacao de data-somente via `dnum()` (`>=`, inclusiva) foram preservados
  exatamente como estavam.
- `dnum` continua resolvido em tempo de chamada (nao em tempo de carga),
  preservando a ordem de scripts e semantica global classica.
- Valores e agregacao de renda, calculos de IR anual, calculos de
  regime de renda, payday, renderizacao/UI, DOM, estado, persistencia, OFX,
  mutacoes de conta e backend nao foram tocados.

## Validacao

Comandos requeridos pela fase, executados nesta sessao — todos aprovados
(18 checks, `passed=true`):

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
node tests/js/finance_income_activation_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-income-activation-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-income-activation-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-income-activation-calculation.js
node --check assets/finance-income-activation-calculation.js
node --check tests/js/finance_income_activation_calculation_test.js
```

`app/Modules/Finance/Frontend/finance-income-activation-calculation.js` e
`assets/finance-income-activation-calculation.js` confirmados
byte-a-byte identicos pelo comando de hash acima.

O novo teste (`tests/js/finance_income_activation_calculation_test.js`)
carrega o asset publicado via `vm` e injeta um stub de `dnum()` que registra
chamadas, cobrindo: renda fixa, variavel e de tipo desconhecido (sempre
ativas, sem chamar `dnum()`); temporaria sem `endDate` e com `endDate` vazia
(ativa, sem chamar `dnum()`); temporaria com `endDate` no passado, igual a
`now` (inclusiva) e no futuro; insensibilidade a hora do dia tanto em `now`
quanto no `endDate` (meia-noite local fixa); `endDate` invalida delegando
para `dnum()` com `Invalid Date`; e delegacao correta para `dnum()` (duas
chamadas, argumentos e ordem).

## Verificacao manual (browser)

Pendente: abrir a pagina Financeiro sem erros de console/undefined-function
e conferir totais de renda e a apresentacao ativa/inativa de renda
temporaria inalterados.

## Rollback

Reverter e so-codigo:

1. Restaurar a declaracao de `isIncomeActive(line, now)` em `assets/app.js`
   (antes de `const TYPE_LABEL`, apos `getIncomeLines()`).
2. Remover a linha
   `<script src="assets/finance-income-activation-calculation.js...">` de
   `index.php`.
3. Apagar `app/Modules/Finance/Frontend/finance-income-activation-calculation.js`,
   `assets/finance-income-activation-calculation.js` e
   `tests/js/finance_income_activation_calculation_test.js`.

Sem schema, migration ou reparo de dados envolvido.
