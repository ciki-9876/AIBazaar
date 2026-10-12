// Deterministic team audit. Actual owned pool, no duplicate player gear, real auto-play.
import {
  createAdventure,
  advanceDialogue,
  chooseDialogue,
  walkAdventure,
  interactAdventure,
  visibleHotspots,
  battleSetup,
  finishAdventureBattle,
  buyOffer,
  upgradeItem,
} from '../src/lib/adventure/magician-world.ts';
import {
  createThrowDuel,
  setAutoPlay,
  stepThrowDuelInPlace,
  TICK_MS,
} from '../src/lib/cards/throw-duel.ts';
import { PRESETS, packThrowItems } from '../src/lib/cards/throw-loadout.ts';
import {
  fitMemberThrowLoadout,
  freeTeamPoolMany,
  validTeamAllocationMany,
  bookRefs,
} from '../src/lib/cards/throw-team.ts';
const read = (s) => {
  for (let i = 0; i < 60 && s.mode === 'dialogue'; i++) {
    const n = advanceDialogue(s);
    if (n === s) break;
    s = n;
  }
  return s;
};
function go(s, id) {
  const h = visibleHotspots(s).find((x) => x.id === id);
  if (!h) throw Error(`${s.map}/${id}`);
  for (let i = 0; Math.abs(s.player.x - h.x) > 4 && i < 1200; i++)
    s = walkAdventure(s, s.player.x < h.x ? 1 : -1, 1);
  return interactAdventure(s, id);
}
const city = (s) => (s.map === 'millbrook' ? s : go(s, `${s.map}-exit`));
const room = (s, id) => (s.map === id ? s : go(city(s), `${id}-door`));
const talk = (s, id) => read(go(s, id));
const sampleCount = Number(process.argv[2] ?? 20);
const goldProfile = process.argv[3] === 'gold';
const findings = {};
function tune(s, id) {
  if (s.itemUpgrades[id] === 'gold') return s;
  const shop = { ...s, mode: 'panel', panel: 'shop' };
  let paid = buyOffer(shop, `mb-${id}`);
  if (paid === shop) throw Error(`Cannot buy ${id} with £${s.fee}`);
  paid = upgradeItem({ ...paid, panel: 'workshop' }, id, 'silver');
  paid = upgradeItem(paid, id, 'gold');
  if (paid.itemUpgrades[id] !== 'gold')
    throw Error(`Cannot tune ${id} with £${paid.fee}`);
  return { ...paid, mode: s.mode, panel: s.panel };
}
function fight(s, who, kind, seed) {
  const adventure = chooseDialogue(talk(s, who), kind),
    setup = battleSetup(adventure);
  if (!setup) throw Error(`Cannot start ${kind}`);
  const pool = {
    ...setup.available,
    variants: [
      ...new Set([
        ...setup.variants,
        ...setup.playerTeam.flatMap((r) => bookRefs(r.book)),
      ]),
    ],
  };
  const primary = fitMemberThrowLoadout(
    {
      style: 'quick',
      layout: packThrowItems(PRESETS.quick.items),
      relic: PRESETS.quick.relic,
      book: {},
    },
    pool,
  );
  const kits = [primary],
    team = [];
  for (const r of setup.playerTeam.slice(0, 2)) {
    const kit = fitMemberThrowLoadout(
      {
        style: r.style,
        layout: packThrowItems(r.items),
        relic: r.relic ?? null,
        book: r.book,
      },
      freeTeamPoolMany(pool, kits),
    );
    kits.push(kit);
    team.push({
      ...r,
      ...kit,
      items: kit.layout.map((x) => x.id),
      upgrades: adventure.itemUpgrades,
    });
  }
  if (!validTeamAllocationMany(kits, pool))
    throw Error('Non-exclusive player pool');
  const duel = setAutoPlay(
    createThrowDuel(
      seed,
      primary.layout.map((x) => x.id),
      setup.enemyStyle,
      primary.relic,
      setup.enemyRelic,
      primary.layout,
      { enemy: setup.enemyBook },
      {
        enemyItems: setup.enemyItems,
        performers: { player: 'eli', enemy: setup.enemyPerformer },
        presence: { player: setup.presence.eli, enemy: setup.enemyPresence },
        playerReserves: team,
        enemyReserves: setup.enemyTeam,
        stanEncore: setup.stanEncore,
        playerUpgrades: adventure.itemUpgrades,
      },
    ),
    true,
  );
  let steps = 0;
  while (duel.status === 'playing' && steps++ < 30000)
    stepThrowDuelInPlace(duel);
  const record = (findings[kind] ??= {
    wins: 0,
    samples: 0,
    seconds: [],
    playerSeats: [],
    enemySeats: [],
  });
  record.samples++;
  record.wins += duel.winner === 0 ? 1 : duel.winner === 'draw' ? 0.5 : 0;
  record.seconds.push((duel.tick * TICK_MS) / 1000);
  record.playerSeats.push(duel.activeSeats[0] + 1);
  record.enemySeats.push(duel.activeSeats[1] + 1);
  // Carry real growth and first-win rewards; bypass only outcome for story coverage after recording it.
  return read(
    finishAdventureBattle(adventure, adventure.battle.id, 0, {
      suits: duel.fighters[1].tally.suits,
      kinds: duel.stats[1].kinds,
      performer: 'eli',
      participants: ['eli', 'juno', 'stan'],
    }),
  );
}
for (let seed = 1; seed <= sampleCount; seed++) {
  let s = read(createAdventure(seed, 4));
  s = talk(room(s, 'mb-hall'), 'mb-edith');
  s = talk(room(s, 'mb-pub'), 'mb-stan');
  if (goldProfile) s = tune(s, 'quick');
  s = fight(room(s, 'mb-hall'), 'mb-edith', 'mb-entry', seed * 31);
  if (goldProfile) s = tune(s, 'sequence');
  s = fight(s, 'mb-holt', 'mb-regular', seed * 31 + 1);
  s = talk(room(s, 'mb-mill'), 'mb-wire');
  s = talk(s, 'mb-ledger');
  s = talk(room(s, 'mb-hall'), 'mb-edith');
  s = talk(room(s, 'mb-mill'), 'mb-mia');
  if (goldProfile) s = tune(s, 'ward');
  s = fight(room(s, 'mb-hall'), 'mb-holt', 'mb-rematch', seed * 31 + 2);
  s = talk(s, 'mb-holt');
  s = read(
    chooseDialogue(talk(room(s, 'mb-pub'), 'mb-stan'), 'mb-stan-return'),
  );
  s = fight(room(s, 'mb-hall'), 'mb-holt', 'mb-final', seed * 31 + 3);
  s = fight(room(s, 'mb-square'), 'mb-pip', 'mb-brass', seed * 31 + 4);
  s = fight(s, 'mb-bonfire', 'mb-bonfire', seed * 31 + 5);
  s = fight(s, 'mb-midnight', 'mb-night', seed * 31 + 6);
}
for (const [kind, r] of Object.entries(findings)) {
  const sorted = r.seconds.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      kind,
      samples: r.samples,
      winRate: r.wins / r.samples,
      medianSeconds: sorted[Math.floor(sorted.length / 2)],
      maxSeconds: Math.max(...sorted),
      meanPlayerSeats: r.playerSeats.reduce((a, b) => a + b) / r.samples,
      meanEnemySeats: r.enemySeats.reduce((a, b) => a + b) / r.samples,
    }),
  );
}
