# Phase 27 — Extract Finance end-of-month balance projection calculation

## Scope

Extracted the end-of-month balance projection calculation from
`renderFinance()` into `calculateEndOfMonthProjection(saldoTotal, incLines,
expLines, now)`.

## Touched contracts

- New global `calculateEndOfMonthProjection(saldoTotal, incLines, expLines,
  now)` returns `{ today, endMonth, remRange, aReceber, aPagar, projetado }`.
- `today = now.getDate()`; `endMonth = new Date(now.getFullYear(),
  now.getMonth()+1, 0)` (last day of current month).
- `remRange.start = addDays(new Date(now.getFullYear(), now.getMonth(),
  today), 1)` (tomorrow, local midnight); `remRange.end = endMonth`.
- `aReceber` sums `Number(l.value||0)` over `incLines` where
  `isIncomeActive(l, now)` is true and `l.payday` is truthy and
  `l.payday >= today`.
- `aPagar` is `0` without calling `expenseTotalInRange` when
  `today >= endMonth.getDate()` (last day of the month); otherwise it sums
  `expenseTotalInRange(e, remRange)` over all `expLines`.
- `projetado = saldoTotal + aReceber - aPagar`, with no additional coercion
  applied to `saldoTotal` (preserves the original `+`/`-` JS coercion
  behavior, including the string-concatenation quirk when `saldoTotal` is a
  string).
- `renderFinance()` now destructures `{ aReceber, aPagar, projetado }` from
  the new function instead of computing them inline. `projBox` HTML, texts,
  classes, `fmtMoney()` calls, and the `contas.length===0` empty-state branch
  are unchanged.
- Delegates to existing helpers instead of recalculating: `addDays` (defined
  in `assets/app.js`), `isIncomeActive` (from
  `finance-income-activation-calculation.js`), and `expenseTotalInRange`
  (from `finance-expense-occurrence-calculation.js`).

## Files changed

- `app/Modules/Finance/Frontend/finance-end-of-month-projection-calculation.js` (new, canonical)
- `assets/finance-end-of-month-projection-calculation.js` (new, byte-identical public copy)
- `assets/app.js` (`renderFinance` now delegates to `calculateEndOfMonthProjection`; removed the inline `today`/`endMonth`/`remRange`/`aReceber`/`aPagar`/`projetado` block)
- `index.php` (new classic script tag, after `finance-invoice-reminder-calculation.js`, before `app.js`)
- `tests/js/finance_end_of_month_projection_calculation_test.js` (new characterization tests)

## Dependency / load order

`calculateEndOfMonthProjection` references `addDays`, defined in
`assets/app.js`, which loads *after* this new script tag in `index.php`. This
is safe for the same reason as Phase 26's `dnum`/`clampDayOfMonth`
dependency: the function is only *called* later at runtime (inside
`renderFinance()`, after all classic scripts have finished parsing and
defining their top-level function declarations), not at script-load time.

## Validation

- `node tests/js/finance_end_of_month_projection_calculation_test.js`: 26 passed, 0 failed
  (empty lists, positive/negative/string saldoTotal, active/inactive income
  types, payday absent/before/equal/after today, `Number(value||0)`
  coercion, one-off and monthly-recurring expenses, last-day-of-month
  short-circuit, month/year rollover, leap/common February, remRange
  start/end shape, non-mutation, delegation proof via stubbed
  `addDays`/`isIncomeActive`/`expenseTotalInRange`, zero-calls proof on the
  last day, byte equality).
- `node tests/js/finance_invoice_reminder_calculation_test.js` (Phase 26 regression): 17 passed, 0 failed.
- `node tests/js/finance_account_summary_calculation_test.js` (Phase 25 regression): 13 passed, 0 failed.
- `node --check` on `assets/app.js`, canonical module, public asset, and test file: all passed.
- `C:\Users\Max\tools\php\php.exe -l index.php`: no syntax errors.
- SHA-256 of canonical vs. public asset: identical
  (`dcbbde3a38098e70ea1c45845ec4e12fa0c41a220cc41e312d392e096c0c4662`).
- `git diff --check`: clean, no whitespace errors.
- `git status --short`: only the six allowed files touched (`assets/app.js`,
  `index.php` modified; four new files, including this report).
- `C:\Users\Max\tools\php\php.exe tests\run.php`: could not run to
  completion — MySQL is unreachable in this environment (confirmed via a
  standalone PDO connection check, `SQLSTATE[HY000] [2002]`), so the 13
  DB-backed cases hang retrying the connection. Same environmental blocker
  already noted in the Phase 26 report. This phase touches no PHP/DB code
  (only a JS module, `assets/app.js`, and one `index.php` script tag), so
  `php -l index.php` plus the JS suites stand in as the available
  validation.

## Risks

- `{ today, endMonth, remRange, aReceber, aPagar, projetado }` return shape
  is now an internal compatibility seam between the module and
  `renderFinance()`.
- Script ordering is load-bearing at call time: `calculateEndOfMonthProjection`
  depends on `addDays`, `isIncomeActive`, and `expenseTotalInRange` all
  existing in global scope by the time `renderFinance()` first runs.
- `tests/run.php` could not be exercised end-to-end in this environment due
  to the pre-existing MySQL connectivity blocker; PHP-side regression
  coverage for this phase is therefore limited to `php -l`.
- Manual browser smoke test still pending before merge.

## Rollback

Code-only:

1. Restore the original inline `today`/`endMonth`/`remRange`/`aReceber`/
   `aPagar`/`projetado` block in `renderFinance()` (`assets/app.js`).
2. Remove the `finance-end-of-month-projection-calculation.js` script tag
   from `index.php`.
3. Delete `app/Modules/Finance/Frontend/finance-end-of-month-projection-calculation.js`,
   `assets/finance-end-of-month-projection-calculation.js`, and
   `tests/js/finance_end_of_month_projection_calculation_test.js`.
4. Delete this report.

No data repair required.
