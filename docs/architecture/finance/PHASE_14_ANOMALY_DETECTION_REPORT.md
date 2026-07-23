# Phase 14 — Extract Finance anomaly detection

## Scope

Extracted the pure global `detectAnomalies(expLines, now)` calculation from
`assets/app.js` into a canonical module, published as a byte-identical
deployable asset, and loaded via classic `<script>` before `app.js`. No
bundler, no build step, no module system.

## Touched contracts

- `detectAnomalies(expLines, now)` — signature, global availability,
  calculation order, thresholds, and return shape unchanged. Now defined in
  `app/Modules/Finance/Frontend/finance-anomaly-detection.js` (canonical) and
  `assets/finance-anomaly-detection.js` (deployable copy), instead of inline
  in `assets/app.js`.
- `index.php` — added one `<script>` tag for
  `assets/finance-anomaly-detection.js`, using the existing
  `filemtime()` cache-busting pattern, placed before the `assets/app.js`
  script tag so `detectAnomalies` is defined when `renderAnomalies` calls it.
- `assets/app.js` — removed the `detectAnomalies` function body, replaced
  with a comment pointing to the new files. `renderAnomalies`, anomaly
  dismissal (`anomaly_dismissed` via `storeGet`/`storeSet`), DOM rendering,
  and the click handlers for dismiss/edit are untouched.

## Unchanged

- Historical baseline: only positive, dated expenses from months strictly
  before the current month, grouped by `categoria`.
- Detection requires history length >= 4, `value >= 30`,
  `value >= mean * 1.5`, and `value > mean + 2 * population standard
  deviation`.
- Result shape: `{ e, mean, pct }`, with `e` the original expense object
  reference, sorted descending by `e.value`.
- `renderAnomalies`, dismissal persistence, endpoints, expense data shapes,
  and rendering markup — no changes.
- Deployment mechanism — still plain files served via FTPS, no build step.

## Compatibility evidence

- `app/Modules/Finance/Frontend/finance-anomaly-detection.js` and
  `assets/finance-anomaly-detection.js` contain the exact same
  `detectAnomalies` source extracted verbatim from `assets/app.js`, with no
  logic changes.
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
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-anomaly-detection.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-anomaly-detection.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-anomaly-detection.js
node --check assets/finance-anomaly-detection.js
node --check tests/js/finance_anomaly_detection_test.js
```

New focused characterization test (`tests/js/finance_anomaly_detection_test.js`)
covers:

- Insufficient history (< 4 entries).
- Prior/current/future-month filtering of the historical baseline.
- Nonpositive-value and undated expenses excluded from history and
  detection.
- Category isolation of both baseline and detection.
- The `value >= 30` boundary (29 rejected, 30 accepted).
- The `value >= mean * 1.5` boundary.
- The `value > mean + 2*std` boundary (at threshold rejected, one above
  accepted).
- Zero standard deviation (constant history) still detects above 1.5x.
- Percentage rounding in the `pct` field.
- Exact `{ e, mean, pct }` result shape.
- Original expense object identity preserved as `e`.
- Descending sort by value, including ties.

Manual browser smoke test (must be performed manually, not run by the
assistant):

- Finance loads with no "detectAnomalies is not defined" or other
  undefined-function console errors.
- Anomaly banner renders unchanged for a month with qualifying expenses.
- Dismissing the banner persists for the current month
  (`anomaly_dismissed`), and no anomaly reappears until the month changes.

## Rollback

Single code-only revert, no schema or data repair:

1. Restore the `detectAnomalies` function body in `assets/app.js` (replace
   the pointer comment).
2. Remove the `assets/finance-anomaly-detection.js` `<script>` tag from
   `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-anomaly-detection.js` and
   `assets/finance-anomaly-detection.js`.
4. Delete `tests/js/finance_anomaly_detection_test.js` and this report.
