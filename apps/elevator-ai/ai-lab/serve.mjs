import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(
  new URL('../../../outputs/f9-local-ai/', import.meta.url),
);
const allowed = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/report.json', ['report.json', 'application/json']],
  ['/model.json', ['model.json', 'application/json']],
  ['/benchmark-request.json', ['benchmark-request.json', 'application/json']],
  ['/benchmark-requests.json', ['benchmark-requests.json', 'application/json']],
  [
    '/worker/decision-worker.js',
    ['worker/decision-worker.js', 'text/javascript'],
  ],
]);
const port = Number(process.argv[2] ?? 4191);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid port');
http
  .createServer((request, response) => {
    const route = allowed.get(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (!route || !fs.existsSync(path.join(root, route[0]))) {
      response.writeHead(404);
      response.end('Run node apps/elevator-ai/ai-lab/run.mjs first');
      return;
    }
    response.writeHead(200, {
      'Content-Type': route[1],
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(path.join(root, route[0])).pipe(response);
  })
  .listen(port, '127.0.0.1', () =>
    console.log('F9 AI experiment: http://127.0.0.1:' + port),
  );
