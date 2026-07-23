You are Codex selecting the next Level OS Finance migration phase.

Inspect the repository in read-only mode. Read:

- docs/architecture/
- docs/architecture/finance/
- docs/development/
- app/Modules/Finance/
- assets/app.js and already extracted Finance scripts
- tests/
- recent git history
- existing automation/phases/phase-*.json

Choose only the smallest next cohesive, reversible, test-covered extraction.
Never repeat a completed phase and never widen scope automatically. Preserve all
public contracts and deployment behavior.

Safety rules:

- expected phase id: {{EXPECTED_PHASE_ID}}
- at most {{MAX_ALLOWED_FILES}} allowed files
- every allowedFiles entry must be one explicit file; no wildcards or directory roots
- never allow scripts/, automation/, secrets, credentials, config.php, .env, schema.sql, or migrations
- new frontend logic must have its canonical source under app/Modules/Finance/Frontend/
- when a canonical frontend file is copied to assets/, require a deterministic byte-for-byte comparison in the tests
- include all relevant existing tests and at least one new focused test
- if no new test is feasible, put an explicit justification in description prefixed with [test-justification]
- render/UI and persistence must remain outside a pure-calculation extraction unless explicitly required by the smallest seam
- forbiddenFiles must explicitly protect adjacent modules and backend boundaries
- allowedFiles and forbiddenFiles must not overlap

If no safe next extraction exists, return completed=true and explain why in reason.
When completed=true, still return a phase object matching the schema, using the
expected id and empty arrays; it will not be persisted.

Return JSON only, matching the provided schema.
