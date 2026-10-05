/** One bounded real weight-update round. Large data and credentials stay in ignored work/. */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, PROFILES } from '../src/lib/survival-ai/encounter.ts';
import {
  trainEncounter,
  evaluateEncounter,
  rankEncounter,
} from '../src/lib/survival-ai/encounter-policy.ts';
import {
  lesson,
  runEpisode,
  replayEpisode,
  rolloutRow,
  ROUND_CONFIG,
} from '../src/lib/survival-ai/rollout-training.ts';
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(
  root,
  process.argv[2] || 'work/ai-training/round-2026-10-04',
);
let completedOutput = false;
try { await access(resolve(output, 'report.json')); completedOutput = true; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (completedOutput) throw new Error('Round already complete. Supply a new output directory; existing evidence is immutable.');
await mkdir(output, { recursive: true });
const oldText = await readFile(
  new URL('../src/lib/survival-ai/encounter-model.json', import.meta.url),
  'utf8',
);
const baseline = JSON.parse(oldText),
  started = performance.now();
const sha = (value) => createHash('sha256').update(value).digest('hex');
const save = (name, value) =>
  writeFile(resolve(output, name), JSON.stringify(value, null, 2) + '\n');
const log = (phase, detail) =>
  console.log(
    JSON.stringify({
      phase,
      seconds: Math.round((performance.now() - started) / 1000),
      ...detail,
    }),
  );
await writeFile(resolve(output, 'baseline-model.json'), oldText);
await save('config.json', ROUND_CONFIG);

const cases = (seeds) =>
  seeds.flatMap((seed) =>
    Object.keys(PROFILES).flatMap((profile) =>
      SCENARIOS.map(({ id: scenario }) => ({ seed, profile, scenario })),
    ),
  );
const trainingCases = cases(ROUND_CONFIG.trainingSeeds),
  validationCases = cases(ROUND_CONFIG.validationSeeds),
  testCases = cases(ROUND_CONFIG.acceptanceSeeds);
function assess(model, suite, name) {
  const rows = [];
  for (const c of suite) {
    const start = lesson(c.seed, c.profile, c.scenario),
      run = runEpisode(start, model),
      a = run.state.actors[1];
    // Replaying recorded external choices must reproduce the full final state.
    const replay = replayEpisode(start, run.inputs, run.state.tick);
    if (fingerprint(replay) !== run.hash)
      throw new Error('Non-deterministic replay');
    rows.push({
      ...c,
      score: run.score,
      status: a.status,
      hp: a.hp,
      food: a.food,
      water: a.water,
      bagKinds: a.bag.map((i) => i.kind),
      decisions: run.inputs.length,
      violations: run.violations,
      recoveries: a.navigation?.recoveries || 0,
      finalTick: run.state.tick,
      hash: run.hash,
      inputs: run.inputs,
    });
    if (rows.length % 6 === 0)
      log(name, { episodes: rows.length, total: suite.length });
  }
  return rows;
}

log('baseline', { episodes: testCases.length, model: baseline.version });
const before = assess(baseline, testCases, 'baseline');
await save('acceptance-before.json', before);
const data = [];
for (const [i, c] of [...trainingCases, ...validationCases].entries()) {
  const s = lesson(c.seed, c.profile, c.scenario),
    partition = i < trainingCases.length ? 'train' : 'test';
  data.push(rolloutRow(s, baseline, partition));
  // A small DAgger-style addition: states visited by the old policy, grouped with their entire seed trajectory.
  if (partition === 'train' && c.seed === ROUND_CONFIG.trainingSeeds[0]) {
    const run = runEpisode(s, baseline, 150);
    if (run.state.actors[1].status === 'active')
      data.push(rolloutRow(run.state, baseline, partition));
  }
  if ((i + 1) % 6 === 0) {
    await save('dataset.partial.json', data);
    log('collect-observed-rollouts', {
      courses: i + 1,
      total: trainingCases.length + validationCases.length,
      rows: data.length,
    });
  }
}
await save('dataset.json', data);
const trainStart = performance.now();
const trained = trainEncounter(
  data,
  ROUND_CONFIG.trainingSeed,
  ROUND_CONFIG.epochs,
  {
    initial: baseline,
    source: 'observed-rollout-v1',
    rate: ROUND_CONFIG.learningRate,
  },
);
await save('candidate-model.json', trained);
const reloaded = JSON.parse(
  await readFile(resolve(output, 'candidate-model.json'), 'utf8'),
);
const trainingSeconds = (performance.now() - trainStart) / 1000;
if (fingerprint(reloaded) !== fingerprint(trained))
  throw new Error('Checkpoint reload mismatch');
log('trained', {
  rows: data.length,
  trainingSeconds,
  model: trained.version,
});
const after = assess(reloaded, testCases, 'acceptance');
await save('acceptance-after.json', after);
const mean = (a) => a.reduce((n, v) => n + v, 0) / a.length;
const delta = before.map((b, i) => after[i].score - b.score);
const profiles = Object.keys(PROFILES).map((profile) => {
  const indices = before.flatMap((b, i) => (b.profile === profile ? [i] : []));
  return {
    profile,
    count: indices.length,
    before: mean(indices.map((i) => before[i].score)),
    after: mean(indices.map((i) => after[i].score)),
    gain: mean(indices.map((i) => delta[i])),
  };
});
const scenarios = SCENARIOS.map(({ id }) => {
  const indices = before.flatMap((b, i) => (b.scenario === id ? [i] : []));
  return {
    scenario: id,
    count: indices.length,
    gain: mean(indices.map((i) => delta[i])),
  };
});
// Paired approximate CI is descriptive with this small, shared-map suite; not a generalization claim.
const gain = mean(delta),
  variance =
    (mean(delta.map((x) => (x - gain) ** 2)) * delta.length) /
    (delta.length - 1);
const radius = 1.96 * Math.sqrt(variance / delta.length);
const violations = after.reduce((n, r) => n + r.violations, 0);
const deathsBefore = before.filter((x) => x.status === 'dead').length,
  deathsAfter = after.filter((x) => x.status === 'dead').length;
const gate = {
  meanGain: gain >= ROUND_CONFIG.gate.meanGain,
  profileRegression: profiles.every(
    (p) => p.gain >= -ROUND_CONFIG.gate.maximumProfileRegression,
  ),
  deathIncrease: deathsAfter <= deathsBefore,
  legalActions: violations === 0,
};
const promote = Object.values(gate).every(Boolean);
const rowsForAccuracy = data.map((r) => ({
  ...r,
  candidates: r.candidates.map((c) => ({ ...c })),
}));
const regret = (m) => {
  const rows = data.filter((r) => r.partition === 'test');
  return mean(
    rows.map((row) => {
      const q = {
        candidates: row.candidates.map((c, i) => ({ ...c, id: String(i) })),
      };
      const key = rankEncounter(m, q)[0].candidate.key;
      return (
        Math.max(...row.candidates.map((c) => c.utility)) -
        row.candidates.find((c) => c.key === key).utility
      );
    }),
  );
};
const sorted = delta
  .map((gain, i) => ({
    ...testCases[i],
    gain,
    before: before[i].score,
    after: after[i].score,
  }))
  .sort((a, b) => a.gain - b.gain);
const report = {
  schema: 'f9-training-round-report-v1',
  config: ROUND_CONFIG,
  scope:
    'One encounter-v2 tactical weight update; Qwen/mail/campaign weights unchanged; formal survival/9 season not trained.',
  models: {
    before: baseline.version,
    after: trained.version,
    baselineSHA256: sha(oldText),
    candidateSHA256: sha(JSON.stringify(trained, null, 2) + '\n'),
    changedWeights: [...trained.w1, ...trained.b1, ...trained.w2].filter(
      (x, i) => x !== [...baseline.w1, ...baseline.b1, ...baseline.w2][i],
    ).length,
  },
  dataset: {
    rows: data.length,
    train: data.filter((r) => r.partition === 'train').length,
    validation: data.filter((r) => r.partition === 'test').length,
    acceptanceEpisodes: testCases.length,
    datasetId: trained.training.datasetId,
    labelSource:
      '4-second observed-belief simulation, actual executor consequences, one prior sample per row',
    limitations: [
      'One fixed arena layout',
      'One loot prior sample and generic enemy prior',
      'Frozen old continuation policy',
      '20-second episode horizon',
      'Stationary player opponent; no self-play',
      'No full season rules or cross-scene persistent handoff',
    ],
  },
  optimization: {
    epochs: ROUND_CONFIG.epochs,
    rate: ROUND_CONFIG.learningRate,
    trainingSeconds,
    elapsedSeconds: (performance.now() - started) / 1000,
    tokenInput: 0,
    tokenOutput: 0,
    note: 'Numeric CPU rollouts and backpropagation use no LLM tokens.',
  },
  validation: {
    baseline: evaluateEncounter(baseline, rowsForAccuracy),
    candidate: evaluateEncounter(trained, rowsForAccuracy),
    baselineRegret: regret(baseline),
    candidateRegret: regret(trained),
  },
  acceptance: {
    before: mean(before.map((x) => x.score)),
    after: mean(after.map((x) => x.score)),
    gain,
    approximatePaired95CI: [gain - radius, gain + radius],
    wins: delta.filter((x) => x > 0.00001).length,
    ties: delta.filter((x) => Math.abs(x) <= 0.00001).length,
    losses: delta.filter((x) => x < -0.00001).length,
    deathsBefore,
    deathsAfter,
    violations,
    profiles,
    scenarios,
    gate,
    promote,
    evaluations: 1,
  },
  examples: {
    worst: sorted.slice(0, 3),
    best: sorted.slice(-3),
    fixedRandom: sorted.filter(
      (x) => x.seed === 63002 && x.scenario === 'cover',
    ),
  },
};
await save('report.json', report);
await save('next-round.json', {
  promoted: promote,
  failures: sorted.slice(0, 6),
  next: [
    'Separate urgent survival goals from collection goals',
    'Extend observations with enemy class, cooldown, route progress and target identity',
    'Add uncertainty samples, moving opponent pool and held-out arena geometry',
    'Prepare Qwen LoRA environment and corpus independently',
  ],
});
log('completed', { output, gain, promote, tokens: 0 });
