// Usage: node apps/throw/tools/story-sim.mjs [N=40] [battleId ...]
// Plays likely player trunks against story battles to check the difficulty curve.
// PRESENCE=340 sets the hero's 气场 (default 320); opponents use their battle's presence (v11).
import { BATTLES } from '../src/lib/adventure/magician-world.ts';
import { playDuel, seedAt } from './sim-proxy.mjs';

const N = Number(process.argv[2] || 40);
const only = process.argv.slice(3);
const HERO = Number(process.env.PRESENCE || 320);
/** Trunks a player plausibly carries in act two. Extend when an act adds kit. */
export const KITS = {
  early: { style: 'guard', items: ['pair', 'umbrella', 'ward', 'thorns', 'quick', 'wash', 'draw'], relic: 'bastion' },
  mend: { style: 'mend', items: ['mend', 'wash', 'drain', 'pair', 'quick', 'draw'], relic: 'heart' },
  guard: { style: 'guard', items: ['umbrella', 'ward', 'thorns', 'pair', 'mend'], relic: 'bastion' },
  poison: { style: 'poison', items: ['poison', 'venom', 'slow', 'pair', 'draw'], relic: 'toxin' },
  burn: { style: 'burn', items: ['cinder', 'bellows', 'ash', 'pair', 'draw'], relic: 'ember' },
  combo: { style: 'combo', items: ['sequence', 'suit', 'focus', 'pair'], relic: null },
};
for (const [id, def] of Object.entries(BATTLES)) {
  if (def.act < 2 || (only.length && !only.includes(id))) continue;
  const enemy = { style: def.style, items: def.items, relic: def.relic, book: def.book, terms: def.terms, performer: def.performer, presence: def.presence };
  const kits = def.kit?.only ? { forced: { style: 'poison', items: def.kit.only.items, relic: def.kit.only.relic } } : KITS;
  const cells = Object.entries(kits)
    .filter(([, kit]) => !def.kit?.banFamilies || def.kit.banFamilies.length === 0 || !kit.items.some((item) => ['umbrella', 'ward', 'thorns', 'shieldbash'].includes(item)))
    .map(([name, kit]) => {
      let score = 0;
      // The hero is always Eli on stage (talent: 压箱底; the proxy never uses his false shuffle).
      for (let i = 0; i < N; i++) score += playDuel({ ...kit, performer: 'eli', presence: HERO }, enemy, seedAt(i) + 2000).score;
      return `${name} ${((score / N) * 100).toFixed(0)}%`;
    });
  console.log(id.padEnd(14), cells.join(' · '));
}
