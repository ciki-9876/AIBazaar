import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, stepSurvival, ELEVATOR } from '../survival-room.ts';
import { observeActor } from './observation.ts';
import {
  createDecisionRequest,
  applyDecision,
  DECISION_TTL,
} from './decisions.ts';
import {
  trainSmokePolicy,
  chooseAction,
  validatePolicy,
} from './tiny-policy.ts';
import { validateDataset, toChoiceExample } from './dataset.ts';
import { validateDecisionRequest } from './request-validation.ts';
import {
  emptyLabState,
  refreshSight,
  labCache,
  labThreat,
  smokeFixtures,
} from '../../../ai-lab/fixtures.ts';

const context = {
  sessionId: 'test-session',
  actorId: 'test-actor',
  goal: 'survive',
  riskTolerance: 0.3,
};
const replyFor = (request, key, version = 'test-policy') => ({
  requestId: request.id,
  candidateId: request.candidates.find((candidate) => candidate.key === key).id,
  modelVersion: version,
});
function waterState() {
  const state = emptyLabState(102);
  state.player.water = 30;
  state.bag = [{ ...ITEMS.water, uid: 'my-water', slot: 0 }];
  return state;
}
const advance = (initial, ticks) => {
  let state = initial;
  for (let i = 0; i < ticks; i++)
    state = stepSurvival(state, {}, { waves: false });
  return state;
};

test('AI privacy: hidden enemies, sealed loot and RNG do not change model input or candidate IDs', () => {
  const state = emptyLabState(101);
  state.caches = [
    labCache('visible-crate', 49, 70),
    labCache('unseen-crate', 5, 5),
  ];
  labThreat(state);
  state.enemies.push({ ...state.enemies[0], id: 'unseen-enemy', x: 5, z: 5 });
  const snapshot = structuredClone(state);
  const first = createDecisionRequest(state, context);
  const changed = structuredClone(state);
  changed.rng = 999;
  changed.seed = 222;
  changed.caches[0].contents = [{ ...ITEMS.core, uid: 'secret-expensive' }];
  changed.caches[0].item = changed.caches[0].contents[0];
  changed.caches[1].x = 10;
  changed.enemies[1].hp = 2;
  assert.deepEqual(createDecisionRequest(changed, context), first);
  assert.deepEqual(state, snapshot);
  const json = JSON.stringify(first);
  for (const secret of [
    'secret-expensive',
    'unseen-enemy',
    'unseen-crate',
    '"rng"',
    '"seed"',
    '"contents"',
  ])
    assert.equal(json.includes(secret), false, secret);
  first.observation.self.hp = 0;
  first.candidates.find(
    (candidate) => candidate.action.type === 'move',
  ).action.to.x = 0;
  assert.deepEqual(
    state,
    snapshot,
    'issued request does not alias engine state',
  );
});

test('AI sight: tall walls hide monsters; low walls do not, and both obstruct movement', () => {
  const state = emptyLabState(103);
  labThreat(state);
  const wall = {
    x: state.player.x - 2,
    z: state.player.z,
    w: 0.5,
    d: 6,
    type: 'wall',
    height: 'tall',
  };
  state.world = { ...state.world, obstacles: [wall] };
  refreshSight(state);
  assert.equal(observeActor(state, context).threats.length, 0);
  assert.equal(
    createDecisionRequest(state, context).candidates.some(
      (candidate) => candidate.key === 'move:W',
    ),
    false,
  );
  state.world = { ...state.world, obstacles: [{ ...wall, height: 'low' }] };
  refreshSight(state);
  assert.equal(observeActor(state, context).threats.length, 1);
  assert.equal(
    createDecisionRequest(state, context).candidates.some(
      (candidate) => candidate.key === 'move:W',
    ),
    false,
  );
});

test('AI action commit: consumes exact UID atomically and duplicate response cannot consume twice', () => {
  const state = waterState(),
    before = structuredClone(state);
  const request = createDecisionRequest(state, context),
    reply = replyFor(request, 'use:water');
  const result = applyDecision(state, context, request, reply);
  assert.equal(result.receipt.accepted, true);
  assert.equal(result.state.player.water, 75);
  assert.equal(result.state.bag.length, 0);
  assert.deepEqual(state, before);
  const again = applyDecision(result.state, context, request, reply);
  assert.equal(again.receipt.reason, 'no-longer-legal');
  assert.equal(again.state, result.state);
});

