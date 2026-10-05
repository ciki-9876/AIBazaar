# 听风之旅 · 共鸣治愈师

This is a standalone production project. Its route is `app/page.tsx`; the complete UI and deterministic simulation are in `src/`. It does not import the elevator project or the throw-card project.

Run it from the repository root with `npm run dev:resonance:cards`. Build with `npm run build:resonance:cards`; output goes to `apps/resonance/dist/client`.

The **大纲编排** entry opens `/outline`. Author the world, main arc, chapter beats and open questions; reorder, mark discussion status, undo, read the complete outline and import/export JSON or Markdown. The current working document is `src/outline/outline.json`, seeded from the existing story as seven draft chapters. Always read this file before later story edits so user-authored changes are preserved. Stable IDs must survive reordering. Outline edits do not automatically modify combat dialogue.

On the local development service, the editor automatically saves to that project file with revision conflict protection and previous-version backups in `src/outline/.outline-history/` (ignored by Git). Static releases save browser drafts instead and explicitly show that mode; they exchange documents by import/export. Gameplay presentation is still undecided: [ADR-0044](../../docs/design-log/decisions/ADR-0044-resonance-outline-authoring.md).

The homepage is the asymmetric healing prototype. Follow 阿弦 through the opening, the master's practice, a letter, and six short story encounters. The player keeps the nine-slot card board, song abilities, beat-driven scan and first-entry activation. One to four heart demons instead have their own HP, attack, skills and independent cooldowns. Choose a priority target before combat; after it disappears, the performance automatically moves to the next living demon. Only the player's song plays. Pausing, seeking, replaying and playback speed also control the music.

New battles and strict replay files use `rhythm-healing-v3`. The historical two-deck prototype remains at `/legacy`, with unchanged `rhythm-scan-v1` and `rhythm-song-v2` replay behavior. Replays from different rule versions are not mixed. This prototype opens all eleven cards and six encounters for experimentation; the complete long-run economy, collection unlocks and numerical growth are not yet implemented.

The complete Chinese story and growth-system packaging are in [the healer script](../../docs/F9_RESONANCE_HEALER_STORY_2026-10-04.md). Rules and implementation evidence are in [ADR-0042](../../docs/design-log/decisions/ADR-0042-resonance-healing-monsters.md) and [the acceptance record](../../docs/design-log/iterations/F9/2026-10-04-resonance-healing-monsters.md).

Original scores and the deterministic PCM renderer are in `music/render-songs.mjs`. Rebuild the authored WAV assets with `node --experimental-strip-types apps/resonance/music/render-songs.mjs`, then restart the product dev command to prepare public assets. Rules, prototype numbers and validation evidence are recorded in [ADR-0040](../../docs/design-log/decisions/ADR-0040-resonance-song-heroes.md).
