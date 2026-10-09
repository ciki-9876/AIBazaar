import test from 'node:test';
import assert from 'node:assert/strict';
import { sitePath } from '../site-path.ts';

test('navigation keeps its standalone or nested product base', () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(sitePath('/wandeng/throw'), '/wandeng/throw');
    process.env.NEXT_PUBLIC_BASE_PATH = '/AIBazaar/throw';
    assert.equal(sitePath('/wandeng/throw'), '/AIBazaar/throw/wandeng/throw');
    assert.equal(sitePath('https://example.com/image.png'), 'https://example.com/image.png');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  }
});
