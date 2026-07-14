# Phase 23 — Extract Finance account type calculation

## Scope

Extracted `isContaLike(a)` from `assets/app.js` into a Finance frontend
canonical source, published as a byte-identical classic-script asset, loaded
after the existing Finance calculation scripts and before `assets/app.js`.

## Touched contracts

- `isContaLike(a)` — global function, name and signature unchanged:
  `function isContaLike(a){ return a.tipo !== 'cartao'; }`.
- Comparison stays a strict `!==` against the exact lowercase string
  `'cartao'`.
- `conta`, `poupanca`, missing `tipo`, unknown values, `null`-valued `tipo`,
  differently cased strings (e.g. `'Cartao'`), and non-string `tipo` values
  all remain account-like (`true`).
- `null`/`undefined` account argument still throws `TypeError` (property
  access on `null`/`undefined`).
- Still directly usable as a callback for `Array.prototype.filter` and
  `Array.prototype.some` (all existing call sites in `assets/app.js` at
  lines 1264, ~1730, 1840, 2242, 2309, 2312 unchanged).

## Files changed

- `app/Modules/Finance/Frontend/finance-account-type-calculation.js` (new,
  canonical source).
- `assets/finance-account-type-calculation.js` (new, byte-identical public
  asset).
- `assets/app.js` (removed the `isContaLike` definition; no call sites
  modified).
- `index.php` (added script tag after
  `assets/finance-expense-installment-calculation.js` and before
  `assets/app.js`, following the existing `filemtime` cache-busting
  convention).
- `tests/js/finance_account_type_calculation_test.js` (new characterization
  tests).

## Compatibility evidence

- No `isContaLike` implementation remains in `assets/app.js`.
- Canonical source and public asset are byte-for-byte identical (verified by
  `Buffer.compare` in the test suite and by the required `Get-FileHash`
  check).
- Script tag ordering places the new asset after all current Finance
  calculation scripts and before `assets/app.js`, matching the deployment
  pattern of every prior extraction in this series.

## Validation executed

- `C:\Users\Max\tools\php\php.exe tests\run.php`.
- `node tests/js/finance_account_movement_test.js`.
- `node tests/js/pay_fatura_account_test.js`.
- `node tests/js/account_transfer_test.js`.
- `node tests/js/ofx_import_confirmation_test.js`.
- `node tests/js/finance_anomaly_detection_test.js`.
- `node tests/js/finance_income_regime_calculation_test.js`.
- `node tests/js/finance_expense_occurrence_calculation_test.js`.
- `node tests/js/finance_annual_ir_calculation_test.js`.
- `node tests/js/finance_period_calculation_test.js`.
- `node tests/js/finance_expense_aggregation_calculation_test.js`.
- `node tests/js/finance_income_activation_calculation_test.js`.
- `node tests/js/finance_expense_time_calculation_test.js`.
- `node tests/js/finance_expense_installment_calculation_test.js`.
- `node tests/js/finance_account_type_calculation_test.js`.
- SHA-256 hash equality check between
  `app/Modules/Finance/Frontend/finance-account-type-calculation.js` and
  `assets/finance-account-type-calculation.js` (PowerShell `Get-FileHash`).
- `C:\Users\Max\tools\php\php.exe -l index.php`.
- `node --check assets/app.js`.
- `node --check app/Modules/Finance/Frontend/finance-account-type-calculation.js`.
- `node --check assets/finance-account-type-calculation.js`.
- `node --check tests/js/finance_account_type_calculation_test.js`.

Result: passed=true, 21 checks approved.

## Browser smoke status

Not executed in this session (no browser available). Manual smoke
recommended before merge: load the Finance screen, confirm no console or
undefined-function errors, and verify account/card grouping and selectors
remain unchanged.

## Risks

- Script tag order is load-bearing: if misplaced, `isContaLike` would be
  undefined when `assets/app.js` executes or when its filter/some callbacks
  run. Order was verified against `index.php`.
- Canonical file and deployed copy can diverge; byte-equality is enforced by
  an automated test and the required hash check.
- This phase intentionally preserves the existing rule that any `tipo`
  other than the exact lowercase string `'cartao'` is treated as
  account-like, including malformed values. Correcting that rule is out of
  scope.

## Rollback

Code-only, no data repair required:

1. Restore `function isContaLike(a){ return a.tipo !== 'cartao'; }  //
   corrente e poupança` in `assets/app.js` (immediately after
   `accTipoLabel`).
2. Remove the `assets/finance-account-type-calculation.js` script tag from
   `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-account-type-calculation.js`,
   `assets/finance-account-type-calculation.js`,
   `tests/js/finance_account_type_calculation_test.js`, and this report.
