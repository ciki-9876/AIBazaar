import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { finalizeStatic } from './static-output.mjs';

function fixture(t, html) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'f9-static-output-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'index.html'), html);
  return root;
}

test('static export accepts the exact product root with or without trailing slash', (t) => {
  const output = fixture(t, '<a href="/AIBazaar/throw">Home</a><a href="/AIBazaar/throw/">Home</a>');
  assert.doesNotThrow(() => finalizeStatic(output, '/AIBazaar/throw'));
  assert.ok(fs.existsSync(path.join(output, '.nojekyll')));
});

test('accepting the product root does not admit adjacent or unprefixed routes', (t) => {
  for (const url of ['/wandeng/throw', '/AIBazaar/throw-other']) {
    const output = fixture(t, `<a href="${url}">Other</a>`);
    assert.throws(() => finalizeStatic(output, '/AIBazaar/throw'), /Missing product prefix/);
  }
});

test('prefixed routes still require an actual export target', (t) => {
  const output = fixture(t, '<a href="/AIBazaar/throw/missing">Missing</a>');
  assert.throws(() => finalizeStatic(output, '/AIBazaar/throw'), /Missing export target/);
});
