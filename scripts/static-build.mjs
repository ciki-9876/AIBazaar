import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { finalizeStatic } from './static-output.mjs';

// Use the build API and let Node drain naturally. The beta CLI calls process.exit(0)
// while native Windows build handles are still closing, which can abort successful builds.
process.env.NODE_ENV = 'production';
process.env.__VINEXT_SHARED_BUILD_ID = randomUUID();
const root = process.cwd();
if (!/[/\\]apps[/\\](elevator|cards|experiments)$/.test(root))
  throw new Error('Build root must be a product app');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root) throw new Error('Invalid output path');
fs.rmSync(output, { recursive: true, force: true });
const { createBuilder } = await import('vite');
const { runPrerender } = await import('vinext/internal/build/run-prerender');
const builder = await createBuilder({ root });
await builder.buildApp();
const result = await runPrerender({ root });
if (
  result.routes.some((route) => route.status !== 'rendered') ||
  !fs.existsSync(path.join(output, 'client/index.html'))
)
  throw new Error(
    'Static export contains failed or skipped routes, or no homepage',
  );
console.log(`Static build complete: ${result.routes.length} routes`);
finalizeStatic(
  path.join(output, 'client'),
  process.env.NEXT_PUBLIC_BASE_PATH || '',
);
fs.writeFileSync(
  path.join(output, 'client/f9-release.json'),
  JSON.stringify(
    {
      product: path.basename(root),
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
      routes: result.routes.length,
    },
    null,
    2,
  ),
);
