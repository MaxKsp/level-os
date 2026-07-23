# AI Automation Pipeline

This directory contains a local, deterministic pipeline for Level OS architectural
phases.

The pipeline exists to keep Codex, Claude Code, validation scripts, and Git in
one controlled flow without changing the application's deploy model.

## Goals

- plan a phase with Codex in read-only mode
- implement only approved scope with Claude Code
- validate changed files against an allowlist
- run deterministic PHP and JavaScript checks
- review only the current diff with Codex in read-only mode
- require human confirmation before commit by default
- never push automatically unless `-Push` is explicitly provided

## Directory Layout

```text
automation/
├── phases/     # Phase definitions in JSON
├── prompts/    # Prompt templates used by the pipeline
├── schemas/    # Output schemas for Codex structured responses
├── runs/       # Timestamped execution artifacts (ignored by Git)
└── README.md
```

## Main Entry Point

Run the pipeline from the Git root:

```powershell
.\scripts\ai-pipeline.ps1 -Phase automation\phases\phase-13.json
```

Generate and run the next safe phase automatically:

```powershell
.\scripts\ai-pipeline.ps1 -AutoNextPhase
```

The default `-MaxPhases 1` limits the automatic cycle to one phase. Use
`-StartPhaseNumber` to override discovery, `-StopAfterPlan` to stop after the
generated phase passes Architect, or `-StopAfterCommit` to stop after its
implementation commit. `-CommitPhaseDefinition` creates a separate definition
commit; otherwise the generated definition is included in the confirmed
implementation commit.

Safe planning-only mode:

```powershell
.\scripts\ai-pipeline.ps1 -AutoNextPhase -DryRun
```

This generates and validates `automation/phases/phase-N.json`, runs Architect,
and stops without calling Claude or changing application files.

Optional flags:

- `-AutoCommit`
- `-AutoNextPhase`
- `-MaxPhases 1`
- `-StartPhaseNumber 15`
- `-StopAfterPlan`
- `-StopAfterCommit`
- `-CommitPhaseDefinition`
- `-Push`
- `-DryRun`
- `-SkipArchitect`
- `-UseCodexUserConfig`
- `-MaxFixAttempts 2`
- `-TestOnlyTolerance 1e-9`
- `-ResumePhase automation\phases\phase-18.json`
- `-ArchitectTimeoutSeconds 300`
- `-ImplementerTimeoutSeconds 900`
- `-ClaudePermissionMode acceptEdits`
- `-ClaudeSkill ponytail`
- `-NoClaudeSkill`
- `-ValidationCommandTimeoutSeconds 180`
- `-ReviewerTimeoutSeconds 300`
- `-HeartbeatSeconds 10`
- `-VerboseLogs`

By default, the automatic Codex Architect and Reviewer stages run with
`--ignore-user-config` and `--ephemeral`. This keeps user-level MCP servers,
hooks, skills, and other global configuration out of non-interactive runs while
preserving the existing `CODEX_HOME` authentication. Pass `-UseCodexUserConfig`
to allow the Codex user configuration for those stages; ephemeral mode remains
enabled. The pipeline logs either `Codex user config: isolated` or
`Codex user config: enabled` at startup. This option does not affect Claude.

## Claude Implementer Permissions

The non-interactive Claude Implementer defaults to
`-ClaudePermissionMode acceptEdits`. It receives only the built-in `Read`,
`Glob`, `Grep`, `Edit`, and `Write` tools; Bash and web tools are explicitly
disabled. The process runs from the repository root, receives its prompt over
stdin, and cannot use `bypassPermissions`.

Immediately after Claude exits, the pipeline reads `git status --porcelain`.
It stops before deterministic validation when no file changed or when any
changed file is outside the phase `allowedFiles`. The log records the permission
mode, allowed tools, working directory, and changed files. Deterministic scope
and test validation still runs afterward for accepted changes.

## Automatic Validation Corrections

