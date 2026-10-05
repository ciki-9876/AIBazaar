export type OutlineStatus = 'draft' | 'discuss' | 'confirmed';
export type OutlineBeat = { id: string; title: string; content: string };
export type OutlineChapter = {
  id: string;
  title: string;
  place: string;
  people: string;
  status: OutlineStatus;
  summary: string;
  goal: string;
  conflict: string;
  change: string;
  connection: string;
  notes: string;
  beats: OutlineBeat[];
};
export type OutlineQuestion = {
  id: string;
  text: string;
  answer: string;
  resolved: boolean;
};
export type OutlineDocument = {
  product: 'resonance-story';
  schemaVersion: 1;
  title: string;
  premise: string;
  theme: string;
  world: string;
  protagonist: string;
  arc: string;
  ending: string;
  notes: string;
  chapters: OutlineChapter[];
  questions: OutlineQuestion[];
};
export const OUTLINE_STORAGE_KEY = 'f9.resonance.story-outline.draft.v1';
export const OUTLINE_STATUSES: Record<OutlineStatus, string> = {
  draft: '草稿',
  discuss: '待讨论',
  confirmed: '已确认',
};

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('大纲格式不正确。');
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some((key) => !keys.includes(key)))
    throw new Error('文件包含不支持的字段。');
  return object;
}
function text(value: unknown, max = 16000): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error(`文字必须在 ${max} 字以内。`);
  return value;
}
function identity(value: unknown): string {
  const id = text(value, 90);
  if (!/^[a-zA-Z0-9:_-]+$/.test(id)) throw new Error('段落标识不正确。');
  return id;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`条目数量不能超过 ${max}。`);
  return value;
}
export function validateOutline(value: unknown): OutlineDocument {
  const ids = new Set<string>();
  const id = (value: unknown) => {
    const result = identity(value);
    if (ids.has(result)) throw new Error('章节或段落的标识重复。');
    ids.add(result);
    return result;
  };
  const d = record(value, [
    'product',
    'schemaVersion',
    'title',
    'premise',
    'theme',
    'world',
    'protagonist',
    'arc',
    'ending',
    'notes',
    'chapters',
    'questions',
  ]);
  if (d.product !== 'resonance-story' || d.schemaVersion !== 1)
    throw new Error('这不是当前版本的共鸣故事大纲。');
  return {
    product: 'resonance-story',
    schemaVersion: 1,
    title: text(d.title, 200),
    premise: text(d.premise),
    theme: text(d.theme),
    world: text(d.world),
    protagonist: text(d.protagonist),
    arc: text(d.arc),
    ending: text(d.ending),
    notes: text(d.notes),
    chapters: list(d.chapters, 80).map((value) => {
      const c = record(value, [
        'id',
        'title',
        'place',
        'people',
        'status',
        'summary',
        'goal',
        'conflict',
        'change',
        'connection',
        'notes',
        'beats',
      ]);
      if (
        typeof c.status !== 'string' ||
        !Object.hasOwn(OUTLINE_STATUSES, c.status)
      )
        throw new Error('章节状态不正确。');
      return {
        id: id(c.id),
        title: text(c.title, 200),
        place: text(c.place, 400),
        people: text(c.people, 800),
        status: c.status as OutlineStatus,
        summary: text(c.summary),
        goal: text(c.goal),
        conflict: text(c.conflict),
        change: text(c.change),
        connection: text(c.connection),
        notes: text(c.notes),
        beats: list(c.beats, 40).map((value) => {
          const b = record(value, ['id', 'title', 'content']);
          return {
            id: id(b.id),
            title: text(b.title, 200),
            content: text(b.content, 24000),
          };
        }),
      };
    }),
    questions: list(d.questions, 80).map((value) => {
      const q = record(value, ['id', 'text', 'answer', 'resolved']);
      if (typeof q.resolved !== 'boolean') throw new Error('讨论状态不正确。');
      return {
        id: id(q.id),
        text: text(q.text),
        answer: text(q.answer),
        resolved: q.resolved,
      };
    }),
  };
}
export function serializeOutline(value: OutlineDocument): string {
  return JSON.stringify(validateOutline(value), null, 2) + '\n';
}
export function moveOutlineEntry<T>(
  list: T[],
  index: number,
  direction: -1 | 1,
): T[] {
  const next = index + direction;
  if (index < 0 || index >= list.length || next < 0 || next >= list.length)
    return list;
  const result = [...list];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}
export function outlineMarkdown(doc: OutlineDocument): string {
  const d = validateOutline(doc);
  const section = (title: string, content: string) =>
    `### ${title}\n\n${content || '（待补充）'}\n\n`;
  return (
    `# ${d.title || '未命名故事'} · 故事大纲\n\n` +
    '此文档为共同撰写的故事草稿；游戏表现形式尚未决定。\n\n' +
    [
      ['一句话故事', d.premise],
      ['主题', d.theme],
      ['世界观', d.world],
      ['主角', d.protagonist],
      ['主线与成长', d.arc],
      ['结尾', d.ending],
      ['备忘', d.notes],
    ]
      .map(([a, b]) => section(a, b))
      .join('') +
    d.chapters
      .map(
        (c, index) =>
          `## ${index + 1}. ${c.title || '未命名章节'}\n\n状态：${OUTLINE_STATUSES[c.status]}\n\n地点：${c.place || '待定'}\n\n人物：${c.people || '待定'}\n\n` +
          [
            ['章节概述', c.summary],
            ['人物想要什么', c.goal],
            ['阻碍与冲突', c.conflict],
          ]
            .map(([a, b]) => section(a, b))
            .join('') +
          c.beats
            .map((b, i) =>
              section(`情节点 ${i + 1} · ${b.title || '待命名'}`, b.content),
            )
            .join('') +
          [
            ['章节后的变化', c.change],
            ['与主线的连接', c.connection],
            ['批注与备选', c.notes],
          ]
            .map(([a, b]) => section(a, b))
            .join(''),
      )
      .join('') +
    '## 待讨论问题\n\n' +
    d.questions
      .map(
        (q) =>
          `- [${q.resolved ? 'x' : ' '}] ${q.text}\n\n${q.answer ? `  讨论记录：${q.answer}\n\n` : ''}`,
      )
      .join('')
  );
}
