import { MAPS, type MapId } from '../../lib/adventure/magician-world.ts';
import { sitePath } from '../../lib/site-path.ts';
import {
  HERO_WORLD_HEIGHT,
  nativeSceneSize,
  PIXEL_SCENES,
  PIXEL_WORLD_SCALE,
  type PixelFrameRect,
  type PixelSceneManifest,
  type SceneProp,
} from './pixel-scene-assets.ts';
import {
  cpuLighting,
  webglLighting,
  type Layer,
  type LightingPass,
  type RendererStatus,
  type SceneActors,
  type SceneLightingOptions,
} from './pixel-scene-renderer.ts';

export const EDITORIAL_ART_ROOT = sitePath('/art-assets/throw/editorial-v1');
export type EditorialArtMode = 'raster' | 'vector';
export const EDITORIAL_RASTER_SCALE = 3;
export type EditorialSceneManifest = PixelSceneManifest & { items?: unknown };
type Atlas = {
  image: HTMLImageElement;
  frames: ReadonlyMap<string, PixelFrameRect>;
};
type ActorAtlas = {
  image: HTMLImageElement;
  groups: PixelFrameRect[][];
  heights: number[];
};
type DrawBounds = { x: number; y: number; width: number; height: number };

const manifestPromises = new Map<
  EditorialArtMode,
  Promise<EditorialSceneManifest>
