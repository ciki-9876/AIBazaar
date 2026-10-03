import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { ROOT } from './module-graph.mjs';

const [product, portArg] = process.argv.slice(2);
const ports = { elevator: 4175, cards: 4176, experiments: 4177 };
if (!Object.hasOwn(ports, product))
  throw new Error('Choose elevator, cards or experiments');
const root = path.join(ROOT, 'apps', product);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'dist/client/f9-release.json'), 'utf8'),
);
const port = Number(portArg || ports[product]);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid preview port');
const server = await preview({
  configFile: false,
  root,
  appType: 'mpa',
  base: `${manifest.basePath}/`,
  build: { outDir: 'dist/client' },
  preview: { host: '127.0.0.1', port, strictPort: true },
});
server.printUrls();
