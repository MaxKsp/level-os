# AI Automation Pipeline

This directory contains a local, deterministic pipeline for Orby architectural
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

Optional flags:

- `-AutoCommit`
- `-Push`
- `-DryRun`
- `-SkipArchitect`
- `-MaxFixAttempts 2`
- `-ArchitectTimeoutSeconds 300`
- `-ImplementerTimeoutSeconds 900`
- `-ReviewerTimeoutSeconds 300`
- `-HeartbeatSeconds 10`
- `-VerboseLogs`

Current `-DryRun` behavior:

- runs preflight and Codex planning only
- writes run artifacts for the planning step
- does not call Claude
- does not run validation, review, commit, or push

## Timeouts and Heartbeats

The pipeline applies a separate timeout to each long-running AI stage:

- Architect: `-ArchitectTimeoutSeconds`
- Implementer: `-ImplementerTimeoutSeconds`
- Reviewer: `-ReviewerTimeoutSeconds`

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
  Checks changed files from `git status --porcelain` against the phase
  allowlist and denylist.

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