>();
const imagePromises = new Map<string, Promise<HTMLImageElement>>();
export function loadEditorialSceneManifest(
  mode: EditorialArtMode = 'raster',
): Promise<EditorialSceneManifest> {
  let result = manifestPromises.get(mode);
  if (result) return result;
  result = fetch(`${EDITORIAL_ART_ROOT}/manifest.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error('Illustration manifest is unavailable');
      return (await response.json()) as EditorialSceneManifest;
    })
    .then(async (manifest) => {
      if (mode !== 'vector') return manifest;
      const response = await fetch(sitePath('/art-assets/throw/vector-v1/manifest.json'));
      if (!response.ok) throw new Error('Vector trial manifest is unavailable');
      const vector = (await response.json()) as Pick<
        EditorialSceneManifest,
        'atlases'
      >;
      return {
        ...manifest,
        atlases: { ...manifest.atlases, ...vector.atlases },
      };
    })
    .catch((error: unknown) => {
      manifestPromises.delete(mode);
      throw error;
    });
  manifestPromises.set(mode, result);
  return result;
}
export function editorialImageUrl(file: string) {
  return file.startsWith('/') ? sitePath(file) : `${EDITORIAL_ART_ROOT}/${file}`;
}

export function editorialSceneSize(mapId: MapId) {
  const size = nativeSceneSize(mapId);
  return {
    width: size.width * EDITORIAL_RASTER_SCALE,
    height: size.height * EDITORIAL_RASTER_SCALE,
    floor: size.floor * EDITORIAL_RASTER_SCALE,
  };
}

function layer(width: number, height: number, readFrequently = false): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', {
    willReadFrequently: readFrequently,
  });
  if (!context) throw new Error('Illustration canvas is unavailable');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

function loadImage(file: string): Promise<HTMLImageElement> {
  let promise = imagePromises.get(file);
  if (!promise) {
    const image = new Image();
    image.src = editorialImageUrl(file);
    promise = image
      .decode()
      .then(() => image)
      .catch((error: unknown) => {
        imagePromises.delete(file);
        throw error;
      });
    imagePromises.set(file, promise);
  }
  return promise;
}

function validateFrames(
  image: HTMLImageElement,
  frames: readonly PixelFrameRect[],
) {
  for (const frame of frames) {
    if (
      ![frame.x, frame.y, frame.width, frame.height].every(Number.isInteger) ||
      frame.x < 0 ||
      frame.y < 0 ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      frame.x + frame.width > image.width ||
      frame.y + frame.height > image.height ||
      (frame.pivotX !== undefined && !Number.isFinite(frame.pivotX)) ||
      (frame.pivotY !== undefined && !Number.isFinite(frame.pivotY))
    )
      throw new Error('Illustration frame is outside its registered atlas');
  }
}

function fill(
  context: CanvasRenderingContext2D,
  color: string | CanvasGradient,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function box(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0.9,
) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function stroke(
  context: CanvasRenderingContext2D,
  color: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 0.6,
) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

/** Broad terracotta shapes have continuous contours; they are not enlarged pixel brick marks. */
function facade(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  muted = false,
) {
  fill(context, muted ? '#ab7273' : '#b56c5b', x, y, width, height);
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  for (let row = 0; row < height / 9; row++) {
    for (let column = -1; column < width / 24 + 1; column++) {
      box(
        context,
        (row + column) % 3
          ? muted
            ? '#9c666c'
            : '#a75b50'
          : muted
            ? '#ba7e7d'
            : '#c27a65',
        x + column * 24 + (row % 2 ? 12 : 0) + 1.1,
        y + row * 9 + 1.1,
        21.6,
        6.5,
        1.1,
      );
    }
  }
  context.restore();
  const shade = context.createLinearGradient(x, y, x + width, y);
  shade.addColorStop(0, '#3f313119');
  shade.addColorStop(0.35, '#ffffff00');
  shade.addColorStop(1, '#3f313122');
  fill(context, shade, x, y, width, height);
  fill(context, '#edcfac', x - 2, y + 1, width + 4, 4.5);
  fill(context, '#9a6a51', x - 2, y + 5.5, width + 4, 1.4);
  fill(context, '#d8bb97', x, y + height - 17, width, 17);
  fill(context, '#f4dfbb', x - 1, y + height - 18, width + 2, 2);
}

function sign(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
) {
  box(context, '#e1c7a3', x, y, width, 14, 1.1);
  context.strokeStyle = '#85694e';
  context.lineWidth = 0.55;
  context.strokeRect(x + 1.7, y + 1.7, width - 3.4, 10.6);
  context.font = 'bold 6.8px Georgia, serif';
  context.textAlign = 'center';
  context.fillStyle = '#514b40';
  context.fillText(text, x + width / 2, y + 9.8);
}

function floorboards(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  floor: number,
  indoor: boolean,
) {
  const top = floor - 3.5;
  const gradient = context.createLinearGradient(0, top, 0, height);
  gradient.addColorStop(0, indoor ? '#a78462' : '#8d9290');
  gradient.addColorStop(1, indoor ? '#846952' : '#687c86');
  fill(context, gradient, 0, top, width, height - top);
  for (let row = 0, y = top; y < height; row++, y += indoor ? 10 : 11) {
    stroke(context, indoor ? '#70583f80' : '#52616e65', 0, y, width, y, 0.65);
    for (let x = row % 2 ? -24 : 0; x < width; x += indoor ? 61 : 48)
      stroke(
        context,
        indoor ? '#79624770' : '#53647266',
        x,
        y + 0.2,
        x,
        y + (indoor ? 9.6 : 10.6),
        0.45,
      );
  }
  fill(context, indoor ? '#b59b78' : '#c6c1ad', 0, top - 2.5, width, 2.5);
}

function bus(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.translate(x, y);
  box(context, '#956d39', 1, 0, 69, 38, 5);
  box(context, '#d4a65b', 0, 4, 71, 31, 4);
  box(context, '#ddbd79', 3, 7, 65, 18, 1.5);
  for (let px = 7; px < 57; px += 13) {
    box(context, '#54757c', px, 8, 10, 15, 1.1);
    fill(context, '#afc3be', px + 1, 9, 8, 1.4);
  }
  fill(context, '#ad7147', 3, 27, 65, 6);
  for (const px of [14, 56]) {
    context.beginPath();
    context.ellipse(px, 38, 7, 7, 0, 0, Math.PI * 2);
    context.fillStyle = '#3f4546';
    context.fill();
    context.beginPath();
    context.ellipse(px, 38, 3.4, 3.4, 0, 0, Math.PI * 2);
    context.fillStyle = '#b8ae96';
    context.fill();
  }
  box(context, '#f7dda0', -1, 27, 4, 5, 1);
  fill(context, '#6a8587', 63, 8, 4, 23);
  context.restore();
}

function street(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  floor: number,
) {
  const sky = context.createLinearGradient(0, 0, 0, floor);
  sky.addColorStop(0, '#8798ab');
  sky.addColorStop(1, '#b9b9ab');
  fill(context, sky, 0, 0, width, height);
  for (let index = 0; index < 11; index++) {
    const x = index * 47,
      top = 98 + (index % 3) * 10;
    box(context, '#708994', x, top, 42, floor - top, 1.3);
    fill(context, '#627a88', x + 4, top - 5, 34, 6);
    for (let wy = top + 13; wy < floor - 12; wy += 22)
      for (let wx = x + 7; wx < x + 36; wx += 13)
        box(context, '#b0bab0', wx, wy, 6, 10, 0.4);
  }
  facade(context, 20, 82, 192, 137);
  facade(context, 248, 75, 153, 144, true);
  sign(context, 'REED · WORKSHOP', 80, 121, 82);
  sign(context, 'LYRIC THEATRE', 310, 101, 55);
  floorboards(context, width, height, floor, false);
  bus(context, 405, 174);
  fill(context, '#405b52', 412, 142, 63, 3.8);
  stroke(context, '#bbad84', 470, 146, 470, 174, 1.4);
}

function room(
  context: CanvasRenderingContext2D,
  mapId: MapId,
  width: number,
  height: number,
  floor: number,
) {
  const theatre = mapId === 'theatre';
  const wall = context.createLinearGradient(0, 0, 0, floor);
  wall.addColorStop(0, theatre ? '#ac9990' : '#c8b79b');
  wall.addColorStop(1, theatre ? '#c9afa0' : '#dbc7a4');
  fill(context, wall, 0, 0, width, height);
  fill(context, theatre ? '#846d68' : '#a69276', 0, 0, width, 29);
  fill(context, '#efdaba', 0, 29, width, 4);
  fill(context, '#8c7157', 0, 33, width, 1.1);
  for (let x = 7; x < width; x += 40) {
    fill(context, '#b9a58555', x, 36, 1, floor - 65);
    fill(context, '#f0dbb633', x + 1.2, 36, 0.6, floor - 65);
  }
  fill(context, '#967456', 0, floor - 29, width, 29);
  fill(context, '#b59a76', 0, floor - 29, width, 2.1);
  for (let x = 1; x < width; x += 31) {
    fill(context, '#a28667', x, floor - 24, 28, 22);
    fill(context, '#896e54', x + 2, floor - 22, 24, 18);
    fill(context, '#ac9170', x + 2.6, floor - 21.4, 22.8, 0.65);
  }
  floorboards(context, width, height, floor, true);
  if (theatre) {
    fill(context, '#93626a', 139, 34, 201, 103);
    fill(context, '#4f6b70', 190, 45, 96, 89);
    fill(context, '#d9b985', 187, 42, 102, 2.2);
    context.fillStyle = '#e9d5ae';
    context.font = 'bold 7.6px Georgia, serif';
    context.textAlign = 'center';
    context.fillText('LYRIC THEATRE', 238, 69);
    for (const [x, y] of [
      [208, 91],
      [254, 108],
      [267, 84],
      [224, 116],
    ]) {
      stroke(context, '#d0b986', x, y, x, y + 5, 0.7);
      stroke(context, '#d0b986', x - 2.5, y + 2.5, x + 2.5, y + 2.5, 0.7);
    }
    fill(context, '#9b6d63', 184, floor - 1, 125, 7);
    fill(context, '#d8bb8d', 184, floor - 2.1, 125, 1.1);
  } else {
    fill(context, '#bd9b74', 204, 92, 18, 14);
    fill(context, '#edd9b6', 205.4, 93.4, 15.2, 11.2);
    context.fillStyle = '#967552';
    context.font = 'italic 4.6px Georgia, serif';
    context.textAlign = 'center';
    context.fillText('a little wonder', 213, 98);
    stroke(context, '#96755280', 208, 101.5, 218, 101.5, 0.4);
  }
}

function drawFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: PixelFrameRect,
  x: number,
  baseline: number,
  height: number,
  groupHeight = source.height,
  width?: number,
  flip = false,
): DrawBounds {
  const targetHeight = (height * source.height) / groupHeight;
  const targetWidth = width ?? (height * source.width) / groupHeight;
  const anchorX =
    (targetWidth *
      ((source.pivotX ?? source.x + source.width / 2) - source.x)) /
    source.width;
  const anchorY =
    (targetHeight * ((source.pivotY ?? source.y + source.height) - source.y)) /
    source.height;
  const targetX = x - (flip ? targetWidth - anchorX : anchorX),
    targetY = baseline - anchorY;
  context.save();
  context.translate(flip ? targetX + targetWidth : targetX, targetY);
  if (flip) context.scale(-1, 1);
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  context.restore();
  return { x: targetX, y: targetY, width: targetWidth, height: targetHeight };
}

/** Higher-resolution albedo plus the shared live material-lighting pass; gameplay coordinates stay unchanged. */
export class EditorialSceneRenderer {
  readonly width: number;
  readonly height: number;
  status: RendererStatus = 'loading';
  private readonly canvas: HTMLCanvasElement;
  private readonly mapId: MapId;
  private readonly artMode: EditorialArtMode;
  private readonly base: Layer;
  private readonly albedo: Layer;
  private readonly baseNormal: Layer;
  private readonly normal: Layer;
  private readonly blockers: Layer;
  private readonly mask: Layer;
  private lighting: LightingPass | null = null;
  private props: Atlas | null = null;
  private decor: Atlas | null = null;
  private hero: ActorAtlas | null = null;
  private npcs: ActorAtlas | null = null;
  private disposed = false;
  private animationStart = 0;
  private lastWalking = false;

  constructor(
    canvas: HTMLCanvasElement,
    mapId: MapId,
    artMode: EditorialArtMode = 'raster',
  ) {
    this.canvas = canvas;
    this.mapId = mapId;
    this.artMode = artMode;
    const size = editorialSceneSize(mapId);
    this.width = canvas.width = size.width;
    this.height = canvas.height = size.height;
    this.base = layer(size.width, size.height);
    this.albedo = layer(size.width, size.height);
    this.baseNormal = layer(size.width, size.height);
    this.normal = layer(size.width, size.height);
    this.blockers = layer(size.width, size.height);
    this.mask = layer(512, 512);
  }

  async load(): Promise<RendererStatus> {
    const manifest = await loadEditorialSceneManifest(this.artMode);
    if (this.disposed) return 'loading';
    const [propsImage, heroImage, npcImage, decorImage] = await Promise.all([
      loadImage(manifest.atlases.props.file),
      loadImage(manifest.atlases.hero.file),
      loadImage(manifest.atlases.npcs.file),
      manifest.atlases.decor
        ? loadImage(manifest.atlases.decor.file)
        : Promise.resolve(null),
    ]);
    if (this.disposed) return 'loading';
    validateFrames(propsImage, manifest.atlases.props.frames);
    const heroGroups = [manifest.atlases.hero.walk, manifest.atlases.hero.idle];
    const npcGroups = [
      manifest.atlases.npcs.reed,
      manifest.atlases.npcs.mia,
      manifest.atlases.npcs.felix,
    ];
    validateFrames(heroImage, heroGroups.flat());
    validateFrames(npcImage, npcGroups.flat());
    if (
      heroGroups.some((group) => group.length !== 8) ||
      npcGroups.some((group) => group.length !== 4)
    )
      throw new Error('Incomplete registered character animation');
    this.props = {
      image: propsImage,
      frames: new Map(
        manifest.atlases.props.frames.map((source) => [source.id, source]),
      ),
    };
    if (decorImage && manifest.atlases.decor) {
      validateFrames(decorImage, manifest.atlases.decor.frames);
      this.decor = {
        image: decorImage,
        frames: new Map(
          manifest.atlases.decor.frames.map((source) => [source.id, source]),
        ),
      };
    }
    this.hero = {
      image: heroImage,
      groups: heroGroups,
      heights: heroGroups.map((group) =>
        Math.max(...group.map((source) => source.height)),
      ),
    };
    this.npcs = {
      image: npcImage,
      groups: npcGroups,
      heights: npcGroups.map((group) =>
        Math.max(...group.map((source) => source.height)),
      ),
    };
    this.composeBase();
    this.lighting = webglLighting(
      this.canvas,
      this.mapId,
      this.lightingOptions(EDITORIAL_RASTER_SCALE),
    );
    if (this.lighting) this.status = 'webgl';
    else {
      this.lighting = this.softwareLighting();
      this.status = 'cpu';
    }
    this.canvas.dataset.renderer = this.status;
    return this.status;
  }

  private lightingOptions(scale: number): SceneLightingOptions {
    const scene = PIXEL_SCENES[this.mapId];
    return {
      ambient: this.mapId === 'street' ? [0.51, 0.54, 0.61] : [0.5, 0.47, 0.43],
      floor: nativeSceneSize(this.mapId).floor * scale,
      lights: scene.lights.map((light) => ({
        ...light,
        x: light.x * scale,
        y: light.y * scale,
        z: light.z * scale,
        radius: light.radius * scale,
        power: light.power * 0.88,
      })),
      smoothing: true,
      toneMapping: 'illustration',
    };
  }

  private softwareLighting(): LightingPass {
    const size = nativeSceneSize(this.mapId),
      output = this.canvas.getContext('2d');
    if (!output) throw new Error('Illustration software output is unavailable');
    output.imageSmoothingEnabled = true;
    output.imageSmoothingQuality = 'high';
    const smallOutput = layer(size.width, size.height, true),
      smallAlbedo = layer(size.width, size.height, true),
      smallNormals = layer(size.width, size.height, true),
      smallBlockers = layer(size.width, size.height, true);
    const pass = cpuLighting(
      smallOutput.canvas,
      this.mapId,
      this.lightingOptions(1),
    );
    this.canvas.dataset.softwareQuality = 'reduced-resolution';
    return {
      render: (albedo, normals, blockers, seconds, debug) => {
        for (const [input, target] of [
          [albedo, smallAlbedo],
          [normals, smallNormals],
          [blockers, smallBlockers],
        ] as const)
          target.context.drawImage(input.canvas, 0, 0, size.width, size.height);
        pass.render(smallAlbedo, smallNormals, smallBlockers, seconds, debug);
        output.drawImage(smallOutput.canvas, 0, 0, this.width, this.height);
      },
      dispose: () => pass.dispose(),
    };
  }

  private drawProp(
    prop: Omit<SceneProp, 'asset'> & { asset: string },
    atlas: Atlas,
  ): DrawBounds {
    const source = atlas.frames.get(prop.asset);
    if (!source) throw new Error(`Missing illustration asset: ${prop.asset}`);
    return drawFrame(
      this.base.context,
      atlas.image,
      source,
      prop.x * 3,
      prop.bottom * 3,
      prop.height * 3,
      source.height,
      prop.width === undefined ? undefined : prop.width * 3,
      prop.mirror,
    );
  }

  private silhouette(
    image: HTMLImageElement,
    source: PixelFrameRect,
    bounds: DrawBounds,
    color: string,
    flip = false,
  ) {
    const context = this.mask.context;
    context.clearRect(0, 0, 512, 512);
    context.save();
    if (flip) {
      context.translate(bounds.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    context.restore();
    context.globalCompositeOperation = 'source-in';
    fill(context, color, 0, 0, 512, 512);
    context.globalCompositeOperation = 'source-over';
  }

  private composeBase() {
    if (!this.props) return;
    const scene = PIXEL_SCENES[this.mapId],
      size = nativeSceneSize(this.mapId),
      scale = EDITORIAL_RASTER_SCALE;
    this.base.context.save();
    this.base.context.scale(scale, scale);
    if (this.mapId === 'street')
      street(this.base.context, size.width, size.height, size.floor);
    else
      room(this.base.context, this.mapId, size.width, size.height, size.floor);
    this.base.context.restore();
    fill(this.baseNormal.context, '#8080ff', 0, 0, this.width, this.height);
    fill(
      this.baseNormal.context,
      '#80f0bf',
      0,
      (size.floor - 3.5) * scale,
      this.width,
      this.height - (size.floor - 3.5) * scale,
    );
    fill(this.blockers.context, '#000000', 0, 0, this.width, this.height);
    if (this.decor)
      for (const prop of scene.decor ?? [])
        if (prop.asset !== 'curtains') this.drawProp(prop, this.decor);
    for (const prop of scene.props) {
      if (prop.foreground) continue;
      const bounds = this.drawProp(prop, this.props);
      if (prop.blocker) {
        const source = this.props.frames.get(prop.asset)!;
        this.silhouette(
          this.props.image,
          source,
          bounds,
          '#ffffff',
          prop.mirror,
        );
        this.blockers.context.drawImage(
          this.mask.canvas,
          0,
          0,
          bounds.width,
          bounds.height,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
        );
      }
    }
    if (this.decor)
      for (const prop of scene.decor ?? [])
        if (prop.asset === 'curtains') this.drawProp(prop, this.decor);
  }

  private drawActor(
    atlas: ActorAtlas,
    group: number,
    frame: number,
    x: number,
    floor: number,
    height: number,
    flip: boolean,
    facing: -1 | 1,
  ) {
    const source = atlas.groups[group][frame],
      context = this.albedo.context;
    context.fillStyle = '#55443744';
    context.beginPath();
    context.ellipse(x, floor, 22, 3.6, 0, 0, Math.PI * 2);
    context.fill();
    const bounds = drawFrame(
      context,
      atlas.image,
      source,
      x,
      floor,
      height,
      atlas.heights[group],
      undefined,
      flip,
    );
    this.silhouette(
      atlas.image,
      source,
      bounds,
      facing === -1 ? '#6480fb' : '#9c80fb',
      flip,
    );
    this.normal.context.drawImage(
      this.mask.canvas,
      0,
      0,
      bounds.width,
      bounds.height,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    );
  }

  render(actors: SceneActors, milliseconds: number, debug: boolean) {
    if (this.disposed || !this.lighting || !this.hero || !this.npcs) return;
    if (actors.walking !== this.lastWalking) {
      this.animationStart = milliseconds;
      this.lastWalking = actors.walking;
    }
    const seconds = milliseconds / 1000,
      localSeconds = (milliseconds - this.animationStart) / 1000,
      floor = editorialSceneSize(this.mapId).floor;
    this.albedo.context.drawImage(this.base.canvas, 0, 0);
    this.normal.context.drawImage(this.baseNormal.canvas, 0, 0);
    const group = actors.walking ? 0 : 1,
      frame = Math.floor(localSeconds * (actors.walking ? 11 : 5)) % 8;
    this.drawActor(
      this.hero,
      group,
      frame,
      (actors.playerX / PIXEL_WORLD_SCALE) * 3,
      floor,
      (HERO_WORLD_HEIGHT / PIXEL_WORLD_SCALE) * 3,
      actors.facing === -1,
      actors.facing,
    );
    for (const hotspot of MAPS[this.mapId].hotspots) {
      if (hotspot.kind !== 'npc' || !hotspot.character) continue;
      const row =
        hotspot.character === 'reed' ? 0 : hotspot.character === 'mia' ? 1 : 2;
      const facing = actors.playerX < hotspot.x ? -1 : 1;
      this.drawActor(
        this.npcs,
        row,
        Math.floor((seconds + row * 0.45) * 4) % 4,
        (hotspot.x / PIXEL_WORLD_SCALE) * 3,
        floor,
        (hotspot.character === 'mia' ? 46 : 48) * 3,
        facing !== -1,
        facing,
      );
    }
    try {
      this.lighting.render(
        this.albedo,
        this.normal,
        this.blockers,
        seconds,
        debug,
      );
    } catch {
      this.lighting.dispose();
      this.lighting = this.softwareLighting();
      this.status = 'cpu';
      this.canvas.dataset.renderer = 'cpu';
      this.canvas.dataset.lightingFallback = 'context-lost';
      this.lighting.render(
        this.albedo,
        this.normal,
        this.blockers,
        seconds,
        debug,
      );
    }
    this.canvas.dataset.heroFrame = String(frame + group * 8);
    this.canvas.dataset.npcFrame = String(Math.floor(seconds * 4) % 4);
    this.canvas.dataset.simulationTick = String(actors.tick);
  }

  dispose() {
    this.disposed = true;
    this.lighting?.dispose();
  }
}
