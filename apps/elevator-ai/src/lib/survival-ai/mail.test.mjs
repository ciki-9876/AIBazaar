import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import model from './encounter-model.json' with { type: 'json' };
import {
  createMailEncounter,
  stepEncounter,
  encounterRequest,
  applyEncounterReply,
  playerCommand,
  ownedItemIds,
} from './encounter.ts';
import { chooseEncounter } from './encounter-policy.ts';
import {
  startMail,
  commitMail,
  confirmMailOffer,
  departMail,
  performMailTrade,
  saveMail,
  restoreMail,
  mailOptions,
  hasMailNarration,
  hasUnsupportedMailTactic,
} from './mail.ts';
import { applyMailAction, recordMail, replayMail } from './mail-replay.ts';
import { ITEMS, searchDuration } from '../survival-room.ts';
import { revealFog } from '../survival-world.ts';
import { battleCamera } from '../survival-camera.ts';
import { fingerprint } from './protocol.ts';
const make = (scenario = 'help', profile = 'ally') =>
  createMailEncounter(20261003, profile, scenario, 'test-mail');
const reply = (q, proposal) => ({
  requestId: q.id,
  proposal,
  model: 'test-fixture-not-LLM',
  tokens: { input: 0, output: 0 },
  milliseconds: 0,
});
const gift = {
  topic: 'water',
  decision: 'accept',
  intent: 'deliver-water',
  price: 0,
  flavor: '',
};
const pact = (s, p = gift, offer = 0) => {
  const sent = startMail(s, '测试约定', offer);
  const result = commitMail(sent.state, reply(sent.request, p));
  assert.equal(result.reason, 'committed');
  return result.state;
};
const tickAI = (s) => {
  const q = encounterRequest(s);
  const applied = applyEncounterReply(s, q, chooseEncounter(model, q));
  assert.equal(applied.reason, 'applied');
  return stepEncounter(applied.state);
};
const refresh = (s) =>
  s.actors.forEach((a) => {
    a.fog = revealFog(a, a.fog, s.world, 11);
  });

test('full live email body survives verbatim instead of being replaced by generic template; narration fails atomically', () => {
  const sent = startMail(make(), '有什么战术？');
  const p = {
    topic: 'chat',
    decision: 'chat',
    intent: 'none',
    price: 0,
    flavor: '',
  };
  const body =
    '先利用高墙切断追击视野，再找机会翻柜子。我们都在自动攻击，别为了多翻一件东西被堵在墙角。你现在更缺补给还是装备？';
  const receipt = {
    ...reply(sent.request, p),
    body,
    writing: 'model-email-v2',
  };
  const committed = commitMail(sent.state, receipt);
  assert.equal(committed.reason, 'committed');
  assert.equal(committed.state.mail.letters.at(-1).text, body);
  assert.equal(committed.state.mail.letters.at(-1).writing, 'model-email-v2');
  for (const narration of [
    '平静地点头',
    '*他摇了摇头*',
    '（微笑）我明白了。',
  ]) {
    assert.ok(hasMailNarration(narration));
    const bad = commitMail(sent.state, { ...receipt, body: narration });
    assert.deepEqual(bad.state.actors, sent.state.actors);
    assert.equal(bad.state.mail.agreements.length, 0);
    assert.ok(bad.reason.includes('旁白'));
  }
});
test('legacy mail saves migrate movement rules without changing inventory; historical v1 ticks remain v1', () => {
  const old = make();
  old.version = 'f9-encounter-v1';
  const inventories = structuredClone(old.actors.map((a) => a.bag));
  const restored = restoreMail(saveMail(old));
  assert.equal(restored.version, 'f9-encounter-v2');
  assert.deepEqual(
    restored.actors.map((a) => a.bag),
    inventories,
  );
  const legacyTick = stepEncounter(old);
  assert.equal(legacyTick.version, 'f9-encounter-v1');
  assert.equal(legacyTick.actors[1].navigation, undefined);
});
test('email suggestions cannot invent climbing or a cabinet-based visibility ability', () => {
  assert.ok(hasUnsupportedMailTactic('我会爬到高处，怪物追不上来。'));
  assert.ok(hasUnsupportedMailTactic('先翻柜子制造遮挡。'));
  assert.ok(!hasUnsupportedMailTactic('利用高墙切断视野，怪物靠近前先撤离。'));
});

