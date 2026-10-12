import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RELICS, swapThrowItems, validThrowLayout } from './throw-loadout.ts';
import {
  ITEM_LABELS, RELIC_LABELS, kitCompatibility,
  EMPTY_KIT_FILTERS, kitFilterTags, matchesKitTags, matchesKitFilters, toggleKitFilter,
  counterKitRecommendations, revealedKitRecommendations,
  availableKitFilterTags,
} from './throw-kit-guide.ts';
import { hasAvailableVariant } from './throw-deckcase-guide.ts';
import { legendaryFor } from './throw-enchant.ts';
import { previewThrow } from './throw-duel.ts';

test('successive facet choices always retain a matching owned item, including secondary outputs', () => {
  const catalog = ITEMS.map(({ id }) => ({ kind: 'item', id }));
  let selected = toggleKitFilter(EMPTY_KIT_FILTERS, 'effect', '治疗');
  const afterHeal = availableKitFilterTags(catalog, selected);
  assert.ok(afterHeal.effect.includes('净化'));
  assert.equal(afterHeal.effect.includes('灼烧'), false);
  assert.equal(afterHeal.play.includes('方块'), false);
  for (const category of ['play', 'effect']) for (const tag of afterHeal[category])
    assert.ok(catalog.some(({ kind, id }) => matchesKitFilters(kind, id, toggleKitFilter(selected, category, tag))));
  selected = toggleKitFilter(selected, 'effect', '净化');
  assert.deepEqual(catalog.filter(({ kind, id }) => matchesKitFilters(kind, id, selected)).map(({ id }) => id), ['mend', 'drain']);
  selected = toggleKitFilter(selected, 'play', '红心');
  assert.deepEqual(availableKitFilterTags(catalog, selected), { play: ['红心'], effect: ['治疗', '净化'] });
  assert.equal(availableKitFilterTags([{kind:'item',id:'quick'}], EMPTY_KIT_FILTERS).effect.includes('治疗'), false, 'unowned labels are absent');
});

test('every item and relic has precisely a trigger tag and a primary effect tag', () => {
  for (const [catalog, labels] of [[ITEMS, ITEM_LABELS], [RELICS, RELIC_LABELS]]) {
    assert.deepEqual(Object.keys(labels).sort(), catalog.map((entry) => entry.id).sort());
    for (const entry of catalog) {
      assert.deepEqual(Object.keys(labels[entry.id]).sort(), ['effect', 'play']);
      assert.ok(labels[entry.id].play && labels[entry.id].effect);
    }
  }
  assert.deepEqual(ITEM_LABELS.needle, { play: '单张', effect: '穿透' });
  assert.equal(ITEM_LABELS.ash.effect, '直伤');
  assert.equal(RELIC_LABELS.heart.effect, '治疗');
});

test('swapping equal-size equipped items exchanges their exact positions without changing the input', () => {
  const initial = [{ id: 'quick', start: 0 }, { id: 'tempo', start: 4 }, { id: 'pair', start: 7 }];
  const before = structuredClone(initial);
  assert.deepEqual(swapThrowItems(initial, 'quick', 'tempo'), [
    { id: 'tempo', start: 0 }, { id: 'quick', start: 4 }, { id: 'pair', start: 7 },
  ]);
  assert.deepEqual(initial, before);
});

test('unequal-size swaps validate both destinations atomically, including third-party items and boundaries', () => {
  const fits = [{ id: 'quick', start: 0 }, { id: 'sequence', start: 5 }];
  const swapped = swapThrowItems(fits, 'quick', 'sequence');
  assert.ok(validThrowLayout(swapped));
  assert.deepEqual(swapped, [{ id: 'sequence', start: 0 }, { id: 'quick', start: 5 }]);
  const crowded = [...fits, { id: 'tempo', start: 1 }];
  assert.equal(swapThrowItems(crowded, 'quick', 'sequence'), crowded);
  const atEdge = [{ id: 'sequence', start: 0 }, { id: 'quick', start: 9 }];
  assert.equal(swapThrowItems(atEdge, 'quick', 'sequence'), atEdge);
  const overlapping = [{ id: 'quick', start: 0 }, { id: 'sequence', start: 1 }];
  assert.equal(swapThrowItems(overlapping, 'quick', 'sequence'), overlapping);
});

