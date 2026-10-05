'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const W = 640,
  H = 144,
  FRAMES = 64,
  FPS = 8;
const ink = '#08191d',
  gold = '#dec58a',
  green = '#aac8ad',
  red = '#bd6652';

/** Hand-drawn pixel frames, baked into a local sprite atlas. No remote media or model calls. */
function paintAdFrame(c: CanvasRenderingContext2D, f: number) {
  const act = Math.floor(f / 16),
    beat = f % 16,
    pose = beat % 4;
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const text = (
    line: string,
    x: number,
    y: number,
    size = 14,
    color = gold,
  ) => {
    c.font = `${size}px "F9 Pixel", monospace`;
    c.textBaseline = 'top';
    c.fillStyle = '#0009';
    c.fillText(line, x + 2, y + 2);
    c.fillStyle = color;
    c.fillText(line, x, y);
  };
  const ticket = (x: number, y: number, n: string, scale = 1) => {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    box(0, 0, 38, 22, gold);
    box(2, 2, 34, 18, ink);
    box(-1, 8, 5, 6, ink);
    box(34, 8, 5, 6, ink);
    for (let i = 3; i < 20; i += 4) box(10, i, 1, 2, gold);
    text(n, 15, 5, 10);
    c.restore();
  };
  const robot = (
    x: number,
    y: number,
    scale: number,
    dance: number,
    evil = false,
  ) => {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    // Four deliberately different poses: squat, left lean, stretch, right lean.
    const lean = [0, -3, 0, 3][dance];
    box(5, 33, 8, 5, gold);
    box(23, 33, 8, 5, gold);
    box(9, 28, 18, 6, '#314d48');
    box(lean + 2, 9, 32, 23, gold);
    box(lean + 4, 11, 28, 19, ink);
    box(lean + 15, 3, 3, 7, '#688d7e');
    box(lean + 13, 0, 7, 4, green);
    box(lean + 8, 16, 6, dance === 2 ? 2 : 7, evil ? red : green);
    box(lean + 23, 16, 6, dance === 2 ? 2 : 7, evil ? red : green);
    if (evil) {
      box(lean + 12, 25, 14, 3, gold);
      box(lean + 15, 25, 2, 2, ink);
      box(lean + 21, 25, 2, 2, ink);
    } else {
      box(lean + 15, 25, 3, 2, green);
      box(lean + 19, 23, 3, 2, green);
    }
    box(lean - 3, dance === 1 ? 4 : 20, 5, 12, '#658679');
    box(lean + 34, dance === 3 ? 4 : 20, 5, 12, '#658679');
    c.restore();
  };
  box(0, 0, W, H, ink);
  // Printed halftone / CRT texture stays stationary; no full-screen flashes.
  for (let y = 4; y < H; y += 8)
    for (let x = (y % 16) / 2; x < W; x += 8) box(x, y, 1, 1, '#274036');
  box(0, 0, 4, H, red);
  box(636, 0, 4, H, gold);
  text('ANBO TV   //   007', 17, 9, 9, green);
  text('广告时间 · 百层竞速', 495, 9, 9, green);
  if (act === 0) {
    for (let i = 0; i < 3; i++) {
      box(
        31 + i * 110,
        40 + (pose === i ? -4 : 0),
        99,
        39,
        i === pose ? '#785348' : '#293e35',
      );
      text('向上!', 40 + i * 110, 44 + (pose === i ? -4 : 0), 27);
    }
    text('安泊牌电梯', 42, 93, 19, green);
    text('停不下来  /  上去看看', 42, 120, 11);
    robot(434, 36 + [2, -3, 2, -3][pose], 2.5, pose);
    text('好用!', 554, 51 + pose * 3, 18, red);
  } else if (act === 1) {
    text('拿票!  拿票!  拿票!', 32, 33, 25);
    text('一张一层 · 越过不回头', 33, 69, 12, green);
    box(22, 119, 392, 5, '#517362');
    for (let i = 0; i < 6; i++) {
      const x = 24 + ((i * 70 + beat * 12) % 388);
      ticket(x, 89 + (i % 2 ? 4 : 0), '↑');
      box(x + 7, 126, 9, 3, gold);
    }
    robot(450 + [0, -4, 0, 4][pose], 39, 2.2, pose);
    text('上楼凭证', 545, 89, 13);
    text('认准安泊', 546, 109, 11, green);
  } else if (act === 2) {
    const floor = [10, 30, 60, 100][Math.floor(beat / 4)];
    text('再上亿层!', 34, 39, 31);
    text('实际终点: 100层', 38, 83, 13, green);
    text('每十层审查 · 每段12分钟', 38, 115, 11);
    for (let i = 0; i < 8; i++)
      box(328, 29 + ((i * 15 + beat * 8) % 106), 5, 7, '#577767');
    box(347, 29, 127, 108, '#567265');
    box(352, 34, 117, 100, '#122b2e');
    text(`${floor}F`, 481, 37, 23, gold);
    text('↑ ↑ ↑', 489, 76 + pose * 4, 18, red);
    robot(373, 50, 1.8, pose);
    box(349, 132, 122, 3, gold);
  } else {
    robot(35, 40, 2.2, pose, true);
    robot(527, 40, 2.2, (pose + 2) % 4, true);
    box(154, 36, 330, 43, '#705344');
    text('百 层 竞 速', 174 + (pose % 2 ? 2 : 0), 42, 32);
    text('先到100层的人获胜', 214, 92, 18, green);
    text('007号 · 你的电梯也是你的休息室', 191, 122, 10);
  }
  // Tiny sponsor strip and progress lights, printed into every frame.
  for (let n = 0; n < 4; n++)
    box(295 + n * 14, 11, 8, 3, n === act ? gold : '#496454');
  for (let y = 0; y < H; y += 3) box(0, y, W, 1, '#00000012');
}

