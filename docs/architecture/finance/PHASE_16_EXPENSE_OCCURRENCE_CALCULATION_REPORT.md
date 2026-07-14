# Phase 16 — Extract Finance expense-occurrence calculations

## Scope

Extracted the four pure global calculation functions `clampDayOfMonth(year,
month, day)`, `expenseOccurrencesInRange(exp, range)`,
`expenseTotalInRange(exp, range)`, and `expenseOccurrenceEntries(expLines,
range)` from `assets/app.js` into a canonical module, published as a
byte-identical deployable asset, and loaded via classic `<script>` before
`app.js`. No bundler, no build step, no module system.

## Touched contracts

- `clampDayOfMonth(year, month, day)`, `expenseOccurrencesInRange(exp,
  range)`, `expenseTotalInRange(exp, range)`, and
  `expenseOccurrenceEntries(expLines, range)` — signatures, global
  availability, Date semantics, installment and monthly-recurrence rules,
  short-month clamping, the 600-month guard, Number coercion, and return
  shapes unchanged. Now defined in
  `app/Modules/Finance/Frontend/finance-expense-occurrence-calculation.js`
  (canonical) and `assets/finance-expense-occurrence-calculation.js`
  (deployable copy), instead of inline in `assets/app.js`.
- `index.php` — added one `<script>` tag for
  `assets/finance-expense-occurrence-calculation.js`, using the existing
  `filemtime()` cache-busting pattern, placed before the `assets/app.js`
  script tag so the four globals are defined when callers in `app.js` (e.g.
  `bucketPeriodTotals()`, rendering/totals code, and `clampDayOfMonth()`
  consumers such as credit-card due-date calculations) invoke them.
- `assets/app.js` — removed the four function bodies. All other functions
  in the same area (`parcelaLabel()`, `expenseTimeOf()`,
  `expenseHourOf()`, `bucketPeriodTotals()`, `clampRangeToToday()`,
  `prorateElapsed()`) are untouched and still call the extracted globals
  at runtime, after script load order guarantees they exist.

## Unchanged

- One-time (non-recurring, non-installment) expenses: only the expense's
  own date counts, and only if it falls within the inclusive
  `[range.start, range.end]` boundary.
- Monthly recurrence: one occurrence per month of the range, on the same
  day-of-month, clamped to the last day of shorter months, excluding any
  occurrence before the anchor date.
- Installments (`parcelas >= 2`): exactly `parcelas` monthly occurrences
  starting at the first installment's date, each clamped to the last day
  of shorter months, filtered to the requested range.
- The 600-iteration guard on the monthly-recurrence loop.
- `expenseTotalInRange()`'s occurrence-count × `Number(value||0)`
  computation, including falsy/missing/numeric-string value coercion.
- `expenseOccurrenceEntries()`'s skip of expenses without a date, input
  order preservation, per-expense occurrence order, original expense
  object identity in each `{ exp, date }` entry, and the flattened shape.
- Period selection, prorating, aggregation, projections, rendering/UI, DOM
  access, persistence, account movement, invoice payment, transfers,
  anomaly detection, income-regime calculations, OFX handling, and backend
  behavior — no changes.
- Deployment mechanism — still plain files served via FTPS, no build step.

## Compatibility evidence

- `app/Modules/Finance/Frontend/finance-expense-occurrence-calculation.js`
  and `assets/finance-expense-occurrence-calculation.js` contain the exact
  same four function bodies extracted verbatim from `assets/app.js`, with
  no logic changes.
- A SHA-256 comparison between both files is part of the required test
  suite (see below) and must stay a merge gate.

## Validation

Required commands (not executed by the assistant in this session — no
shell execution tool was available; must be run manually before merge):

```
C:\Users\Max\tools\php\php.exe tests\run.php
node tests/js/finance_account_movement_test.js
node tests/js/pay_fatura_account_test.js
node tests/js/account_transfer_test.js
node tests/js/ofx_import_confirmation_test.js
node tests/js/finance_anomaly_detection_test.js
node tests/js/finance_income_regime_calculation_test.js
node tests/js/finance_expense_occurrence_calculation_test.js
powershell.exe -NoProfile -NonInteractive -Command "$sourceHash = (Get-FileHash app/Modules/Finance/Frontend/finance-expense-occurrence-calculation.js -Algorithm SHA256).Hash; $assetHash = (Get-FileHash assets/finance-expense-occurrence-calculation.js -Algorithm SHA256).Hash; if ($sourceHash -ne $assetHash) { throw 'Frontend source and public asset differ.' }"
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check app/Modules/Finance/Frontend/finance-expense-occurrence-calculation.js
node --check assets/finance-expense-occurrence-calculation.js
node --check tests/js/finance_expense_occurrence_calculation_test.js
```

New focused characterization test
(`tests/js/finance_expense_occurrence_calculation_test.js`) covers:

- `clampDayOfMonth`: in-range day, common-February clamp (28), leap-February
  clamp (29), and 30-day-month clamp.
- `expenseOccurrencesInRange` one-time: in-range match, out-of-range empty
  result, missing-date empty result, and inclusive start/end boundaries.
- `expenseOccurrencesInRange` monthly recurrence: one occurrence per month,
  anchor-date exclusion for earlier months, short-month clamping across a
  Jan→Apr span, and non-`'mensal'` values falling back to one-time
  behavior.
- `expenseOccurrencesInRange` installments: N monthly occurrences from the
  first installment, short-month clamping, and range filtering.
- The 600-month guard, asserting the generated occurrence count never
  exceeds the guard.
- `expenseTotalInRange`: occurrence-count × value, missing-value coercion
  to zero, numeric-string coercion, and zero-occurrence total.
- `expenseOccurrenceEntries`: skipping dateless expenses, flattening in
  input/occurrence order across multiple expenses, and preserving the
  original expense object's identity in each entry.

Manual browser smoke test (must be performed manually, not run by the
assistant):

- Finance loads with no "clampDayOfMonth/expenseOccurrencesInRange/
  expenseTotalInRange/expenseOccurrenceEntries is not defined" or other
  undefined-function console errors.
- Expense totals, period breakdowns, and charts for one-time, recurring,
  and installment expenses are unchanged from before the extraction.
- Credit-card due-date calculations (a `clampDayOfMonth()` consumer outside
  the other three functions) remain unchanged.

## Rollback

Single code-only revert, no schema or data repair:

1. Restore the `clampDayOfMonth`, `expenseOccurrencesInRange`,
   `expenseTotalInRange`, and `expenseOccurrenceEntries` function bodies in
   `assets/app.js`.
2. Remove the `assets/finance-expense-occurrence-calculation.js`
   `<script>` tag from `index.php`.
3. Delete
   `app/Modules/Finance/Frontend/finance-expense-occurrence-calculation.js`
   and `assets/finance-expense-occurrence-calculation.js`.
4. Delete `tests/js/finance_expense_occurrence_calculation_test.js` and
   this report.
