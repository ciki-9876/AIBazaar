import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { ROOT } from './module-graph.mjs';

const target = process.argv[2];
if (!['elevator', 'cards'].includes(target))
  throw new Error('Choose elevator or cards');
const project = process.env[`F9_${target.toUpperCase()}_PAGES_PROJECT`];
if (!project || !/^[a-z0-9-]+$/.test(project))
  throw new Error(
    `Configure F9_${target.toUpperCase()}_PAGES_PROJECT for this product before publishing`,
  );
const output = path.resolve(ROOT, 'apps', target, 'dist/client');
if (!fs.existsSync(path.join(output, 'index.html')))
  throw new Error(`Build ${target} before publishing`);
const manifest = JSON.parse(
  fs.readFileSync(path.join(output, 'f9-release.json'), 'utf8'),
);
if (manifest.product !== target || manifest.basePath !== '')
  throw new Error(
    `Run npm run build:${target} without NEXT_PUBLIC_BASE_PATH before publishing to an independent domain`,
  );
// Explicit invocation only; no automatic remote changes during local builds.
const result = spawnSync(
  process.execPath,
  [
    path.join(ROOT, 'node_modules/wrangler/bin/wrangler.js'),
    'pages',
    'deploy',
    output,
    '--project-name',
    project,
  ],
  { cwd: ROOT, stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
