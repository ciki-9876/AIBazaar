// Retired IDs are data migration aliases, never card definitions or drop options.
export const RETIRED_CARDS: Record<string, string> = {
  knife: 'gapblade',
  wire: 'gapblade',
  bottle: 'distiller',
  shelter: 'recoil',
  bell: 'fuse',
  brick: 'springbow',
  box: 'counterweight',
  cell: 'sealant',
  coil: 'culture',
  battery: 'recoil',
  'c-ram': 'springbow',
  'c-punch': 'nailer',
  'c-cut': 'gapblade',
  'c-spark': 'fuse',
  'c-burst': 'springbow',
  'c-pacer': 'gapblade',
  'c-rope': 'distiller',
  'b-cart': 'recoil',
  'b-staple': 'sealant',
  'b-hammer': 'counterweight',
  'b-return': 'recoil',
  'b-gasket': 'rubber',
  'b-pump': 'counterweight',
  'b-wrench': 'fuse',
  'b-rivet': 'gapblade',
  'w-cabinet': 'culture',
  'w-ink': 'acid',
  'w-label': 'gapblade',
  'w-pen': 'gapblade',
  'w-press': 'culture',
  'w-index': 'catalyst',
  'w-vial': 'distiller',
  'w-clock': 'culture',
  'w-tome': 'culture',
};
export const RETIRED_SALE_CREDIT: Record<string, number> = {
  bell: 1,
  cell: 1,
  coil: 1,
  battery: 3,
  'b-cart': 1,
};

export function retiredSize(id: string) {
  return ['battery', 'c-ram', 'b-cart', 'w-cabinet'].includes(id)
    ? 3
    : [
          'shelter',
          'brick',
          'box',
          'coil',
          'c-punch',
          'c-burst',
          'b-hammer',
          'b-return',
          'b-pump',
          'w-ink',
          'w-press',
          'w-clock',
          'w-tome',
        ].includes(id)
      ? 2
      : 1;
}
