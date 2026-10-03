import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileDraft,
  validateDraft,
  publishBlueprint,
  createBattle,
  advanceBattle,
  runBattle,
  saveBattle,
  loadBattle,
  cooldownView,
  canonical,
  PROFILE,
} from './card-framework/index.ts';
import {
  cardDraft,
  numeric,
  target,
  response,
  SAMPLE_DRAFTS,
  WARM_CUP,
  SPARK_BOX,
  COMPANION_BELL,
  AFTERGLOW_VEIL,
} from './card-framework/samples.ts';
import { select, attackCents } from './card-framework/selectors.ts';

const clone = structuredClone;
const fixed = (id, kind, value, t = target('lane', 'enemy')) => ({
  id,
  kind,
  target: t,
  distribution: 'per_target',
  magnitude: { kind: 'fixed', value },
});
const control = (
  id,
  kind,
  params,
  t = target('card', 'ally', { kind: 'self' }),
) => ({ id, kind, target: t, distribution: 'per_target', params });
const at = (id, ms, effects) => {
  const a = response(id, 'time_reached', null, effects);
  a.when.filters = { atMs: ms };
  return a;
};
async function input(entries, seed = 42) {
  const blueprints = [],
    instances = [];
  for (const [i, [draft, side, slot, uid]] of entries.entries()) {
    const { blueprint, report } = await compileDraft(draft, {
      blueprintId: `test-${i}`,
      generatedAt: '2026-09-27T00:00:00.000Z',
    });
    assert.ok(blueprint, JSON.stringify(report));
    blueprints.push(blueprint);
    instances.push({
      instanceId: uid ?? `c${i}`,
      blueprintId: blueprint.blueprintId,
      revision: 1,
      side,
      at: slot,
      level: 0,
      quality: 0,
    });
  }
  return { profileId: PROFILE.id, seed, blueprints, instances };
}
const setup = async (entries) => createBattle(await input(entries));
const damageEvents = (s) =>
  s.events.filter((e) => e.kind === 'damage_resolved');

test('framework: the four approved examples compile; unknown mechanisms, illegal fields and uncalibrated publication fail closed', async () => {
  for (const [i, d] of SAMPLE_DRAFTS.entries()) {
    const before = canonical(d),
      { blueprint, report } = await compileDraft(d, {
        blueprintId: `sample${i}`,
      });
    assert.ok(blueprint);
    assert.equal(canonical(d), before);
    assert.equal(report.lifecycle, 'balance_pending');
    assert.equal(report.publishable, false);
    assert.equal(
      report.checks.find((x) => x.id === 'budget').status,
      'not_run',
    );
    assert.throws(() => publishBlueprint(blueprint), /UNCALIBRATED/);
    assert.ok(blueprint.rulesText.length > 20);
  }
  for (const mutate of [
    (d) => (d.mechanics.abilities[0].effects[0].kind = 'execute_script'),
    (d) => (d.mechanics.abilities[0].when.event = 'stat_crossed'),
    (d) => (d.mechanics.cooldownMs = 501),
    (d) => (d.mechanics.baseAttack = -1),
    (d) => (d.mechanics.abilities[0].effects[0].params = {}),
    (d) => (d.context.budgetPolicyRef = 'trust-me'),
    (d) => (d.mechanics.abilities[0].effects[0].target.entity = 'card'),
  ]) {
    const d = clone(WARM_CUP);
    mutate(d);
    assert.throws(() => validateDraft(d));
  }
  const high = clone(WARM_CUP);
  high.mechanics.abilities[0].effects[0].magnitude.ratioBps = 25000;
  assert.doesNotThrow(() => validateDraft(high));
  const bad = clone(WARM_CUP);
  bad.mechanics.baseAttack = Infinity;
  assert.throws(() => validateDraft(bad));
  const req = {
    requestId: 'r',
    itemInput: {},
    preferences: {},
    context: {
      ...WARM_CUP.context,
      schemaVersion: WARM_CUP.schemaVersion,
      mechanismVersion: WARM_CUP.mechanismVersion,
      rarityTier: 2,
    },
  };
  assert.throws(() => validateDraft(WARM_CUP, req), /边界/);
});

test('framework: cup effect filtering does not cancel core healing when the local barrier is broken', async () => {
  const attacker = cardDraft('开场试探', 0, null, []);
  attacker.mechanics.abilities = [
    at('damage', 1000, [
      fixed('barrier', 'physical_damage', 100, target('barrier', 'enemy')),
      fixed('core', 'physical_damage', 100, target('core', 'enemy')),
    ]),
  ];
  const s = advanceBattle(
    await setup([
      [WARM_CUP, 0, 0],
      [attacker, 1, 0],
    ]),
    6000,
  );
  assert.equal(s.hp[0], 20800);
  assert.equal(s.barriers[0][0].state, 'broken');
  assert.equal(
    s.events.find((e) => e.kind === 'heal_resolved').payload.effectiveAmount,
    800,
  );
  assert.ok(
    s.events.some(
      (e) => e.kind === 'effect_skipped' && e.payload.effectId === 'repair',
    ),
  );
});