export default function ProgrammeAd({
  paused,
  reduced,
}: {
  paused: boolean;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [stopped, setStopped] = useState(false);
  const frame = useRef(0);
  const frozen = paused || reduced || stopped;
  useEffect(() => {
    const canvas = ref.current!,
      out = canvas.getContext('2d')!;
    const atlas = document.createElement('canvas');
    atlas.width = W * 8;
    atlas.height = H * 8;
    const art = atlas.getContext('2d')!;
    let cancelled = false,
      timer = 0;
    const draw = () => {
      const f = frame.current;
      out.imageSmoothingEnabled = false;
      out.drawImage(
        atlas,
        (f % 8) * W,
        Math.floor(f / 8) * H,
        W,
        H,
        0,
        0,
        W,
        H,
      );
    };
    const ready = async () => {
      await document.fonts.load('24px "F9 Pixel"');
      if (cancelled) return;
      for (let f = 0; f < FRAMES; f++) {
        art.save();
        art.translate((f % 8) * W, Math.floor(f / 8) * H);
        paintAdFrame(art, f);
        art.restore();
      }
      draw();
      if (!frozen)
        timer = window.setInterval(() => {
          if (document.hidden) return;
          frame.current = (frame.current + 1) % FRAMES;
          draw();
        }, 1000 / FPS);
    };
    void ready();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      atlas.width = atlas.height = 0;
    };
  }, [frozen]);
  return (
    <div className="programme-ad">
      <canvas
        ref={ref}
        width={W}
        height={H}
        aria-label="安泊像素广告：向上、拿票、冲刺百层，八秒循环帧动画"
      />
      {!reduced && (
        <button
          className="programme-ad-toggle"
          aria-label={stopped ? '播放节目广告' : '暂停节目广告'}
          aria-pressed={stopped}
          onClick={() => setStopped(!stopped)}
        >
          {stopped ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </div>
  );
}
