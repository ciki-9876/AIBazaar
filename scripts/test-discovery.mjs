import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SOURCE_ROOTS, owner } from './module-graph.mjs';

const generated = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', '.public', '.vinext', '.vite', '.next']);
const targets = ['all', 'shared', 'elevator', 'resonance', 'throw', 'elevator-ai', 'experiments'];
const production = ['elevator', 'resonance', 'throw'];
export function discoverTests(target = 'all', root = ROOT) {
  if (!targets.includes(target)) throw new Error(`Unknown test target: ${target}`);
  const walk = (directory) => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
      ? generated.has(entry.name) ? [] : walk(`${directory}/${entry.name}`)
      : entry.isFile() ? [`${directory}/${entry.name}`] : []);
  };
  const belongs = (file) => file.startsWith('scripts/') || file.startsWith('tests/') ? 'shared'
    : owner(file);
  return SOURCE_ROOTS.flatMap(walk).filter((file) => /\.test\.(mjs|cjs|js|ts)$/.test(file)
    && (target === 'all' || belongs(file) === target || (production.includes(target) && belongs(file) === 'shared')))
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}
