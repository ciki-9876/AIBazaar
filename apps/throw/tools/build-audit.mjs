// Build-space audit: how strong are arbitrary legal trunks against the six presets?
//
//   node apps/throw/tools/build-audit.mjs sample  <count> <seeds> <shard>/<shards> <out.json>
//   node apps/throw/tools/build-audit.mjs sample-spec <count> <seeds> <shard>/<shards> <out.json>
//   node apps/throw/tools/build-audit.mjs refine  <seeds> <top> <out.json> <in.json> [in.json ...]
//   node apps/throw/tools/build-audit.mjs report  <refined.json> <in.json> [in.json ...]
//
// Sampling is deterministic: trunk i is generated from its own index, so shards
// can run in parallel and still describe the same population. A trunk is the 24
// items shuffled and packed greedily until 10 cells are full, plus a relic drawn
// uniformly from the relics and "none". Its AI policy is the style of the family
// that fills most cells (combo items count as combo, other damage as quick).
// Every trunk plays every preset on both seats; score = mean win share.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BAG_CELLS, COMPETITIVE_STYLES, ITEMS, PRESETS, RELICS, itemDefinition } from '../src/lib/cards/throw-loadout.ts';
import { playDuel, seedAt } from './sim-proxy.mjs';

const COMBO_ITEMS = new Set(['sequence', 'suit', 'focus']);
const STYLE_OF_FAMILY = { shield: 'guard', heal: 'mend', burn: 'burn', poison: 'poison' };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleTrunk(index) {
  const random = rng(0x5eed + index * 2654435761);
  const pool = ITEMS.map((item) => item.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const items = [];
  let used = 0;
  for (const id of pool) {
    const size = itemDefinition(id).size;
    if (used + size <= BAG_CELLS) {
      items.push(id);
      used += size;
    }
  }
  const relics = [...RELICS.map((relic) => relic.id), null];
  const relic = relics[Math.floor(random() * relics.length)];
  return { items, relic, style: styleFor(items) };
}

/**
 * Specialist trunks for the costume check: one or two families plus utility,
 * with the matching costume (vest for one family, coat for two) half the time.
 */
const SPEC_FAMILIES = ['damage', 'burn', 'poison', 'shield', 'heal'];
/** Family-specific helpers only go with their family; general helpers go anywhere. */
const UTILITY_FOR = { bellows: 'burn', venom: 'poison' };
const utilityFits = (id, families) => !UTILITY_FOR[id] || families.has(UTILITY_FOR[id]);
export function sampleSpecialist(index) {
  const random = rng(0xc0a7 + index * 2246822519);
  const pick = () => SPEC_FAMILIES[Math.floor(random() * SPEC_FAMILIES.length)];
  const families = new Set([pick()]);
  if (random() < 0.5) while (families.size < 2) families.add(pick());
  const costume = random() < 0.5 ? (families.size === 1 ? 'sequin' : 'tailcoat') : null;
  const pool = ITEMS.filter((item) => item.id !== 'sequin' && item.id !== 'tailcoat' &&
    (families.has(item.family) || (item.family === 'utility' && utilityFits(item.id, families)))).map((item) => item.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const items = costume ? [costume] : [];
  let used = costume ? itemDefinition(costume).size : 0;
  for (const id of pool) {
    const size = itemDefinition(id).size;
    if (used + size <= BAG_CELLS) {
      items.push(id);
      used += size;
    }
  }
  const relics = [...RELICS.map((relic) => relic.id), null];
  return { items, relic: relics[Math.floor(random() * relics.length)], style: styleFor(items), costume };
}
/** Cells per non-utility family; combo items form their own bucket. */
export function familyCells(items) {
  const cells = {};
  for (const id of items) {
    const item = itemDefinition(id);
    const key = COMBO_ITEMS.has(id) ? 'combo' : item.family;
    if (key === 'utility') continue;
    cells[key] = (cells[key] ?? 0) + item.size;
  }
  return cells;
}
export function styleFor(items) {
  const best = Object.entries(familyCells(items)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'damage';
  return best === 'combo' ? 'combo' : best === 'damage' ? 'quick' : STYLE_OF_FAMILY[best];
}

export function scoreTrunk(trunk, seeds) {
  let total = 0,
    games = 0;
  const per = {};
  for (const style of COMPETITIVE_STYLES) {
    const preset = { style, items: PRESETS[style].items, relic: PRESETS[style].relic };
    let share = 0;
    for (let i = 0; i < seeds; i++) {
      const seed = seedAt(i) + 31337;
      share += playDuel(trunk, preset, seed).score;
      share += 1 - playDuel(preset, trunk, seed).score;
    }
    per[style] = share / (2 * seeds);
    total += share;
    games += 2 * seeds;
  }
  return { score: total / games, per };
}

const main = import.meta.url === pathToFileURL(process.argv[1]).href;
const [mode, ...args] = main ? process.argv.slice(2) : [];
if (!main) {
  // Imported as a library.
} else if (mode === 'sample') {
  const [count, seeds, shardArg, out] = args;
  const [shard, shards] = shardArg.split('/').map(Number);
  const rows = [];
  const started = Date.now();
  for (let i = shard; i < Number(count); i += shards) {
    const trunk = sampleTrunk(i);
    rows.push({ index: i, ...trunk, ...scoreTrunk(trunk, Number(seeds)) });
    if (rows.length % 100 === 0) console.error(`shard ${shard}: ${rows.length} trunks, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  writeFileSync(out, JSON.stringify({ seeds: Number(seeds), rows }));
} else if (mode === 'sample-spec') {
  const [count, seeds, shardArg, out] = args;
  const [shard, shards] = shardArg.split('/').map(Number);
  const rows = [];
  for (let i = shard; i < Number(count); i += shards) {
    const trunk = sampleSpecialist(i);
    rows.push({ index: `spec:${i}`, ...trunk, ...scoreTrunk(trunk, Number(seeds)) });
  }
  writeFileSync(out, JSON.stringify({ seeds: Number(seeds), rows }));
} else if (mode === 'refine') {
  const [seeds, top, out, ...inputs] = args;
  const rows = inputs.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')).rows);
  rows.sort((a, b) => b.score - a.score);
  const picked = rows.slice(0, Number(top)).map((row) => ({ index: row.index, items: row.items, relic: row.relic, style: row.style, screen: row.score }));
  const presets = COMPETITIVE_STYLES.map((style) => ({ index: `preset:${style}`, items: [...PRESETS[style].items], relic: PRESETS[style].relic, style }));
  const refined = [...presets, ...picked].map((trunk) => ({ ...trunk, ...scoreTrunk(trunk, Number(seeds)) }));
  writeFileSync(out, JSON.stringify({ seeds: Number(seeds), rows: refined }));
} else if (mode === 'report') {
  const [refinedFile, ...inputs] = args;
  const rows = inputs.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')).rows);
  const refined = JSON.parse(readFileSync(refinedFile, 'utf8')).rows;
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const scores = rows.map((row) => row.score).sort((a, b) => a - b);
  const q = (p) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))];
  console.log(`Screened ${rows.length} trunks (screen seeds per side ${JSON.parse(readFileSync(inputs[0], 'utf8')).seeds})`);
  console.log(`score percentiles: p10 ${pct(q(0.1))}  p50 ${pct(q(0.5))}  p90 ${pct(q(0.9))}  p99 ${pct(q(0.99))}  max ${pct(scores.at(-1))}`);
  const families = (row) => Object.keys(familyCells(row.items)).length;
  console.log('\nmean screen score by number of non-utility families:');
  for (let n = 1; n <= 6; n++) {
    const group = rows.filter((row) => families(row) === n);
    if (group.length) console.log(`  ${n} famil${n === 1 ? 'y' : 'ies'}: n=${group.length}  mean ${pct(group.reduce((s, r) => s + r.score, 0) / group.length)}  best ${pct(Math.max(...group.map((r) => r.score)))}`);
  }
  const top = [...rows].sort((a, b) => b.score - a.score).slice(0, Math.ceil(rows.length * 0.05));
  const freq = (set, id) => set.filter((row) => row.items.includes(id)).length / set.length;
  console.log('\nitem lift in the top 5% (share in top / share overall):');
  const lifts = ITEMS.map((item) => ({ id: item.id, name: item.name, lift: freq(top, item.id) / Math.max(1e-9, freq(rows, item.id)), top: freq(top, item.id) }));
  for (const entry of lifts.sort((a, b) => b.lift - a.lift)) console.log(`  ${entry.name.padEnd(6, '　')} ${entry.lift.toFixed(2)}×  (in ${pct(entry.top)} of top)`);
  const relicFreq = (set, id) => set.filter((row) => row.relic === id).length / set.length;
  console.log('\nrelic lift in the top 5%:');
  for (const id of [...RELICS.map((relic) => relic.id), null]) console.log(`  ${(RELICS.find((relic) => relic.id === id)?.name ?? '不带').padEnd(6, '　')} ${(relicFreq(top, id) / Math.max(1e-9, relicFreq(rows, id))).toFixed(2)}×`);
  console.log(`\nrefined (seeds per side ${JSON.parse(readFileSync(refinedFile, 'utf8')).seeds}), presets first, then strongest trunks:`);
  const name = (id) => ITEMS.find((item) => item.id === id)?.name ?? id;
  const ordered = [...refined.filter((row) => String(row.index).startsWith('preset')), ...refined.filter((row) => !String(row.index).startsWith('preset')).sort((a, b) => b.score - a.score)];
  for (const row of ordered.slice(0, 26))
    console.log(`  ${pct(row.score).padStart(6)}  [${row.style}] ${row.items.map(name).join('、')} + ${RELICS.find((relic) => relic.id === row.relic)?.name ?? '不带'}  | ${COMPETITIVE_STYLES.map((s) => `${s.slice(0, 2)} ${(row.per[s] * 100).toFixed(0)}`).join(' ')}`);
  const trunks = refined.filter((row) => !String(row.index).startsWith('preset'));
  console.log(`\nrefined top trunks: ${trunks.filter((r) => r.score > 0.65).length}/${trunks.length} above 65%; best ${pct(Math.max(...trunks.map((r) => r.score)))}`);
} else {
  console.error('usage: sample | refine | report (see header)');
  process.exit(1);
}