`-MaxFixAttempts` defaults to 2. Before calling Claude, the pipeline classifies
each failure as `test-only`, `production-possible`, or `unknown`. Unknown
failures stop for human review. Test-only failures restrict Claude to the exact
test paths associated with failed commands; phase production files are not part
of that correction allowlist. `-TestOnlyTolerance` controls deterministic
IEEE-754 residual classification and defaults to `1e-9`.

The correction prompt contains only the classification, exact correction
allowlist, forbidden paths, failed commands with stdout/stderr, expected fix,
and instructions to run the failed test and stop without committing. Passed
commands, the original prompt, project documentation, and phase history are not
resent.

Before every correction, byte-exact copies and an existence manifest are saved
under `fix-backup-attempt-N/`. The pipeline computes only the delta introduced
by Claude. An unauthorized edit restores the pre-attempt bytes (not `HEAD`),
removes newly created unauthorized files, records the violation, and consumes a
retry without running validation. This preserves the already implemented phase
diff. After an accepted correction, each failed command runs first; only when
those targeted checks pass does the complete scope/test/lint suite run.

Artifacts include `validation-attempt-N.json`,
`validation-failures-attempt-N.json`, `fix-prompt-attempt-N.txt`, and separate
`fix-implementer-attempt-N.stdout.log` / `.stderr.log` files. Reviewer runs only
after validation passes.

The Reviewer uses ordinary `codex exec` with a minimal prompt over stdin and a
mandatory output schema. It does not use the `review` subcommand or parse
free-form Markdown. Valid JSON is accepted after one call; invalid output gets
exactly one JSON-only repair call and then blocks the commit if still invalid.
The raw first response is retained as `review.raw.txt`. Generated phase JSON
and run-directory artifacts are removed from the changed-file list; the phase
definition remains architectural context but cannot appear in `filesReviewed`
or be the basis of a blocker.

By default every Claude prompt begins with `/ponytail`. The pipeline resolves
the skill from repository/user skill paths and then repository/user command
paths, rejects unreadable or `user-invocable: false` definitions, and respects
accessible `skillOverrides.ponytail = off` configuration. `-NoClaudeSkill`
explicitly disables this requirement without creating or changing any skill.

Resume an already implemented phase with:

```powershell
.\scripts\ai-pipeline.ps1 -ResumePhase automation\phases\phase-18.json
```

Resume mode accepts a dirty tree only when every changed file is in the phase
allowlist or is the phase JSON itself. It skips Architect and the initial
Implementer, starts with deterministic validation, applies the same correction
cycle, then continues to Reviewer and human commit confirmation. A successful
validation stores `validated-diff.sha256` and `validation-result.json`. Resume
reuses them only when the current tracked diff plus allowed untracked file
contents produce the same hash; any change forces complete validation.
Finance report Markdown is excluded from the code-validation hash. After a
successful or reused validation, a pending report gets one `/ponytail`
documentation-only synchronization restricted to that report. This does not
rerun tests or consume `MaxFixAttempts`; the review diff hash is recalculated
before Reviewer.

The controlled retry-policy checks run without a real phase or commit:

```powershell
.\scripts\test-validation-fix-loop.ps1
.\scripts\test-reviewer-runner.ps1
.\scripts\test-claude-skill.ps1
```

All three checks use deterministic mocks or temporary repositories and never
invoke Codex or Claude.

The controlled write check can be run independently without running a phase:

```powershell
.\scripts\test-claude-write.ps1
```

It permits Claude to create `automation/claude-write-test.txt`, verifies that
its content is exactly `OK`, and removes it in a `finally` block.

Current `-DryRun` behavior:

- in `-Phase` mode, runs preflight and Codex planning only
- in `-AutoNextPhase` mode, generates and validates the next phase first
- writes run artifacts for the planning step
- does not call Claude
- does not run validation, review, commit, or push

## Timeouts and Heartbeats

The pipeline applies a separate timeout to each long-running AI stage:

- Architect: `-ArchitectTimeoutSeconds`
- Implementer: `-ImplementerTimeoutSeconds`
- Reviewer: `-ReviewerTimeoutSeconds`

