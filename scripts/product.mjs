import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { EXPERIMENTS, PRODUCTS } from './products.mjs';
import { ROOT } from './module-graph.mjs';

const [target, command = 'build', ...args] = process.argv.slice(2);
if (
  !(target in PRODUCTS || target in EXPERIMENTS) ||
  !['dev', 'build', 'typecheck', 'lint'].includes(command)
)
  throw new Error('Invalid product command');
const run = (file, argv, cwd = ROOT) => {
  const result = spawnSync(
    process.execPath,
    [path.resolve(ROOT, file), ...argv],
    { cwd, stdio: 'inherit', env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
};
const appRoot = path.resolve(ROOT, 'apps', target);
if (command === 'typecheck')
  run('node_modules/typescript/bin/tsc', [
    '--project',
    path.join(appRoot, 'tsconfig.json'),
    '--noEmit',
    '--incremental',
    'false',
  ]);
else if (command === 'lint') {
  const { closure, walk } = await import('./module-graph.mjs');
  const entries = walk(`apps/${target}/app`).filter((f) =>
    /\/(page|layout)\.tsx$/.test(f),
  );
  const files = closure(entries).files.filter((f) => /\.(ts|tsx|mjs)$/.test(f));
  run('node_modules/oxlint/bin/oxlint', files);
} else {
  if (target in PRODUCTS) run('scripts/check-boundaries.mjs', [target]);
  run('scripts/product-assets.mjs', [target]);
  if (command === 'build') run('scripts/static-build.mjs', [], appRoot);
  else run('node_modules/vinext/dist/cli.js', [command, ...args], appRoot);
}
