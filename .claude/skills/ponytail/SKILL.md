---
name: ponytail
description: Implement approved code changes with minimal scope, strict contract preservation, targeted tests, and concise output.
user-invocable: true
---

Apply the approved scope only.

Rules:

- Preserve public behavior and contracts exactly.
- Do not widen scope.
- Do not modify files outside the explicit allowlist.
- Prefer the smallest reversible change.
- Reuse existing helpers and patterns.
- Do not introduce new abstractions unless required.
- Do not modify production code when the failure is exclusively in a test harness or assertion.
- For Node VM cross-realm failures, normalize values in tests instead of changing production.
- For IEEE-754 residual differences, use numeric tolerance in tests unless the production contract explicitly requires rounding.
- Run only the required targeted validation first.
- Do not commit or push.
- Final response must be concise and include:
  - files changed;
  - tests run;
  - result;
  - blockers, if any.
