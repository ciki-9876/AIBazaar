import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROPS,
  BOUNDS,
  PALETTES,
  prop,
  hero,
  svg,
} from './vector-authoring.mjs';

const output = fileURLToPath(
  new URL('../../../public/art-assets/throw/vector-v1/', import.meta.url),
);
fs.mkdirSync(output, { recursive: true });
const write = (file, body) =>
  fs.writeFileSync(path.join(output, file), body + '\n', 'utf8');
const frames = PROPS.map((id, index) => {
  const [x, y, width, height] = BOUNDS[id];
  return {
    id,
    x: (index % 4) * 200 + x,
    y: Math.floor(index / 4) * 256 + y,
    width,
    height,
  };
});
write(
  'props-atlas.svg',
  svg(
    PROPS.map(
      (id, i) =>
        `<g transform="translate(${(i % 4) * 200} ${Math.floor(i / 4) * 256})">${prop(id)}</g>`,
    ).join(''),
    800,
    512,
    PALETTES.original,
    1,
  ),
);
write(
  'hero-atlas.svg',
  svg(
    Array.from(
      { length: 16 },
      (_, i) =>
        `<g transform="translate(${(i % 8) * 200} ${Math.floor(i / 8) * 256})">${hero(i % 8, i < 8).replace(/id="([^"]+)"/g, (_, id) => `id="frame-${i}-${id}"`)}</g>`,
    ).join(''),
    1600,
    512,
    PALETTES.original,
    1,
  ),
);
const actorFrame = (i, row) => ({
  x: i * 200 + 35,
  y: row * 256 + 4,
  width: 130,
  height: 240,
  pivotX: i * 200 + 101,
  pivotY: row * 256 + 243,
});
write(
  'manifest.json',
  JSON.stringify(
    {
      version: 'throw-vector-trial-v1',
      worldUnitsPerPixel: 4,
      heroHeight: 192,
      authoring:
        'original editable SVG paths; no embedded raster, no automatic tracing',
      atlases: {
        props: {
          file: '/art-assets/throw/vector-v1/props-atlas.svg',
          width: 800,
          height: 512,
          frames,
        },
        hero: {
          file: '/art-assets/throw/vector-v1/hero-atlas.svg',
          width: 1600,
          height: 512,
          walk: Array.from({ length: 8 }, (_, i) => actorFrame(i, 0)),
          idle: Array.from({ length: 8 }, (_, i) => actorFrame(i, 1)),
        },
      },
    },
    null,
    2,
  ),
);
for (const [name, palette] of Object.entries(PALETTES)) {
  for (const id of PROPS)
    write(
      `${id}${name === 'original' ? '' : '-midnight'}.svg`,
      svg(prop(id, palette), 200, 256, palette),
    );
  write(
    `eli${name === 'original' ? '' : '-midnight'}.svg`,
    svg(hero(0, false, palette), 200, 256, palette),
  );
}
write(
  'production.json',
  JSON.stringify(
    {
      version: 'throw-vector-trial-v1',
      rebuild: 'node apps/throw/scripts/build-vector-art.mjs',
      paletteTokens: PALETTES,
      parts: [
        'back-leg',
        'back-arm',
        'front-leg',
        'coat',
        'neck',
        'head',
        'scarf',
        'front-arm',
      ],
      trialScope: [
        '8 scene props',
        'Eli: 8 walk + 8 idle',
        '2 palette families',
      ],
      unchangedRaster: ['3 NPCs', '8 scene decorations', 'equipment icons'],
      runtime:
        'SVG sources decoded into existing fixed-resolution canvas; shared WebGL lighting retained',
      recommendations: [
        'SVG masters for props, architecture, UI and cards',
        'separate reusable character parts + dedicated authored rig',
        'rasterize approved masters into texture atlases at build time for production games',
        'AI generates design candidates, not final frame-by-frame identity',
      ],
      files: fs
        .readdirSync(output)
        .filter((file) => file.endsWith('.svg'))
        .map((file) => ({
          file,
          bytes: fs.statSync(path.join(output, file)).size,
        })),
    },
    null,
    2,
  ),
);
console.log(`Wrote vector trial masters to ${output}`);
