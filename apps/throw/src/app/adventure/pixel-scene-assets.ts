import { MAPS, type MapId } from '../../lib/adventure/magician-world.ts';

/** One native art pixel is four adventure-world units. All placements are in native pixels. */
export const PIXEL_WORLD_SCALE = 4;
export const HERO_WORLD_HEIGHT = 192;
export const PIXEL_ART_ROOT = '/art-assets/throw/western-rpg-v2';
export type PixelFrameRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Absolute atlas coordinates; body anchor horizontally and boot baseline vertically. */
  pivotX?: number;
  pivotY?: number;
};
export type PixelSceneManifest = {
  version: string;
  worldUnitsPerPixel: number;
  heroHeight: number;
  atlases: {
    props: {
      file: string;
      width: number;
      height: number;
      frames: (PixelFrameRect & { id: string })[];
    };
    hero: {
      file: string;
      width: number;
      height: number;
      walk: PixelFrameRect[];
      idle: PixelFrameRect[];
    };
    npcs: {
      file: string;
      width: number;
      height: number;
      reed: PixelFrameRect[];
      mia: PixelFrameRect[];
      felix: PixelFrameRect[];
    };
    decor?: {
      file: string;
      width: number;
      height: number;
      frames: (PixelFrameRect & { id: string })[];
    };
  };
};

let manifestPromise: Promise<PixelSceneManifest> | null = null;
export function loadPixelSceneManifest(): Promise<PixelSceneManifest> {
  manifestPromise ??= fetch(`${PIXEL_ART_ROOT}/manifest.json`).then(
    async (response) => {
      if (!response.ok) throw new Error('Pixel asset manifest is unavailable');
      return (await response.json()) as PixelSceneManifest;
    },
  );
  return manifestPromise;
}
export const PROP_IDS = [
  'door',
  'window',
  'bookshelf',
  'desk',
  'streetlamp',
  'hanginglamp',
  'cabinet',
  'plant',
] as const;
export type PropId = (typeof PROP_IDS)[number];
export const DECOR_IDS = [
  'awning',
  'curtains',
  'rug',
  'poster',
  'bench',
  'clock',
  'shopwindow',
  'cornice',
] as const;
export type DecorId = (typeof DECOR_IDS)[number];
export type SceneProp = {
  id: string;
  asset: PropId;
  x: number;
  bottom: number;
  height: number;
  width?: number;
  mirror?: boolean;
  foreground?: boolean;
  blocker?: boolean;
};
export type SceneLight = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: readonly [number, number, number];
  power: number;
  flicker?: number;
};
export type PixelSceneDefinition = {
  props: readonly SceneProp[];
  decor?: readonly (Omit<SceneProp, 'asset'> & { asset: DecorId })[];
  lights: readonly SceneLight[];
  ambient: readonly [number, number, number];
};

