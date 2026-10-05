import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTION_PRODUCTS } from './products.mjs';
import { ROOT } from './module-graph.mjs';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/AIBazaar';
if (base !== '' && !/^\/[A-Za-z0-9._-]+$/.test(base))
  throw new Error('Invalid Pages prefix');
const output = path.resolve(ROOT, 'dist/client');
if (output !== path.join(ROOT, 'dist', 'client'))
  throw new Error('Invalid Pages output');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const product of PRODUCTION_PRODUCTS) {
  const build = spawnSync(
    process.execPath,
    ['scripts/product.mjs', product, 'build'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, NEXT_PUBLIC_BASE_PATH: `${base}/${product}` },
    },
  );
  if (build.error) throw build.error;
  if (build.status) process.exit(build.status);
  fs.cpSync(
    path.resolve(ROOT, 'apps', product, 'dist/client'),
    path.join(output, product),
    { recursive: true },
  );
}
const redirect = (to) =>
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to}"><title>正在进入游戏</title><a href="${to}">进入游戏</a></html>`;
for (const [route, destination] of Object.entries({
  survival: 'elevator/survival',
  wandeng: 'resonance',
  'wandeng/training': 'resonance',
  'wandeng/rhythm': 'resonance',
  'wandeng/throw': 'throw',
  arena: 'resonance',
  'arena/2d': 'resonance',
  'arena/2d/storybook': 'resonance',
  'arena/2d/sticker': 'resonance',
})) {
  const dir = path.join(output, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    redirect(`${base}/${destination}/`),
  );
}
fs.writeFileSync(
  path.join(output, 'index.html'),
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>F9</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#101918;color:#e9e5d5;font:18px system-ui}nav{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}a{color:inherit;border:1px solid #78866a;padding:24px;text-decoration:none}h1{font-weight:400}</style><h1>F9</h1><nav><a href="${base}/elevator/">安泊 · 电梯求生</a><a href="${base}/resonance/">万灯城 · 共鸣卡牌</a><a href="${base}/throw/">万灯城 · 甩牌对决</a></nav></html>`,
);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(
  'Pages export contains three isolated products and compatibility redirects; experimental projects are excluded.',
);