test('AI boundary: stale/wrong/foreign/injected/unknown replies are rejected without mutation', () => {
  const state = waterState(),
    request = createDecisionRequest(state, context);
  const valid = replyFor(request, 'use:water');
  for (const [reply, reason] of [
    [{ ...valid, requestId: 'wrong' }, 'wrong-request'],
    [{ ...valid, candidateId: 'invented' }, 'unknown-candidate'],
    [
      { ...valid, action: { type: 'consume', uid: 'another-water' } },
      'malformed',
    ],
    [null, 'malformed'],
  ]) {
    const result = applyDecision(state, context, request, reply);
    assert.equal(result.receipt.reason, reason);
    assert.equal(result.state, state);
  }
  assert.equal(
    applyDecision(state, { ...context, actorId: 'other' }, request, valid)
      .receipt.reason,
    'actor-mismatch',
  );
  assert.equal(
    applyDecision(
      state,
      { ...context, sessionId: 'another-room' },
      request,
      valid,
    ).receipt.reason,
    'session-mismatch',
  );
  const stale = { ...state, tick: state.tick + DECISION_TTL + 1 };
  assert.equal(applyDecision(stale, context, request, valid).state, stale);
  assert.equal(
    applyDecision(stale, context, request, valid).receipt.reason,
    'expired',
  );
  const rollback = { ...state, tick: state.tick - 1 };
  assert.equal(
    applyDecision(rollback, context, request, valid).receipt.reason,
    'expired',
  );
});

test('AI revalidation: a full stat, removed cache or newly blocking wall invalidates an issued action', () => {
  const state = waterState(),
    request = createDecisionRequest(state, context);
  const full = { ...state, player: { ...state.player, water: 100 } };
  assert.equal(
    applyDecision(full, context, request, replyFor(request, 'use:water')).state,
    full,
  );
  state.caches = [labCache('target', 49, 70)];
  const lootRequest = createDecisionRequest(state, context);
  const noCache = { ...state, caches: [] };
  assert.equal(
    applyDecision(
      noCache,
      context,
      lootRequest,
      replyFor(lootRequest, 'loot:target'),
    ).state,
    noCache,
  );
  const move = replyFor(request, 'move:E');
  const wallState = {
    ...state,
    world: {
      ...state.world,
      obstacles: [
        {
          x: state.player.x + 1,
          z: state.player.z,
          w: 0.5,
          d: 4,
          type: 'wall',
          height: 'tall',
        },
      ],
    },
  };
  assert.equal(
    applyDecision(wallState, context, request, move).receipt.reason,
    'no-longer-legal',
  );
});

test('AI execution uses real search duration, receives all container items and continues extraction', () => {
  const state = emptyLabState(104);
  state.caches = [labCache('target', 49, 70)];
  const request = createDecisionRequest(state, context);
  let searching = applyDecision(
    state,
    context,
    request,
    replyFor(request, 'loot:target'),
  ).state;
  searching = advance(searching, 30);
  assert.equal(
    searching.bag.length,
    0,
    'not an instantaneous abstract loot result',
  );
  searching = advance(searching, 60);
  assert.equal(searching.caches[0].opened, true);
  assert.equal(searching.bag.length, 3);
  let leaving = {
    ...emptyLabState(105),
    player: { ...state.player, ...ELEVATOR },
  };
  for (let tick = 0; tick < 66 && leaving.status === 'running'; tick++) {
    if (tick % 15 === 0) {
      const req = createDecisionRequest(leaving, {
        ...context,
        goal: 'withdraw',
      });
      leaving = applyDecision(
        leaving,
        { ...context, goal: 'withdraw' },
        req,
        replyFor(req, 'extract'),
      ).state;
    }
    leaving = stepSurvival(leaving, {}, { waves: false });
  }
  assert.equal(
    leaving.status,
    'extracted',
    'repeated decisions do not reset the extraction timer',
  );
});

