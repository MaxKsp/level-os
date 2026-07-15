# Finance Render Dead Code Cleanup Report

## Objective

Remove declarations that became unused in `renderFinance()` after the Finance calculation logic was extracted into dedicated modules, without changing public contracts or runtime output.

## Changes

Removed five dead declarations from the beginning of `renderFinance()` in `assets/app.js`:

- `incomeFromLines`
- `income`
- `outflow`
- `saldo`
- the duplicated local `hasVariableIncome`

Added `tests/js/finance_render_dead_code_test.js` to verify the removals and protect the surrounding contracts.

## Preserved Contracts

The cleanup preserves:

- `mk` and `monthEntries` initialization;
- `ifoodTotal` calculation;
- the `ifoodTotal` argument passed to `renderDashCharts()`;
- the valid `hasVariableIncome` declaration inside `renderDashCharts()`;
- existing data fetches, rendering flow, APIs, and public function signatures.

The removed values had no consumers. Their removal therefore eliminates redundant calculations without changing observable behavior.

## Validation

- `tests/js/finance_render_dead_code_test.js`: 11 passed, 0 failed;
- all 19 `tests/js/*_test.js` files passed;
- `php tests/run.php`: 13 passed, 0 failed;
- `node --check assets/app.js`: passed;
- `git diff --check`: passed.

The `SQLSTATE ... boom` lines emitted by the PHP suite are expected logs from simulated error cases; the suite completed with 13/13 passing.

## Risk and Rollback

Risk is low because only unused local declarations were removed. Rollback consists of restoring the five declarations and removing the dedicated regression test and this report.
