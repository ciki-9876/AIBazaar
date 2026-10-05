import test from 'node:test';
import assert from 'node:assert/strict';
import { sitePath } from '../site-path.ts';

test('adventure and vector art retain their standalone or nested product base', async () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(sitePath('/wandeng/throw'), '/wandeng/throw');
    process.env.NEXT_PUBLIC_BASE_PATH = '/AIBazaar/throw';
    assert.equal(sitePath('/wandeng/throw'), '/AIBazaar/throw/wandeng/throw');
    assert.equal(sitePath('/art/vector/play'), '/AIBazaar/throw/art/vector/play');
    assert.equal(sitePath('https://example.com/image.png'), 'https://example.com/image.png');
    const { PIXEL_ART_ROOT } = await import('../../app/adventure/pixel-scene-assets.ts');
    const { EDITORIAL_ART_ROOT, editorialImageUrl } = await import('../../app/adventure/editorial-scene-renderer.ts');
    assert.equal(PIXEL_ART_ROOT, '/AIBazaar/throw/art-assets/throw/western-rpg-v2');
    assert.equal(EDITORIAL_ART_ROOT, '/AIBazaar/throw/art-assets/throw/editorial-v1');
    assert.equal(editorialImageUrl('hero.png'), '/AIBazaar/throw/art-assets/throw/editorial-v1/hero.png');
    assert.equal(editorialImageUrl('/art-assets/throw/vector-v1/eli.svg'), '/AIBazaar/throw/art-assets/throw/vector-v1/eli.svg');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  }
});
