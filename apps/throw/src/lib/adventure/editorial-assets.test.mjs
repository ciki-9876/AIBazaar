import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PIXEL_SCENES } from "../../app/adventure/pixel-scene-assets.ts";

const root = new URL(
  "../../../../../public/art-assets/throw/editorial-v1/",
  import.meta.url,
);
const manifest = JSON.parse(
  fs.readFileSync(new URL("manifest.json", root), "utf8"),
);
const frameGroups = (key, atlas) =>
  key === "hero"
    ? [atlas.walk, atlas.idle]
    : key === "npcs"
      ? [atlas.reed, atlas.mia, atlas.felix]
      : [atlas.frames];

test("illustrated atlases retain alpha and explicitly bounded source rectangles", () => {
  for (const [key, atlas] of Object.entries(manifest.atlases)) {
    const png = fs.readFileSync(new URL(atlas.file, root));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), atlas.width);
    assert.equal(png.readUInt32BE(20), atlas.height);
    assert.equal(png[25], 6, `${key} must keep transparency`);
    for (const frames of frameGroups(key, atlas))
      for (const frame of frames) {
        assert.ok(
          [frame.x, frame.y, frame.width, frame.height].every(Number.isInteger),
        );
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

test("every illustrated actor cycle preserves a body pivot and planted boot baseline", () => {
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
    assert.equal(
      new Set(frames.map((frame) => `${frame.x}:${frame.y}`)).size,
      frames.length,
    );
    const heights = frames.map((frame) => frame.height);
    assert.ok(
      Math.max(...heights) - Math.min(...heights) <= 6,
      "breathing never changes adult proportions",
    );
    for (const frame of frames) {
      assert.ok(
        Number.isFinite(frame.pivotX) &&
          frame.pivotX >= frame.x &&
          frame.pivotX <= frame.x + frame.width,
      );
      assert.equal(
        frame.pivotY,
        frame.y + frame.height,
        "frames register to the same output floor",
      );
    }
  }
});

test("new equipment and architecture preserve the complete original asset vocabulary", () => {
  assert.equal(manifest.atlases.items.frames.length, 12);
  const ids = new Set(
    [...manifest.atlases.props.frames, ...manifest.atlases.decor.frames].map(
      (frame) => frame.id,
    ),
  );
  assert.equal(ids.size, 16);
  for (const scene of Object.values(PIXEL_SCENES))
    for (const instance of [...scene.props, ...(scene.decor ?? [])])
      assert.ok(
        ids.has(instance.asset),
        `missing reusable atom: ${instance.asset}`,
      );
  assert.equal(manifest.heroHeight, 192);
  assert.equal(manifest.worldUnitsPerPixel, 4);
  assert.equal(manifest.rasterScale, 3);
});
