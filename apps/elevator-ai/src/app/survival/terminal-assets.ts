import { sitePath } from '../../lib/site-path';

let demon: HTMLImageElement | undefined;
let pending: Promise<void> | undefined;
export const demonImage = () =>
  demon?.complete && demon.naturalWidth ? demon : undefined;
/** Load before any canvas labels are constructed: no permanent fallback glyphs. */
export function loadTerminalAssets() {
  return (pending ??= (async () => {
    const font = new FontFace(
      'F9 Pixel',
      `url(${sitePath('/fonts/unifont/unifont-17.0.04.woff2')})`,
    );
    await font.load();
    document.fonts.add(font);
    demon = new Image();
    demon.src = sitePath('/art-assets/survival/demon-pixel-v4.png');
    await demon.decode();
  })());
}
