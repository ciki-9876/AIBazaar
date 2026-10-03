import type { ItemKind } from '@/lib/survival-room';
type Pixel = [number, number, number, number, string];
const ink = '#08131d',
  dark = '#28464d',
  steel = '#648387',
  light = '#bed1ad',
  gold = '#c5a65f',
  amber = '#e4cb85',
  green = '#79bb9d',
  red = '#ba5751';
/** Native 32×32 sprites. Shaded objects, not scaled outline icons. */
export function PixelGear({
  kind,
  size = 32,
}: {
  kind: ItemKind;
  size?: number;
}) {
  const p: Pixel[] = [];
  const r = (x: number, y: number, w: number, h: number, c: string) =>
    p.push([x, y, w, h, c]);
  const frame = (x: number, y: number, w: number, h: number) => {
    r(x, y, w, h, ink);
    r(x + 1, y + 1, w - 2, h - 2, steel);
    r(x + 2, y + 2, w - 4, h - 4, dark);
    r(x + 2, y + 2, w - 4, 1, light);
    r(x + w - 3, y + 3, 1, h - 5, '#3d5e64');
  };
  if (kind === 'phone') {
    frame(8, 2, 16, 28);
    r(10, 6, 12, 18, '#0c262e');
    r(11, 7, 10, 4, '#3f796b');
    r(11, 12, 5, 1, green);
    r(11, 15, 8, 1, steel);
    r(11, 18, 6, 1, steel);
    r(11, 22, 10, 1, '#507e76');
    r(14, 4, 4, 1, ink);
    r(14, 26, 4, 2, light);
    r(9, 5, 1, 20, '#9bb49d');
  } else if (kind === 'flashlight') {
    frame(12, 12, 8, 18);
    r(13, 14, 2, 14, gold);
    r(15, 15, 3, 2, amber);
    for (let y = 19; y < 27; y += 3) r(13, y, 5, 1, ink);
    frame(8, 4, 16, 11);
    r(7, 5, 18, 6, ink);
    r(8, 4, 16, 5, gold);
    r(9, 3, 14, 4, amber);
    r(11, 3, 10, 2, '#f0e4b2');
    r(10, 8, 12, 2, steel);
    r(10, 11, 12, 2, dark);
  } else if (kind === 'energy-core') {
    r(10, 1, 4, 4, steel);
    r(19, 1, 3, 4, steel);
    frame(7, 5, 18, 24);
    r(9, 7, 14, 4, gold);
    r(10, 8, 12, 1, amber);
    r(9, 12, 14, 12, '#60523c');
    r(10, 13, 3, 10, gold);
    r(19, 13, 3, 10, amber);
    r(13, 13, 5, 8, '#394843');
    r(14, 15, 3, 5, green);
    r(9, 25, 14, 2, steel);
    r(23, 9, 1, 16, ink);
  } else if (kind === 'capacitor' || kind === 'coolant') {
    for (let n = 0; n < 4; n++) {
      r(6 + n * 5, 3, 2, 5, gold);
      r(6 + n * 5, 24, 2, 5, gold);
      r(3, 6 + n * 5, 5, 2, gold);
      r(24, 6 + n * 5, 5, 2, gold);
    }
    frame(6, 6, 20, 20);
    frame(10, 10, 12, 12);
    r(12, 12, 8, 8, kind === 'capacitor' ? '#bc7754' : '#619cba');
    r(13, 12, 2, 5, amber);
    r(15, 16, 4, 2, light);
    r(8, 8, 2, 2, green);
  } else if (kind === 'lift-material') {
    r(5, 11, 22, 12, ink);
    r(8, 7, 16, 20, ink);
    r(10, 5, 12, 2, ink);
    r(8, 10, 17, 12, '#b86d78');
    r(10, 7, 12, 18, '#d599a0');
    r(7, 14, 3, 6, '#995662');
    r(11, 8, 3, 5, '#e4b4ad');
    r(18, 8, 3, 5, '#e4b4ad');
    r(15, 7, 2, 17, '#673c51');
    r(10, 14, 5, 2, '#8b4b60');
    r(18, 15, 5, 2, '#8b4b60');
    r(10, 19, 3, 4, '#a76576');
    r(20, 20, 4, 3, '#bd7787');
    r(8, 26, 3, 3, '#803e56');
    r(23, 25, 2, 2, '#9b5268');
  } else if (kind === 'core') {
    const rows = [
      [13, 2, 6],
      [10, 5, 12],
      [7, 8, 18],
      [5, 12, 22],
      [7, 19, 18],
      [10, 24, 12],
      [13, 28, 6],
    ];
    for (const [x, y, w] of rows) r(x, y, w, 4, ink);
    r(13, 4, 6, 23, '#506e74');
    r(10, 7, 12, 17, '#759895');
    r(7, 12, 18, 7, steel);
    r(11, 8, 4, 14, light);
    r(15, 6, 3, 17, '#dce4b5');
    r(18, 10, 4, 9, '#435f68');
    r(13, 24, 6, 3, dark);
  } else if (kind === 'water') {
    r(12, 2, 8, 4, steel);
    r(13, 3, 6, 1, light);
    frame(9, 7, 14, 22);
    r(11, 10, 10, 7, '#639391');
    r(11, 17, 10, 8, '#396e81');
    r(11, 12, 2, 12, light);
    r(13, 18, 7, 3, '#b3cabb');
    r(10, 25, 12, 2, steel);
  } else if (kind === 'bread') {
    r(5, 12, 23, 14, ink);
    r(3, 15, 26, 8, ink);
    r(5, 13, 23, 11, '#9d5e32');
    r(7, 9, 18, 14, '#c38b48');
    r(9, 7, 14, 3, gold);
    r(7, 12, 18, 6, '#e6bd71');
    r(5, 17, 3, 6, '#c38b48');
    r(8, 22, 17, 2, '#7c4429');
    for (let i = 0; i < 3; i++) {
      r(10 + i * 5, 10, 2, 6, '#975c35');
      r(11 + i * 5, 10, 1, 4, '#fae1a0');
    }
  } else if (kind === 'food' || kind === 'medicine') {
    frame(5, 8, 22, 19);
    r(7, 10, 18, 15, kind === 'food' ? '#8b7249' : '#aaae8a');
    r(7, 10, 18, 3, amber);
    if (kind === 'medicine') {
      r(14, 14, 4, 9, red);
      r(11, 17, 10, 3, red);
    } else {
      r(10, 16, 12, 1, ink);
      r(10, 19, 8, 1, ink);
      r(10, 22, 10, 1, ink);
    }
  } else if (kind === 'nail' || kind === 'laser') {
    frame(3, 10, 23, 10);
    r(25, 12, 5, 6, gold);
    frame(10, 20, 7, 10);
    r(5, 12, 14, 2, light);
    r(5, 16, 9, 2, steel);
    r(17, 7, 5, 3, red);
    r(11, 21, 2, 6, gold);
  } else if (kind === 'blade' || kind === 'coil') {
    for (let y = 4; y < 28; y += 3) {
      const w = Math.floor(Math.sqrt(Math.max(0, 144 - (y - 16) ** 2)));
      r(16 - w, y, w * 2, 3, ink);
      r(17 - w, y, w * 2 - 2, 2, steel);
    }
    frame(10, 10, 12, 12);
    r(13, 13, 6, 6, gold);
    r(14, 14, 4, 4, light);
    for (let a = 0; a < 4; a++) {
      r(5 + a * 5, 6, 2, 4, gold);
      r(5 + a * 5, 23, 2, 4, dark);
    }
  } else {
    frame(6, 6, 20, 20);
    frame(10, 10, 12, 12);
    r(12, 12, 8, 8, ink);
    r(4, 10, 4, 5, gold);
    r(24, 17, 4, 5, gold);
    r(11, 4, 5, 4, steel);
    r(17, 24, 5, 4, steel);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="pixel-gear"
      shapeRendering="crispEdges"
    >
      {p.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}
