/** One palette for the physical terminal, menus and component catalogue. */
export const SURVIVAL_UI = {
  ink: '#080f12',
  panel: '#17262a',
  raised: '#243638',
  moss: '#52635b',
  brass: '#a38a59',
  paper: '#e0d3ad',
  muted: '#9fa798',
  phosphor: '#9fc4ab',
  danger: '#b96251',
  shadow: '#03080b',
};
export const UI_FONT = '"F9 Pixel", monospace';
export const UI_TITLE = UI_FONT;
export const uiVariables = Object.fromEntries(
  Object.entries(SURVIVAL_UI).map(([k, v]) => [`--f9-${k}`, v]),
);