Every deterministic test, lint, and scope command has its own
`-ValidationCommandTimeoutSeconds` timeout (180 seconds by default). Validation
closes stdin immediately, reads stdout/stderr concurrently, logs the last
started command, and terminates the process tree on timeout. There is no single
900-second timeout for the whole validation stage.

Controlled validation-runner check:

```powershell
.\scripts\test-validation-runner.ps1
```

It uses a temporary Git repository to verify concurrent stdout/stderr capture,
closed stdin, per-command progress, timeout diagnostics, last-command logging,
and descendant-process termination without running a real phase.

Progress heartbeat:

- `-HeartbeatSeconds`

Example:

```powershell
.\scripts\ai-pipeline.ps1 `
  -Phase automation\phases\phase-13.json `
  -DryRun `
  -ArchitectTimeoutSeconds 180 `
  -HeartbeatSeconds 10
```

During execution, the pipeline prints progress like:

```text
[Architect] running... 10s
[Architect] running... 20s
[Reviewer] running... 10s
```

On timeout or failure, the pipeline records:

- command
- arguments
- PID
- duration
- stdout log path
- stderr log path
- last 30 lines of stdout/stderr for timed-out stages

## What Each Script Does

- `scripts/ai-pipeline.ps1`
  Orchestrates preflight, planning, implementation, validation, review,
  optional correction loop, commit, optional push, and run reporting.

- `scripts/validate-phase.ps1`
  Validates a phase definition and executes deterministic checks for the
  current working tree.

- `scripts/check-scope.ps1`
  Checks exact tracked, staged, and individual untracked files against the
  phase allowlist and denylist.

- `scripts/validate-next-phase.ps1`
  Applies deterministic safety rules to a Codex next-phase decision, including
  explicit-file allowlists, maximum scope, sensitive-path denial, overlap
  checks, new-test coverage, and canonical frontend source enforcement.

## Automatic Next-Phase Safety

Automatic mode starts only on a clean non-`main`/non-`master` branch. Codex
reads architecture/development docs, current Finance seams, tests, existing
phase files, and recent Git history. Its structured decision is saved as
`automation/runs/<timestamp>/next-phase.json` and validated against
`automation/schemas/next-phase.schema.json` plus deterministic PowerShell
guards before a phase file is created.

The generator rejects wildcard or directory-root allowlists, `scripts/`,
`automation/`, sensitive files, schema/migration paths, excessive file counts,
allow/deny overlap, and phases without a new runnable test unless the
description starts with `[test-justification]`. Public JavaScript copies under
`assets/` require a canonical source under
`app/Modules/Finance/Frontend/` and a byte-for-byte validation command.

`completed=true` creates no phase file, writes the decision and `summary.md`,
and exits successfully. Any failed test, lint, scope check, Architect decision,
Reviewer blocker, or `MaxPhases` limit stops the cycle.

## Required CLIs

- `git`
- `%APPDATA%\npm\codex.cmd`
- `%APPDATA%\npm\claude.cmd`
- `node`
- `php`

The default phase file can also point to an explicit PHP executable when the
project needs it.

## Safety Rules

- no `--yolo`
- no `danger-full-access`
- no `--dangerously-skip-permissions`
- no `git add .`
- no `git commit -a`
- no automatic push
- no automatic scope expansion after review failure

## Phase Definition Contract

Each phase JSON must contain:

- `id`
- `title`
- `description`
- `allowedFiles`
- `forbiddenFiles`
- `phpTests`
- `jsTests`
- `phpLint`
- `jsLint`
- `commitMessage`

See [phase-13.json](./phases/phase-13.json) for the first concrete example.

## Output Artifacts

Each run creates `automation/runs/<timestamp>/` with:

- `plan.json`
- `plan.txt`
- `review.json`
- `review.txt`
- `implementer.txt`
- `summary.md`
- raw logs for each step when available

## Phase 13 Baseline

The initial phase file models the next small Finance front-end extraction after
the transfer phase: OFX import final confirmation, keeping public endpoints and
payload contracts intact.

That choice follows the current Finance migration trail in
`docs/architecture/finance/`.
