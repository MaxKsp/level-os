# Review Checklist

## Purpose

Use this checklist for every meaningful change before commit or merge.

## Scope

- Does the diff match the approved task?
- Is any unrelated code or noise included?
- Is the change smaller than the next obvious broader alternative?

## Contracts

- Are public routes unchanged unless explicitly approved?
- Are JSON shapes unchanged unless explicitly approved?
- Are cookies, sessions, auth, and plan gates unchanged unless explicitly
  approved?
- Does the front-end still receive the same contract it expects?

Reference:

- [PUBLIC_CONTRACTS.md](../architecture/PUBLIC_CONTRACTS.md)
- [FINANCE_PUBLIC_CONTRACTS.md](../architecture/finance/FINANCE_PUBLIC_CONTRACTS.md)

## Legacy and Migration

- Did the change respect [MIGRATION_RULES.md](../architecture/MIGRATION_RULES.md)?
- Did a legacy file only delegate rather than absorb new rules?
- Was new migration code placed in `app/`?
- Is the extraction phase-aligned and reversible?

## Testing

- Are tests proportional to the risk?
- If a characterization test already exists, does it still pass?
- If coverage is partial, is the gap documented clearly?
- Were manual smoke checks identified for non-automated risk?

## Abstractions

- Was any new abstraction introduced?
- If yes, is it justified by repeated logic or a documented boundary?
- Could the same outcome be achieved with a smaller seam?

## Rollback

- Can the change be reverted quickly?
- Does rollback require only code revert, not data repair?
- If a facade/adapter was introduced, does the legacy path still exist?

## Security and Data Safety

- Are prepared statements still used?
- Is `user_id` isolation preserved?
- Are CSRF, login, rate limit, and plan checks intact where expected?
- Are error responses still safe?

## Final Review Output

A review should end with:

- approval or rejection
- issues by severity
- mandatory fixes
- changed files
- commit recommendation
