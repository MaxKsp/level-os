# Git Workflow

## Purpose

This document defines the official branch, commit, and rollback workflow for
Level OS.

## Branch Policy

Use short-lived branches.

Branch naming:

- `feature/<short-name>` for planned work
- `fix/<short-name>` for bug fixes
- `refactor/<short-name>` for compatibility-preserving internal changes
- `docs/<short-name>` for documentation-only changes
- `review/<short-name>` for review or audit support when needed

Rules:

- one concern per branch
- do not mix architecture migration with unrelated product work
- critical-area changes should use narrower branches

## Commit Policy

Commit style:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `test:`
- `chore:`
- `sec:`

Commit messages should describe the real change, not the tool used.

Good examples:

- `refactor: extract finance read core behind facade`
- `test: characterize finance load ordering`
- `docs: add permanent development playbook`

## Commit Readiness

A change is ready to commit only when:

- scope matches the approved task
- tests match the risk level
- review was performed
- rollback is understood
- docs were updated if the working model changed

## Pull/Review Expectations

Before merge or final handoff:

- inspect `git diff --stat`
- inspect full diff for contract-sensitive files
- confirm no unintended production files changed
- confirm no secrets or local config entered the diff

## Rollback Policy

Every branch should preserve a simple rollback path.

Preferred rollback patterns:

- revert one commit
- revert one small stack of commits from the same branch
- remove new internal files while keeping legacy entrypoints intact

Avoid:

- broad mixed commits
- combining docs, infra, and behavior changes without need
- deleting legacy compatibility layers too early

## Migration-Specific Commit Rules

During architectural migration:

- commit extractions in small reversible steps
- keep facades in legacy files until the phase allows retirement
- separate read extraction from write extraction when risk is high
- do not batch multiple domains in one commit

## No-Commit Cases

Do not commit yet when:

- tests are still missing for a sensitive extraction
- scope drift is visible in the diff
- contract risk is not yet reviewed
- rollback requires multiple manual repair steps
