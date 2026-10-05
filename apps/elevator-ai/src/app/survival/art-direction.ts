import { Atelier } from '../../packages/render-kit/atelier';

// The lift and the floor machinery share these exact paints and toon shading.
export function industrialPalette(kit: Atelier) {
  const colors = {
    ink: kit.mat('#253c40'),
    ivory: kit.mat('#c5bda0'),
    edge: kit.mat('#e5d7b1'),
    teal: kit.mat('#436865'),
    red: kit.mat('#9e403b'),
    gold: kit.mat('#b98b47'),
    shadow: kit.mat('#344743'),
    floor: kit.mat('#d0d3c1'),
  };
  for (const material of [
    colors.ivory,
    colors.edge,
    colors.teal,
    colors.red,
    colors.floor,
  ])
    kit.weather(material, 0.32, 2.2, true);
  return colors;
}
export type IndustrialPalette = ReturnType<typeof industrialPalette>;
