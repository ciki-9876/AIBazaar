import { spawnSync } from 'node:child_process';
import { ROOT } from './module-graph.mjs';
import { PRODUCTION_PRODUCTS } from './products.mjs';
for (const target of PRODUCTION_PRODUCTS) {
  const result = spawnSync(
    process.execPath,
    ['scripts/product.mjs', target, 'build'],
    { cwd: ROOT, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
}