test('framework: attack additions precede summed percentages, distinct effects stack, and expiration precedes same-time launch', async () => {
  const d = cardDraft('属性试验', 40, 500, [
    numeric('hit', 'physical_damage', target('core', 'enemy'), 10000),
  ]);
  d.mechanics.abilities.push(
    response('buff', 'battle_started', null, [
      control('flat', 'modify_attack', {
        mode: 'flat',
        delta: 10,
        durationMs: 1000,
      }),
      control('up', 'modify_attack', {
        mode: 'percent',
        delta: 2000,
        durationMs: 1000,
      }),
      control('down', 'modify_attack', {
        mode: 'percent',
        delta: -1000,
        durationMs: 1000,
      }),
    ]),
  );
  let s = await setup([[d, 0, 0]]);
  assert.equal(attackCents(s, s.cards[0]), 5500);
  s = advanceBattle(s, 1000);
  assert.deepEqual(
    damageEvents(s).map((e) => e.payload.totalLoss),
    [5500, 4000],
  );
  const zero = clone(d);
  zero.mechanics.abilities[1].effects = [
    control('down', 'modify_attack', {
      mode: 'percent',
      delta: -20000,
      durationMs: 1000,
    }),
  ];
  const z = await setup([[zero, 0, 0]]);
  assert.equal(attackCents(z, z.cards[0]), 0);
});

test('framework: same-source statuses refresh; haste minus slow uses fixed progress and freeze blocks charging', async () => {
  const d = cardDraft('时钟', 1, 2000, [fixed('hit', 'physical_damage', 1)]);
  const status = response('rates', 'interval_elapsed', null, [
    control('haste', 'haste', { rateBps: 10000, durationMs: 1000 }),
    control('slow', 'slow', { rateBps: 5000, durationMs: 1000 }),
  ]);
  status.when.filters = { firstAtMs: 10, periodMs: 500 };
  d.mechanics.abilities.push(status);
  let s = advanceBattle(await setup([[d, 0, 0]]), 1010);
  assert.equal(s.cards[0].statuses.length, 2);
  assert.equal(s.cards[0].progress, 1010 * 15000);
  const freeze = cardDraft('冻结试验', 0, null, []);
  freeze.mechanics.abilities = [
    at('freeze', 100, [
      control('f', 'freeze', { durationMs: 1000 }, target('card', 'enemy')),
      control(
        'c',
        'advance_cooldown',
        { amountMs: 500 },
        target('card', 'enemy'),
      ),
    ]),
  ];
  s = advanceBattle(
    await setup([
      [d, 0, 0],
      [freeze, 1, 0],
    ]),
    200,
  );
  assert.ok(
    s.events.some(
      (e) => e.kind === 'effect_zero' && e.payload.reason === 'FROZEN',
    ),
  );
  assert.equal(s.cards[0].progress, 90 * 15000);
});

test('framework: selectors deduplicate big cards and cores; random samples and cent remainders are deterministic', async () => {
  const a = cardDraft('选择器', 0, null, []),
    big = clone(a);
  big.mechanics.sizeCells = 3;
  const s = await setup([
    [a, 0, 0, 'p'],
    [big, 1, 0, 'big'],
    [a, 1, 3, 'other'],
  ]);
  assert.deepEqual(
    select(
      s,
      s.cards[0],
      target('card', 'enemy', { kind: 'opposing_overlap' }),
      null,
      'test',
    ).map((r) => r.uid),
    ['big'],
  );
  assert.equal(
    select(s, s.cards[0], target('core', 'both'), null, 'test').length,
    2,
  );
  const random = {
    ...target('card', 'enemy', { kind: 'all' }),
    selection: { mode: 'random', count: 8 },
  };
  assert.deepEqual(
    select(clone(s), s.cards[0], random, null, 'test'),
    select(clone(s), s.cards[0], random, null, 'test'),
  );
  const hit = cardDraft('均分', 0, null, []),
    fx = fixed('split', 'physical_damage', 1.01, target('core', 'both'));
  fx.distribution = 'split_total';
  hit.mechanics.abilities = [at('one', 10, [fx])];
  const split = advanceBattle(await setup([[hit, 0, 0]]), 10);
  assert.deepEqual(split.hp, [29949, 29950]);
});

