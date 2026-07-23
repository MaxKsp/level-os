# Phase 24 — Extract Finance category key calculation

## Scope

Extracted `catSlug(name)` from `assets/app.js` into a canonical Finance
frontend source, published as a byte-identical classic-script asset, and
wired into `index.php` load order. No other behavior touched.

## Touched contracts

- `catSlug(name)` remains a classic-script global with the same name and
  one-argument signature.
- Exact expression preserved: `(name||'').toLowerCase().normalize('NFD')`,
  combining-mark removal, non-ASCII-alphanumeric run replacement with `_`,
  leading/trailing underscore trim, 40-character truncation, and the
  `'cat'+Date.now()` fallback when the result is empty.
- All existing call sites in `assets/app.js` unchanged.

## Files changed

- `app/Modules/Finance/Frontend/finance-category-key-calculation.js` (new,
  canonical source)
- `assets/finance-category-key-calculation.js` (new, byte-identical public
  asset)
- `assets/app.js` (removed the `catSlug` definition only)
- `index.php` (added script tag after
  `assets/finance-account-type-calculation.js`, before `assets/app.js`,
  using the existing `filemtime` cache-busting convention)
- `tests/js/finance_category_key_calculation_test.js` (new, characterization
  coverage)

## Load order

```
finance-account-type-calculation.js
finance-category-key-calculation.js   <- new
app.js
```

## Validation

Automated tests/lint were written per the approved plan but could not be
executed in this session — no shell/process-execution tool was available.
The following commands must be run manually before merge:

```
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-category-key-calculation.js
node --check assets/finance-category-key-calculation.js
node --check tests/js/finance_category_key_calculation_test.js
C:\Users\Max\tools\php\php.exe -l index.php
node tests/js/finance_category_key_calculation_test.js
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
node tests/js/finance_account_type_calculation_test.js
C:\Users\Max\tools\php\php.exe tests\run.php
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-category-key-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-category-key-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
```

Canonical source and public asset were written with identical content in
this session (same tool, same call), so they are expected to be
byte-identical; this must still be confirmed with the hash check above.

## Browser smoke (manual, still required)

Load Finance, confirm no console/undefined-function errors, and exercise
custom-category creation including input that fully strips to empty
(fallback-producing input).

## Risks

- Script ordering is load-bearing; verified by direct inspection of
  `index.php`.
- Canonical/asset drift risk mitigated by identical write + hash-check
  requirement above.
- `catSlug` does not coerce truthy non-string inputs lacking `toLowerCase`;
  this failure behavior was preserved unchanged and is covered by
  characterization tests.

## Rollback

Code-only:

1. Restore the `catSlug` definition in `assets/app.js` (immediately before
   `allCategories`).
2. Remove the new `<script>` tag from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-category-key-calculation.js`,
   `assets/finance-category-key-calculation.js`, and
   `tests/js/finance_category_key_calculation_test.js`.
4. Delete this report.

No data repair required.
