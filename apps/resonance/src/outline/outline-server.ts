import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { serializeOutline, validateOutline } from './outline-model.ts';

export const OUTLINE_API = '/__resonance_outline';
export function outlineStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async () => {
    const data = validateOutline(JSON.parse(await readFile(file, 'utf8')));
    const revision = createHash('sha256')
      .update(serializeOutline(data))
      .digest('hex');
    return { data, revision };
  };
  const save = (value: unknown, revision: string) => {
    const task = queue.then(async () => {
      const data = validateOutline(value);
      const current = await read();
      if (revision !== current.revision)
        return { conflict: true as const, ...current };
      const contents = serializeOutline(data);
      const history = path.join(path.dirname(file), '.outline-history');
      await mkdir(history, { recursive: true });
      await writeFile(
        path.join(history, `${current.revision}.json`),
        serializeOutline(current.data),
        'utf8',
      );
      const temporary = `${file}.pending`;
      await writeFile(temporary, contents, 'utf8');
      await rename(temporary, file);
      return {
        conflict: false as const,
        data,
        revision: createHash('sha256').update(contents).digest('hex'),
      };
    });
    queue = task.catch(() => {});
    return task;
  };
  return { read, save };
}

// A local authoring adapter only. Static releases still work with browser drafts.
export function outlinePlugin(file: string): Plugin {
  const store = outlineStore(file);
  return {
    name: 'resonance-story-authoring',
    configureServer(server) {
      const endpoint = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${OUTLINE_API}`;
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.url?.split('?')[0] !== endpoint) return next();
          const reply = (status: number, body: unknown) => {
            res.writeHead(status, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
            });
            res.end(JSON.stringify(body));
          };
          const host = req.headers.host || '';
          if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))
            return reply(403, { error: '大纲编辑仅在本机开放。' });
          if (req.headers.origin) {
            try {
              if (new URL(req.headers.origin).host !== host)
                return reply(403, { error: '请在项目网页内保存。' });
            } catch {
              return reply(403, { error: '请求来源不正确。' });
            }
          }
          try {
            if (req.method === 'GET') return reply(200, await store.read());
            if (req.method !== 'PUT')
              return reply(405, { error: '不支持这个操作。' });
            if (!req.headers['content-type']?.startsWith('application/json'))
              return reply(415, { error: '请提交大纲文件。' });
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
              size += Buffer.byteLength(chunk);
              if (size > 1024 * 1024)
                return reply(413, { error: '大纲文件不能超过1 MB。' });
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (
              !parsed ||
              typeof parsed !== 'object' ||
              Object.keys(parsed).some(
                (key) => !['data', 'revision'].includes(key),
              ) ||
              typeof parsed.revision !== 'string'
            )
              return reply(400, { error: '保存请求不正确。' });
            const result = await store.save(parsed.data, parsed.revision);
            reply(result.conflict ? 409 : 200, result);
          } catch (error) {
            reply(400, {
              error:
                error instanceof Error
                  ? error.message
                  : '保存失败，草稿仍保留在浏览器。',
            });
          }
        },
      );
    },
  };
}
