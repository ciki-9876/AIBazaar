import * as T from 'three';
import { specimenCard } from './specimen';

const W = 1024,
  H = 1440;
function canvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return { canvas: c, ctx: c.getContext('2d')! };
}
function seeded() {
  let s = 71231;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function texture(c: HTMLCanvasElement) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function emblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.save();
  ctx.translate(x, y);
  for (const radius of [r, r * 0.82]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const angle of [0, Math.PI / 3, (Math.PI * 2) / 3]) {
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeRect(-r * 0.43, -r * 0.43, r * 0.86, r * 0.86);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function paper(ctx: CanvasRenderingContext2D) {
  const rand = seeded();
  for (let i = 0; i < 42000; i++) {
    const x = rand() * W,
      y = rand() * H;
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(246,234,205,${rand() * 0.09})`
        : `rgba(0,7,5,${rand() * 0.16})`;
    ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 3);
  }
  ctx.strokeStyle = '#d8d0b72b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 170; i++) {
    const x = rand() * W,
      y = rand() * H;
    line(ctx, x, y, x + rand() * 14 - 7, y + rand() * 5);
  }
  // Small irregular edge wear stays confined to the trim; not fake grime over text.
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = `rgba(196,184,150,${rand() * 0.25})`;
    const x = rand() > 0.5 ? rand() * 26 : W - rand() * 26;
    ctx.fillRect(x, rand() * H, rand() * 4, rand() * 15);
  }
}

export function frontTextures(tier: number, art: HTMLImageElement) {
  const { def, edition, description } = specimenCard(tier);
  const front = canvas(),
    foil = canvas(),
    c = front.ctx,
    f = foil.ctx;
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#34483f');
  bg.addColorStop(0.42, '#192c29');
  bg.addColorStop(1, '#122321');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#bfb49b80';
  c.lineWidth = 2;
  round(c, 30, 30, W - 60, H - 60, 25);
  c.stroke();
  c.fillStyle = '#c7c3ae';
  c.font = '22px Georgia, serif';
  c.textAlign = 'left';
  c.fillText('F9   /   FIELD ARCHIVE', 72, 88);
  c.textAlign = 'right';
  c.font = '25px "Microsoft YaHei", sans-serif';
  c.fillStyle = edition.color;
  c.fillText(edition.label, 948, 88);
  c.textAlign = 'left';
  c.fillStyle = '#f1e6ca';
  c.font = 'bold 76px "SimSun", serif';
  c.fillText(def.name, 72, 181);
  c.fillStyle = '#a8b7a7';
  c.font = '25px "Microsoft YaHei", sans-serif';
  c.fillText('防御器具  /  固守反击', 76, 229);

  // A printed specimen plate: the exact model silhouette is shared with inventory.
  round(c, 62, 263, 900, 570, 140);
  c.save();
  c.clip();
  const vignette = c.createRadialGradient(512, 525, 20, 512, 525, 540);
  vignette.addColorStop(0, '#5d6c5980');
  vignette.addColorStop(0.72, '#1e302b80');
  vignette.addColorStop(1, '#071816');
  c.fillStyle = vignette;
  c.fillRect(62, 263, 900, 570);
  c.strokeStyle = '#d0c4a118';
  c.lineWidth = 1;
  for (let i = 0; i < 15; i++) {
    line(c, 80 + i * 64, 263, 80 + i * 64, 833);
    line(c, 62, 300 + i * 42, 962, 300 + i * 42);
  }
  c.strokeStyle = '#c2c5a934';
  for (const r of [180, 226, 233]) {
    c.beginPath();
    c.arc(512, 555, r, 0, Math.PI * 2);
    c.stroke();
  }
  c.save();
  c.shadowBlur = 26;
  c.shadowOffsetY = 20;
  c.shadowColor = '#000a';
  c.drawImage(art, 157, 180, 710, 710);
  c.restore();
  c.restore();
  c.fillStyle = '#b6bca1';
  c.font = '19px Georgia,serif';
  c.fillText('SPECIMEN  007', 85, 807);
  c.textAlign = 'right';
  c.fillText('R / ' + String(tier + 1).padStart(2, '0'), 940, 807);
  c.textAlign = 'left';

  c.fillStyle = '#d4cbb0';
  round(c, 63, 860, 898, 422, 8);
  c.fill();
  c.strokeStyle = '#68756470';
  c.lineWidth = 2;
  line(c, 100, 972, 924, 972);
  c.fillStyle = '#273c35';
  c.font = 'bold 53px Georgia, serif';
  c.fillText(`${description.cd}s`, 104, 936);
  c.font = '27px "Microsoft YaHei",sans-serif';
  c.fillText('发动周期', 221, 931);
  c.textAlign = 'right';
  c.fillText(`${def.size} 格   ·   基础`, 919, 931);
  c.textAlign = 'left';
  c.fillStyle = '#1f352d';
  c.font = 'bold 44px "Microsoft YaHei",sans-serif';
  c.fillText(description.abilities[0].text, 104, 1042);
  c.fillStyle = '#61705d';
  c.font = '32px "Microsoft YaHei",sans-serif';
  c.fillText(description.abilities[1].when, 104, 1117);
  c.fillStyle = '#1f352d';
  c.font = 'bold 42px "Microsoft YaHei",sans-serif';
  // The wording is taken directly from describeCard, rather than a second rules table.
  c.fillText(description.abilities[1].text, 104, 1172, 810);
  c.fillStyle = '#64705d';
  c.font = 'italic 24px "SimSun",serif';
  c.fillText('“它记得每一次，本该落在你身上的撞击。”', 104, 1243, 810);
  c.fillStyle = '#b8b59c';
  c.font = '22px Georgia,serif';
  c.fillText('ELEVATOR   /   ANOMALY REGISTER', 75, 1345);
  c.textAlign = 'right';
  c.fillText('007', 948, 1345);
  c.textAlign = 'left';
  paper(c);

  f.strokeStyle = '#fff';
  f.fillStyle = '#fff';
  f.lineWidth = 3;
  round(f, 42, 42, 940, 1356, 22);
  f.stroke();
  round(f, 58, 257, 908, 582, 146);
  f.stroke();
  f.lineWidth = 1;
  round(f, 68, 267, 888, 562, 136);
  f.stroke();
  for (const x of [72, 952])
    for (const y of [115, 1310]) {
      f.save();
      f.translate(x, y);
      f.rotate(Math.PI / 4);
      f.fillRect(-5, -5, 10, 10);
      f.restore();
    }
  f.lineWidth = 2;
  for (let i = 0; i < edition.marks; i++) {
    const x = 512 + (i - (edition.marks - 1) / 2) * 22;
    f.save();
    f.translate(x, 1369);
    f.rotate(Math.PI / 4);
    f.fillRect(-4, -4, 8, 8);
    f.restore();
  }
  // Foil guilloche is restricted to the illustration field; the rules remain matte.
  f.save();
  round(f, 68, 267, 888, 562, 136);
  f.clip();
  f.globalAlpha = 0.4 + tier * 0.1;
  f.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    f.beginPath();
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2,
        r = 244 + k * 5 + 8 * Math.sin(a * 16);
      const x = 512 + Math.cos(a) * r * 1.45,
        y = 548 + Math.sin(a) * r;
      if (i === 0) f.moveTo(x, y);
      else f.lineTo(x, y);
    }
    f.stroke();
  }
  f.restore();
  return { front: texture(front.canvas), foil: texture(foil.canvas) };
}

export function backTexture() {
  const { canvas: c, ctx } = canvas();
  ctx.fillStyle = '#152724';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#aba88b80';
  ctx.fillStyle = '#aca98c';
  ctx.lineWidth = 3;
  for (const n of [36, 48, 68]) {
    round(ctx, n, n, W - n * 2, H - n * 2, 22);
    ctx.stroke();
  }
  ctx.save();
  round(ctx, 70, 70, W - 140, H - 140, 20);
  ctx.clip();
  ctx.strokeStyle = '#9dac8828';
  ctx.lineWidth = 1;
  for (let j = -12; j < 18; j++)
    for (let i = -8; i < 14; i++) {
      ctx.save();
      ctx.translate(i * 105 + (j % 2) * 52, j * 105);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-35, -35, 70, 70);
      ctx.restore();
    }
  ctx.restore();
  ctx.fillStyle = '#152724';
  ctx.beginPath();
  ctx.arc(512, 680, 255, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c0b696';
  ctx.fillStyle = '#c0b696';
  ctx.lineWidth = 3;
  emblem(ctx, 512, 680, 210);
  ctx.textAlign = 'center';
  ctx.font = 'italic 95px Georgia,serif';
  ctx.fillText('f9', 512, 1010);
  ctx.font = '29px "SimSun",serif';
  ctx.fillText('异  常  留  存', 512, 1090);
  ctx.font = '21px Georgia,serif';
  ctx.fillText('WHAT REMAINS, REMEMBERS.', 512, 1150);
  paper(ctx);
  return texture(c);
}

export function paperBump() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const image = ctx.createImageData(256, 256),
    rand = seeded();
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 110 + rand() * 45;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(5, 7);
  return t;
}
