import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CARDS, AMPLIFIERS } from './arena-catalog.ts';
import { placeArenaCard, validateArenaBoard } from './arena-engine.ts';
import { makeArenaDuel, OPENING_LINEUP, chooseCounter } from './arena-challenge.ts';
import { simulateDuel } from './demo-combat.ts';
import { cardDef } from './demo-cards.ts';
import { appendMatch, emptyArchive, parseArchive, summarizeMatch } from './arena-archive.ts';

const card = (id, at, uid = `${id}-${at}`) => ({ uid, id, at, rarity: cardDef(id).rarity, quality: 0, level: 0 });

test('arena keeps placement atomic and all fifty cards plus ten amplifiers runnable', () => {
  const original = [card('arena-03', 0)];
  assert.throws(() => placeArenaCard(original, 'arena-02', 2, 'bad'), /不能放在此格/);
  assert.throws(() => placeArenaCard(original, 'arena-01', 1, 'overlap'), /重叠/);
  assert.equal(original.length, 1);
  assert.ok(validateArenaBoard(original));
  for (const entry of ARENA_CARDS) {
    const duel = makeArenaDuel([card(entry.id, 0)], OPENING_LINEUP, [null, null, null]);
    assert.ok(simulateDuel(duel).frames.length > 1, entry.name);
  }
  for (const amp of AMPLIFIERS) {
    const duel = makeArenaDuel([card('arena-03', 0)], OPENING_LINEUP, [amp.id, null, null]);
    assert.ok(simulateDuel(duel).frames.length > 1, amp.name);
  }
});

test('arena replay and archived summary reproduce the same win, damage and break times', () => {
  const duel = makeArenaDuel([card('arena-03', 0), card('arena-03', 3), card('arena-09', 6)], OPENING_LINEUP, ['amp-04', null, 'amp-01']);
  const first = simulateDuel(duel), second = simulateDuel(structuredClone(duel));
  assert.deepEqual(first, second);
  const match = summarizeMatch('one', OPENING_LINEUP.id, null, duel, first);
  assert.equal(match.summary.winner, first.winner);
  assert.deepEqual(match.summary.finalHp, first.frames.at(-1).hp);
  assert.ok(match.summary.totalHits > 0);
  assert.ok(match.summary.brokenAt.flat().some((time) => time !== null));
  const archive = appendMatch(emptyArchive(), match);
  assert.deepEqual(parseArchive(JSON.stringify(archive)), archive);
  assert.throws(() => appendMatch(archive, match), /重复/);
  assert.throws(() => parseArchive('{"version":2,"matches":[]}'), /格式/);
});

test('burn damages a lane shield before host and its amplifier ends with the shield', () => {
  const attacker = [card('arena-11', 0), card('arena-03', 3)];
  const duel = makeArenaDuel(attacker, OPENING_LINEUP, [null, null, null]);
  duel.enemy = [];
  duel.arena.amplifiers[1] = ['amp-01', null, null];
  const result = simulateDuel(duel);
  const before = result.frames.find((frame) => frame.burn[1][0] > 0 && !frame.barriers[1][0].broken);
  assert.ok(before, 'burn lands while the shield is intact');
  assert.equal(before.hp[1], 300, 'burn first damages the shield');
  const broken = result.frames.find((frame) => frame.barriers[1][0].broken);
  assert.ok(broken, 'sustained burn eventually breaks the shield');
  assert.equal(broken.amplifierActive[1][0], false);
});

test('counter search is deterministic and never claims a win without a winning simulation', () => {
  const player = [card('arena-03', 0), card('arena-03', 3), card('arena-09', 6)];
  const first = chooseCounter(player, [null, null, null], OPENING_LINEUP.id);
  const second = chooseCounter(player, [null, null, null], OPENING_LINEUP.id);
  assert.deepEqual(first, second);
  assert.equal(first.tested, 10);
  const replay = simulateDuel(makeArenaDuel(player, first.lineup, [null, null, null]));
  assert.equal(first.counterFound, replay.winner === 1);
});
