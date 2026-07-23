# Coding Standards

## Purpose

These are the permanent implementation standards for Level OS.

They complement the architecture docs and the repo rules in `CLAUDE.md`.

## General Standards

- Preserve current behavior unless the task explicitly changes it.
- Prefer simple PHP and vanilla JavaScript.
- Match the existing style of the surrounding file.
- Keep diffs small and reviewable.
- Prefer explicit code over premature abstraction.

## PHP

- Use PHP 8 compatible syntax already proven in the repo.
- Use PDO prepared statements for database access.
- Filter user data by `user_id` where applicable.
- Return stable JSON contracts from `api/*.php`.
- Avoid introducing framework-like layers without phase justification.

For migration work:

- new internal code goes into `app/`
- legacy entrypoints preserve public behavior
- extraction should preserve function signatures when the legacy facade depends
  on them

## Frontend

- Use React, TypeScript, Vite and Tailwind CSS v4 under `frontend/`.
- Keep routes, stores and API contracts backwards compatible.
- Keep financial calculations in typed modules with focused Vitest coverage.
- Do not edit `frontend/dist/`; generate it with the documented npm build.

## SQL and Database

- Use prepared statements.
- Prefer additive migrations over destructive changes.
- Keep `schema.sql` aligned when new install state changes are intended.
- Do not alter schema during documentation or architecture-only tasks.

## Abstraction Policy

Only create a new abstraction when it removes real complexity.

Allowed reasons:

- repeated logic with stable behavior
- a migration seam that improves rollback safety
- a domain boundary already documented in architecture

Weak reasons:

- "future-proofing"
- matching a generic clean architecture pattern
- creating repositories or services before their boundary is proven

Specific migration rule:

- do not create repository-per-table by default
- prefer domain-oriented extraction when the phase reaches that point

## Module Creation Criteria

Before adding code to `app/Modules/<Domain>/`, confirm:

- domain boundary is documented
- public contract is understood
- tests or characterization exist for the moved behavior
- legacy adapter plan exists
- rollback is trivial or near-trivial

## Legacy File Rules

Legacy files are compatibility surfaces, not innovation surfaces.

Rules:

- they may delegate
- they may not gain new business rules during migration
- they keep public routes, payloads, and behavior
- they are retired only in the approved phase

## Documentation Standards

- do not duplicate architecture docs unnecessarily
- prefer short operational docs with links to source of truth
- when a development rule becomes stable, put it in `docs/development/`

## Test Standards

- characterize current behavior before risky refactors
- keep tests deterministic
- prefer focused fixtures over broad unstable datasets
- document manual validation when automation is not enough
