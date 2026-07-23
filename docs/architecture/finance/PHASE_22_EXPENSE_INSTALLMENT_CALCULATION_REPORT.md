# Phase 22 — Extract Finance expense installment calculation

## Scope

Extracted `parcelaLabel(exp, now)` from `assets/app.js` into the canonical
module `app/Modules/Finance/Frontend/finance-expense-installment-calculation.js`,
published as a byte-identical classic script at
`assets/finance-expense-installment-calculation.js`, loaded after
`assets/finance-expense-time-calculation.js` and before `assets/app.js`.

## Touched contracts

- Global function `parcelaLabel(exp, now)` — name, signature, and body
  unchanged (moved verbatim, no reformatting or logic change).
- Call site in `assets/app.js` (`e.parcelas>=2?parcelaLabel(e,now):''`)
  unchanged.
- `index.php` script order: new `<script>` tag added immediately after the
  existing `finance-expense-time-calculation.js` tag and before `app.js`,
  using the same `filemtime` cache-busting convention as siblings.

## Compatibility evidence

- Function body copied byte-for-byte from `assets/app.js` into the new
  canonical file; no cleanup, correction, or wrapping applied.
- Falsy `exp.parcelas`/`exp.date` still returns `''`.
- Date parsing unchanged: `new Date(exp.date+'T00:00:00')` (local time).
- Calendar-month arithmetic, one-based numbering, `Math.max`/`Math.min`
  clamping, string concatenation, and numeric coercion all preserved as-is.
- Malformed dates still propagate `NaN` into the label
  (`'parcela NaN/' + parcelas`), matching prior behavior.
- Canonical (`app/Modules/Finance/Frontend/...`) and public
  (`assets/...`) files are byte-identical.

## Validation

- Manual read-diff confirms `parcelaLabel` removed from `assets/app.js`
  with the call site untouched.
- Manual read-diff confirms canonical and public asset contents match
  exactly.
- All required commands executed this session. Result: **passed=true**,
  20 checks approved.

### Executed commands (this session)

```
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
node tests/js/finance_expense_installment_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-expense-installment-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-expense-installment-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-expense-installment-calculation.js
node --check assets/finance-expense-installment-calculation.js
node --check tests/js/finance_expense_installment_calculation_test.js
```

## Browser smoke status

Not performed in this session (no browser access). Manual check required:
load Finance screen, confirm no console/undefined-function errors, and
confirm installment labels ("parcela X/N") render unchanged on expenses
with `parcelas >= 2`.

## Risks

- Behavior verified by test execution this session (20/20 passed). Browser
  smoke still pending — see Browser smoke status.

## Rollback

Code-only, no data repair:

1. Restore `parcelaLabel(exp, now)` body into `assets/app.js` (before
   `CATEGORIA_LABEL`).
2. Remove the `finance-expense-installment-calculation.js` `<script>` tag
   from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-expense-installment-calculation.js`,
   `assets/finance-expense-installment-calculation.js`,
   `tests/js/finance_expense_installment_calculation_test.js`, and this
   report.
