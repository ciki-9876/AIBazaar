import { canonicalJson } from '../packages/core/serialization.ts';
import { createHash } from 'node:crypto';
import { createSurvival, survivalAction, stepSurvival, ITEMS } from '../lib/survival-room.ts';
import { simulateArenaDuel } from '../lib/arena-engine.ts';

export const digest = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');
export function replayGolden(fixture) {
  if (fixture.product === 'cards') return digest(simulateArenaDuel(structuredClone(fixture.duel)));
  let state = createSurvival(fixture.seed);
  state = { ...state, status: 'running', leftLift: true, player: { ...state.player, ...fixture.player }, bag: fixture.gear.map((kind, i) => ({ ...ITEMS[kind], uid: `golden-${i}` })) };
  fixture.gear.forEach((kind, i) => { state = survivalAction(state, { type: 'equip', uid: `golden-${i}`, slot: i * 3 }); });
  const hashes = [digest(state)];
  for (let tick = 0; tick < fixture.ticks; tick++) {
    const segment = fixture.inputs.find((s) => tick >= s.from && tick < s.until);
    state = stepSurvival(state, segment?.input ?? {});
    if ((tick + 1) % 120 === 0) hashes.push(digest(state));
  }
  return hashes;
}
