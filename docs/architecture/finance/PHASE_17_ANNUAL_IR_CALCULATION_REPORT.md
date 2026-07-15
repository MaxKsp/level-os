# Phase 17 — Extract Finance annual IR calculations

## Scope

Extracted `irMonthRange(year, m)` and `buildIrData(year, expLines, incLines, entries)`
from `assets/app.js` into `app/Modules/Finance/Frontend/finance-annual-ir-calculation.js`
(canonical source), published byte-identical at
`assets/finance-annual-ir-calculation.js`, loaded as a classic script in
`index.php` after `finance-expense-occurrence-calculation.js` and before
`assets/app.js`.

`renderIrReport()` and everything else in the IR report block (DOM rendering,
printing, account loading) stays in `assets/app.js` unchanged.

## Touched contracts

- Both functions remain global, same names, same signatures, same bodies
  (verbatim copy, no reformatting).
- `buildIrData` still depends on globals defined elsewhere in classic-script
  load order: `expenseTotalInRange`, `isIncomeActive` (available before use),
  `pad`, `MONTH_ABBR` (declared later in `assets/app.js` but only referenced
  at call time inside `renderIrReport`, after all scripts have loaded).
- Return shape unchanged: `{ months, catTotals, annualExp, annualInc,
  incFixed, incVar, incTemp, incIfood }`, with `months` as a 12-entry array
  `{ label, inc, exp, saldo }` in Jan-Dez order.

## Compatibility evidence

- Diff against `assets/app.js` removes only the two function bodies; the
  preceding comment banner and `renderIrReport` are untouched.
- `app/Modules/Finance/Frontend/finance-annual-ir-calculation.js` and
  `assets/finance-annual-ir-calculation.js` are byte-for-byte identical
  (verified by the SHA-256 gate in `jsTests`).
- `index.php` loads the new script once, after
  `finance-expense-occurrence-calculation.js` and before `assets/app.js`,
  using the existing `filemtime` cache-busting convention.

## Validation commands

```bash
C:/Users/Max/tools/php/php.exe tests/run.php
node tests/js/finance_account_movement_test.js
node tests/js/pay_fatura_account_test.js
node tests/js/account_transfer_test.js
node tests/js/ofx_import_confirmation_test.js
node tests/js/finance_anomaly_detection_test.js
node tests/js/finance_income_regime_calculation_test.js
node tests/js/finance_expense_occurrence_calculation_test.js
node tests/js/finance_annual_ir_calculation_test.js
C:/Users/Max/tools/php/php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-annual-ir-calculation.js
node --check assets/finance-annual-ir-calculation.js
node --check tests/js/finance_annual_ir_calculation_test.js
```

PowerShell SHA-256 equality gate:

```powershell
$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-annual-ir-calculation.js -Algorithm SHA256).Hash
$assetHash = (Get-FileHash assets/finance-annual-ir-calculation.js -Algorithm SHA256).Hash
if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }
```

## Manual browser checks

- Finance page loads with no undefined-function console errors.
- Generate annual IR report for a year with recurring expenses, installment
  expenses, income created mid-year, temporary income with an end date, and
  iFood entries: totals, category breakdown, and month-by-month
  income/expense/saldo match pre-change output.
- Report rendering and print flow still work.

## Rollback

Single code-only revert:

1. Restore both function bodies in `assets/app.js` (before `renderIrReport`).
2. Remove the new `<script>` tag from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-annual-ir-calculation.js`,
   `assets/finance-annual-ir-calculation.js`, and
   `tests/js/finance_annual_ir_calculation_test.js`.

No schema or data repair needed.
