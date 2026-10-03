import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSave } from '../packages/core/save-envelope.ts';
import { createWandeng, serializeWandeng, parseWandeng, serializeWandengReplay, parseWandengReplay, wandengReducer } from '../lib/wandeng-game.ts';
import { createOpening } from '../lib/survival-opening.ts';
import { readOpeningCheckpoint, serializeOpeningCheckpoint, OPENING_SAVE_KEY } from '../lib/survival-checkpoint.ts';
import { emptyArchive, serializeArchive, parseArchive, ARENA_ARCHIVE_KEY } from '../lib/arena-archive.ts';
import { makeTrainingDuel, parseTrainingDuel, exportTrainingDuel } from '../lib/wandeng-training.ts';
import { simulateArenaDuel } from '../lib/arena-engine.ts';

test('card saves restore identical states from current envelopes and legacy JSON without changing storage namespaces', () => {
  const state = createWandeng(20261003);
  assert.deepEqual(parseWandeng(serializeWandeng(state)), parseWandeng(JSON.stringify(state)));
  assert.throws(() => parseWandeng(encodeSave('elevator', 'f9-survival/6', createOpening())), /其他产品/);
  assert.throws(() => parseWandeng(encodeSave('cards', 'future/2', state)), /规则版本/);
});
test('elevator checkpoints retain old version migration and reject damaged or foreign envelopes', () => {
  const state = createOpening();
  assert.deepEqual(readOpeningCheckpoint(serializeOpeningCheckpoint(state)), readOpeningCheckpoint(JSON.stringify(state)));
  const old = structuredClone(state); old.version = 5;
  assert.deepEqual(readOpeningCheckpoint(serializeOpeningCheckpoint(old)), readOpeningCheckpoint(JSON.stringify(old)));
  const corrupt = JSON.parse(serializeOpeningCheckpoint(state)); corrupt.payload.room.serial++;
  assert.equal(readOpeningCheckpoint(JSON.stringify(corrupt)), null);
  assert.equal(readOpeningCheckpoint(serializeWandeng(createWandeng())), null);
  assert.equal(OPENING_SAVE_KEY, 'f9-survival-opening-v4');
  assert.equal(ARENA_ARCHIVE_KEY, 'f9-arena-matches-v1');
});
test('legacy and current battle replay files reproduce exactly the same combat', () => {
  let state = wandengReducer(createWandeng(), { type: 'comic-done' });
  state = wandengReducer(state, { type: 'lesson-next' });
  state = wandengReducer(state, { type: 'place', uid: state.inventory[3].uid, at: 5 });
  state = wandengReducer(state, { type: 'start-lesson' });
  const battle = state.battle;
  for (const text of [serializeWandengReplay(battle), JSON.stringify({ version: 1, battle })]) assert.deepEqual(simulateArenaDuel(parseWandengReplay(text).duel), simulateArenaDuel(battle.duel));
  assert.throws(() => parseWandengReplay(encodeSave('elevator', 'f9-survival/6', { version: 1, battle })), /其他产品/);
  const archive = emptyArchive();
  assert.deepEqual(parseArchive(serializeArchive(archive)), parseArchive(JSON.stringify(archive)));
  for (const version of ['original-v1', 'tuned-v1']) {
    const duel = makeTrainingDuel(version);
    const legacy = JSON.stringify({ format: 'wandeng-training-v1', duel });
    assert.deepEqual(parseTrainingDuel(exportTrainingDuel(duel)), parseTrainingDuel(legacy));
  }
});
