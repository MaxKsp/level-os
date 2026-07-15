# Finance Migration Completion Report

## Status

The controlled Finance extraction roadmap (Phases 1-27) is complete.

The migration preserved the public HTTP, persistence, data-shape, and visual
contracts characterized in `FINANCE_BOUNDARIES.md`,
`FINANCE_PUBLIC_CONTRACTS.md`, and `FINANCE_COMPATIBILITY_MATRIX.md`.

## Delivered architecture

### Back end

`finance.php` remains the compatible facade and loads the extracted internal
modules under `app/Modules/Finance/`:

- relational read and write;
- legacy KV migration;
- Finance API save orchestration;
- combined bootstrap composition;
- auxiliary Finance KV persistence;
- OFX preview orchestration.

The public adapters remain at their original paths:

- `GET api/data.php?all=1`;
- `POST api/data.php`;
- `POST api/finance.php`;
- `POST api/import-ofx.php`.

### Front end

Finance mutations and calculations were extracted from `assets/app.js` into
small classic-script modules. `assets/app.js` remains responsible for the
existing UI, DOM access, global SPA state, formatting, and orchestration.

Fourteen calculation modules have canonical sources under
`app/Modules/Finance/Frontend/` and byte-identical public copies under
`assets/`. Earlier flow extractions remain public classic scripts for account
movement, invoice payment, account transfer, and final OFX confirmation.

`index.php` loads every dependency before `assets/app.js`. Helpers defined in
`assets/app.js` and referenced by earlier scripts are resolved at call time,
after all classic scripts have loaded.

## Preserved contracts

- Public endpoint paths, authentication, CSRF, rate limits, and OFX plan gate.
- Relational keys: `expense_lines_v4`, `income_lines`, `ifood-entries`, and
  `accounts_v2`.
- Auxiliary Finance KV keys and combined bootstrap behavior.
- Public array shapes, string client IDs, and physical `ORDER BY id` ordering.
- Full-set replacement semantics in Finance persistence.
- OFX as preview-only on the server, with final persistence controlled by the
  client.
- Current rendering, text, formatting, account/card behavior, calculations,
  mutation ordering, and rollback/undo behavior characterized by the phase
  tests.

## Final audit evidence

The independent read-only audit completed with a clean working tree before
this documentation update:

- 18 JavaScript test files passed;
- 13 PHP test cases passed;
- PHP lint passed for the public adapters, facade, and extracted PHP modules;
- `node --check` passed for the 19 relevant application/module scripts;
- all 21 scripts referenced by `index.php` existed;
- all 14 canonical/public calculation pairs were byte-identical;
- 130 loaded global function definitions were unique;
- no missing extracted-function reference or invalid load-order dependency was
  found;
- `git diff --check` was clean.

## Residual risks and follow-up

- `assets/app.js` still contains an unused calculation chain at the beginning
  of `renderFinance()` (`incomeFromLines`, `income`, `outflow`, `saldo`, and a
  local `hasVariableIncome`). Its removal is intentionally excluded from this
  documentation closure and requires a separate tested cleanup.
- Classic-script global scope and load order remain intentional compatibility
  constraints. Converting these files to ES modules requires a separate
  migration.
- Full-set replacement and mixed relational/KV bootstrap behavior remain
  preserved legacy contracts, not newly recommended designs.

## Authenticated browser smoke test

The final authenticated browser smoke test passed on 2026-07-15. It covered:

- Finance boot without application errors or missing script requests;
- account summary, end-of-month projection, and invoice reminders;
- account grouping, expenses, income, transfers, and invoice payment;
- OFX preview/import with the local paid-plan gate enabled;
- CSV export after financial entries existed;
- annual report generation.

`tests/fixtures/manual-smoke-2026-07-15.ofx` is retained as the reusable manual
fixture for OFX smoke testing. It contains three expenses and two income rows
with unique FITIDs and is accepted by the current project parser.

## Rollback strategy

Each numbered phase report contains its local rollback procedure. Prefer
reverting the smallest responsible phase commit instead of reverting the
entire roadmap. Backend public adapters and `finance.php` remain stable
facades, while frontend rollback requires restoring the corresponding inline
block and removing its script tag/module pair.

No schema or data repair is required for the frontend extraction phases.

## Completion decision

No additional extraction phase is required for this roadmap. Automated and
manual operational validation are complete. Remaining work is optional
dead-code cleanup and integration into the target branch.
