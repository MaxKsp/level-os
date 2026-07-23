# Development Playbook

## Purpose

This directory is the permanent execution guide for day-to-day development in
Level OS.

It does not replace the architecture docs. It tells contributors and AI agents
how to work on the project without re-explaining the same context in every
prompt.

Architecture sources of truth:

- [MASTER_REFACTOR_PLAN.md](../architecture/MASTER_REFACTOR_PLAN.md)
- [MIGRATION_PHASES.md](../architecture/MIGRATION_PHASES.md)
- [MIGRATION_RULES.md](../architecture/MIGRATION_RULES.md)
- [LEGACY_BOUNDARIES.md](../architecture/LEGACY_BOUNDARIES.md)
- [PUBLIC_CONTRACTS.md](../architecture/PUBLIC_CONTRACTS.md)
- [Finance docs](../architecture/finance/)

## Official Flow

`Architecture -> Implementation -> Tests -> Review -> Commit`

This order is mandatory for any non-trivial change.

### 1. Architecture

Use this step when the work affects boundaries, contracts, modules, legacy
files, migrations, or critical flows.

Minimum check:

- identify whether the change touches public contracts
- identify whether it belongs to legacy or `app/`
- confirm whether an approved architecture document already covers it
- if the work is part of the migration, confirm the current phase first

### 2. Implementation

Implementation follows the repo's real constraints:

- PHP 8 procedural legacy
- vanilla JavaScript front-end
- MySQL via PDO prepared statements
- Hostinger-compatible deploy
- no framework, no mandatory Composer, no mandatory npm, no build step

### 3. Tests

Every change needs proportional validation.

- low-risk docs-only work: review links and structure
- isolated PHP behavior: lint and focused tests
- contract-sensitive work: characterization or compatibility tests first
- UI or endpoint work: manual smoke validation in addition to unit coverage

The test policy lives in [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) and
[REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md).

### 4. Review

Review is mandatory before commit, even for AI-authored work.

Use [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md).

### 5. Commit

Commit only after:

- scope is verified
- tests are complete for the risk level
- rollback path is understood
- documentation is updated when required

See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).

## Role Split

### Claude Code

Claude is the primary implementation agent.

Expected responsibilities:

- implement approved changes
- edit code and tests
- preserve existing contracts unless the task explicitly changes them
- follow architecture and migration constraints
- keep changes small, reviewable, and reversible

Claude should not improvise architecture that conflicts with the existing docs.

### Codex

Codex is the audit, architecture, documentation, and technical review agent.

Expected responsibilities:

- audit workspace and process quality
- review diffs and identify regressions or compatibility risks
- maintain permanent development docs
- validate migration scope and rollback safety
- create characterization plans and compatibility guidance

Codex may implement documentation and developer-workflow improvements, but
should not change production behavior unless explicitly asked.

## Permanent Rules

- Do not change production behavior accidentally.
- Prefer referencing architecture docs over duplicating them.
- Legacy files may delegate, but must not receive new business rules during
  migration.
- New migration code belongs in `app/`.
- Public contracts outrank architectural elegance during migration.
- Critical areas require smaller scope and stronger validation.

## When to Create a New Module

Create or extend a module in `app/Modules/` only when all of the following are
true:

- the behavior belongs to a clear business domain
- the extraction has a documented boundary
- public contracts can stay stable
- the rollback path is simple
- the work fits the current migration phase or has explicit approval

Do not create a module just to rename folders or pre-build abstractions.

## When to Refactor

Refactoring is justified when at least one of these is true:

- a migration phase explicitly requires it
- duplication or coupling is blocking safe iteration
- tests or characterization need a seam to protect compatibility
- the change reduces legacy risk without changing behavior

Do not mix refactoring and bug fixing in the same change unless the task
explicitly requires both and the contract impact is documented.

## Rollback Policy

Every change should have an obvious rollback path before commit.

Preferred rollback shapes:

- revert a small diff
- remove a new adapter and restore the legacy code path
- delete a new internal module if the legacy facade still exists

Avoid multi-step rollback plans when a smaller extraction is possible.

## Legacy File Rule

Legacy files remain the compatibility surface until the phase that retires
them.

During migration:

- legacy file may call new code in `app/`
- legacy file must preserve signature, route, payload, and behavior
- legacy file must not gain new business rules

For the formal boundaries, see
[LEGACY_BOUNDARIES.md](../architecture/LEGACY_BOUNDARIES.md).
