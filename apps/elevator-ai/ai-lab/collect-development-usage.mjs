/** Optional local Codex session accounting. This is engineering usage, never training inference. */
import { readFile, writeFile } from 'node:fs/promises';
const [
  logPath,
  output,
  requestText = '现在就启动训练，先完成训练loop中的一轮，评估token消耗',
] = process.argv.slice(2);
if (!logPath || !output)
  throw new Error('Supply a session JSONL and output path');
const rows = (await readFile(logPath, 'utf8'))
  .trim()
  .split('\n')
  .flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
const start = rows.findLastIndex(
  (r) =>
    r.type === 'response_item' &&
    r.payload?.role === 'user' &&
    r.payload.content?.some((c) => c.text?.includes(requestText)),
);
if (start < 0)
  throw new Error('Training request was not found; no guessed baseline');
const isUsage = (r) =>
  r.type === 'event_msg' &&
  r.payload?.type === 'token_count' &&
  r.payload.info?.total_token_usage;
const before = rows.slice(0, start).findLast(isUsage),
  after = rows.slice(start).findLast(isUsage);
if (!before || !after) throw new Error('Missing usage counters');
const a = before.payload.info.total_token_usage,
  b = after.payload.info.total_token_usage;
const difference = Object.fromEntries(
  Object.keys(a).map((key) => [key, b[key] - a[key]]),
);
const result = {
  source: 'local-session-token-count',
  requestText,
  requestTimestamp: rows[start].timestamp,
  throughTimestamp: after.timestamp,
  usage: difference,
  uncachedInput: difference.input_tokens - difference.cached_input_tokens,
  note: 'Engineering and conversation usage, including context and cached inputs; separate from local Qwen training-loop calls. This snapshot excludes subsequent tools/final response and is not an invoice.',
};
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
