import * as T from 'three';
import { Atelier, type V3 } from '../../packages/render-kit/atelier';

// A small geometry font: actual glyphs laid out from a string, never a stretched
// label texture. Every stroke uses the same world-space unit in both axes.
const glyphs: Record<string, string[]> = {
  '0': ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  '3': ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
  '4': ['00011', '00111', '01111', '11011', '11111', '00011', '00011'],
  '5': ['11111', '11000', '11000', '11110', '00011', '00011', '11110'],
  '6': ['01110', '11000', '11000', '11110', '11011', '11011', '01110'],
  '7': ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
  '8': ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  '9': ['01110', '11011', '11011', '01111', '00011', '00011', '01110'],
  F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
};
export function panelText(
  kit: Atelier,
  text: string,
  height: number,
  at: V3,
  parent: T.Object3D,
) {
  const material = kit.basic('#9db594');
  material.toneMapped = false;
  material.userData.liftInterior = true;
  const group = kit.group(at, parent);
  const unit = height / 7;
  const draw = (value: string) => {
    group.clear();
    const shapes: T.Shape[] = [];
    value.split('').forEach((ch, index) => {
      glyphs[ch]?.forEach((row, y) =>
        row.split('').forEach((bit, x) => {
          if (bit !== '1') return;
          const left = (index * 6 + x - (value.length * 6 - 1) / 2) * unit,
            bottom = (3 - y) * unit;
          const shape = new T.Shape();
          shape.moveTo(left, bottom);
          shape.lineTo(left + unit, bottom);
          shape.lineTo(left + unit, bottom + unit);
          shape.lineTo(left, bottom + unit);
          shape.closePath();
          shapes.push(shape);
        }),
      );
    });
    const geo = kit.geo(
      `panel-text-${value}-${height}`,
      () => new T.ShapeGeometry(shapes),
    );
    const mesh = new T.Mesh(geo, material);
    group.add(mesh);
    group.name = `text:${value}`;
  };
  let current = text;
  draw(text);
  return {
    group,
    set(value: string) {
      if (value !== current) {
        current = value;
        draw(value);
      }
    },
  };
}