test('framework: projectile attack and targets are snapshotted, and display interpolation cannot affect state', async () => {
  const d = clone(SPARK_BOX);
  d.mechanics.abilities.push(
    at('buff', 6100, [
      control('up', 'modify_attack', {
        mode: 'flat',
        delta: 100,
        durationMs: 1000,
      }),
    ]),
  );
  let s = advanceBattle(await setup([[d, 0, 0]]), 6310);
  const before = saveBattle(s);
  for (let i = 0; i < 100; i++) cooldownView(s, 'c0', i);
  assert.equal(saveBattle(s), before);
  assert.equal(
    s.queue.find((q) => q.kind === 'physical_damage').targets[0].amount,
    4000,
  );
  s = advanceBattle(s, 7250);
  assert.equal(damageEvents(s)[0].payload.requestedAmount, 4000);
});

test('framework: periodic damage merges one contact, attributes only actual loss, and decay does not duplicate credit', async () => {
  const burn = cardDraft('余火', 0, null, []);
  burn.mechanics.abilities = [at('burn', 10, [fixed('fire', 'apply_burn', 2)])];
  const s = advanceBattle(
    await setup([
      [burn, 0, 0, 'a'],
      [burn, 0, 1, 'b'],
    ]),
    500,
  );
  const contacts = s.events.filter(
    (e) => e.kind === 'damage_received' && e.payload.damageKind === 'burn',
  );
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].payload.totalLoss, 400);
  const credits = s.events.filter(
    (e) => e.kind === 'damage_dealt' && e.payload.damageKind === 'burn',
  );
  assert.deepEqual(
    credits.map((e) => e.payload.totalLoss),
    [200, 200],
  );
  assert.equal(
    s.dots[1][0].burn.reduce((n, x) => n + x.amount, 0),
    300,
  );
});

test('framework: A→B→A chains terminate, charge-created cycles retain roots, and frozen chains are rejected', async () => {
  const d = cardDraft('连锁', 0, 1000, [
    control(
      'chain',
      'trigger_chain',
      {},
      target('card', 'ally', { kind: 'adjacent_both' }),
    ),
  ]);
  d.mechanics.chainEntryAbilityId = 'cycle';
  d.mechanics.abilities[0].limits = {
    internalCooldownMs: 10,
    maxActivationsPerBattle: 100,
  };
  d.mechanics.abilities[0].delivery = { kind: 'projectile', travelMs: 10 };
  const s = advanceBattle(
    await setup([
      [d, 0, 0, 'a'],
      [d, 0, 1, 'b'],
    ]),
    1040,
  );
  assert.ok(
    s.events.some(
      (e) =>
        e.kind === 'ability_suppressed' &&
        e.payload.reason === 'ABILITY_ALREADY_VISITED',
    ),
  );
  assert.ok(s.events.length < 100);
  const charge = clone(d);
  charge.mechanics.chainEntryAbilityId = null;
  charge.mechanics.abilities[0].delivery = { kind: 'instant' };
  charge.mechanics.abilities[0].limits = null;
  charge.mechanics.abilities[0].effects = [
    control(
      'charge',
      'advance_cooldown',
      { amountMs: 1000 },
      target('card', 'ally', { kind: 'adjacent_both' }),
    ),
  ];
  const charged = advanceBattle(
    await setup([
      [charge, 0, 0, 'a'],
      [charge, 0, 1, 'b'],
    ]),
    1000,
  );
  assert.ok(charged.events.some((e) => e.kind === 'ability_suppressed'));
  assert.ok(charged.events.length < 100);
  const frozen = cardDraft('冰', 0, null, []);
  frozen.mechanics.abilities = [
    at('ice', 10, [
      control('f', 'freeze', { durationMs: 1000 }, target('card', 'enemy')),
      control('chain', 'trigger_chain', {}, target('card', 'enemy')),
    ]),
  ];
  const f = advanceBattle(
    await setup([
      [d, 0, 0],
      [frozen, 1, 0],
    ]),
    10,
  );
  assert.ok(f.events.some((e) => e.kind === 'chain_rejected'));
});

test('framework: delayed damage retains visited abilities so continuous damage cannot launder a reactive loop', async () => {
  const d = cardDraft('因果', 0, null, []);
  const fx = fixed('burn', 'apply_burn', 1, target('lane', 'ally'));
  d.mechanics.abilities = [
    at('start', 10, [fx]),
    response('echo', 'damage_received', target('barrier', 'ally'), [fx]),
  ];
  d.mechanics.abilities[1].when.filters = { damageKinds: ['burn'] };
  const s = advanceBattle(await setup([[d, 0, 0]]), 3000);
  assert.equal(s.cards[0].abilities.echo.count, 1);
  assert.ok(s.events.some((e) => e.kind === 'ability_suppressed'));
});

