import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2] || 'all';
if (!['all', 'elevator', 'cards', 'experiments'].includes(target))
  throw new Error(`Unknown test target: ${target}`);
const walk = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(`${dir}/${entry.name}`)
      : [`${dir}/${entry.name}`],
  );
const belongs = (file) => {
  if (file.startsWith('lib/survival-') || file.startsWith('app/survival/'))
    return 'elevator';
  if (
    /^lib\/(?:arena-|wandeng-|card-framework|cards\/|training-)/.test(file) ||
    /^app\/(?:arena|wandeng)\//.test(file) ||
    file === 'app/art/playback.test.mjs'
  )
    return 'cards';
  return 'experiments';
};
const files = ['app', 'lib', 'scripts', 'packages']
  .flatMap((dir) => {
    try {
      return walk(dir);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  })
  .filter(
    (file) =>
      file.endsWith('.test.mjs') &&
      (target === 'all' || belongs(file) === target),
  )
  .sort((a, b) => a.localeCompare(b));
if (!files.length) throw new Error(`No tests discovered for ${target}`);
console.log(`Testing ${target}: ${files.length} files`);
const run = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit',
});
if (run.error) throw run.error;
process.exit(run.status ?? 1);