test('mail context never reads player inventory, hidden needs or sealed loot; choices reflect owned resources', () => {
  const s = make(),
    q = startMail(s, '求水').request;
  s.actors[0].bag = [];
  s.actors[0].water = 99;
  s.actors[0].food = 0;
  s.caches[0].contents = [{ ...ITEMS.laser, uid: 'hidden' }];
  assert.deepEqual(startMail(s, '求水').request, q);
  const scarce = structuredClone(q);
  scarce.context.self.inventory = [];
  assert.equal(Object.hasOwn(mailOptions(scarce), 'water-gift'), false);
  assert.equal(q.context.guard, null);
  assert.equal(q.context.cache, null);
});
test('an accepted gift constrains learned tactics and transfers its exact UID; pickup never auto drinks', () => {
  let s = departMail(pact(make()));
  const uid = s.mail.agreements[0].waterUid;
  const before = s.actors[0].water;
  const q = encounterRequest(s);
  assert.ok(q.candidates.some((c) => c.action.type === 'give'));
  assert.ok(
    q.candidates.every((c) =>
      ['give', 'consume', 'move', 'wait'].includes(c.action.type),
    ),
  );
  s = tickAI(s);
  assert.ok(s.actors[0].bag.some((i) => i.uid === uid));
  assert.equal(
    s.actors[1].bag.some((i) => i.uid === uid),
    false,
  );
  assert.equal(s.mail.agreements[0].status, 'fulfilled');
  assert.ok(s.actors[0].water <= before);
  s = stepEncounter(playerCommand(s, { type: 'consume', uid }));
  assert.ok(s.actors[0].water > before);
  assert.ok(!s.actors[0].bag.some((i) => i.uid === uid));
});
test('a counteroffer is inert until player confirmation and swaps both real inventories atomically', () => {
  let s = pact(make('bargain', 'broker'), {
    ...gift,
    decision: 'counter',
    intent: 'trade-water',
    price: 2,
  });
  assert.equal(s.mail.agreements[0].status, 'offered');
  const initial = s.actors.map((a) => a.bag);
  s = departMail(s);
  assert.deepEqual(
    s.actors.map((a) => a.bag),
    initial,
  );
  s.mail.stage = 'home';
  s = confirmMailOffer(s, s.mail.agreements[0].id, true);
  s = departMail(s);
  const uid = s.mail.agreements[0].waterUid,
    scraps = s.actors[0].bag.map((i) => i.uid);
  s = tickAI(s);
  assert.equal(s.mail.agreements[0].status, 'fulfilled');
  assert.ok(s.actors[0].bag.some((i) => i.uid === uid));
  assert.ok(scraps.every((uid) => s.actors[1].bag.some((i) => i.uid === uid)));
  assert.equal(new Set(ownedItemIds(s)).size, ownedItemIds(s).length);
});
test('missing payment or recipient capacity cannot partially transfer water or payment', () => {
  for (const full of [false, true]) {
    const s = departMail(
      pact(make('bargain'), { ...gift, intent: 'trade-water', price: 1 }, 1),
    );
    s.actors[0].bag = full
      ? Array.from({ length: 16 }, (_, i) => ({
          ...ITEMS.water,
          uid: 'full:' + i,
          cargo: i,
        }))
      : [];
    const before = structuredClone(s);
    assert.equal(
      performMailTrade(s, s.actors[1], {
        type: 'trade',
        agreementId: s.mail.agreements[0].id,
      }),
      false,
    );
    assert.deepEqual(s, before);
  }
});
test('duplicate replies and stale worker or language outputs cannot change a new plan or consume twice', () => {
  const sent = startMail(make(), '求水'),
    output = reply(sent.request, gift),
    q = encounterRequest(sent.state),
    selected = chooseEncounter(model, q);
  const s = commitMail(sent.state, output).state;
  assert.equal(commitMail(s, output).state, s);
  assert.equal(applyEncounterReply(s, q, selected).reason, 'plan-changed');
  const next = startMail(s, '再次确认');
  next.state.mail.revision++;
  const stale = commitMail(
    next.state,
    reply(next.request, {
      topic: 'chat',
      decision: 'chat',
      intent: 'none',
      price: 0,
      flavor: '',
    }),
  );
  assert.ok(stale.reason.includes('旧回信'));
  assert.deepEqual(stale.state.actors, next.state.actors);
  assert.equal(stale.state.mail.agreements.length, 1);
});
test('contradictory rejection and impossible acceptance fail without inventing items or replacing a promise', () => {
  let s = pact(make()),
    sent = startMail(s, '你还会给吗？');
  const bad = commitMail(
    sent.state,
    reply(sent.request, { ...gift, decision: 'reject', intent: 'none' }),
  );
  assert.ok(bad.reason.includes('不一致'));
  assert.equal(bad.state.mail.agreements[0].status, 'accepted');
  assert.deepEqual(bad.state.actors, s.actors);
  s = make();
  s.actors[1].bag = [];
  sent = startMail(s, '请给水');
  assert.notEqual(
    commitMail(sent.state, reply(sent.request, gift)).reason,
    'committed',
  );
});
test('genuine assistance waits for the player to take the guarded chest; precommitted deception actually takes it', () => {
  for (const intent of ['assist-guard', 'steal-cache']) {
    let s = departMail(
      pact(make('guardian'), {
        topic: 'guard',
        decision: 'accept',
        intent,
        price: 0,
        flavor: '',
      }),
    );
    const c = s.caches.find((c) => c.id === s.mail.agreements[0].cacheId);
    assert.equal(
      s.mail.memories.some((e) => e.text.includes('私有意图')),
      intent === 'steal-cache',
    );
    assert.equal(s.mail.letters.at(-1).text.includes('抢先'), false);
    s.actors[1].x = c.x;
    s.actors[1].z = c.z;
    s.actors[0].x = c.x - 1;
    s.actors[0].z = c.z;
    s.enemies = [];
    refresh(s);
    const q = encounterRequest(s);
    assert.equal(
      q.candidates.some((c) => c.action.type === 'search'),
      intent === 'steal-cache',
    );
    if (intent === 'assist-guard')
      s = playerCommand(s, { type: 'search', cacheId: c.id });
    for (let i = 0; i < searchDuration(c, 100) + 3; i++) {
      if (i % 15 === 0) s = tickAI(s);
      else s = stepEncounter(s);
    }
    assert.equal(
      s.mail.agreements[0].status,
      intent === 'steal-cache' ? 'broken' : 'fulfilled',
    );
    assert.equal(
      s.caches.find((x) => x.id === c.id).openedBy,
      intent === 'steal-cache' ? 'rival' : 'player',
    );
  }
});
test('an injured rival withdraws with evidence, and explicit cancel preserves resources', () => {
  let s = departMail(pact(make()));
  s.actors[1].hp = 19;
  s = stepEncounter(s);
  assert.equal(s.mail.agreements[0].status, 'cancelled');
  assert.ok(s.mail.agreements[0].reason.includes('重伤'));
  assert.equal(
    s.actors[0].bag.some((i) => i.kind === 'water'),
    false,
  );
  s = pact(make());
  const sent = startMail(s, '撤回吧');
  const cancelled = commitMail(
    sent.state,
    reply(sent.request, {
      topic: 'water',
      decision: 'cancel',
      intent: 'none',
      price: 0,
      flavor: '',
    }),
  );
  assert.equal(cancelled.state.mail.agreements[0].status, 'cancelled');
  assert.deepEqual(cancelled.state.actors, s.actors);
});
test('experiment restore checks product, rules, identities and fog; pending mail becomes retryable', () => {
  const s = pact(make()),
    restored = restoreMail(JSON.parse(JSON.stringify(saveMail(s))));
  assert.ok(restored);
  assert.equal(fingerprint(restored), fingerprint(s));
  assert.equal(
    fingerprint(stepEncounter(departMail(restored))),
    fingerprint(stepEncounter(departMail(s))),
  );
  for (const corrupt of [
    (e) => (e.product = 'f9-survival'),
    (e) => (e.rules = 'unknown'),
    (e) => e.state.actors[0].bag.push(e.state.actors[1].bag[0]),
    (e) => (e.state.actors[0].hp = NaN),
    (e) => (e.state.actors[0].fog.visible = []),
    (e) => (e.state.mail.revision = -1),
  ]) {
    const e = structuredClone(saveMail(s));
    corrupt(e);
    assert.equal(restoreMail(e), null);
  }
  const waiting = startMail(make(), '求水').state,
    r = restoreMail(saveMail(waiting));
  assert.equal(r.mail.requests.length, 0);
  assert.equal(r.mail.letters[0].status, 'failed');
  assert.ok(startMail(r, '再试').request);
});
test('all external mail decisions and tactical outputs replay deterministically without calling a model', () => {
  let s = make();
  const recording = recordMail(s);
  const act = (action) => {
    const result = applyMailAction(s, action);
    recording.entries.push({ tick: s.tick, action, receipt: result.reason });
    s = result.state;
  };
  act({ type: 'send', text: '求水', offer: 0 });
  act({ type: 'reply', reply: reply(s.mail.requests[0], gift) });
  act({ type: 'depart' });
  const q = encounterRequest(s);
  act({ type: 'decision', request: q, reply: chooseEncounter(model, q) });
  for (let i = 0; i < 40; i++) act({ type: 'step', input: { x: 0, z: 0 } });
  assert.equal(
    fingerprint(replayMail(JSON.parse(JSON.stringify(recording)))),
    fingerprint(s),
  );
});
test('shared production perspective projects D right and W up without diagonal drift', () => {
  for (const aspect of [1, 1.8])
    for (const clearing of [false, true]) {
      const p = { x: 48.5, z: 70 },
        pose = battleCamera(p, aspect, clearing),
        c = new T.PerspectiveCamera(pose.fov, aspect, 0.025, 180);
      c.position.set(pose.position.x, pose.position.y, pose.position.z);
      c.lookAt(pose.target.x, pose.target.y, pose.target.z);
      c.updateMatrixWorld();
      const base = new T.Vector3(p.x, 0, p.z).project(c),
        right = new T.Vector3(p.x + 1, 0, p.z).project(c),
        up = new T.Vector3(p.x, 0, p.z - 1).project(c);
      assert.ok(right.x > base.x);
      assert.ok(Math.abs(right.y - base.y) < 1e-10);
      assert.ok(up.y > base.y);
      assert.ok(Math.abs(up.x - base.x) < 1e-10);
    }
});