test('framework: grace permits overflow, repair consumes the protection, and expiry wins an equal-time repair', async () => {
  const hit = cardDraft('破幕试验', 0, null, []);
  hit.mechanics.abilities = [
    at('hit', 1000, [fixed('hit', 'physical_damage', 100)]),
  ];
  let s = advanceBattle(
    await setup([
      [AFTERGLOW_VEIL, 0, 0],
      [hit, 1, 0],
    ]),
    1000,
  );
  assert.equal(s.barriers[0][0].state, 'pending_break');
  assert.equal(s.hp[0], 29000);
  assert.equal(s.barriers[0][0].graceExpiresAtMs, 6000);
  const repair = cardDraft('补丁', 0, null, []);
  repair.mechanics.abilities = [
    at('repair', 5000, [
      fixed('repair', 'repair_barrier', 5, target('barrier')),
    ]),
  ];
  s = advanceBattle(
    await setup([
      [AFTERGLOW_VEIL, 0, 0],
      [repair, 0, 1],
      [hit, 1, 0],
    ]),
    6000,
  );
  assert.equal(s.barriers[0][0].state, 'intact');
  assert.equal(s.barriers[0][0].graceUsesConsumed, 1);
  const late = clone(repair);
  late.mechanics.abilities[0].when.filters.atMs = 6000;
  s = advanceBattle(
    await setup([
      [AFTERGLOW_VEIL, 0, 0],
      [late, 0, 1],
      [hit, 1, 0],
    ]),
    6000,
  );
  assert.equal(s.barriers[0][0].state, 'broken');
  assert.equal(
    s.events.find((e) => e.kind === 'repair_resolved').payload.effectiveAmount,
    0,
  );
  const longer = clone(AFTERGLOW_VEIL);
  longer.mechanics.specialRules[0].params.durationMs = 7000;
  s = advanceBattle(
    await setup([
      [AFTERGLOW_VEIL, 0, 0],
      [longer, 0, 1],
      [hit, 1, 0],
    ]),
    1000,
  );
  assert.equal(s.barriers[0][0].graceExpiresAtMs, 8000);
});

test('framework: 90 s starts corruption, 91 s sends six packets, and same-batch lethal damage is a draw', async () => {
  const initial = await setup([]),
    ninety = advanceBattle(initial, 90000);
  assert.equal(ninety.result, null);
  assert.equal(ninety.corruptionRound, 0);
  assert.equal(
    ninety.events.filter((e) => e.kind === 'corruption_started').length,
    1,
  );
  const pulse = advanceBattle(ninety, 91000);
  assert.equal(damageEvents(pulse).length, 6);
  assert.equal(
    pulse.events.filter((e) => e.kind === 'corruption_pulse').length,
    1,
  );
  assert.equal(pulse.events.filter((e) => e.kind === 'damage_dealt').length, 0);
  const end = runBattle(initial);
  assert.equal(end.result.winner, -1);
  assert.ok(end.result.atMs > 91000);
  assert.deepEqual(end.hp, [0, 0]);
  const invincible = cardDraft('压力上限试验', 0, null, []);
  const rescue = response('rescue', 'damage_received', target('core'), [
    fixed('heal', 'heal_core', 100000, target('core')),
  ]);
  rescue.when.filters = { damageKinds: ['corruption'] };
  rescue.limits.maxActivationsPerBattle = 1000;
  invincible.mechanics.abilities = [rescue];
  const start = await setup([
      [invincible, 0, 0],
      [invincible, 1, 0],
    ]),
    before = saveBattle(start);
  assert.throws(() => runBattle(start), /SIMULATION_BUDGET_EXCEEDED/);
  assert.equal(saveBattle(start), before);
});

test('framework: public advancement is atomic and embedded definitions plus mid-flight state round-trip exactly', async () => {
  const spec = await input([
    [SPARK_BOX, 0, 0],
    [COMPANION_BELL, 0, 1],
    [WARM_CUP, 0, 2],
    [AFTERGLOW_VEIL, 1, 0],
    [SPARK_BOX, 1, 1],
  ]);
  const initial = await createBattle(spec),
    before = canonical(spec),
    mid = advanceBattle(initial, 6310),
    restored = await loadBattle(saveBattle(mid));
  assert.equal(canonical(spec), before);
  assert.equal(saveBattle(runBattle(initial)), saveBattle(runBattle(restored)));
  assert.equal(saveBattle(await createBattle(spec)), saveBattle(initial));
  const corrupt = clone(mid);
  corrupt.hp[0]--;
  await assert.rejects(loadBattle(JSON.stringify(corrupt)), /STATE_MISMATCH/);
  const altered = clone(spec);
  altered.blueprints[0].draft.mechanics.baseAttack++;
  await assert.rejects(createBattle(altered), /HASH_MISMATCH/);
  const overlap = clone(spec);
  overlap.instances[1].at = 0;
  await assert.rejects(createBattle(overlap), /OVERLAPPING/);
  const invalid = saveBattle(initial);
  assert.throws(() => advanceBattle(initial, 15), /INVALID_ADVANCE/);
  assert.equal(saveBattle(initial), invalid);
});
