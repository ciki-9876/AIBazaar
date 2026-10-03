import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryViolations, runtimeCycles } from './module-graph.mjs';

test('product boundaries reject direct, type-only and shared backdoor imports', () => {
  const edges = [
    { from: 'lib/survival-room.ts', to: 'lib/cards/combat.ts', typeOnly: true },
    { from: 'packages/render-kit/atelier.ts', to: 'lib/survival-world.ts' },
    { from: 'app/arena/arena-table.tsx', to: 'app/art/slice/page.tsx' },
  ];
  assert.equal(boundaryViolations(edges.slice(0, 1), 'elevator').length, 1);
  assert.equal(boundaryViolations(edges.slice(1), 'cards').length, 2);
  assert.equal(
    boundaryViolations(
      [{ from: 'lib/survival-room.ts', to: 'lib/site-path.ts' }],
      'elevator',
    ).length,
    0,
  );
});
test('runtime cycle checks allow type references but reject executable cycles', () => {
  const forward = { from: 'a', to: 'b' },
    reverse = { from: 'b', to: 'a', typeOnly: true };
  assert.equal(runtimeCycles([forward, reverse]).length, 0);
  assert.equal(
    runtimeCycles([forward, { ...reverse, typeOnly: false }]).length,
    1,
  );
});