test('AI replay: recorded external choices reproduce world/combat/loot without inference', () => {
  const initial = emptyLabState(107),
    commands = [];
  initial.caches = [labCache('target', 49, 70)];
  const run = (replay) => {
    let state = structuredClone(initial);
    for (let i = 0; i < 120; i++) {
      if (i % 15 === 0) {
        const request = createDecisionRequest(state, context);
        const reply = replay
          ? commands[i / 15]
          : replyFor(
              request,
              request.candidates.some(
                (candidate) => candidate.key === 'loot:target',
              )
                ? 'loot:target'
                : 'wait',
            );
        if (!replay) commands.push(reply);
        const applied = applyDecision(state, context, request, reply);
        assert.equal(applied.receipt.accepted, true);
        state = applied.state;
      }
      state = stepSurvival(state, {}, { waves: false });
    }
    return state;
  };
  assert.deepEqual(run(false), run(true));
});

test('AI dataset: seed, trajectory, template and relationship groups cannot leak between partitions', () => {
  const examples = smokeFixtures().map((fixture) => fixture.example);
  validateDataset(examples);
  for (const key of ['seed', 'trajectory', 'template', 'relation']) {
    const copy = structuredClone(examples);
    const train = copy.find((example) => example.partition === 'train');
    const testRow = copy.find((example) => example.partition === 'test');
    train.group.relation = 'shared-personal-history';
    testRow.group[key] = train.group[key];
    assert.throws(() => validateDataset(copy), /leakage/);
  }
  const bad = structuredClone(examples);
  bad[0].acceptableKeys = ['not-legal'];
  assert.throws(() => validateDataset(bad), /action label/);
  const review = toChoiceExample(examples[0]);
  assert.deepEqual(review.acceptableIds, examples[0].acceptableKeys);
  assert.equal(
    review.options.some((option) => option.id === 'use:water'),
    true,
  );
});

test('AI learning: fixed seed reproduces weights; held-out labels never change gradient updates', () => {
  const examples = smokeFixtures().map((fixture) => fixture.example);
  const a = trainSmokePolicy(examples, { seed: 99, epochs: 100 });
  const b = trainSmokePolicy(examples, { seed: 99, epochs: 100 });
  assert.deepEqual(a, b);
  const altered = structuredClone(examples);
  for (const example of altered.filter(
    (example) => example.partition !== 'train',
  ))
    example.acceptableKeys = ['wait'];
  const c = trainSmokePolicy(altered, { seed: 99, epochs: 100 });
  assert.deepEqual(a.w1, c.w1);
  assert.deepEqual(a.w2, c.w2);
  assert.deepEqual(a.b1, c.b1);
  assert.notEqual(a.training.datasetId, c.training.datasetId);
  const example = examples[0];
  const reply = chooseAction(a, example.request);
  assert.ok(
    example.request.candidates.some(
      (candidate) => candidate.id === reply.candidateId,
    ),
  );
  const broken = structuredClone(a);
  broken.w1[0] = NaN;
  assert.throws(() => validatePolicy(broken), /Invalid policy/);
});

test('AI learning: changing training supervision changes learned policy rather than a scripted score table', () => {
  const examples = smokeFixtures().map((fixture) => fixture.example);
  const original = trainSmokePolicy(examples, { seed: 12, epochs: 150 });
  const altered = structuredClone(examples);
  altered
    .filter((example) => example.partition === 'train')
    .forEach((example) => {
      example.acceptableKeys = ['wait'];
    });
  const changed = trainSmokePolicy(altered, { seed: 12, epochs: 150 });
  const request = examples[0].request;
  assert.notEqual(
    chooseAction(original, request).candidateId,
    chooseAction(changed, request).candidateId,
  );
});

test('AI transport rejects leaked fields, corrupt fingerprints and non-finite features before inference', () => {
  const original = createDecisionRequest(waterState(), context);
  validateDecisionRequest(JSON.parse(JSON.stringify(original)));
  for (const corrupt of [
    (request) => {
      request.observation.rng = 123;
    },
    (request) => {
      request.candidates[0].features.hpGain = NaN;
    },
    (request) => {
      request.id = 'wrong-fingerprint';
    },
    (request) => {
      request.candidates[0].action = { type: 'wait', grantItem: 'core' };
    },
  ]) {
    const request = structuredClone(original);
    corrupt(request);
    assert.throws(() => validateDecisionRequest(request));
  }
  for (const model of [null, {}, { schema: 'foreign-policy' }])
    assert.throws(() => validatePolicy(model), /Invalid policy/);
});
