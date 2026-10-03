# AIBazaar development guide

## Project

AIBazaar contains two independent products in one repository: elevator survival (`apps/elevator`, `app/survival`, `lib/survival-*`) and Wandeng cards (`apps/cards`, `app/arena`, `app/wandeng`, `lib/cards` and related card modules). `apps/experiments` contains the legacy demo and prototypes. Shared infrastructure belongs in `packages/` or explicitly shared neutral modules. Keep gameplay rules, saves, previews, and replay behavior deterministic unless a task explicitly changes that contract.

## Setup

- Required Node.js: 22.13 or newer.
- Install dependencies with `npm ci`.
- Do not commit `.env`, `.env.local`, API keys, credentials, or generated build output.

## Validation

- Run `npm test` after gameplay or data-model changes.
- Run `npm run lint` after TypeScript/React changes.
- Run `npm run build` when changing routes, configuration, or deployment behavior.
- Run `npm run typecheck` and `npm run check:boundaries` before submitting a PR. PRs must pass full-repository checks and both product builds.
- Product commands use `:elevator` and `:cards` suffixes (dev, test, typecheck, build, preview). Product checks supplement full-repository checks.

## Working rules

- Read the relevant files in `docs/` before changing a documented gameplay rule.
- For game-design work, first read `docs/design-log/00_START_HERE.md`, `docs/design-log/01_DESIGN_DNA.md`, `docs/design-log/03_CURRENT_DESIGN.md`, and the relevant system document.
- Preserve atomic state updates: failed actions must not partially consume inventory, resources, or quota.
- Preserve stable identities and deterministic serialization for cards, items, saves, replays, and generated worlds.
- Elevator and cards must not import one another or experimental code, including type-only imports. Shared modules must not depend on product or experiment modules.
- Simulation inputs must explicitly supply seeds and simulation ticks. Keep wall-clock timestamps and fresh seed generation in adapters, outside deterministic rules.
- Preserve existing storage keys and migrate supported legacy saves when changing their envelope. Reject mismatched product or unsupported rules versions before restoring state.
- Keep user-facing descriptions aligned with executable behavior.
- Record design knowledge separately from implementation noise: facts, decisions, hypotheses, rejected alternatives, and evidence must be distinguishable.
- When a design discussion produces a decision, update the relevant design-log record. When a rule changes, update the affected design atom or mechanism composition and link the decision/iteration record.
- Do not rewrite historical decisions or experiments. Supersede them with a new record and an explicit link.
- Ordinary debugging does not belong in the design log; record a bug only when it reveals, validates, or changes a game-design rule.
- Prefer a feature branch or Codex Cloud worktree over direct edits to `main`.
- Summarize changed files, tests run, and any remaining risks when finishing a task.
