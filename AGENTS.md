# AIBazaar development guide

## Project

AIBazaar is a deterministic card-and-field gameplay prototype. Keep gameplay rules, saves, previews, and replay behavior deterministic unless a task explicitly changes that contract.

## Setup

- Required Node.js: 22.13 or newer.
- Install dependencies with `npm ci`.
- Do not commit `.env`, `.env.local`, API keys, credentials, or generated build output.

## Validation

- Run `npm test` after gameplay or data-model changes.
- Run `npm run lint` after TypeScript/React changes.
- Run `npm run build` when changing routes, configuration, or deployment behavior.

## Working rules

- Read the relevant files in `docs/` before changing a documented gameplay rule.
- For game-design work, first read `docs/design-log/00_START_HERE.md`, `docs/design-log/01_DESIGN_DNA.md`, `docs/design-log/03_CURRENT_DESIGN.md`, and the relevant system document.
- Preserve atomic state updates: failed actions must not partially consume inventory, resources, or quota.
- Preserve stable identities and deterministic serialization for cards, items, saves, replays, and generated worlds.
- Keep user-facing descriptions aligned with executable behavior.
- Record design knowledge separately from implementation noise: facts, decisions, hypotheses, rejected alternatives, and evidence must be distinguishable.
- When a design discussion produces a decision, update the relevant design-log record. When a rule changes, update the affected design atom or mechanism composition and link the decision/iteration record.
- Do not rewrite historical decisions or experiments. Supersede them with a new record and an explicit link.
- Ordinary debugging does not belong in the design log; record a bug only when it reveals, validates, or changes a game-design rule.
- Prefer a feature branch or Codex Cloud worktree over direct edits to `main`.
- Summarize changed files, tests run, and any remaining risks when finishing a task.
