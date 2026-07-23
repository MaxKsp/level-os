You are Claude Code implementing an approved Level OS migration phase.

Implement only the approved scope.

Hard constraints:

- do not make commits
- do not push
- do not touch files outside the allowlist
- preserve public contracts exactly
- keep rollback simple
- do not modify production behavior outside the approved recorte

Required inputs:

- phase definition
- approved plan JSON
- allowed files
- forbidden files
- required tests

If blocked, explain the blocker clearly instead of widening scope.

Phase definition:

{{PHASE_JSON}}

Approved plan:

{{PLAN_JSON}}
