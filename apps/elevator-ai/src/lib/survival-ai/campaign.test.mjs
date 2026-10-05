import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCampaign,
  campaignRequest,
  applyCampaignChoice,
  stepCampaign,
  baselineCampaign,
  replayCampaign,
  campaignLetterFacts,
} from './campaign.ts';
import { fingerprint } from './protocol.ts';
const make = () => createCampaign(20261004, 'campaign-test');
test('mail receives authoritative present state separately from completed exploration memories', () => {
  const s = make();
  s.actors[0].memory = ['搜取8件物资。', '带回8件，存入仓库。'];
  const facts = campaignLetterFacts(campaignRequest(s, 'ally'));
  assert.equal(facts.当前位置, '电梯内，不在野外');
  assert.equal(facts.正在执行, '没有进行中的行动，当前待命');
  assert.equal(facts.行囊.brain, 0);
  assert.equal(facts.最近已完成事项并非进行中[0], '搜取8件物资。');
});
const choose = (s, actor, action) => {
  const r = campaignRequest(s, actor);
  return applyCampaignChoice(s, r, {
    action,
    reason: 'test fixture',
    model: 'fixture-not-LLM',
  });
};
const finish = (s, actor) => {
  while (s.actors.find((a) => a.id === actor).plan) s = stepCampaign(s);
  return s;
};
const units = (s) =>
  s.actors
    .flatMap((a) => [...a.bag, ...a.stock])
    .concat(
      Object.values(s.sites)
        .flat()
        .flatMap((p) => p.items),
    )
    .map((u) => u.uid);
test('offscreen observations omit sealed loot, other inventories and private reasons', () => {
  const s = make(),
    original = campaignRequest(s, 'ally');
  s.sites.ally[0].items = [{ uid: 'hidden', kind: 'brain' }];
  s.actors[1].stock = [];
  s.actors[1].memory = ['secret'];
  s.sites.broker[0].risk = 99;
  assert.deepEqual(campaignRequest(s, 'ally'), original);
  assert.equal(new Set(units(make())).size, units(make()).length);
});
test('exploration takes time, reveals only actual finite units, then return deposits the same IDs', () => {
  let s = make();
  const ids = s.sites.ally[0].items.map((u) => u.uid);
  s = choose(s, 'ally', 'explore').state;
  assert.equal(s.actors[0].bag.length, 0);
  s = finish(s, 'ally');
  assert.deepEqual(
    s.actors[0].bag.map((u) => u.uid),
    ids,
  );
  assert.equal(s.sites.ally[0].items.length, 0);
  s = finish(choose(s, 'ally', 'return').state, 'ally');
  assert.ok(ids.every((id) => s.actors[0].stock.some((u) => u.uid === id)));
  assert.equal(s.actors[0].bag.length, 0);
  assert.equal(new Set(units(s)).size, units(s).length);
});
test('build rejects missing bundles atomically, reserves real costs and unlocks ascent only on completion', () => {
  let s = make();
  assert.equal(choose(s, 'ally', 'lift').state, s);
  s.actors[0].stock.push(
    ...Array.from({ length: 6 }, (_, i) => ({
      uid: 'brain:' + i,
      kind: 'brain',
    })),
    ...Array.from({ length: 2 }, (_, i) => ({
      uid: 'part:' + i,
      kind: 'part',
    })),
  );
  s = choose(s, 'ally', 'lift').state;
  assert.equal(s.actors[0].lift, 1);
  assert.equal(s.actors[0].stock.filter((u) => u.kind === 'brain').length, 0);
  assert.equal(campaignRequest(s, 'ally').options.length, 0);
  s = finish(s, 'ally');
  assert.equal(s.actors[0].lift, 2);
  s = finish(choose(s, 'ally', 'ascend').state, 'ally');
  assert.equal(s.actors[0].floor, 2);
  assert.equal(campaignRequest(s, 'ally').nextSite.zone, 1);
  assert.ok(
    !campaignRequest(s, 'ally').options.some((o) => o.action === 'descend'),
  );
});
test('duplicate and stale plans cannot double-spend, and inference waiting causes no need loss', () => {
  let s = make();
  const r = campaignRequest(s, 'ally'),
    c = { action: 'explore', reason: 'fixture', model: 'fixture' };
  const body = structuredClone(s.actors);
  s = stepCampaign(s);
  assert.deepEqual(s.actors, body);
  s = applyCampaignChoice(s, r, c).state;
  assert.equal(applyCampaignChoice(s, r, c).state, s);
  s = finish(s, 'ally');
  assert.equal(applyCampaignChoice(s, r, c).reason, 'stale');
});
test('full rule baseline progresses through exploration, construction and ascent; recorded choices replay exactly', () => {
  let s = make();
  for (let i = 0; i < 1500; i++) {
    for (const id of ['ally', 'broker', 'predator']) {
      const r = campaignRequest(s, id);
      if (r.options.length)
        s = applyCampaignChoice(s, r, baselineCampaign(r)).state;
    }
    s = stepCampaign(s);
  }
  assert.ok(s.actors.every((a) => a.floor >= 3));
  assert.ok(s.receipts.some((r) => r.choice.action === 'lift'));
  assert.ok(s.receipts.some((r) => r.choice.action === 'ward'));
  assert.ok(s.receipts.some((r) => r.choice.action === 'storage'));
  assert.equal(
    fingerprint(
      replayCampaign(
        s.seed,
        s.session,
        JSON.parse(JSON.stringify(s.receipts)),
        s.tick,
      ),
    ),
    fingerprint(s),
  );
});
