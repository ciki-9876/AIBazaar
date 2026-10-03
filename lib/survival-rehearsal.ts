import {
  createOpening,
  openingAction,
  stepOpening,
  LIGHT_POINT,
  BOX_POINT,
  type OpeningState,
} from './survival-opening.ts';
import { ELEVATOR } from './survival-room.ts';
/** User-facing chapter rehearsal. Run the actual opening rules; never mint a pretend inventory. */
export function createHomecomingRehearsal(
  observe: (s: OpeningState) => void = () => {},
): OpeningState {
  const until = (s: OpeningState, done: (s: OpeningState) => boolean) => {
    observe(s);
    for (let i = 0; i < 2400 && !done(s); i++) {
      if (s.guidance.active) s = openingAction(s, { type: 'ack-guide' });
      s = stepOpening(s);
      observe(s);
    }
    if (!done(s))
      throw new Error(`Rehearsal could not reach its checkpoint: ${s.stage}`);
    return s;
  };
  let s = until(
    openingAction(createOpening(), { type: 'enter' }),
    (s) => s.stage === 'door',
  );
  s = until(
    openingAction(s, { type: 'open-door' }),
    (s) => s.stage === 'find-light',
  );
  s = until(
    openingAction(s, { type: 'move', to: LIGHT_POINT }),
    (s) => s.stage === 'equip-light',
  );
  s = openingAction(s, { type: 'equip-light' });
  s = until(
    openingAction(s, { type: 'move', to: BOX_POINT }),
    (s) => s.stage === 'edge',
  );
  s = openingAction(s, {
    type: 'edge-spawns',
    points: [
      { x: s.room.player.x - 13, z: s.room.player.z },
      { x: s.room.player.x + 13, z: s.room.player.z - 1 },
      { x: s.room.player.x, z: s.room.player.z - 13 },
    ],
  });
  s = until(s, (s) => s.stage === 'aftermath');
  for (const c of s.room.caches.filter((c) => c.item.kind === 'lift-material'))
    s = until(
      openingAction(s, { type: 'move', to: c }),
      (s) => !s.room.caches.some((n) => n.id === c.id && !n.opened),
    );
  return until(
    openingAction(s, { type: 'move', to: ELEVATOR }),
    (s) => s.stage === 'home',
  );
}

/** Continue through a real first feeding, ready to review chapter 18 onward. */
export function createAfterlightRehearsal(): OpeningState {
  let s = createHomecomingRehearsal();
  while (s.homecoming.scene !== 'mouth') s = stepOpening(s);
  s = openingAction(s, { type: 'open-mouth' });
  s = openingAction(s, { type: 'feed-core', uid: 'opening-box-item' });
  while (s.homecoming.scene !== 'complete') s = stepOpening(s);
  return s;
}
