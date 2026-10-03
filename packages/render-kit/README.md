# Shared rendering

Atelier geometry/material ownership, visual presets and post-processing live here. This package must not import gameplay rules, saves, UI or product routes. Production boundary validation enforces that restriction transitively.

Changes affect both products and experiments: run the full test suite and both product builds. Consumers own scene-specific actors, environment construction and resource disposal.
