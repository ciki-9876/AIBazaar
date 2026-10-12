import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUpgradeItem,
  validItemUpgrades,
  itemValue,
  upgradedItemText,
  ITEM_TUNING,
} from './throw-upgrades.ts';
import { previewThrow, costumeRate } from './throw-duel.ts';
import { ITEMS } from './throw-loadout.ts';
const cards = (suit, ranks) =>
  ranks.map((rank, index) => ({ suit, rank, uid: `${suit}-${index}` }));
test('every item tunes its own mechanism and its description, never its trigger', () => {
  for (const item of ITEMS) {
    const silver = upgradedItemText(item.id, { [item.id]: 'silver' }),
      gold = upgradedItemText(item.id, { [item.id]: 'gold' });
    assert.notEqual(silver, item.text, item.id);
    assert.notEqual(gold, silver, item.id);
    assert.doesNotMatch(gold, /改装额外|buff/);
    for (const [key, [base, s, g]] of Object.entries(ITEM_TUNING[item.id])) {
      assert.equal(itemValue(item.id, key, base), base);
      assert.equal(itemValue(item.id, key, base, { [item.id]: 'gold' }), g);
      assert.ok(item.id === 'draw' ? g < s && s < base : g > s && s > base);
    }
  }
  assert.match(upgradedItemText('focus', { focus: 'gold' }), /≥5 张.*\+52/);
  assert.match(upgradedItemText('draw', { draw: 'gold' }), /2 次.*1 张/);
  assert.match(
    upgradedItemText('sequence', { sequence: 'gold' }),
    /42／56／72.*≥7/,
  );
});
test('real preview tunes damage, piercing, statuses, cleanup, slower draw threshold, links and costumes', () => {
  const context = {
    upgrades: {
      quick: 'gold',
      needle: 'gold',
      cinder: 'gold',
      poison: 'gold',
      ward: 'gold',
      mend: 'gold',
      wash: 'gold',
      draw: 'gold',
    },
    throws: 1,
  };
  assert.equal(
    previewThrow(cards(3, [8]), ['quick', 'needle', 'cinder'], context)
      .itemBonus,
    16,
  );
  assert.equal(
    previewThrow(cards(3, [8]), ['quick', 'needle', 'cinder'], context).pierce,
    60,
  );
  assert.equal(previewThrow(cards(3, [8]), ['cinder'], context).burn, 6);
  assert.equal(previewThrow(cards(2, [8]), ['poison'], context).poison, 6);
  assert.equal(previewThrow(cards(0, [8]), ['ward'], context).shield, 12);
  assert.equal(previewThrow(cards(1, [8]), ['mend'], context).heal, 9);
  assert.equal(previewThrow(cards(1, [8]), ['wash'], context).cleanseBurn, 8);
  assert.equal(previewThrow(cards(1, [8]), ['draw'], context).draw, 1);
  assert.equal(
    previewThrow(cards(3, [8]), ['cinder', 'bellows'], {
      upgrades: { bellows: 'gold' },
    }).burn,
    6,
  );
  assert.equal(costumeRate(['quick', 'sequin'], { sequin: 'gold' }).rate, 50);
});
test('gold count is unlimited but tier ordering and invalid maps remain strict', () => {
  const upgrades = Object.freeze({
    quick: 'gold',
    pair: 'gold',
    ward: 'silver',
  });
  assert.equal(canUpgradeItem({}, 'quick', 'gold'), false);
  assert.equal(canUpgradeItem({}, 'needle', 'silver'), true);
  assert.equal(canUpgradeItem(upgrades, 'ward', 'gold'), true);
  assert.equal(canUpgradeItem(upgrades, 'quick', 'silver'), false);
  assert.equal(
    validItemUpgrades(Object.fromEntries(ITEMS.map(({ id }) => [id, 'gold']))),
    true,
  );
  for (const bad of [null, [], { missing: 'silver' }, { quick: 'bronze' }])
    assert.equal(validItemUpgrades(bad), false);
});
