import { dialogueCue } from '../../lib/survival-opening';
import { afterlightLine } from '../../lib/survival-afterlight';
import { demonImage } from './terminal-assets';
import {
  openingSettlement,
  ROBOT_LINES,
  type OpeningState,
} from '../../lib/survival-opening';
import { SURVIVAL_UI as P, UI_FONT, UI_TITLE } from './design-tokens';

export function screenBrightness(s?: OpeningState, reduced = false) {
  if (!s || s.stage !== 'home') return 0.44;
  const { scene, tick } = s.homecoming;
  if (scene === 'blackout' || scene === 'approach') return 0;
  if (scene === 'flicker') {
    const t = tick / 30;
    return reduced
      ? 0.44 * (1 - t / 5)
      : Math.sin(t * 5 + t * t * 3.6) > -0.1
        ? 0.46
        : 0.035;
  }
  if (scene === 'scare') return 0.88;
  return 0.68;
}
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  line = 42,
) {
  let row = '';
  for (const ch of text) {
    if (ctx.measureText(row + ch).width > width) {
      ctx.fillText(row, x, y);
      row = ch;
      y += line;
    } else row += ch;
  }
  ctx.fillText(row, x, y);
}
/** Identical artwork is painted onto the 3D screen and the 2D upgrade view. */
export function paintTerminal(
  ctx: CanvasRenderingContext2D,
  state?: OpeningState,
  reduced = false,
  minimal: boolean | 'system' = false,
) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.save();
  ctx.scale(w / 600, h / 860);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 0, 600, 860);
  const scene = state?.stage === 'home' ? state.homecoming.scene : 'ad';
  const tick = state?.homecoming.tick || 0;
  const hasLevel =
    !minimal && ['upgrade', 'thanks', 'lights', 'complete'].includes(scene);
  const serving =
    scene === 'complete' && state?.afterlight.phase === 'serve-food';
  if (['blackout', 'approach'].includes(scene)) {
    ctx.restore();
    return;
  }
  const ad = ['ad', 'rest', 'look-right', 'look-left', 'flicker'].includes(
    scene,
  );
  ctx.fillStyle = P.panel;
  // A small stepped bevel; every edge stays on the logical pixel grid.
  ctx.fillRect(24, 44, 552, 772);
  ctx.fillRect(32, 32, 536, 796);
  ctx.fillRect(44, 24, 512, 812);
  ctx.fillStyle = '#657b71';
  ctx.fillRect(44, 24, 512, 4);
  ctx.fillRect(24, 44, 4, 772);
  ctx.fillStyle = '#856f4a';
  ctx.fillRect(44, 832, 512, 4);
  ctx.fillRect(572, 44, 4, 772);
  for (let y = 40; y < 820; y += 8)
    for (let x = 40; x < 560; x += 8) {
      ctx.fillStyle = (x + y) % 16 === 0 ? '#a3b98b06' : '#020b1508';
      ctx.fillRect(x, y, 2, 2);
    }
  ctx.fillStyle = P.brass;
  ctx.font = `16px ${UI_FONT}`;
  if (!minimal)
    ctx.fillText(
      ad ? '安 泊 住 区   /   归 途 有 光' : '安 泊  /  居 所 管 理 终 端',
      48,
      68,
    );
  if (!minimal) ctx.fillRect(48, 88, 504, 2);
  if (ad) {
    ctx.fillStyle = P.paper;
    ctx.font = `64px ${UI_TITLE}`;
    ctx.fillText('每一次归来，', 48, 184);
    ctx.fillText('都有人等你。', 48, 264);
    for (let i = 0; i < 7; i++) {
      const x = 50 + i * 73,
        top = 440 + Math.sin(i * 1.7) * 62;
      ctx.fillStyle = i % 2 ? '#30443c' : '#213632';
      ctx.fillRect(x, top, 58, 640 - top);
      ctx.strokeStyle = P.moss;
      ctx.strokeRect(x, top, 58, 640 - top);
      for (let j = 0; j < 9; j++) {
        const y = top + 22 + Math.floor(j / 2) * 30;
        if (y > 625) continue;
        ctx.fillStyle = (j + i) % 3 ? P.moss : P.brass;
        ctx.fillRect(x + 12 + (j % 2) * 24, y, 12, 9);
      }
    }
    ctx.fillStyle = P.muted;
    ctx.font = `32px ${UI_FONT}`;
    ctx.fillText('恒温住宅 · 全天候电梯服务', 48, 713);
    ctx.font = `16px ${UI_FONT}`;
    ctx.fillText('愿您平安抵达。', 48, 777);
  } else {
    const demon = ['scare', 'plead', 'welcome'].includes(scene);
    if (demon) {
      ctx.save();
      ctx.globalAlpha = scene === 'welcome' ? Math.max(0, 1 - tick / 75) : 1;
      ctx.fillStyle = '#160b12';
      ctx.fillRect(28, 92, 544, 704);
      const emblem = demonImage();
      ctx.imageSmoothingEnabled = false;
      if (emblem) ctx.drawImage(emblem, 48, 150, 504, 504);
      ctx.restore();
    }
    if (!demon || scene === 'welcome') {
      ctx.save();
      if (scene === 'welcome') ctx.globalAlpha = tick / 75;
      const bob = reduced ? 0 : Math.round(Math.sin(tick * 0.045)) * 4;
      ctx.translate(
        300,
        (minimal === 'system' ? 400 : hasLevel ? 328 : 256) + bob,
      );
      if (minimal === 'system') ctx.scale(1.25, 1.25);
      ctx.fillStyle = '#101b23';
      ctx.fillRect(-174, -108, 348, 204);
      ctx.fillStyle = '#617b75';
      ctx.fillRect(-164, -116, 328, 12);
      ctx.fillRect(-176, -100, 12, 178);
      ctx.fillStyle = '#b5c6a6';
      ctx.fillRect(-152, -112, 72, 4);
      ctx.fillStyle = '#8a7154';
      ctx.fillRect(-146, 80, 292, 12);
      for (const x of [-166, 158]) {
        ctx.fillStyle = '#c4ae7b';
        ctx.fillRect(x, -100, 8, 8);
        ctx.fillRect(x, 68, 8, 8);
      }
      ctx.fillStyle = '#738a80';
      ctx.fillRect(-4, -146, 8, 30);
      ctx.fillStyle = '#bbd9b3';
      ctx.fillRect(-12, -154, 24, 12);
      ctx.fillStyle = P.shadow;
      ctx.fillRect(-159, -100, 318, 180);
      ctx.strokeStyle = P.brass;
      ctx.lineWidth = 4;
      ctx.strokeRect(-155, -96, 310, 172);
      ctx.fillStyle = P.phosphor;
      const blink = !reduced && tick % 143 > 136;
      for (const x of [-92, 50]) {
        ctx.fillRect(x, -48, 42, blink ? 7 : 48);
        if (!blink) {
          ctx.fillStyle = P.panel;
          ctx.fillRect(x + 27, -48, 15, 14);
          ctx.fillStyle = P.phosphor;
        }
      }
      ctx.fillRect(-20, 20, 12, 10);
      ctx.fillRect(8, 20, 12, 10);
      ctx.fillRect(-8, 30, 16, 10);
      ctx.fillStyle = P.brass;
      ctx.fillRect(-177, -30, 14, 42);
      ctx.fillRect(163, -30, 14, 42);
      ctx.restore();
      const cue = state ? dialogueCue(state) : null;
      const line =
        (cue?.speaker === 'robot' ? cue.text : state?.lastRobotLine) ||
        (scene === 'complete' && state
          ? afterlightLine(state.afterlight)
          : ROBOT_LINES[scene as keyof typeof ROBOT_LINES]);
      if (line && !minimal && scene !== 'settlement') {
        ctx.fillStyle = '#142421';
        ctx.fillRect(45, 455, 510, 160);
        ctx.strokeStyle = '#91a38a';
        ctx.lineWidth = 2;
        ctx.strokeRect(45, 455, 510, 160);
        ctx.fillStyle = P.paper;
        ctx.font = `24px ${UI_FONT}`;
        wrap(ctx, line, 63, 489, 470, 32);
        ctx.fillStyle = P.brass;
        ctx.font = `20px ${UI_FONT}`;
        ctx.fillText('»', 510, 577);
        ctx.textAlign = 'right';
        ctx.fillText(`▷ 自动 ${state?.dialogueAuto ? '开' : '关'}`, 532, 603);
        ctx.textAlign = 'left';
      }
      if (scene === 'settlement' && state && !minimal) {
        ctx.fillStyle = P.paper;
        ctx.font = `32px ${UI_TITLE}`;
        ctx.fillText('首次归途 · 携回物资', 50, 410);
        openingSettlement(state).forEach((r, i) => {
          const y = 453 + i * 96;
          ctx.fillStyle = '#314038';
          ctx.fillRect(50, y, 500, 78);
          ctx.fillStyle = P.brass;
          ctx.font = `32px ${UI_FONT}`;
          ctx.fillText(String(i + 1).padStart(2, '0'), 67, y + 48);
          ctx.fillStyle = P.paper;
          ctx.font = `32px ${UI_FONT}`;
          ctx.fillText(r.name, 117, y + 48);
          ctx.textAlign = 'right';
          ctx.fillText(`× ${r.count}`, 532, y + 48);
          ctx.textAlign = 'left';
        });
      }
      if (
        minimal === true ||
        serving ||
        ['mouth', 'feed', 'upgrade', 'thanks'].includes(scene)
      ) {
        const amount = scene === 'mouth' ? Math.min(1, tick / 28) : 1;
        ctx.fillStyle = '#030509';
        for (let row = -72; row <= 72; row += 8) {
          const half =
            Math.floor(
              (201 * Math.sqrt(Math.max(0, 1 - (row / 80) ** 2))) / 8,
            ) * 8;
          ctx.fillStyle = '#52605a';
          ctx.fillRect(300 - half - 4, 702 + row * amount, half * 2 + 8, 8);
          ctx.fillStyle = '#020609';
          ctx.fillRect(300 - half, 702 + row * amount, half * 2, 8);
        }
        for (let i = 0; i < 7; i++) {
          const phase = (tick * 0.009 + i / 7) % 1;
          ctx.globalAlpha = (1 - phase) * 0.6;
          ctx.fillStyle = '#071011';
          ctx.fillRect(
            128 + i * 48,
            680 - Math.floor((phase * 80) / 8) * 8,
            32,
            24,
          );
        }
        ctx.globalAlpha = 1;
        if (scene === 'mouth' && !reduced && tick < 33) {
          ctx.fillStyle = P.phosphor;
          for (let i = 0; i < 6; i++)
            ctx.fillRect(
              ((i * 137 + tick * 19) % 510) + 40,
              631 + i * 19,
              50 + i * 7,
              3,
            );
        }
        ctx.fillStyle = P.paper;
        ctx.font = `16px ${UI_FONT}`;
        ctx.textAlign = 'center';
        if (!minimal && !serving)
          ctx.fillText(
            scene === 'mouth'
              ? '点击黑孔 · 接入供能'
              : scene === 'feed'
                ? '将电容拖入这里'
                : '供能接入中',
            300,
            809,
          );
        ctx.textAlign = 'left';
      }
      if (serving && minimal && state) {
        const t = Math.min(1, state.afterlight.tick / 90);
        ctx.save();
        ctx.translate(
          300 + Math.floor((t * t * 180) / 4) * 4,
          700 - Math.round((Math.sin(t * Math.PI) * 160) / 4) * 4,
        );
        const scale = 1 - Math.max(0, t - 0.7) * 3;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#563a28';
        ctx.fillRect(-56, -24, 112, 48);
        ctx.fillStyle = '#c78f4f';
        ctx.fillRect(-52, -32, 104, 52);
        ctx.fillStyle = '#e6bd71';
        ctx.fillRect(-40, -40, 80, 32);
        ctx.fillStyle = '#9b5f35';
        for (let x = -24; x <= 24; x += 24) ctx.fillRect(x, -32, 8, 28);
        ctx.restore();
      }
      if (
        !minimal &&
        ['upgrade', 'thanks', 'lights', 'complete'].includes(scene)
      ) {
        const progress = scene === 'upgrade' ? Math.min(1, tick / 105) : 1;
        ctx.fillStyle = P.paper;
        ctx.font = `16px ${UI_FONT}`;
        ctx.fillText(
          `居所等级  ${progress < 1 ? '0 → 1' : String(state?.room.liftLevel || 1)}   ·   ${Math.floor(progress * 100)} / 100`,
          50,
          126,
        );
        ctx.fillStyle = P.ink;
        ctx.fillRect(50, 143, 500, 9);
        ctx.fillStyle = P.brass;
        ctx.fillRect(50, 143, 500 * progress, 9);
      }
    }
  }
  ctx.fillStyle = '#02070b18';
  for (let y = 0; y < 860; y += 5) ctx.fillRect(0, y, 600, 1);
  ctx.restore();
}
