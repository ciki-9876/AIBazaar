import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { smokeFixtures } from './fixtures.ts';
import {
  trainSmokePolicy,
  chooseAction,
  evaluatePolicy,
} from '../src/lib/survival-ai/tiny-policy.ts';
import {
  createDecisionRequest,
  applyDecision,
} from '../src/lib/survival-ai/decisions.ts';
import {
  toChoiceExample,
  validateDataset,
} from '../src/lib/survival-ai/dataset.ts';
import {
  AI_SCHEMA,
  fingerprint,
} from '../src/lib/survival-ai/observation.ts';
import { stepSurvival } from '../src/lib/survival-room.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
const output = path.resolve(root, args[0] ?? 'outputs/f9-local-ai');
const fixtures = smokeFixtures();
const examples = fixtures.map((fixture) => fixture.example);
const dataset = validateDataset(examples);
const start = performance.now();
const model = trainSmokePolicy(examples, { seed: 20261003, epochs: 300 });
const trainingMs = performance.now() - start;
const staticEvaluation = evaluatePolicy(model, examples);
const parameterCount = model.w1.length + model.b1.length + model.w2.length + 1;

function episode(fixture, replay = null) {
  let state = structuredClone(fixture.state);
  const startState = structuredClone(state),
    startTick = state.tick;
  const decisions = [],
    outcomes = [];
  let index = 0;
  // Fixed encounters: no new waves. Combat, needs and search use existing rules.
  while (state.status === 'running' && state.tick < startTick + 300) {
    if ((state.tick - startTick) % 15 === 0) {
      const request = createDecisionRequest(state, fixture.context);
      const reply = replay
        ? replay[index]?.reply
        : chooseAction(model, request);
      if (!reply) throw new Error('Missing replay decision');
      if (replay) assert.equal(request.id, replay[index].request.id);
      const before = state;
      const applied = applyDecision(state, fixture.context, request, reply);
      state = applied.state;
      if (replay) assert.deepEqual(applied.receipt, replay[index].receipt);
      decisions.push({ request, reply, receipt: applied.receipt });
      outcomes.push({ before, request, receipt: applied.receipt });
      index++;
    }
    state = stepSurvival(state, {}, { waves: false });
  }
  if (replay) assert.equal(index, replay.length);
  // Outcomes are bounded to the next decision or episode end, never global hidden state.
  const traces = outcomes.map((entry, i) => {
    const end = outcomes[i + 1]?.before ?? state;
    return {
      schema: AI_SCHEMA,
      request: entry.request,
      receipt: entry.receipt,
      outcome: {
        endTick: end.tick,
        hpChange: end.player.hp - entry.before.player.hp,
        foodChange: end.player.food - entry.before.player.food,
        waterChange: end.player.water - entry.before.player.water,
        bagAdded: end.bag
          .filter(
            (item) => !entry.before.bag.some((old) => old.uid === item.uid),
          )
          .map((item) => item.uid),
        bagRemoved: entry.before.bag
          .filter(
            (item) => !end.bag.some((current) => current.uid === item.uid),
          )
          .map((item) => item.uid),
      },
    };
  });
  const summary = {
    id: fixture.example.id,
    goal: fixture.context.goal,
    status: state.status,
    ticks: state.tick - startTick,
    mental: state.player.hp,
    water: state.player.water,
    bagCount: state.bag.length,
    searched: state.caches
      .filter((cache) => cache.opened)
      .map((cache) => cache.id),
    decisions: decisions.length,
    rejected: decisions.filter((decision) => !decision.receipt.accepted).length,
    finalHash: fingerprint(state),
  };
  return {
    summary,
    decisions,
    traces,
    initialState: startState,
    finalState: state,
  };
}
const episodes = fixtures
  .filter((fixture) => fixture.example.id.endsWith('-0'))
  .map((fixture) => {
    const run = episode(fixture);
    const replay = episode(fixture, run.decisions);
    assert.deepEqual(run.finalState, replay.finalState);
    return { ...run, context: fixture.context };
  });

const times = [];
for (let i = 0; i < 100; i++)
  chooseAction(model, examples[i % examples.length].request);
for (let i = 0; i < 1000; i++) {
  const request = examples[i % examples.length].request;
  const before = performance.now();
  chooseAction(model, request);
  times.push(performance.now() - before);
}
times.sort((a, b) => a - b);
const percentile = (p) => times[Math.floor((times.length - 1) * p)];
const report = {
  schema: 'f9-ai-lab-report-v1',
  scope:
    'Synthetic pipeline smoke only. No Laya, no in-game multi-actor integration, no social strategy validation.',
  dataset,
  modelVersion: model.version,
  parameterCount,
  trainingMs,
  modelJsonBytes: Buffer.byteLength(JSON.stringify(model)),
  staticEvaluation,
  closedLoop: episodes.map((run) => run.summary),
  replayMatches: episodes.length,
  inference: {
    environment: 'Node.js CPU, warm, game renderer not running',
    samples: times.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  },
};
fs.mkdirSync(output, { recursive: true });
const writeJson = (name, value) =>
  fs.writeFileSync(
    path.join(output, name),
    JSON.stringify(value, null, 2) + '\n',
  );
writeJson('model.json', model);
writeJson('report.json', report);
writeJson(
  'benchmark-request.json',
  examples.find((example) => example.partition === 'test').request,
);
writeJson(
  'benchmark-requests.json',
  examples.map((example) => {
    const reply = chooseAction(model, example.request);
    return {
      request: example.request,
      expected: example.request.candidates.find(
        (candidate) => candidate.id === reply.candidateId,
      ).key,
    };
  }),
);
fs.writeFileSync(
  path.join(output, 'dataset.jsonl'),
  examples.map((example) => JSON.stringify(example)).join('\n') + '\n',
);
fs.writeFileSync(
  path.join(output, 'review.jsonl'),
  examples
    .map(toChoiceExample)
    .map((example) => JSON.stringify(example))
    .join('\n') + '\n',
);
fs.writeFileSync(
  path.join(output, 'traces.jsonl'),
  episodes
    .flatMap((run) => run.traces)
    .map((trace) => JSON.stringify(trace))
    .join('\n') + '\n',
);
writeJson(
  'replays.json',
  episodes.map(({ initialState, finalState, decisions, context }) => ({
    schema: AI_SCHEMA,
    context,
    initialState,
    decisions,
    finalHash: fingerprint(finalState),
  })),
);
await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    outDir: path.join(output, 'worker'),
    emptyOutDir: false,
    lib: {
      entry: path.join(root, 'apps/elevator-ai/ai-lab/worker.ts'),
      formats: ['es'],
      fileName: () => 'decision-worker.js',
    },
    minify: true,
  },
});
fs.copyFileSync(
  path.join(root, 'apps/elevator-ai/ai-lab/benchmark.html'),
  path.join(output, 'index.html'),
);
console.log(
  JSON.stringify(
    {
      output,
      dataset: dataset.counts,
      parameterCount,
      trainingMs: +trainingMs.toFixed(1),
      evaluation: staticEvaluation.map(({ partition, count, correct }) => ({
        partition,
        correct,
        count,
      })),
      replayMatches: episodes.length,
      nodeWarmP95Ms: +percentile(0.95).toFixed(3),
    },
    null,
    2,
  ),
);
