# Decision Log

## Purpose

This file records stable development decisions that should not keep being
re-negotiated in prompts.

It is not a changelog. It is a compact log of working agreements.

## Current Standing Decisions

### D-001 - Official delivery flow

Decision:

- `Architecture -> Implementation -> Tests -> Review -> Commit`

Reason:

- reduces accidental scope drift and compatibility regressions

Sources:

- [PLAYBOOK.md](./PLAYBOOK.md)

### D-002 - Architecture source of truth

Decision:

- long-lived architecture rules live in `docs/architecture/`
- long-lived execution/process rules live in `docs/development/`

Reason:

- avoids prompt repetition and duplicated instructions

Sources:

- [MASTER_REFACTOR_PLAN.md](../architecture/MASTER_REFACTOR_PLAN.md)
- [MIGRATION_RULES.md](../architecture/MIGRATION_RULES.md)

### D-003 - Migration guardrails

Decision:

- migration must preserve public contracts
- legacy files may delegate but not gain new business rules
- new migration code belongs in `app/`

Reason:

- allows incremental modernization without breaking the running product

Sources:

- [MIGRATION_RULES.md](../architecture/MIGRATION_RULES.md)
- [LEGACY_BOUNDARIES.md](../architecture/LEGACY_BOUNDARIES.md)

### D-004 - Platform constraints

Decision:

- no framework introduced by default
- no mandatory Composer adoption
- no mandatory npm/build step
- do not change Hostinger deploy model as collateral damage

Reason:

- aligns with the real production environment

Sources:

- [MASTER_REFACTOR_PLAN.md](../architecture/MASTER_REFACTOR_PLAN.md)
- [CLAUDE.md](../../CLAUDE.md)

### D-005 - AI role split

Decision:

- Claude is the default implementation agent
- Codex is the default architecture/documentation/review agent

Reason:

- keeps responsibilities explicit and reduces mixed expectations

Sources:

- [AI_WORKFLOW.md](./AI_WORKFLOW.md)

### D-006 - Finance migration pilot

Decision:

- Finance is the pilot module for incremental extraction
- compatibility characterization comes before deeper extraction

Reason:

- Finance has a strong domain boundary but high contract sensitivity

Sources:

- [FINANCE_BOUNDARIES.md](../architecture/finance/FINANCE_BOUNDARIES.md)
- [FINANCE_COMPATIBILITY_MATRIX.md](../architecture/finance/FINANCE_COMPATIBILITY_MATRIX.md)
- [FINANCE_EXTRACTION_RISKS.md](../architecture/finance/FINANCE_EXTRACTION_RISKS.md)

### D-007 - Tests must match risk

Decision:

- use focused deterministic characterization tests for risky internal
  extractions
- use manual validation where automation does not reach the real risk

Reason:

- balances confidence with the project's lightweight stack

Sources:

- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md)
- [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md)
