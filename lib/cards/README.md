# Card core

The former demo card catalog, card rules and deterministic duel simulation belong to the card product. Playback timing is shared by card presentations and experimental previews. Elevator rules must not depend on this directory.

This move preserves card IDs, serialized state, replay inputs and combat behavior. The declarative framework in `lib/card-framework/` remains a separate implementation module; this refactor does not replace either combat engine.
