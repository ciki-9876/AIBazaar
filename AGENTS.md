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
- Preserve atomic state updates: failed actions must not partially consume inventory, resources, or quota.
- Preserve stable identities and deterministic serialization for cards, items, saves, replays, and generated worlds.
- Keep user-facing descriptions aligned with executable behavior.
- Prefer a feature branch or Codex Cloud worktree over direct edits to `main`.
- Summarize changed files, tests run, and any remaining risks when finishing a task.
