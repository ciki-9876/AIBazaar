import { spawnSync } from 'node:child_process';
import { ROOT } from './module-graph.mjs';
import { discoverTests } from './test-discovery.mjs';

const target = process.argv[2] || 'all';
const files = discoverTests(target);
if (!files.length) throw new Error('No tests discovered for ' + target);
if (process.argv.includes('--list')) console.log(files.join('\n'));
else {
  console.log('Testing ' + target + ': ' + files.length + ' files');
  const run = spawnSync(process.execPath, ['--test', ...files], { cwd: ROOT, stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
}
