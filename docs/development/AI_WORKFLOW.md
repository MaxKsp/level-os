# AI Workflow

## Purpose

This document defines the official way AI agents are used in Level OS.

It exists to reduce prompt repetition and to keep Claude and Codex aligned on
scope, tools, and expected outputs.

## Default Agent Responsibilities

### Claude Code

Use Claude for:

- implementing approved code changes
- writing or updating tests
- tracing behavior through the codebase
- doing small, focused refactors
- producing implementation-ready diffs

### Codex

Use Codex for:

- architecture review
- workspace/process review
- diff review with compatibility focus
- permanent documentation
- migration planning and validation
- characterization and rollback analysis

## Official AI Sequence

For substantial work, the default sequence is:

1. Architecture validation
2. Implementation
3. Test execution or test-plan validation
4. Review
5. Commit recommendation

Suggested ownership:

1. Codex validates architecture and scope
2. Claude implements
3. Claude runs tests or adds focused coverage
4. Codex reviews the diff
5. Human approves commit

## Tool Rules

## Context7

Context7 is mandatory when the task asks about a library, framework, SDK, API,
CLI tool, or cloud service.

Use it for:

- current syntax
- current configuration
- version-specific behavior
- official examples
- external technical references

Do not use it for:

- business logic review
- repo-specific architecture decisions
- general refactoring strategy

Rule:

- start with library resolution
- then query docs for a single focused concept
- prefer Context7 over web search for these questions

## Serena

Serena is the preferred tool for semantic code navigation when it is available
in the session.

Use it for:

- activate the current project
- locate symbols
- find references
- inspect symbol-level relationships

Do not replace Serena with text search when the request explicitly requires
Serena.

If Serena is unavailable:

- say so clearly
- do not pretend the tool exists
- use fallback search only when the task allows it

## Ponytail

Ponytail should be used for browser-driven verification when it is available
and the task requires interaction-level validation.

Use it for:

- smoke-testing user flows
- validating UI behavior tied to real browser state
- reproducing interaction bugs
- checking that a compatibility-preserving change still behaves correctly in
  the browser

Do not use Ponytail as a substitute for architecture analysis or source review.

If Ponytail is not enabled in the session, document that limitation and use the
next approved validation path.

## Caveman

Caveman is optional and is used for token efficiency, not for changing the
quality bar.

Use it when:

- the user explicitly asks for Caveman mode
- a review or commit message should be compressed
- a long-running session needs more context efficiency

Allowed uses:

- concise reviews
- concise commit messages
- compressed operational notes

Do not let compressed format remove risk details, test outcomes, or contract
warnings.

## Prompt Strategy

Prompting should be minimal and structured.

Always prefer:

- task objective
- scope boundaries
- files or docs to read
- hard constraints
- expected output format

Avoid copying full architecture context into every prompt when it already lives
in `docs/architecture/` or `docs/development/`.

Use [PROMPT_LIBRARY.md](./PROMPT_LIBRARY.md) instead of rewriting standard
instructions.

## Escalation Rules

Pause and escalate to architecture review before implementation if any of the
following is true:

- public contracts may change
- legacy/auth/finance/deploy may change
- the change spans both migration and product behavior
- a new module or shared abstraction is being proposed
- rollback is unclear

## Expected Outputs

### Implementation turn

- changed files
- what behavior was preserved or changed
- how to validate
- risks or follow-ups

### Review turn

- approval or rejection
- issues by severity
- mandatory fixes
- affected files
- commit recommendation

### Documentation turn

- files created or updated
- how they are meant to be used
- references to source-of-truth docs
