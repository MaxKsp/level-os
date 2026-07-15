# Phase 25 — Extract Finance account summary calculation

## Scope

Extracted account classification and summary arithmetic from `renderFinance()`
into `calculateAccountSummary(accounts)`.

## Touched contracts

- New global `calculateAccountSummary(accounts)` returns
  `{ contas, cartoes, saldoTotal, faturaTotal, patrimonio, creditoCartoes,
  chequeUsadoTotal, chequeDisp, creditoDisp, overdraft }`.
- `renderFinance()` destructures the fields it uses from the new function
  instead of computing them inline. Rendering, DOM access, formatting,
  projections, invoice reminders, and overdraft alert output are unchanged.
- `isContaLike()` delegation preserved; card classification stays a strict
  `tipo === 'cartao'` check.
- `Number(value||0)` coercion, negative-balance handling, `Math.max(0, ...)`
  clamping for card credit and cheque especial, and overdraft account order/
  references are preserved exactly (no sort, no clone, no mutation).

## Files changed

- `app/Modules/Finance/Frontend/finance-account-summary-calculation.js` (new, canonical)
- `assets/finance-account-summary-calculation.js` (new, byte-identical public copy)
- `assets/app.js` (renderFinance now delegates to calculateAccountSummary)
- `index.php` (new classic script tag, after Finance calculation assets, before app.js)
- `tests/js/finance_account_summary_calculation_test.js` (new characterization tests)

## Validation

- Byte-for-byte diff of canonical vs. public asset: identical (verified by
  `Get-FileHash` SHA-256 comparison, matching hashes).
- Manual review confirms script load order in `index.php`: existing Finance
  calculation assets → `finance-account-summary-calculation.js` → `app.js`,
  matching `isContaLike()` dependency ordering.
- Full PHP test suite (`tests\run.php`) and all 15 finance/account JS test
  files executed and passed, including
  `finance_account_summary_calculation_test.js`.
- `php -l` on `index.php` and `node --check` on `app.js`,
  `finance-account-summary-calculation.js` (canonical and public copy), and
  `finance_account_summary_calculation_test.js`: all passed.
- 23 approved checks run, all passed (`passed=true`). No manual browser smoke
  test performed as part of this validation pass.

## Risks

- Returned property names of `calculateAccountSummary()` are now an internal
  compatibility seam between the module and `renderFinance()`.
- Script ordering is load-bearing (`calculateAccountSummary` depends on
  `isContaLike`, `app.js` depends on `calculateAccountSummary`).
- Manual browser smoke test still pending before merge.

## Rollback

Code-only:

1. Restore the original inline calculation block in `renderFinance()`
   (`assets/app.js`).
2. Remove the `finance-account-summary-calculation.js` script tag from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-account-summary-calculation.js`,
   `assets/finance-account-summary-calculation.js`, and
   `tests/js/finance_account_summary_calculation_test.js`.
4. Delete this report.

No data repair required.