test('pack-to-board and board-to-pack replacements preserve all unrelated cells and reject invalid sizes', () => {
  const layout = [{ id: 'quick', start: 0 }, { id: 'tempo', start: 2 }];
  const replacement = [{ id: 'ward', start: 0 }, { id: 'tempo', start: 2 }];
  assert.deepEqual(swapThrowItems(layout, 'ward', 'quick'), replacement);
  assert.deepEqual(swapThrowItems(layout, 'quick', 'ward'), replacement);
  assert.equal(swapThrowItems(layout, 'sequence', 'quick'), layout);
  assert.equal(swapThrowItems(layout, 'quick', 'quick'), layout);
  assert.equal(swapThrowItems(layout, 'sequence', 'ward'), layout);
  assert.equal(swapThrowItems(layout, 'unknown', 'quick'), layout);
});

test('recommended adjacency links match real effects instead of merely sharing a family colour', () => {
  const card = [{ uid: 'proof', suit: 3, rank: 2 }];
  const alone = previewThrow(card, ['cinder'], { layout: [{ id: 'cinder', start: 0 }] });
  const linked = previewThrow(card, ['cinder', 'bellows'], { layout: [{ id: 'cinder', start: 0 }, { id: 'bellows', start: 2 }] });
  assert.ok(kitCompatibility('cinder', 'bellows'));
  assert.ok(linked.effects.find((effect) => effect.source === 'item:cinder').value > alone.effects.find((effect) => effect.source === 'item:cinder').value);
  assert.equal(kitCompatibility('ash', 'bellows'), null, 'ash is in the burn family but produces direct damage');
  assert.equal(kitCompatibility('slow', 'venom'), null, 'slow belongs to the poison family but does not apply poison');
  assert.equal(kitCompatibility('needle', 'compass'), null, 'penetration is not an amplifiable output');
  assert.equal(kitCompatibility('growth', 'tempo'), null, 'successive same-suit and changed-suit triggers are incompatible');
});

test('compatibility is symmetric and costume badges require a viable current family count', () => {
  for (const left of ITEMS) for (const right of ITEMS)
    assert.equal(kitCompatibility(left.id, right.id), kitCompatibility(right.id, left.id));
  assert.ok(kitCompatibility('sequin', 'quick', [{ id: 'needle', start: 0 }]));
  assert.equal(kitCompatibility('sequin', 'quick', [{ id: 'cinder', start: 0 }]), null);
  assert.equal(kitCompatibility('tailcoat', 'quick'), null);
  assert.ok(kitCompatibility('tailcoat', 'quick', [{ id: 'cinder', start: 0 }]));
});

test('variant filter includes collected-but-unequipped variants, validates exact card slots, and handles empty ownership', () => {
  const ownership = ['1-14:edge', `0-2:${legendaryFor(0, 2).id}`, '2-6:not-real', `3-8:${legendaryFor(0, 2).id}`];
  assert.equal(hasAvailableVariant(1, 14, ownership), true);
  assert.equal(hasAvailableVariant(0, 2, ownership), true);
  assert.equal(hasAvailableVariant(1, 13, ownership), false);
  assert.equal(hasAvailableVariant(2, 6, ownership), false);
  assert.equal(hasAvailableVariant(3, 8, ownership), false);
  assert.equal(hasAvailableVariant(1, 14, []), false);
  assert.equal(hasAvailableVariant(1, 14), true, 'practice room lends all variants');
});

