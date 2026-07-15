# Definition Of Done

## Purpose

A task is done only when the implementation, validation, and review state are
complete for its risk level.

## Universal Done Criteria

All tasks must satisfy:

- scope matches the request
- no unintended production changes
- documentation is updated when the working model changes
- validation was performed and reported honestly
- rollback path is understood

## Done Criteria By Change Type

### Documentation-only work

- files are created or updated in the correct place
- links resolve
- architecture docs are referenced instead of duplicated
- `git diff --stat` is reviewed

### Small internal refactor

- behavior preserved
- focused validation completed
- no public contracts changed
- review confirms rollback safety

### Contract-sensitive change

- characterization or compatibility coverage exists first
- tests pass
- manual validation steps are identified or executed
- risks are explicitly documented

### Migration extraction

- phase is correct
- boundary is documented
- legacy facade remains compatible
- new code lives in `app/`
- rollback is simple
- review confirms that public behavior is unchanged

## Test Policy

Use the minimum test level that honestly protects the change.

### Required test levels

- docs-only: no code tests required
- isolated PHP behavior: lint and focused test when feasible
- migration seam: characterization tests strongly preferred
- public contract or critical area: focused automated coverage plus manual
  review of the affected flow

## Manual Validation Policy

Manual validation is required when automation does not fully cover:

- browser interaction
- SPA boot behavior
- auth/session behavior
- payment/plan gates
- compatibility of mixed legacy + new internal flows

## Not Done Yet

A task is not done if:

- tests were skipped without explanation
- review found unresolved mandatory issues
- scope drift remains in the diff
- rollback is unclear
- permanent process or architecture changed without doc update
