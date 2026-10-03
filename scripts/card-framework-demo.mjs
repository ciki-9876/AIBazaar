import { mkdir, writeFile } from 'node:fs/promises';
import {
  compileDraft,
  createBattle,
  advanceBattle,
  runBattle,
  saveBattle,
  loadBattle,
  PROFILE,
  SUPPORT,
} from '../lib/card-framework/index.ts';
import { SAMPLE_DRAFTS } from '../lib/card-framework/samples.ts';

const compiled = await Promise.all(
  SAMPLE_DRAFTS.map((d, i) =>
    compileDraft(d, {
      blueprintId: `sample-${i + 1}`,
      generatedAt: '2026-09-27T00:00:00.000Z',
    }),
  ),
);
if (compiled.some((x) => !x.blueprint))
  throw Error(JSON.stringify(compiled.map((x) => x.report.blockingReasons)));
const blueprints = compiled.map((x) => x.blueprint);
const instance = (uid, index, side, at) => ({
  instanceId: uid,
  blueprintId: blueprints[index].blueprintId,
  revision: 1,
  side,
  at,
  level: 0,
  quality: 0,
});
const input = {
  profileId: PROFILE.id,
  seed: 20260927,
  blueprints,
  instances: [
    instance('player-cup', 0, 0, 0),
    instance('player-bell', 2, 0, 1),
    instance('player-spark', 1, 0, 2),
    instance('player-veil', 3, 0, 3),
    instance('enemy-spark', 1, 1, 0),
    instance('enemy-cup', 0, 1, 1),
    instance('enemy-veil', 3, 1, 2),
  ],
};
const initial = await createBattle(input),
  mid = advanceBattle(initial, 6310),
  result = runBattle(initial),
  resumed = runBattle(await loadBattle(saveBattle(mid)));
if (saveBattle(result) !== saveBattle(resumed)) throw Error('RESUME_DIVERGED');
const report = {
  framework: SUPPORT,
  profile: PROFILE,
  scenario: '四张文档样例纵向验收',
  seed: input.seed,
  result: result.result,
  remainingHp: result.hp.map((n) => n / 100),
  eventCount: result.events.length,
  midBattleResume: 'passed',
  publishable: false,
  compilation: compiled.map((x) => x.report),
  runtimeChecks: [
    { id: 'sample-simulation', status: 'passed' },
    { id: 'mid-battle-resume', status: 'passed' },
    { id: 'balance-budget', status: 'not_run' },
  ],
};
await mkdir('outputs/card-framework', { recursive: true });
await writeFile(
  'outputs/card-framework/report.json',
  JSON.stringify(report, null, 2),
);
await writeFile(
  'outputs/card-framework/input.json',
  JSON.stringify(input, null, 2),
);
await writeFile('outputs/card-framework/mid-battle.json', saveBattle(mid));
await writeFile('outputs/card-framework/final.json', saveBattle(result));
console.log(
  JSON.stringify(
    {
      result: result.result,
      hp: report.remainingHp,
      events: result.events.length,
      resume: 'passed',
      publishable: false,
    },
    null,
    2,
  ),
);
