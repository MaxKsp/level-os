# Phase 26 — Extract Finance invoice reminder calculation

## Scope

Extracted the invoice-due-date reminder calculation from `renderFinance()`
into `calculateInvoiceReminders(cartoes, now)`.

## Touched contracts

- New global `calculateInvoiceReminders(cartoes, now)` returns an array of
  `{ c, due, days }`, sorted ascending by `days`.
- Ignores cards without `vencimento` or with `Number(fatura||0) <= 0`.
- Normalizes `now` to a local midnight `todayD` via
  `new Date(now.getFullYear(), now.getMonth(), now.getDate())`.
- Uses `clampDayOfMonth(year, month, day)` (existing helper from
  `finance-expense-occurrence-calculation.js`) to build the due date for the
  current month, delegating instead of recalculating month-length clamping
  inline.
- Uses `dnum(d)` (existing helper defined in `assets/app.js`) to compare due
  date against today; if this month's due date has already passed
  (`dnum(due) < dnum(todayD)`), advances to next month and reclamps.
- `days = Math.round((due - todayD) / 86400000)`; only entries with
  `days <= 7` are included.
- `renderFinance()` now calls `calculateInvoiceReminders(cartoes, now)` and
  keeps the exact same `.map(...)` rendering (HTML, `esc()`, `fmtMoney()`,
  "vence hoje/amanhã/em N dias" text) unchanged.

## Files changed

- `app/Modules/Finance/Frontend/finance-invoice-reminder-calculation.js` (new, canonical)
- `assets/finance-invoice-reminder-calculation.js` (new, byte-identical public copy)
- `assets/app.js` (`renderFinance` now delegates to `calculateInvoiceReminders`; removed the now-unused local `todayD` and inline `reminders` build/sort)
- `index.php` (new classic script tag, after `finance-account-summary-calculation.js`, before `app.js`)
- `tests/js/finance_invoice_reminder_calculation_test.js` (new characterization tests)

## Dependency / load order

`calculateInvoiceReminders` references two globals it does not define:
`clampDayOfMonth` (from `finance-expense-occurrence-calculation.js`, loaded
earlier in `index.php`) and `dnum` (defined in `assets/app.js`, loaded after
this new script tag). This is safe because `calculateInvoiceReminders` is
only *called* later at runtime (inside `renderFinance()`, triggered after all
classic scripts have finished parsing and defining their top-level function
declarations) — not at script-load time. Same pattern already used by
`expenseOccurrencesInRange` in `finance-expense-occurrence-calculation.js`,
which also calls `dnum` despite `app.js` loading after it.

## Validation

- `node tests/js/finance_invoice_reminder_calculation_test.js`: 17 passed, 0 failed
  (empty list, missing vencimento, zero/negative fatura, due today/tomorrow/7d/8d,
  month rollover, year rollover, Feb common/leap clamp, short-month clamp,
  stable sort + reference preservation, non-mutation, delegation proof via
  stubbed `clampDayOfMonth`/`dnum`, byte equality).
- `node --check` on `assets/app.js`, canonical module, public asset, and test file: all passed.
- `C:/Users/Max/tools/php/php.exe -l index.php`: no syntax errors.
- SHA-256 of canonical vs. public asset: identical
  (`dd87f1589f950feb9412cce170e23fba258c18f9f5fb81aacb0255bd6099cce`).
- Phase 25 suite (`tests/js/finance_account_summary_calculation_test.js`): 13 passed, 0 failed (regression check).
- `C:/Users/Max/tools/php/php.exe tests/run.php`: 13 passed, 0 failed in the
  independent final audit. The earlier environment-specific MySQL failure did
  not reproduce and is not a remaining blocker.
- `git diff --check`: clean, no whitespace errors.
- `git status --short`: only allowed files touched (`assets/app.js`, `index.php`
  modified; the four new files under scope).

## Risks

- `{ c, due, days }` return shape is now an internal compatibility seam
  between the module and `renderFinance()`'s reminder rendering.
- Script ordering is load-bearing at call time: `calculateInvoiceReminders`
  depends on `clampDayOfMonth` and `dnum` both existing in global scope by
  the time `renderFinance()` first runs.
- Manual browser smoke test still pending before merge.

## Rollback

Code-only:

1. Restore the original inline `reminders` build (including local `todayD`)
   in `renderFinance()` (`assets/app.js`).
2. Remove the `finance-invoice-reminder-calculation.js` script tag from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-invoice-reminder-calculation.js`,
   `assets/finance-invoice-reminder-calculation.js`, and
   `tests/js/finance_invoice_reminder_calculation_test.js`.
4. Delete this report.

No data repair required.
