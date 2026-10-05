import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer, request } from 'node:http';
import {
  validateOutline,
  serializeOutline,
  moveOutlineEntry,
  outlineMarkdown,
} from './outline-model.ts';
import { outlineStore, outlinePlugin, OUTLINE_API } from './outline-server.ts';

const source = JSON.parse(
  await readFile(new URL('./outline.json', import.meta.url), 'utf8'),
);
const copy = () => structuredClone(source);
async function workspace(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'resonance-outline-'));
  // Only this test-created directory is removed, never a computed product path.
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'outline.json');
  await writeFile(file, serializeOutline(source));
  return { file, store: outlineStore(file), directory };
}

test('outline round trips preserve all authored fields and stable identities', () => {
  const parsed = validateOutline(source);
  assert.deepEqual(
    validateOutline(JSON.parse(serializeOutline(parsed))),
    parsed,
  );
  assert.equal(
    new Set(parsed.chapters.flatMap((c) => [c.id, ...c.beats.map((b) => b.id)]))
      .size,
    parsed.chapters.reduce((sum, c) => sum + 1 + c.beats.length, 0),
  );
});
test('outline rejects foreign versions, duplicate identities, malformed fields and oversized content without mutation', () => {
  for (const alter of [
    (d) => {
      d.product = 'throw-story';
    },
    (d) => {
      d.schemaVersion = 2;
    },
    (d) => {
      d.chapters[1].id = d.chapters[0].id;
    },
    (d) => {
      d.questions[0].id = d.chapters[0].beats[0].id;
    },
    (d) => {
      d.chapters[0].status = 'published';
    },
    (d) => {
      d.questions[0].resolved = 'yes';
    },
    (d) => {
      d.world = '文'.repeat(16001);
    },
    (d) => {
      d.unsupported = true;
    },
  ]) {
    const input = copy();
    alter(input);
    const snapshot = JSON.stringify(input);
    assert.throws(() => validateOutline(input));
    assert.equal(JSON.stringify(input), snapshot);
  }
});
test('chapter and beat reordering does not rewrite identities or source ordering', () => {
  const list = copy().chapters,
    ids = list.map((c) => c.id);
  const moved = moveOutlineEntry(list, 1, -1);
  assert.deepEqual(
    moved.map((c) => c.id),
    [ids[1], ids[0], ...ids.slice(2)],
  );
  assert.deepEqual(
    list.map((c) => c.id),
    ids,
  );
  assert.equal(moveOutlineEntry(list, 0, -1), list);
  assert.equal(moveOutlineEntry(list, list.length - 1, 1), list);
});
test('reading export includes chapters, emotional changes and open discussion answers', () => {
  const doc = copy();
  doc.questions[0].resolved = true;
  const markdown = outlineMarkdown(doc);
  assert.ok(markdown.includes(doc.chapters[0].beats[0].content));
  assert.ok(markdown.includes(doc.chapters[2].change));
  assert.ok(markdown.includes(doc.questions[0].answer));
  assert.ok(markdown.includes(`- [x] ${doc.questions[0].text}`));
});
test('project saves write a valid document and retain the previous version as a backup', async (t) => {
  const { store, file, directory } = await workspace(t);
  const before = await store.read();
  const changed = copy();
  changed.chapters[0].summary = '新的共同大纲。';
  const result = await store.save(changed, before.revision);
  assert.equal(result.conflict, false);
  assert.notEqual(result.revision, before.revision);
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), changed);
  assert.deepEqual(
    JSON.parse(
      await readFile(
        path.join(directory, '.outline-history', `${before.revision}.json`),
        'utf8',
      ),
    ),
    source,
  );
});
test('stale concurrent saves return the current version without overwriting it', async (t) => {
  const { store } = await workspace(t);
  const before = await store.read();
  const first = copy(),
    second = copy();
  first.theme = '第一个修改';
  second.theme = '第二个修改';
  const results = await Promise.all([
    store.save(first, before.revision),
    store.save(second, before.revision),
  ]);
  assert.equal(results[0].conflict, false);
  assert.equal(results[1].conflict, true);
  assert.deepEqual(results[1].data, first);
  assert.deepEqual((await store.read()).data, first);
});
test('failed validation leaves the project and history unchanged; the next valid save still works', async (t) => {
  const { store, file, directory } = await workspace(t);
  const before = await store.read();
  const bad = copy();
  bad.chapters[0].beats[0].id = bad.chapters[0].id;
  await assert.rejects(() => store.save(bad, before.revision));
  assert.equal(await readFile(file, 'utf8'), serializeOutline(source));
  assert.deepEqual(await readdir(directory), ['outline.json']);
  const valid = copy();
  valid.title = '共同的新标题';
  assert.equal((await store.save(valid, before.revision)).conflict, false);
});
test('manual edits to the shared file are read and protected by revision comparison', async (t) => {
  const { file, store } = await workspace(t);
  const before = await store.read();
  const external = copy();
  external.ending = '新的结尾';
  await writeFile(file, serializeOutline(external));
  const result = await store.save(source, before.revision);
  assert.equal(result.conflict, true);
  assert.equal(result.data.ending, '新的结尾');
});

test('local authoring endpoint preserves Chinese text and rejects invalid or cross-origin writes', async (t) => {
  const { file, store } = await workspace(t);
  let handler;
  outlinePlugin(file).configureServer({
    middlewares: {
      use(value) {
        handler = value;
      },
    },
  });
  const server = createServer((req, res) => {
    void handler(req, res, () => {
      res.writeHead(404);
      res.end();
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const call = (method, data, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: '127.0.0.1',
          port,
          path: OUTLINE_API,
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
            }),
          );
        },
      );
      req.on('error', reject);
      if (!data) {
        req.end();
        return;
      }
      const bytes = Buffer.from(JSON.stringify(data));
      // Split in the middle of a Chinese character, across two incoming chunks.
      const split = bytes.indexOf(Buffer.from('共')) + 1;
      req.write(bytes.subarray(0, split));
      setImmediate(() => req.end(bytes.subarray(split)));
    });
  const before = await store.read(),
    data = copy();
  data.title = '共同撰写的中文故事';
  assert.equal(
    (
      await call(
        'PUT',
        { data, revision: before.revision },
        { Origin: 'https://example.com' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call('PUT', {
        data: { product: 'other' },
        revision: before.revision,
      })
    ).status,
    400,
  );
  assert.deepEqual((await store.read()).data, source);
  const response = await call(
    'PUT',
    { data, revision: before.revision },
    { Origin: `http://127.0.0.1:${port}` },
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.data.title, data.title);
  assert.equal((await call('GET')).body.data.title, data.title);
  assert.equal(
    (await call('PUT', { data: source, revision: before.revision })).status,
    409,
  );
});
