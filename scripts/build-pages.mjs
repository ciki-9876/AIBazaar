import { spawnSync } from 'node:child_process';
import {
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/AIBazaar';
if (!/^\/[A-Za-z0-9._-]+$/.test(base) && base !== '') {
  throw new Error(
    'NEXT_PUBLIC_BASE_PATH must be empty or a single repository path',
  );
}
const build = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: base },
  },
);
if (build.status !== 0) process.exit(build.status ?? 1);
// vinext currently prerenders flat HTML reliably; Pages also needs directory
// indexes for existing trailing-slash links and direct page refreshes.
const output = 'dist/client';
const pages = readdirSync(output, { recursive: true }).filter(
  (name) =>
    name.endsWith('.html') &&
    !['index.html', '404.html'].includes(name) &&
    !name.endsWith('/index.html') &&
    !name.endsWith('\\index.html'),
);
for (const page of pages) {
  const target = join(output, page.slice(0, -5), 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(output, page), target);
}
// CSS-only modules can leave optional JS preload hints in vinext's manifest.
// Drop only hints for absent files; required scripts and links must validate.
for (const name of readdirSync(output, { recursive: true }).filter((n) =>
  n.endsWith('.html'),
)) {
  const file = join(output, name);
  const html = readFileSync(file, 'utf8').replace(/<link\b[^>]*>/g, (tag) => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (
      tag.includes('rel="modulepreload"') &&
      href?.startsWith(`${base}/`) &&
      !existsSync(join(output, href.slice(base.length + 1)))
    )
      return '';
    return tag;
  });
  for (const match of html.matchAll(
    /(?:src|href)="(\/[^"?#]*)(?:[?#][^"]*)?"/g,
  )) {
    const url = match[1];
    if (url.startsWith('//')) continue;
    if (!url.startsWith(`${base}/`))
      throw new Error(`Missing Pages prefix in ${name}: ${url}`);
    const target = join(output, url.slice(base.length + 1));
    if (!existsSync(target) && !existsSync(`${target.replace(/\/$/, '')}.html`))
      throw new Error(`Missing exported target in ${name}: ${url}`);
  }
  writeFileSync(file, html);
}
writeFileSync('dist/client/.nojekyll', '');
