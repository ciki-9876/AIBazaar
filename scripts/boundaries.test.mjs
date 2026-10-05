import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryViolations, runtimeCycles } from './module-graph.mjs';

test('product boundaries reject direct, type-only and shared backdoor imports', () => {
  const edges = [
    { from: 'apps/elevator/app/page.tsx', to: 'apps/resonance/src/lib/cards/rhythm.ts', typeOnly: true },
    { from: 'packages/render-kit/atelier.ts', to: 'apps/elevator/app/page.tsx' },
    { from: 'apps/resonance/src/app/page.tsx', to: 'apps/throw/src/app/page.tsx' },
    { from: 'apps/elevator-ai/app/page.tsx', to: 'apps/elevator/app/page.tsx' },
  ];
  assert.equal(boundaryViolations(edges.slice(0, 1), 'elevator').length, 1);
  assert.equal(boundaryViolations(edges.slice(1, 3), 'resonance').length, 2);
  assert.equal(boundaryViolations(edges.slice(3), 'elevator-ai').length, 1);
  assert.equal(
    boundaryViolations(
      [{ from: 'apps/elevator/app/page.tsx', to: 'lib/site-path.ts' }],
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
