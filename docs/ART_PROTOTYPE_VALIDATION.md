# F9 art prototype delivery · 2026-09-13

## Deliverables

- `/art/?mode=2d`: charcoal battle presentation.
- `/art/?mode=3d`: real Three.js/WebGL battle room, dimensional card trays and camera transition.
- `/art/direction/`: detailed art directions for combat, base construction and all supporting modules.
- `/art-direction.md`: downloadable design document.

## Scope

The two renderers consume the same `simulateDuel` result and shared playback cursor. No new combat formula or adventure storage is introduced. The release is isolated from unrelated, in-progress changes in the main working directory. Base construction and supporting modules are design proposals; only the two combat presentations are implemented here.

The 3D actor is a geometric blockout, with modeled hands and body but no skeletal grasping animation. The 2D environment is a single illustration, with no layered character animation yet. Maintenance props temporarily stand in for some weapon/auxiliary card illustrations; these are documented in the direction page. Sound is a simple opt-in synthesized hit cue. This is an art-direction prototype, not a production asset set.

## Validation

- Production export succeeded for both art routes and the existing routes using Node 24.19.0.
- TypeScript and lint passed in the isolated release checkout.
- Existing game model suite: 107 passed, 0 failed.
- Local HTTP requests to the art entry, 3D query entry and direction page returned 200.
- Generated environment and atlas were visually inspected before integration.
- Browser interaction, rendered WebGL visual QA, device benchmarks and user playtests were not performed. Rendering, animation timing and typography still need hands-on review on target devices. The Sites skill permits browser testing only when explicitly requested; HTTP checks do not verify client behavior.

## Assets

Generated with the built-in imagegen tool:

- `D:/CodexGames/public/art-assets/charcoal-scene.png` — 1672 × 941.
- `D:/CodexGames/public/art-assets/object-atlas.png` — 1254 × 1254, nine 418 × 418 cells.
- `D:/CodexGames/public/art-assets/generation-record.json` — exact final prompts, method, paths and asset roles.

The background and atlas are original concept assets. No reference-game screenshots, character models, audio or card art are shipped.
