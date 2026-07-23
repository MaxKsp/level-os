# Phase 15 — Extract Finance income-regime calculations

## Scope

Extracted the four pure global calculation functions `calcINSS(gross)`,
`irrfFromBase(base)`, `computeCLT(p)`, and `computePJ(p)` from
`assets/app.js` into a canonical module, published as a byte-identical
deployable asset, and loaded via classic `<script>` before `app.js`. No
bundler, no build step, no module system.

## Touched contracts

- `calcINSS(gross)`, `irrfFromBase(base)`, `computeCLT(p)`, `computePJ(p)` —
  signatures, global availability, 2025 bracket tables, operation order,
  Number coercion, and return shapes unchanged. Now defined in
  `app/Modules/Finance/Frontend/finance-income-regime-calculation.js`
  (canonical) and `assets/finance-income-regime-calculation.js` (deployable
  copy), instead of inline in `assets/app.js`.
- `index.php` — added one `<script>` tag for
  `assets/finance-income-regime-calculation.js`, using the existing
  `filemtime()` cache-busting pattern, placed before the `assets/app.js`
  script tag so the four globals are defined when `recalcRegime()` calls
  them.
- `assets/app.js` — removed the four function bodies, replaced with a
  comment pointing to the new files. `recalcRegime()`, `cltParamsFromForm()`,
  `pjParamsFromForm()`, DOM rendering, event handling, and income
  persistence are untouched.

## Unchanged

- INSS progressive brackets (1518/2793.88/4190.83/8157.41 at
  7.5%/9%/12%/14%) and cap at 8157.41.
- IRRF monthly brackets and deductions (2259.20/2826.65/3751.05/4664.68/∞ at
  0%/7.5%/15%/22.5%/27.5% with deductions 0/169.44/381.44/662.77/896.00).
- CLT calculation: overtime (50%/100%), dependent deduction (189.59/dep),
  simplified-vs-legal IRRF base comparison (`Math.min`), FGTS (8%), décimo,
  férias, and all discount fields.
- PJ calculation: percentage tax on gross, convênio and other discounts.
- `recalcRegime()`, form parameter collection, rendering markup,
  persistence, endpoints, and all other Finance behavior — no changes.
- Deployment mechanism — still plain files served via FTPS, no build step.

## Compatibility evidence

- `app/Modules/Finance/Frontend/finance-income-regime-calculation.js` and
  `assets/finance-income-regime-calculation.js` contain the exact same four
  function bodies extracted verbatim from `assets/app.js`, with no logic
  changes.
- A SHA-256 comparison between both files is part of the required test
  suite (see below) and must stay a merge gate.

## Validation

Required commands (not executed by the assistant in this session — no shell
execution tool was available; must be run manually before merge):

```
C:\Users\Max\tools\php\php.exe tests\run.php
node tests/js/finance_account_movement_test.js
node tests/js/pay_fatura_account_test.js
node tests/js/account_transfer_test.js
node tests/js/ofx_import_confirmation_test.js
node tests/js/finance_anomaly_detection_test.js
node tests/js/finance_income_regime_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-income-regime-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-income-regime-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-income-regime-calculation.js
node --check assets/finance-income-regime-calculation.js
node --check tests/js/finance_income_regime_calculation_test.js
```

New focused characterization test
(`tests/js/finance_income_regime_calculation_test.js`) covers:

- `calcINSS`: each bracket boundary, progressive accumulation, cap
  enforcement above the ceiling, and negative-input clamping to zero.
- `irrfFromBase`: the exempt bracket, each subsequent bracket boundary, the
  final open-ended bracket, and the non-negative result floor.
- `computeCLT`: baseline with no overtime/discounts, overtime 50%/100%
  computation, dependent deduction effect on the IRRF base, convênio/other
  discounts reducing `liquido`, missing-field coercion to zero, numeric
  string coercion, and the exact set of returned keys.
- `computePJ`: basic percentage tax, convênio/other discounts, missing-field
  coercion to zero, numeric string coercion, and the exact set of returned
  keys.

Manual browser smoke test (must be performed manually, not run by the
assistant):

- Finance loads with no "calcINSS/irrfFromBase/computeCLT/computePJ is not
  defined" or other undefined-function console errors.
- Switching the income regime selector to CLT and to PJ and adjusting form
  fields recalculates and renders unchanged results.
- Displayed and persisted income values are unchanged from before the
  extraction.

## Rollback

Single code-only revert, no schema or data repair:

1. Restore the `calcINSS`, `irrfFromBase`, `computeCLT`, and `computePJ`
   function bodies in `assets/app.js` (replace the pointer comment).
2. Remove the `assets/finance-income-regime-calculation.js` `<script>` tag
   from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-income-regime-calculation.js`
   and `assets/finance-income-regime-calculation.js`.
4. Delete `tests/js/finance_income_regime_calculation_test.js` and this
   report.
