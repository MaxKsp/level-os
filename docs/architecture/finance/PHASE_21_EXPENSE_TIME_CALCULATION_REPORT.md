# Phase 21 — Extract Finance expense time calculation

## Escopo

Extraidas apenas as funcoes `expenseTimeOf(exp)` e `expenseHourOf(exp)` de
`assets/app.js` para
`app/Modules/Finance/Frontend/finance-expense-time-calculation.js` (fonte
canonica), publicadas byte-a-byte em
`assets/finance-expense-time-calculation.js`.

Nenhuma reformatacao, limpeza ou correcao de regra foi aplicada; o corpo das
funcoes foi copiado verbatim.

## Contratos tocados

- `assets/app.js`: remove a declaracao de `expenseTimeOf(exp)` e
  `expenseHourOf(exp)`; os pontos de chamada existentes permanecem
  inalterados, chamando os globais do jeito que sempre chamaram.
- `assets/app.js` continua declarando `pad()`; o novo asset o referencia em
  tempo de chamada via semantica de script classico (sem module, sem IIFE,
  sem captura antecipada).
- `index.php`: novo `<script>` para
  `assets/finance-expense-time-calculation.js` adicionado apos
  `finance-income-activation-calculation.js` e antes de `app.js`, seguindo a
  convencao existente de `?v=<?= @filemtime(...) ?>`.
- Nenhum outro arquivo de `allowedFiles` fora esses tres (mais o teste e este
  relatorio) foi alterado.

## Compatibilidade

- Nomes globais e assinaturas `expenseTimeOf(exp)` / `expenseHourOf(exp)`
  preservados.
- Precedencia de `exp.time` explicito sobre `exp.createdAt` preservada
  (checagem por truthiness, nao por presenca).
- `new Date(exp.createdAt)` continua usando `Date` local (sem normalizacao
  UTC), incluindo comportamento existente para datas malformadas
  (`NaN:NaN` via `pad(NaN)`).
- `pad()` continua resolvido em tempo de chamada de `expenseTimeOf()`
  (nao em tempo de carga do asset), recebendo `getHours()` e `getMinutes()`
  nesta ordem.
- Fallback `'12:00'` preservado quando `time` e `createdAt` sao ambos
  falsy.
- `expenseHourOf()` permanece exatamente
  `Number(expenseTimeOf(exp).split(':')[0])`.
- Edicao de despesa, heatmap, bucketing, extrato/CSV, DOM, lookups de conta
  e categoria, ocorrencia/agregacao de despesa, persistencia, OFX, mutacoes
  de conta e backend nao foram tocados.

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
node tests/js/finance_income_activation_calculation_test.js
node tests/js/finance_expense_time_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-expense-time-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-expense-time-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-expense-time-calculation.js
node --check assets/finance-expense-time-calculation.js
node --check tests/js/finance_expense_time_calculation_test.js
```

Resultado: passed=true, 19 checagens aprovadas. Hash de
`app/Modules/Finance/Frontend/finance-expense-time-calculation.js` e
`assets/finance-expense-time-calculation.js` confirmado identico.

O novo teste (`tests/js/finance_expense_time_calculation_test.js`) carrega o
asset publicado via `vm` e injeta um stub de `pad()` que registra chamadas,
cobrindo: precedencia de `time` explicito sobre `createdAt`; `time` vazio ou
ausente caindo para `createdAt`; fallback `'12:00'` quando ambos sao
falsy; `createdAt` valido usando `Date` local (`getHours`/`getMinutes`);
ordem e argumentos passados a `pad()`; resolucao de `pad()` em tempo de
chamada (nao em tempo de carga); `createdAt` malformado gerando
`'NaN:NaN'`; `expenseHourOf()` delegando para `expenseTimeOf()` com
`Number()` e `split(':')[0]`; e igualdade byte-a-byte entre o arquivo
canonico e o asset publico.

## Verificacao manual (browser)

Pendente: abrir a pagina Financeiro sem erros de console/undefined-function
e conferir horarios de despesa (edicao, heatmap, extrato) inalterados.

## Rollback

Reverter e so-codigo:

1. Restaurar a declaracao de `expenseTimeOf(exp)` e `expenseHourOf(exp)` em
   `assets/app.js` (antes de `const CATEGORIA_LABEL`, apos `parcelaLabel()`).
2. Remover a linha
   `<script src="assets/finance-expense-time-calculation.js...">` de
   `index.php`.
3. Apagar `app/Modules/Finance/Frontend/finance-expense-time-calculation.js`,
   `assets/finance-expense-time-calculation.js` e
   `tests/js/finance_expense_time_calculation_test.js`.

Sem schema, migration ou reparo de dados envolvido.
