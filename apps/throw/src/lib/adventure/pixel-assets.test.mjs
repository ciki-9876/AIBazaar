import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HERO_WORLD_HEIGHT,
  nativeSceneSize,
  PIXEL_SCENES,
  PIXEL_WORLD_SCALE,
} from '../../app/adventure/pixel-scene-assets.ts';

const root = new URL(
  '../../../../../public/art-assets/throw/western-rpg-v2/',
  import.meta.url,
);
const manifest = JSON.parse(
  fs.readFileSync(new URL('manifest.json', root), 'utf8'),
);
const lists = (key, atlas) =>
  key === 'hero'
    ? [atlas.walk, atlas.idle]
    : key === 'npcs'
      ? [atlas.reed, atlas.mia, atlas.felix]
      : [atlas.frames];

test('registered frames refer to actual RGBA PNG pixels, never fractional atlas cells', () => {
  for (const [key, atlas] of Object.entries(manifest.atlases)) {
    const png = fs.readFileSync(new URL(atlas.file, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), atlas.width);
    assert.equal(png.readUInt32BE(20), atlas.height);
    assert.equal(png[25], 6, `${key} must retain alpha`);
    for (const frames of lists(key, atlas))
      for (const frame of frames) {
        for (const value of [frame.x, frame.y, frame.width, frame.height])
          assert.ok(Number.isInteger(value));
        assert.ok(
          frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0,
        );
        assert.ok(
          frame.x + frame.width <= atlas.width &&
            frame.y + frame.height <= atlas.height,
        );
      }
  }
});

test('each animated actor owns a complete independently registered cycle', () => {
  assert.equal(manifest.atlases.hero.walk.length, 8);
  assert.equal(manifest.atlases.hero.idle.length, 8);
  for (const frames of [
    manifest.atlases.hero.walk,
    manifest.atlases.hero.idle,
    manifest.atlases.npcs.reed,
    manifest.atlases.npcs.mia,
    manifest.atlases.npcs.felix,
  ]) {
    assert.ok(frames.length >= 4);
    for (const frame of frames) {
      assert.ok(
        Number.isInteger(frame.pivotX) && Number.isInteger(frame.pivotY),
      );
      assert.ok(
        frame.pivotX >= frame.x && frame.pivotX <= frame.x + frame.width,
      );
      assert.equal(
        frame.pivotY,
        frame.y + frame.height,
        'every cycle plants its boots on the same output baseline',
      );
    }
    const maximum = Math.max(...frames.map((frame) => frame.height));
    const heights = frames.map((frame) =>
      Math.round((frame.height / maximum) * 48),
    );
    assert.ok(
      Math.max(...heights) - Math.min(...heights) <= 1,
      'head height may vary by one native pixel',
    );
    assert.equal(
      new Set(frames.map((frame) => `${frame.x}:${frame.y}`)).size,
      frames.length,
    );
  }
});

test('reusable atoms cover every scene instance and keep indoor human proportions', () => {
  const ids = new Set(
    [...manifest.atlases.props.frames, ...manifest.atlases.decor.frames].map(
      (frame) => frame.id,
    ),
  );
  assert.equal(ids.size, 16);
  const human = HERO_WORLD_HEIGHT / PIXEL_WORLD_SCALE;
  assert.equal(human, 48);
  for (const [id, scene] of Object.entries(PIXEL_SCENES)) {
    assert.equal(
      new Set(scene.props.map((prop) => prop.id)).size,
      scene.props.length,
    );
    for (const prop of [...scene.props, ...(scene.decor ?? [])])
      assert.ok(ids.has(prop.asset), `unknown atom ${id}:${prop.asset}`);
    if (id !== 'street') {
      for (const prop of scene.props.filter((prop) => prop.asset === 'door'))
        assert.ok(prop.height / human >= 1.2 && prop.height / human <= 1.5);
      for (const prop of scene.props.filter((prop) => prop.asset === 'desk'))
        assert.ok(prop.height / human >= 0.45 && prop.height / human <= 0.6);
    }
  }
});

test('each scene has local warm and cool runtime lights inside the fixed shader budget', () => {
  for (const [id, scene] of Object.entries(PIXEL_SCENES)) {
    const size = nativeSceneSize(id);
    assert.ok(size.width > 0 && size.height > 0);
    assert.ok(scene.lights.length > 1 && scene.lights.length <= 8);
    assert.equal(
      new Set(scene.lights.map((light) => light.id)).size,
      scene.lights.length,
    );
    assert.ok(scene.lights.some((light) => light.color[0] > light.color[2]));
    assert.ok(scene.lights.some((light) => light.color[2] > light.color[0]));
    for (const light of scene.lights)
      assert.ok(light.z > 0 && light.radius > 0 && light.power > 0);
  }
});
