import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encounterTrainingData } from './encounter-training.ts';
import {
  trainEncounter,
  evaluateEncounter,
} from '../src/lib/survival-ai/encounter-policy.ts';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const data = encounterTrainingData();
const start = performance.now();
const model = trainEncounter(data, 20261003);
const report = {
  model: model.version,
  parameters: model.w1.length + model.b1.length + model.w2.length,
  trainingMilliseconds: performance.now() - start,
  evaluation: evaluateEncounter(model, data),
  disclaimer:
    'Synthetic utility imitation; not Laya, not an LLM, not a general reasoning model.',
};
const dir = path.join(root, 'outputs/f9-local-ai/encounter');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dataset.json'), JSON.stringify(data));
fs.writeFileSync(
  path.join(dir, 'report.json'),
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  path.join(root, 'apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
  JSON.stringify(model),
);
console.log(JSON.stringify(report, null, 2));