/** Reusable instances refer to independent atlas silhouettes, never a flattened scene painting. */
export const PIXEL_SCENES: Record<MapId, PixelSceneDefinition> = {
  street: {
    ambient: [0.18, 0.25, 0.39],
    decor: [
      {
        id: 'reed-awning',
        asset: 'awning',
        x: 121,
        bottom: 156,
        height: 19,
        width: 81,
      },
      {
        id: 'reed-cornice',
        asset: 'cornice',
        x: 116,
        bottom: 86,
        height: 13,
        width: 197,
      },
      {
        id: 'lyric-cornice',
        asset: 'cornice',
        x: 326,
        bottom: 79,
        height: 13,
        width: 162,
      },
      {
        id: 'street-bench',
        asset: 'bench',
        x: 223,
        bottom: 220,
        height: 22,
        width: 48,
      },
      {
        id: 'street-programme',
        asset: 'poster',
        x: 186,
        bottom: 188,
        height: 30,
        width: 22,
      },
      {
        id: 'reed-display-west',
        asset: 'shopwindow',
        x: 62,
        bottom: 213,
        height: 43,
        width: 64,
      },
      {
        id: 'reed-display-east',
        asset: 'shopwindow',
        x: 179,
        bottom: 213,
        height: 43,
        width: 62,
      },
    ],
    props: [
      {
        id: 'reed-door',
        asset: 'door',
        x: 121.25,
        bottom: 218,
        height: 68,
        width: 45,
      },
      {
        id: 'reed-window-west',
        asset: 'window',
        x: 65,
        bottom: 147,
        height: 43,
      },
      {
        id: 'reed-window-east',
        asset: 'window',
        x: 177,
        bottom: 147,
        height: 43,
      },
      {
        id: 'reed-street-light',
        asset: 'streetlamp',
        x: 90,
        bottom: 220,
        height: 78,
      },
      { id: 'reed-planter', asset: 'plant', x: 149, bottom: 219, height: 20 },
      {
        id: 'lyric-door',
        asset: 'door',
        x: 335,
        bottom: 218,
        height: 69,
        width: 45,
      },
      {
        id: 'lyric-window-west',
        asset: 'window',
        x: 281,
        bottom: 145,
        height: 45,
      },
      {
        id: 'lyric-window-east',
        asset: 'window',
        x: 381,
        bottom: 145,
        height: 45,
      },
      {
        id: 'lyric-street-light',
        asset: 'streetlamp',
        x: 304,
        bottom: 220,
        height: 78,
      },
      { id: 'lyric-planter', asset: 'plant', x: 363, bottom: 219, height: 22 },
    ],
    lights: [
      {
        id: 'reed-lantern',
        x: 98,
        y: 164,
        z: 25,
        radius: 87,
        color: [1, 0.66, 0.3],
        power: 2.35,
        flicker: 0.025,
      },
      {
        id: 'lyric-lantern',
        x: 312,
        y: 164,
        z: 25,
        radius: 87,
        color: [1, 0.63, 0.29],
        power: 2.4,
        flicker: 0.02,
      },
      {
        id: 'reed-window',
        x: 62,
        y: 192,
        z: 15,
        radius: 67,
        color: [1, 0.73, 0.4],
        power: 1.65,
      },
      {
        id: 'reed-window-east',
        x: 179,
        y: 192,
        z: 15,
        radius: 66,
        color: [1, 0.67, 0.28],
        power: 1.5,
      },
      {
        id: 'bus-headlight',
        x: 406,
        y: 201,
        z: 15,
        radius: 48,
        color: [1, 0.84, 0.57],
        power: 0.85,
      },
      {
        id: 'dusk-sky',
        x: 226,
        y: 70,
        z: 110,
        radius: 320,
        color: [0.49, 0.66, 1],
        power: 0.3,
      },
    ],
  },
  workshop: {
    ambient: [0.3, 0.29, 0.31],
    decor: [
      {
        id: 'workshop-ceiling-beam',
        asset: 'cornice',
        x: 160,
        bottom: 32,
        height: 13,
        width: 320,
      },
      {
        id: 'workshop-curtains',
        asset: 'curtains',
        x: 268,
        bottom: 115,
        height: 62,
        width: 68,
      },
      {
        id: 'workshop-rug',
        asset: 'rug',
        x: 161,
        bottom: 177,
        height: 22,
        width: 121,
      },
      {
        id: 'workshop-programme',
        asset: 'poster',
        x: 139,
        bottom: 108,
        height: 36,
        width: 27,
      },
      {
        id: 'workshop-clock',
        asset: 'clock',
        x: 224,
        bottom: 69,
        height: 20,
        width: 20,
      },
    ],
    props: [
      {
        id: 'workshop-exit',
        asset: 'door',
        x: 35,
        bottom: 152,
        height: 66,
        width: 43,
      },
      {
        id: 'workshop-books',
        asset: 'bookshelf',
        x: 94,
        bottom: 150,
        height: 65,
        blocker: true,
      },
      {
        id: 'workshop-window',
        asset: 'window',
        x: 268,
        bottom: 112,
        height: 51,
        width: 45,
      },
      {
        id: 'workshop-workbench',
        asset: 'desk',
        x: 165,
        bottom: 151,
        height: 27,
        width: 66,
        blocker: true,
      },
      {
        id: 'workshop-radio',
        asset: 'cabinet',
        x: 272,
        bottom: 151,
        height: 30,
        width: 27,
        blocker: true,
      },
      { id: 'workshop-plant', asset: 'plant', x: 297, bottom: 151, height: 24 },
      {
        id: 'workshop-pendant-west',
        asset: 'hanginglamp',
        x: 84,
        bottom: 66,
        height: 36,
        width: 27,
      },
      {
        id: 'workshop-pendant-east',
        asset: 'hanginglamp',
        x: 173,
        bottom: 66,
        height: 36,
        width: 27,
      },
    ],
    lights: [
      {
        id: 'workshop-pendant-west',
        x: 84,
        y: 62,
        z: 38,
        radius: 110,
        color: [1, 0.7, 0.39],
        power: 1.8,
        flicker: 0.018,
      },
      {
        id: 'workshop-pendant-east',
        x: 173,
        y: 62,
        z: 38,
        radius: 110,
        color: [1, 0.71, 0.4],
        power: 1.8,
        flicker: 0.015,
      },
      {
        id: 'workshop-moon-window',
        x: 268,
        y: 86,
        z: 27,
        radius: 101,
        color: [0.42, 0.69, 1],
        power: 1.35,
      },
    ],
  },
  theatre: {
    ambient: [0.35, 0.36, 0.43],
    decor: [
      {
        id: 'theatre-stage-curtains',
        asset: 'curtains',
        x: 238,
        bottom: 135,
        height: 105,
        width: 184,
      },
      {
        id: 'theatre-programme',
        asset: 'poster',
        x: 72,
        bottom: 123,
        height: 34,
        width: 25,
      },
      {
        id: 'theatre-rug',
        asset: 'rug',
        x: 241,
        bottom: 188,
        height: 23,
        width: 139,
      },
    ],
    props: [
      {
        id: 'theatre-exit',
        asset: 'door',
        x: 37.5,
        bottom: 160,
        height: 67,
        width: 43,
      },
      {
        id: 'theatre-prop-table',
        asset: 'desk',
        x: 133,
        bottom: 161,
        height: 27,
        width: 65,
        blocker: true,
      },
      {
        id: 'theatre-radio',
        asset: 'cabinet',
        x: 312,
        bottom: 161,
        height: 30,
        width: 29,
        blocker: true,
      },
      {
        id: 'theatre-pendant',
        asset: 'hanginglamp',
        x: 91,
        bottom: 62,
        height: 34,
        width: 25,
      },
      {
        id: 'theatre-planter',
        asset: 'plant',
        x: 335,
        bottom: 160,
        height: 27,
      },
    ],
    lights: [
      {
        id: 'theatre-spotlight',
        x: 238,
        y: 41,
        z: 48,
        radius: 175,
        color: [1, 0.81, 0.53],
        power: 1.65,
      },
      {
        id: 'theatre-pendant',
        x: 91,
        y: 58,
        z: 34,
        radius: 117,
        color: [1, 0.63, 0.31],
        power: 1.22,
        flicker: 0.02,
      },
      {
        id: 'theatre-side-light',
        x: 333,
        y: 79,
        z: 28,
        radius: 85,
        color: [0.47, 0.67, 1],
        power: 0.75,
      },
    ],
  },
};

export function nativeSceneSize(mapId: MapId) {
  const map = MAPS[mapId];
  return {
    width: Math.ceil(map.width / PIXEL_WORLD_SCALE),
    height: Math.ceil(map.height / PIXEL_WORLD_SCALE),
    floor: map.floor / PIXEL_WORLD_SCALE,
  };
}