test('tag filters intersect categories and multiple effects, retaining actual secondary effects', () => {
  assert.ok(ITEMS.every((item) => matchesKitFilters('item', item.id, EMPTY_KIT_FILTERS)));
  assert.ok(matchesKitFilters('item', 'mend', { play: ['红心'], effect: ['治疗', '净化'] }));
  assert.equal(matchesKitFilters('item', 'wash', { play: ['红心'], effect: ['治疗', '净化'] }), false,
    'a cleanser without healing must not match the healing-plus-cleanse intersection');
  assert.equal(matchesKitFilters('item', 'mend', { play: ['红心', '单张'], effect: [] }), false);
  assert.ok(matchesKitFilters('relic', 'heart', { play: ['受击'], effect: ['治疗', '护盾'] }));
  assert.equal(matchesKitFilters('item', 'wash', { play: [], effect: ['灼烧'] }), false,
    'removing fire is not applying fire');
  assert.equal(matchesKitFilters('item', 'slow', { play: [], effect: ['剧毒'] }), false,
    'poison family alone is not a poison output');
  const futureDualStatus = { play: ['换色'], effect: ['灼烧', '剧毒'] };
  assert.ok(matchesKitTags(futureDualStatus, { play: [], effect: ['灼烧', '剧毒'] }));
  assert.equal(matchesKitTags({ play: ['换色'], effect: ['灼烧'] }, { play: [], effect: ['灼烧', '剧毒'] }), false);
});

test('filter toggling is immutable, allows independent row reset, and keeps primary labels in all facets', () => {
  const initial = { play: ['红心'], effect: ['治疗'] };
  const before = structuredClone(initial);
  const combined = toggleKitFilter(initial, 'effect', '净化');
  assert.deepEqual(initial, before);
  assert.deepEqual(combined, { play: ['红心'], effect: ['治疗', '净化'] });
  assert.deepEqual(toggleKitFilter(combined, 'effect', '治疗'), { play: ['红心'], effect: ['净化'] });
  assert.ok(matchesKitFilters('item', 'drain', { ...combined, play: [] }));
  for (const [kind, catalog, labels] of [['item', ITEMS, ITEM_LABELS], ['relic', RELICS, RELIC_LABELS]]) {
    for (const { id } of catalog) {
      const tags = kitFilterTags(kind, id);
      assert.ok(tags.play.includes(labels[id].play));
      assert.ok(tags.effect.includes(labels[id].effect));
      assert.equal(tags.effect.length, new Set(tags.effect).size);
    }
  }
});

test('counter advice is absent without intelligence and only derives from genuinely revealed facts', () => {
  const none = { items: {}, relics: {} };
  assert.deepEqual(counterKitRecommendations(null), none);
  assert.deepEqual(counterKitRecommendations('lesson'), none);
  assert.deepEqual(revealedKitRecommendations({}), none);
  assert.deepEqual(revealedKitRecommendations({ items: ['compass', 'draw'], relic: 'capacity' }), none,
    'utility gear reveals no damage family and should not guess a hidden strategy');
  const visiblePoison = revealedKitRecommendations({ items: ['poison'] });
  assert.ok(visiblePoison.items.stride);
  assert.ok(visiblePoison.items.mend);
  assert.equal(visiblePoison.items.ward, undefined, 'a poison clue must not invent a fire counter recommendation');
  const moreIntel = revealedKitRecommendations({ items: ['poison', 'cinder'] });
  assert.ok(moreIntel.items.stride && moreIntel.items.ward);
  const mirrorIntel = revealedKitRecommendations({ relic: 'bastion' });
  assert.ok(mirrorIntel.items.needle);
  assert.ok(mirrorIntel.relics.toxin);
});

test('counter advice names real mechanisms and every suggested ID exists', () => {
  const allItems = new Set(ITEMS.map(({ id }) => id));
  const allRelics = new Set(RELICS.map(({ id }) => id));
  for (const style of ['quick', 'guard', 'burn', 'mend', 'poison', 'combo']) {
    const advice = counterKitRecommendations(style);
    assert.ok(Object.keys(advice.items).length);
    for (const [id, reason] of Object.entries(advice.items)) assert.ok(allItems.has(id) && reason.length > 8);
    for (const [id, reason] of Object.entries(advice.relics)) assert.ok(allRelics.has(id) && reason.length > 8);
  }
  assert.match(counterKitRecommendations('combo').relics.bastion, /多张.*反弹/);
  assert.equal(counterKitRecommendations('quick').relics.bastion, undefined,
    'the mirror cannot reflect single cards, even though they deal direct damage');
  assert.match(counterKitRecommendations('mend').relics.ember, /净火减半/);
});
