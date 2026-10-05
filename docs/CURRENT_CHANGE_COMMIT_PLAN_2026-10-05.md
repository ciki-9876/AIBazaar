# Current-change commit organization · 2026-10-05

## Scope and provenance

Frozen root source snapshot: `eb08c354fc7e41ace875f2990bd78ffcfe0785c7`. Base: `7cf88f2d62c385ea05f4b78a96986daf27fab62c`. Generated legacy dist/.public/.next (546 paths) are excluded. Original live worktrees and the original unstaged content are preserved. The baseline includes existing runnable rhythm/song, throw-duel and local AI prototypes; it is not described as a pure file move.

## Review sequence

Review the five stacked branches in order: project-baseline, elevator-season, resonance-healing, throw-adventure, elevator-ai-training. Each PR's base is the preceding branch. Product PRs include executable rules, UI, tests, resources and linked design evidence together. Shared design indices and archived root Wandeng compatibility UI are reconciled in the final coordination commit.

## AI worktree reconciliation

Mapped old experiment paths: 35; isolated equivalents: 35; unmigrated paths: 0. The 13 unique foundation/tool files are migrated into this experiment with imports, worker entry and model output paths adjusted to the independent source tree. Unique historical documentation (6 files) is recovered. The original AI worktree and local safety snapshot `6e83cfa0bb2fac0612afec212ec24da13a729016` are retained. Existing scene/model/backend revisions use the isolated project's newer snapshots; old main-elevator imports are not merged. No AI code is integrated into production elevator or published.

## Known feature limits

Healing and magician adventure are prototypes. Art routes are candidates. The latest offline AI search candidate is not connected to browser play and does not prove superiority over rule search. Subsequent changes made in the live workspace after this snapshot belong to new commits.

## Validation

Per-PR and final check results are recorded separately after execution; a prior chat's successful checks are not evidence for this snapshot.

## Executed validation

Local runtime: Node.js 24.14.0, npm 11.9.0; dependencies installed with npm ci. Every review branch passed the full test suite, lint, repository typecheck, four project typechecks, boundaries, determinism, dependency checks, all three production builds, the separate AI build, and the prefixed Pages export. Golden replay fixtures were unchanged.

| Review branch | Tested code commit | Tests | Checks |
| --- | --- | ---: | --- |
| `codex/project-baseline-20261005` | `ec4366f` | 393 | 13/13 passed |
| `codex/elevator-season-20261005` | `e81c8de` | 446 | 13/13 passed |
| `codex/resonance-healing-20261005` | `77fa4b2` | 472 | 13/13 passed |
| `codex/throw-adventure-20261005` | `c510697` | 490 | 13/13 passed |
| `codex/elevator-ai-training-20261005` | `66c2724` | 517 | 13/13 passed |

The throw Pages export initially exposed missing product prefixes in adventure links and pixel/vector resource requests. These were corrected, a nested-base regression test was added, and the full throw/AI validation was rerun. Earlier transient installation errors are not counted as passing evidence. The source-path/credential audit found no generated directories, model weights, environment files, detected credential patterns or changed files over 50 MB.

This final record is a documentation-only commit on top of the tested code revision. Review the five draft PRs in order; no main merge or deployment was performed by this task.
