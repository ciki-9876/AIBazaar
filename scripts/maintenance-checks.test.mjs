import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverTests } from './test-discovery.mjs';
import { ROOT, productSources, dependencies, boundaryViolations } from './module-graph.mjs';

function fixture() {
  fs.mkdirSync(path.join(ROOT, 'outputs'), { recursive: true });
  const directory = fs.mkdtempSync(path.join(ROOT, 'outputs/maintenance-check-'));
  const write = (file, text = '') => { fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true }); fs.writeFileSync(path.join(directory, file), text); };
  const cleanup = () => {
    assert.ok(directory.startsWith(path.join(ROOT, 'outputs/maintenance-check-')));
    fs.rmSync(directory, { recursive: true, force: true });
  };
  return { directory, write, cleanup };
}
test('discovery covers nested apps, components, hooks, shared and legacy tests while excluding generated output', () => {
  const f = fixture();
  try {
    const tests = ['apps/resonance/app/deep/card.test.mjs', 'apps/elevator/app/lift.test.mjs', 'components/button.test.mjs', 'hooks/save.test.mjs', 'packages/core/core.test.mjs', 'scripts/check.test.mjs', 'lib/demo-engine.test.mjs'];
    tests.forEach((file) => f.write(file));
    f.write('apps/resonance/dist/bundled.test.mjs');
    f.write('apps/resonance/.public/bundled.test.mjs');
    f.write('apps/resonance/node_modules/dependency.test.mjs');
    assert.deepEqual(discoverTests('all', f.directory), [...tests].sort((a, b) => a < b ? -1 : a > b ? 1 : 0));
    for (const product of ['elevator', 'resonance', 'throw']) {
      const selected = discoverTests(product, f.directory);
      assert.ok(selected.includes('packages/core/core.test.mjs'));
      assert.ok(selected.includes('scripts/check.test.mjs'));
      const other = product === 'elevator' ? 'resonance' : 'elevator';
      assert.ok(!selected.includes(`apps/${other}/app/${product === 'elevator' ? 'deep/card' : 'lift'}.test.mjs`));
    }
  } finally { f.cleanup(); }
});
test('boundary scope includes unused product files and shared modules, excludes historical waterworks and test fixtures', () => {
  const files = ['lib/survival-unused.ts', 'apps/elevator/app/page.tsx', 'packages/core/unused.ts', 'app/survival/waterworks/page.tsx', 'lib/survival-room.test.mjs', 'app/wandeng/page.tsx'];
  assert.deepEqual(productSources(files, 'elevator'), files.slice(0, 3));
  assert.equal(boundaryViolations([{ from: files[0], to: 'app/art/page.tsx' }]).length, 1);
});
test('module parser detects workspace package imports, type imports and require; rejects computed imports', () => {
  const f = fixture();
  const file = path.relative(ROOT, path.join(f.directory, 'source.ts')).replaceAll('\\', '/');
  try {
    f.write('source.ts', "import type T from '@f9/resonance/app/page'; export { type X } from '@/lib/wandeng-game'; const x = require('@/lib/survival-room');");
    const edges = dependencies(file);
    assert.deepEqual(edges.map((e) => e.to), ['apps/resonance/app/page.tsx', 'lib/wandeng-game.ts', 'lib/survival-room.ts']);
    assert.equal(edges[0].typeOnly, true);
    assert.equal(edges[1].typeOnly, true);
    assert.equal(boundaryViolations(edges.map((e) => ({ ...e, from: 'lib/survival-room.ts' })), 'elevator').length, 2);
    f.write('source.ts', 'const page = import(destination);');
    assert.throws(() => dependencies(file), /Non-static module import/);
  } finally { f.cleanup(); }
});
