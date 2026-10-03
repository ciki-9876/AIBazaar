import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SOURCE_ROOTS, owner } from './module-graph.mjs';

const generated = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', '.public', '.vinext', '.vite', '.next']);
export function discoverTests(target = 'all', root = ROOT) {
  if (!['all', 'shared', 'elevator', 'cards', 'experiments'].includes(target)) throw new Error(`Unknown test target: ${target}`);
  const walk = (directory) => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
      ? generated.has(entry.name) ? [] : walk(`${directory}/${entry.name}`)
      : entry.isFile() ? [`${directory}/${entry.name}`] : []);
  };
  const belongs = (file) => file.startsWith('scripts/') || file.startsWith('tests/') ? 'shared'
    : file === 'app/art/playback.test.mjs' ? 'cards' : owner(file);
  return SOURCE_ROOTS.flatMap(walk).filter((file) => /\.test\.(mjs|cjs|js|ts)$/.test(file)
    && (target === 'all' || belongs(file) === target || (['elevator', 'cards'].includes(target) && belongs(file) === 'shared')))
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}
