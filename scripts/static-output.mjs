import fs from 'node:fs';
import path from 'node:path';

/** Validate deployable HTML, preserve directory refreshes, and drop only absent optional preload hints. */
export function finalizeStatic(output, base = '') {
  const list = () => fs.readdirSync(output, { recursive: true }).map(String);
  for (const page of list().filter(
    (name) =>
      name.endsWith('.html') &&
      !['index.html', '404.html'].includes(name) &&
      !/[/\\]index.html$/.test(name),
  )) {
    const dest = path.join(output, page.slice(0, -5), 'index.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(output, page), dest);
  }
  for (const name of list().filter((file) => file.endsWith('.html'))) {
    const file = path.join(output, name);
    const html = fs
      .readFileSync(file, 'utf8')
      .replace(/<link\b[^>]*>/g, (tag) => {
        const href = tag.match(/href="([^"]+)"/)?.[1];
        return tag.includes('rel="modulepreload"') &&
          href?.startsWith(`${base}/`) &&
          !fs.existsSync(path.join(output, href.slice(base.length + 1)))
          ? ''
          : tag;
      });
    for (const match of html.matchAll(
      /(?:src|href)="(\/[^"?#]*)(?:[?#][^"]*)?"/g,
    )) {
      const url = match[1];
      if (url.startsWith('//')) continue;
      if (url !== base && !url.startsWith(`${base}/`))
        throw new Error(`Missing product prefix in ${name}: ${url}`);
      const target = path.join(
        output,
        url === base ? '' : decodeURI(url.slice(base.length + 1)),
      );
      if (
        !fs.existsSync(target) &&
        !fs.existsSync(`${target.replace(/[/\\]$/, '')}.html`)
      )
        throw new Error(`Missing export target in ${name}: ${url}`);
    }
    fs.writeFileSync(file, html);
  }
  fs.writeFileSync(path.join(output, '.nojekyll'), '');
}
