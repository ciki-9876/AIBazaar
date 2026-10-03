# Contributing to AIBazaar

Thanks for helping maintain AIBazaar. The repository contains two independently runnable games and a small experiments workspace:

- **Anbo Elevator Survival** (`apps/elevator`): exploration, equipment, survival, and return-to-elevator progression.
- **Wandeng City Cards** (`apps/cards`): collectible cards, deterministic lane battles, and replay/archive flows.
- **Experiments** (`apps/experiments`): prototypes and visual or gameplay studies; this is not a third production game.

## Get started

1. Install Node.js 22.13 or newer.
2. Run `npm ci` from the repository root.
3. Start the product you are working on with `npm run dev:elevator` or `npm run dev:cards`.
4. Read the relevant design notes before changing gameplay rules. Start with `docs/design-log/00_START_HERE.md`; the links there lead to current decisions and system records.

The root [README](README.md) lists product-specific test, type-check, build, preview, and publishing commands.

## Changes and boundaries

- Keep the two products independently buildable. Product-specific code belongs under its app or package; shared rendering and genuinely shared utilities belong in `packages/`.
- Preserve deterministic gameplay, save data, previews, and replays unless a design decision explicitly changes that behavior.
- Make state changes atomic: a failed action must not partially spend items, resources, or quota.
- Keep stable IDs and deterministic serialization for cards, items, saves, replays, and generated worlds.
- Keep user-facing descriptions aligned with the executable rules.
- Do not commit `.env` files, credentials, API keys, or generated build output.

## Validation

Run checks for the product and code you changed:

| Change | Checks |
| --- | --- |
| Elevator gameplay or data | `npm run test:elevator` |
| Card gameplay or data | `npm run test:cards` |
| TypeScript or React | `npm run lint` and the relevant `npm run typecheck:elevator` or `npm run typecheck:cards` |
| Product boundaries | `npm run check:boundaries` |
| Routes, configuration, or publishing | Build the affected product; run `npm run build:pages` for Pages changes |

Run `npm test` and `npm run lint` when a change crosses product boundaries or affects shared behavior.

## Design records

Do not rewrite historical decisions or experiments. When a gameplay decision is made, add a new decision or iteration record and link it from the relevant design-log index/current-design page. Keep facts, decisions, hypotheses, rejected options, and evidence clearly distinguished. Ordinary bug fixes do not need a design-log entry unless they reveal or change a gameplay rule.

## Pull requests

Use a focused branch and keep commits reviewable by product or shared concern. Explain which product is affected, summarize behavior changes, list validation performed, and note any known gaps. Ask for review from the maintainers responsible for the affected product when ownership is established.
