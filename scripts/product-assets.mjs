import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './module-graph.mjs';
import { PRODUCTS } from './products.mjs';

const target = process.argv[2];
if (!PRODUCTS[target] && target !== 'experiments')
  throw new Error(`Unknown product ${target}`);
const destination = path.resolve(ROOT, 'apps', target, '.public');
// This directory contains generated copies only. Never remove a canonical asset.
if (
  !destination.startsWith(path.resolve(ROOT, 'apps') + path.sep) ||
  path.basename(destination) !== '.public'
)
  throw new Error('Invalid generated asset directory');
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const entry of target === 'experiments'
  ? fs.readdirSync(path.resolve(ROOT, 'public'))
  : PRODUCTS[target].assets) {
  const source = path.resolve(ROOT, 'public', entry),
    output = path.join(destination, entry);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.cpSync(source, output, { recursive: true });
}
console.log(`Prepared ${target} assets`);
