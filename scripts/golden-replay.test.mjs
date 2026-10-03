import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { replayGolden } from './golden-replay.mjs';
import { CARD_RULES_VERSION } from '../lib/wandeng-game.ts';
import { SURVIVAL_RULES_VERSION } from '../lib/survival-checkpoint.ts';

const fixtures = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/replays-v1.json', import.meta.url), 'utf8'));
for (const fixture of fixtures) test(`golden replay: ${fixture.id} (${fixture.rulesVersion})`, () => {
  assert.equal(fixture.rulesVersion, fixture.product === 'cards' ? CARD_RULES_VERSION : SURVIVAL_RULES_VERSION);
  assert.deepEqual(replayGolden(fixture), fixture.expected);
});
