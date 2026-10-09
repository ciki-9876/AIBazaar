import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS, RELICS } from '../cards/throw-loadout.ts';
import { MAPS, CHARACTERS } from './magician-world.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const stage = path.resolve(here, '../../app/stage');
const read = (file) => readFileSync(path.join(stage, file), 'utf8');

test('every item and relic has its own vector glyph', () => {
  const source = read('glyphs.tsx');
  for (const { id } of [...ITEMS, ...RELICS])
    assert.match(source, new RegExp(`\\n  ${id}: `), `missing glyph for ${id}`);
});

test('every speaking character and NPC hotspot has a vector rig', () => {
  const source = read('rig.tsx');
  const rigs = Object.keys(CHARACTERS).filter((id) => id !== 'narrator');
  for (const id of rigs) assert.match(source, new RegExp(`\\n  ${id}: \\{`), `missing rig for ${id}`);
  for (const map of Object.values(MAPS))
    for (const spot of map.hotspots)
      if (spot.kind === 'npc') assert.ok(rigs.includes(spot.character), spot.id);
});

test('each map has an authored set and the throw project ships no bitmap art', () => {
  const sets = read('stage-scene.tsx');
  for (const id of Object.keys(MAPS)) assert.match(sets, new RegExp(`\\b${id}: \\w+Set`));
  const app = path.resolve(here, '../../..');
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (['node_modules', 'dist', '.public', '.vinext'].includes(name)) return [];
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  for (const file of walk(app)) {
    assert.doesNotMatch(file, /\.(png|jpe?g|webp|gif)$/i, `bitmap found: ${file}`);
    if (/\.(tsx?|css)$/.test(file))
      assert.doesNotMatch(readFileSync(file, 'utf8'), /art-assets\//, `bitmap reference in ${file}`);
  }
});
