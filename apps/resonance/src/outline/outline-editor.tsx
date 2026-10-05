'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { sitePath } from '../lib/site-path';
import {
  OUTLINE_STORAGE_KEY,
  OUTLINE_STATUSES,
  moveOutlineEntry,
  outlineMarkdown,
  serializeOutline,
  validateOutline,
  type OutlineDocument,
  type OutlineChapter,
} from './outline-model';

type Remote = { data: OutlineDocument; revision: string };
function remoteOutline(value: unknown): Remote {
  if (!value || typeof value !== 'object')
    throw new Error('无法读取项目大纲。');
  const raw = value as Record<string, unknown>;
  if (typeof raw.revision !== 'string' || !/^[a-f0-9]{64}$/.test(raw.revision))
    throw new Error('项目版本不正确。');
  return { data: validateOutline(raw.data), revision: raw.revision };
}
type Pane = 'world' | 'chapters' | 'questions';
type Modal = 'files' | 'delete' | null;
const endpoint = () => sitePath('/__resonance_outline');
const uniqueId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function Field({
  label,
  value,
  change,
  hint,
  short = false,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  hint?: string;
  short?: boolean;
}) {
  return (
    <label className="ol-field">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      {short ? (
        <input
          value={value}
          maxLength={label === '故事名称' ? 200 : 400}
          onChange={(e) => change(e.target.value)}
        />
      ) : (
        <textarea
          value={value}
          rows={3}
          maxLength={16000}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </label>
  );
}
function ModalWindow({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="ol-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={close} aria-label="关闭窗口">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function download(contents: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OutlineEditor({
  initial,
}: {
  initial: OutlineDocument;
}) {
  const [doc, setDoc] = useState(initial);
  const latest = useRef(initial),
    revision = useRef(''),
    saving = useRef(false);
  const [saved, setSaved] = useState(serializeOutline(initial));
  const savedRef = useRef(saved);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'loading' | 'project' | 'browser'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [conflict, setConflict] = useState<Remote | null>(null);
  const [wake, setWake] = useState(0);
  const [pane, setPane] = useState<Pane>('chapters');
  const [selected, setSelected] = useState(initial.chapters[0]?.id || '');
  const [reading, setReading] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [imported, setImported] = useState<OutlineDocument | null>(null);
  const [fileError, setFileError] = useState('');
  const history = useRef<OutlineDocument[]>([]),
    future = useRef<OutlineDocument[]>([]);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const chapter =
    doc.chapters.find((c) => c.id === selected) || doc.chapters[0];
  const serial = serializeOutline(doc),
    dirty = serial !== saved;

  const install = useCallback(
    (data: OutlineDocument, acknowledged?: string) => {
      latest.current = data;
      setDoc(data);
      if (acknowledged !== undefined) {
        savedRef.current = acknowledged;
        setSaved(acknowledged);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cached: {
      data: OutlineDocument;
      revision: string;
      dirty: boolean;
    } | null = null;
    try {
      const stored = localStorage.getItem(OUTLINE_STORAGE_KEY);
      if (stored) {
        const raw = JSON.parse(stored);
        cached = {
          data: validateOutline(raw.data),
          revision: typeof raw.revision === 'string' ? raw.revision : '',
          dirty: raw.dirty === true,
        };
      }
    } catch {
      queueMicrotask(() => setNotice('浏览器旧草稿无法读取；载入项目大纲。'));
      try {
        const raw = localStorage.getItem(OUTLINE_STORAGE_KEY);
        if (raw) localStorage.setItem(`${OUTLINE_STORAGE_KEY}.unreadable`, raw);
      } catch {
        queueMicrotask(() => setStorageError(true));
      }
    }
    void (async () => {
      try {
        const response = await fetch(endpoint(), {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('unavailable');
        const remote = remoteOutline(await response.json());
        if (controller.signal.aborted) return;
        revision.current = remote.revision;
        const serverText = serializeOutline(remote.data);
        if (cached?.dirty && serializeOutline(cached.data) !== serverText) {
          install(cached.data, serverText);
          if (cached.revision !== remote.revision) setConflict(remote);
          else setNotice('已恢复尚未同步的浏览器草稿。');
        } else install(remote.data, serverText);
        setMode('project');
      } catch {
        if (controller.signal.aborted) return;
        const data = cached?.data || initial;
        install(data, serializeOutline(data));
        setMode('browser');
      }
      if (!controller.signal.aborted) setReady(true);
    })();
    return () => controller.abort();
  }, [initial, install]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        OUTLINE_STORAGE_KEY,
        JSON.stringify({
          data: doc,
          revision: revision.current,
          dirty:
            dirty ||
            (mode === 'browser' &&
              serializeOutline(doc) !== serializeOutline(initial)),
        }),
      );
      queueMicrotask(() => setStorageError(false));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [doc, dirty, ready, mode, initial]);

  const save = useCallback(async () => {
    if (!ready || mode !== 'project' || conflict || saving.current) return;
    const data = latest.current,
      contents = serializeOutline(data);
    if (contents === savedRef.current) return;
    saving.current = true;
    setBusy(true);
    let success = false;
    try {
      const response = await fetch(endpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, revision: revision.current }),
      });
      const raw = await response.json();
      if (response.status === 409) {
        setConflict(remoteOutline(raw));
      } else {
        if (!response.ok) throw new Error('保存失败');
        const result = remoteOutline(raw);
        revision.current = result.revision;
        savedRef.current = serializeOutline(result.data);
        setSaved(savedRef.current);
        setNotice('');
        success = true;
      }
    } catch {
      setNotice('项目暂时无法保存，草稿仍在此浏览器。恢复后点击「保存」。');
    } finally {
      saving.current = false;
      setBusy(false);
      if (success && serializeOutline(latest.current) !== savedRef.current)
        setWake((n) => n + 1);
    }
  }, [ready, mode, conflict]);

  useEffect(() => {
    if (!ready || !dirty || mode !== 'project' || conflict) return;
    const timer = setTimeout(() => {
      void save();
    }, 800);
    return () => clearTimeout(timer);
  }, [doc, dirty, mode, ready, conflict, save, wake]);

  useEffect(() => {
    if (!ready || mode !== 'project') return;
    const timer = setInterval(() => {
      if (saving.current || document.hidden) return;
      const observedRevision = revision.current;
      void (async () => {
        try {
          const response = await fetch(endpoint(), { cache: 'no-store' });
          if (!response.ok) return;
          const remote = remoteOutline(await response.json());
          if (
            remote.revision === revision.current ||
            saving.current ||
            revision.current !== observedRevision
          )
            return;
          if (serializeOutline(latest.current) !== savedRef.current)
            setConflict(remote);
          else {
            revision.current = remote.revision;
            install(remote.data, serializeOutline(remote.data));
            setConflict(null);
            setNotice('已载入项目中更新的大纲。');
          }
        } catch {
          /* Keep the local draft when the service is unavailable. */
        }
      })();
    }, 5000);
    return () => clearInterval(timer);
  }, [ready, mode, install]);

  const edit = (change: (value: OutlineDocument) => OutlineDocument) => {
    if (!ready) return;
    const previous = latest.current,
      next = validateOutline(change(previous));
    if (serializeOutline(previous) === serializeOutline(next)) return;
    history.current = [...history.current.slice(-79), previous];
    future.current = [];
    setHistoryState({ undo: history.current.length, redo: 0 });
    install(next);
    setNotice('');
  };
  const undo = (redo: boolean) => {
    const source = redo ? future.current : history.current;
    const target = redo ? history.current : future.current;
    const next = source.pop();
    if (!next) return;
    target.push(latest.current);
    install(next);
    setHistoryState({
      undo: history.current.length,
      redo: future.current.length,
    });
  };
  const chapterEdit = (change: (value: OutlineChapter) => OutlineChapter) => {
    if (chapter)
      edit((d) => ({
        ...d,
        chapters: d.chapters.map((c) => (c.id === chapter.id ? change(c) : c)),
      }));
  };
  const addChapter = () => {
    const id = uniqueId('chapter');
    edit((d) => ({
      ...d,
      chapters: [
        ...d.chapters,
        {
          id,
          title: '新的章节',
          place: '',
          people: '',
          status: 'draft',
          summary: '',
          goal: '',
          conflict: '',
          change: '',
          connection: '',
          notes: '',
          beats: [],
        },
      ],
    }));
    setSelected(id);
    setPane('chapters');
    setReading(false);
  };
  const saveLabel = !ready
    ? '正在打开大纲'
    : storageError
      ? '浏览器保存失败，请导出备份'
      : conflict
        ? '发现另一份修改'
        : busy
          ? '正在保存到项目'
          : mode === 'browser'
            ? '已保存在此浏览器'
            : dirty
              ? '等待保存'
              : '已保存到项目';
  const confirmed = doc.chapters.filter((c) => c.status === 'confirmed').length;
  const openQuestions = doc.questions.filter((q) => !q.resolved).length;

  return (
    <main className="ol-root">
      <header className="ol-header">
        <div className="ol-brand">
          <a href={sitePath('/')} aria-label="返回游戏">
            ← 听风之旅
          </a>
          <h1>大纲编排</h1>
          <p>先写下故事，再决定它的模样。</p>
        </div>
        <div className="ol-toolbar">
          <output
            className={`ol-save ${conflict || storageError || notice.startsWith('项目暂时') ? 'is-warning' : ''}`}
            aria-live="polite"
          >
            <i />
            {saveLabel}
          </output>
          <div className="ol-actions">
            <button
              disabled={!historyState.undo}
              onClick={() => undo(false)}
              title="撤销上一处编辑"
            >
              撤销
            </button>
            <button disabled={!historyState.redo} onClick={() => undo(true)}>
              重做
            </button>
            <button
              disabled={!ready}
              className={reading ? 'is-active' : ''}
              onClick={() => setReading(!reading)}
            >
              {reading ? '返回编排' : '整篇通读'}
            </button>
            <button
              disabled={
                !ready || busy || !dirty || mode !== 'project' || !!conflict
              }
              onClick={() => {
                void save();
              }}
            >
              保存
            </button>
            <button
              disabled={!ready}
              className="ol-primary"
              onClick={() => {
                setFileError('');
                setImported(null);
                setModal('files');
              }}
            >
              导入 / 导出
            </button>
          </div>
        </div>
      </header>

      {notice && <output className="ol-notice">{notice}</output>}
      {mode === 'browser' && ready && (
        <p className="ol-notice">
          当前使用浏览器草稿。若要与项目中的大纲交换修改，请导出或导入大纲文件。
        </p>
      )}
      {conflict && (
        <section className="ol-conflict" aria-label="大纲版本冲突">
          <div>
            <strong>项目里的大纲也有了修改</strong>
            <p>你的文字已保留。请选择以哪一份继续，避免互相覆盖。</p>
          </div>
          <button
            onClick={() =>
              download(
                serializeOutline(doc),
                '听风之旅-我的草稿.json',
                'application/json',
              )
            }
          >
            先导出我的草稿
          </button>
          <button
            onClick={() => {
              edit(() => conflict.data);
              revision.current = conflict.revision;
              savedRef.current = serializeOutline(conflict.data);
              setSaved(savedRef.current);
              setConflict(null);
              setNotice('已载入项目版本；可用撤销找回你的文字。');
            }}
          >
            载入项目版本
          </button>
          <button
            onClick={() => {
              revision.current = conflict.revision;
              setConflict(null);
              setWake((n) => n + 1);
            }}
          >
            保留我的内容并保存
          </button>
        </section>
      )}

      <div className="ol-layout">
        <aside className="ol-sidebar">
          <p className="ol-kicker">
            STORY NOTEBOOK <span>01</span>
          </p>
          <nav aria-label="大纲分类" className="ol-tabs">
            <button
              aria-pressed={pane === 'world' && !reading}
              onClick={() => {
                setPane('world');
                setReading(false);
              }}
            >
              <span>世界与主线</span>
              <small>故事的骨架</small>
            </button>
            <button
              aria-pressed={pane === 'chapters' && !reading}
              onClick={() => {
                setPane('chapters');
                setReading(false);
              }}
            >
              <span>章节大纲</span>
              <small>
                {doc.chapters.length} 章 · {confirmed} 章已确认
              </small>
            </button>
            <button
              aria-pressed={pane === 'questions' && !reading}
              onClick={() => {
                setPane('questions');
                setReading(false);
              }}
            >
              <span>待讨论问题</span>
              <small>{openQuestions} 个还没想清楚的问题</small>
            </button>
          </nav>
          <div className="ol-chapter-heading">
            <span>故事顺序</span>
            <small>草稿可随时调整</small>
          </div>
          <ol className="ol-chapters">
            {doc.chapters.map((c, index) => (
              <li key={c.id}>
                <button
                  className="ol-chapter"
                  aria-pressed={
                    chapter?.id === c.id && pane === 'chapters' && !reading
                  }
                  onClick={() => {
                    setSelected(c.id);
                    setPane('chapters');
                    setReading(false);
                  }}
                >
                  <span className="ol-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <b>{c.title || '未命名章节'}</b>
                    <small>
                      <i className={`ol-dot ${c.status}`} />
                      {OUTLINE_STATUSES[c.status]}
                    </small>
                  </span>
                </button>
                <div className="ol-order">
                  <button
                    disabled={index === 0 || !ready}
                    aria-label={`上移${c.title}`}
                    onClick={() =>
                      edit((d) => ({
                        ...d,
                        chapters: moveOutlineEntry(d.chapters, index, -1),
                      }))
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === doc.chapters.length - 1 || !ready}
                    aria-label={`下移${c.title}`}
                    onClick={() =>
                      edit((d) => ({
                        ...d,
                        chapters: moveOutlineEntry(d.chapters, index, 1),
                      }))
                    }
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="ol-add-chapter"
            disabled={!ready || doc.chapters.length >= 80}
            onClick={addChapter}
          >
            ＋ 新增章节
          </button>
          <p className="ol-sidebar-note">
            章节确认只记录讨论结论。
            <br />
            大纲编辑不会自动替换游戏对白。
          </p>
        </aside>

        <section
          className="ol-paper"
          aria-label="大纲正文"
          key={reading ? 'read' : pane}
        >
          <fieldset disabled={!ready} className="ol-editor">
            {reading ? (
              <article className="ol-read">
                <span className="ol-kicker">全文 · 阅读模式</span>
                <h2>{doc.title || '未命名故事'}</h2>
                <p className="ol-read-premise">{doc.premise}</p>
                <div className="ol-read-world">
                  {[
                    ['主题', doc.theme],
                    ['世界观', doc.world],
                    ['主角', doc.protagonist],
                    ['主线与成长', doc.arc],
                    ['结尾', doc.ending],
                    ['备忘', doc.notes],
                  ].map(([title, text]) => (
                    <section key={title}>
                      <h3>{title}</h3>
                      <p>{text || '待补充'}</p>
                    </section>
                  ))}
                </div>
                {doc.chapters.map((c, i) => (
                  <section className="ol-read-chapter" key={c.id}>
                    <span className="ol-kicker">
                      {String(i + 1).padStart(2, '0')} /{' '}
                      {OUTLINE_STATUSES[c.status]}
                    </span>
                    <h2>{c.title || '未命名章节'}</h2>
                    <small>
                      {c.place} · {c.people}
                    </small>
                    <p>{c.summary}</p>
                    {[
                      ['人物想要什么', c.goal],
                      ['阻碍与冲突', c.conflict],
                    ].map(([title, text]) => (
                      <section key={title}>
                        <h3>{title}</h3>
                        <p>{text || '待补充'}</p>
                      </section>
                    ))}
                    {c.beats.map((b, index) => (
                      <section key={b.id}>
                        <h3>
                          {index + 1}. {b.title || '未命名情节点'}
                        </h3>
                        <p>{b.content || '待补充'}</p>
                      </section>
                    ))}
                    {[
                      ['章节后的变化', c.change],
                      ['与主线的连接', c.connection],
                      ['批注与备选', c.notes],
                    ].map(([title, text]) => (
                      <section key={title}>
                        <h3>{title}</h3>
                        <p>{text || '待补充'}</p>
                      </section>
                    ))}
                  </section>
                ))}
                <section className="ol-read-chapter">
                  <h2>待讨论问题</h2>
                  {doc.questions.map((q) => (
                    <section key={q.id}>
                      <h3>
                        {q.resolved ? '✓' : '○'} {q.text}
                      </h3>
                      <p>{q.answer || '尚未记录讨论'}</p>
                    </section>
                  ))}
                </section>
              </article>
            ) : pane === 'world' ? (
              <>
                <div className="ol-page-heading">
                  <span className="ol-kicker">WORLD & STORY</span>
                  <h2>让这段旅途，有一个方向。</h2>
                  <p>写清楚主角想要什么，以及旅途将怎样改变他。</p>
                </div>
                <Field
                  label="故事名称"
                  value={doc.title}
                  short
                  change={(title) => edit((d) => ({ ...d, title }))}
                />
                <Field
                  label="一句话故事"
                  value={doc.premise}
                  change={(premise) => edit((d) => ({ ...d, premise }))}
                />
                {(
                  [
                    ['theme', '想表达的主题'],
                    ['world', '世界观与能力边界'],
                    ['protagonist', '主角的起点'],
                    ['arc', '贯穿旅途的主线与成长'],
                    ['ending', '故事最终落在哪里'],
                    ['notes', '备忘与暂定设想'],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={doc[key]}
                    change={(value) => edit((d) => ({ ...d, [key]: value }))}
                  />
                ))}
              </>
            ) : pane === 'questions' ? (
              <>
                <div className="ol-page-heading">
                  <span className="ol-kicker">OPEN QUESTIONS</span>
                  <h2>把还没想清楚的，留在这里。</h2>
                  <p>记录分歧、备选和讨论结果，确认后再放进主线。</p>
                </div>
                {doc.questions.map((q, i) => (
                  <section
                    className={`ol-question ${q.resolved ? 'is-resolved' : ''}`}
                    key={q.id}
                  >
                    <header>
                      <b>问题 {String(i + 1).padStart(2, '0')}</b>
                      <label>
                        <input
                          type="checkbox"
                          checked={q.resolved}
                          onChange={(e) =>
                            edit((d) => ({
                              ...d,
                              questions: d.questions.map((item) =>
                                item.id === q.id
                                  ? { ...item, resolved: e.target.checked }
                                  : item,
                              ),
                            }))
                          }
                        />{' '}
                        已讨论清楚
                      </label>
                    </header>
                    <Field
                      label="需要讨论什么"
                      value={q.text}
                      change={(text) =>
                        edit((d) => ({
                          ...d,
                          questions: d.questions.map((item) =>
                            item.id === q.id ? { ...item, text } : item,
                          ),
                        }))
                      }
                    />
                    <Field
                      label="想法与讨论记录"
                      value={q.answer}
                      change={(answer) =>
                        edit((d) => ({
                          ...d,
                          questions: d.questions.map((item) =>
                            item.id === q.id ? { ...item, answer } : item,
                          ),
                        }))
                      }
                    />
                    <button
                      className="ol-text-button"
                      onClick={() =>
                        edit((d) => ({
                          ...d,
                          questions: d.questions.filter(
                            (item) => item.id !== q.id,
                          ),
                        }))
                      }
                    >
                      移除这个问题
                    </button>
                  </section>
                ))}
                <button
                  className="ol-add"
                  disabled={doc.questions.length >= 80}
                  onClick={() =>
                    edit((d) => ({
                      ...d,
                      questions: [
                        ...d.questions,
                        {
                          id: uniqueId('question'),
                          text: '',
                          answer: '',
                          resolved: false,
                        },
                      ],
                    }))
                  }
                >
                  ＋ 新增待讨论问题
                </button>
              </>
            ) : chapter ? (
              <>
                <div className="ol-page-heading ol-chapter-title">
                  <div>
                    <span className="ol-kicker">
                      CHAPTER{' '}
                      {String(doc.chapters.indexOf(chapter) + 1).padStart(
                        2,
                        '0',
                      )}
                    </span>
                    <input
                      aria-label="章节名称"
                      value={chapter.title}
                      maxLength={200}
                      onChange={(e) =>
                        chapterEdit((c) => ({ ...c, title: e.target.value }))
                      }
                    />
                  </div>
                  <label className="ol-status">
                    <span>章节状态</span>
                    <select
                      value={chapter.status}
                      onChange={(e) =>
                        chapterEdit((c) => ({
                          ...c,
                          status: e.target.value as OutlineChapter['status'],
                        }))
                      }
                    >
                      {Object.entries(OUTLINE_STATUSES).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
                <div className="ol-meta">
                  <Field
                    label="地点"
                    short
                    value={chapter.place}
                    change={(place) => chapterEdit((c) => ({ ...c, place }))}
                  />
                  <Field
                    label="主要人物"
                    short
                    value={chapter.people}
                    change={(people) => chapterEdit((c) => ({ ...c, people }))}
                  />
                </div>
                <Field
                  label="章节概述"
                  hint="这章发生什么，它为什么值得被讲述？"
                  value={chapter.summary}
                  change={(summary) => chapterEdit((c) => ({ ...c, summary }))}
                />
                <div className="ol-pair">
                  <Field
                    label="人物想要什么"
                    value={chapter.goal}
                    change={(goal) => chapterEdit((c) => ({ ...c, goal }))}
                  />
                  <Field
                    label="阻碍与冲突"
                    value={chapter.conflict}
                    change={(conflict) =>
                      chapterEdit((c) => ({ ...c, conflict }))
                    }
                  />
                </div>
                <div className="ol-section-heading">
                  <h3>情节顺序</h3>
                  <p>先写事件与变化，表现形式留待之后决定。</p>
                </div>
                <ol className="ol-beats">
                  {chapter.beats.map((b, index) => (
                    <li key={b.id}>
                      <div className="ol-beat-number">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="ol-beat-body">
                        <input
                          aria-label={`情节点${index + 1}名称`}
                          value={b.title}
                          maxLength={200}
                          onChange={(e) =>
                            chapterEdit((c) => ({
                              ...c,
                              beats: c.beats.map((item) =>
                                item.id === b.id
                                  ? { ...item, title: e.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <textarea
                          aria-label={`情节点${index + 1}内容`}
                          value={b.content}
                          rows={3}
                          maxLength={24000}
                          onChange={(e) =>
                            chapterEdit((c) => ({
                              ...c,
                              beats: c.beats.map((item) =>
                                item.id === b.id
                                  ? { ...item, content: e.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <div className="ol-beat-actions">
                          <button
                            disabled={index === 0}
                            aria-label={`上移情节点${index + 1}`}
                            onClick={() =>
                              chapterEdit((c) => ({
                                ...c,
                                beats: moveOutlineEntry(c.beats, index, -1),
                              }))
                            }
                          >
                            ↑ 上移
                          </button>
                          <button
                            disabled={index === chapter.beats.length - 1}
                            aria-label={`下移情节点${index + 1}`}
                            onClick={() =>
                              chapterEdit((c) => ({
                                ...c,
                                beats: moveOutlineEntry(c.beats, index, 1),
                              }))
                            }
                          >
                            ↓ 下移
                          </button>
                          <button
                            onClick={() =>
                              chapterEdit((c) => ({
                                ...c,
                                beats: c.beats.filter(
                                  (item) => item.id !== b.id,
                                ),
                              }))
                            }
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  className="ol-add"
                  disabled={chapter.beats.length >= 40}
                  onClick={() =>
                    chapterEdit((c) => ({
                      ...c,
                      beats: [
                        ...c.beats,
                        {
                          id: uniqueId('beat'),
                          title: '新的情节点',
                          content: '',
                        },
                      ],
                    }))
                  }
                >
                  ＋ 添加情节点
                </button>
                <Field
                  label="章节后的变化"
                  hint="人物做出了什么具体行动？"
                  value={chapter.change}
                  change={(change) => chapterEdit((c) => ({ ...c, change }))}
                />
                <Field
                  label="与主线的连接"
                  hint="它照见主角的哪一部分？留下什么伏笔或回应？"
                  value={chapter.connection}
                  change={(connection) =>
                    chapterEdit((c) => ({ ...c, connection }))
                  }
                />
                <Field
                  label="批注与备选"
                  value={chapter.notes}
                  change={(notes) => chapterEdit((c) => ({ ...c, notes }))}
                />
                <footer className="ol-chapter-footer">
                  <span>不必一次写完，每一处修改都会留在草稿里。</span>
                  <button onClick={() => setModal('delete')}>删除本章</button>
                </footer>
              </>
            ) : (
              <div className="ol-empty">
                <h2>第一章，从这里开始。</h2>
                <p>为故事加入一个章节，再写下第一个情节点。</p>
                <button className="ol-primary" onClick={addChapter}>
                  ＋ 新增章节
                </button>
              </div>
            )}
          </fieldset>
        </section>
      </div>

      {modal === 'delete' && chapter && (
        <ModalWindow title="删除这一章？" close={() => setModal(null)}>
          <p>将移除「{chapter.title}」及其情节点。删除后可点击撤销找回。</p>
          <div className="ol-dialog-actions">
            <button onClick={() => setModal(null)}>保留本章</button>
            <button
              className="ol-danger"
              onClick={() => {
                edit((d) => ({
                  ...d,
                  chapters: d.chapters.filter((c) => c.id !== chapter.id),
                }));
                setModal(null);
              }}
            >
              删除本章
            </button>
          </div>
        </ModalWindow>
      )}
      {modal === 'files' && (
        <ModalWindow
          title="把故事带走，也带回来。"
          close={() => setModal(null)}
        >
          <p>
            大纲文件保留章节、顺序、状态与讨论记录，可用于恢复或交换修改；阅读文稿适合通读和分享。
          </p>
          <div className="ol-export-options">
            <button
              onClick={() =>
                download(
                  serializeOutline(doc),
                  '听风之旅-故事大纲.json',
                  'application/json',
                )
              }
            >
              <b>导出大纲文件 ↓</b>
              <span>完整可编辑备份</span>
            </button>
            <button
              onClick={() =>
                download(
                  outlineMarkdown(doc),
                  '听风之旅-故事大纲.md',
                  'text/markdown;charset=utf-8',
                )
              }
            >
              <b>导出阅读文稿 ↓</b>
              <span>按故事顺序整理的文字</span>
            </button>
          </div>
          <label className="ol-import">
            <span>导入大纲文件</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                setFileError('');
                setImported(null);
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 1024 * 1024)
                    throw new Error('文件不能超过1 MB。');
                  setImported(validateOutline(JSON.parse(await file.text())));
                } catch (error) {
                  setFileError(
                    error instanceof Error ? error.message : '文件无法读取。',
                  );
                }
              }}
            />
          </label>
          {fileError && (
            <p className="ol-error" role="alert">
              {fileError}
            </p>
          )}
          {imported && (
            <div className="ol-import-review">
              <b>{imported.title || '未命名故事'}</b>
              <p>
                {imported.chapters.length} 章 · {imported.questions.length}{' '}
                个讨论问题
              </p>
              <p>确认后替换当前大纲，原内容可用撤销找回。</p>
              <button
                className="ol-primary"
                onClick={() => {
                  edit(() => imported);
                  setSelected(imported.chapters[0]?.id || '');
                  setModal(null);
                  setImported(null);
                }}
              >
                使用这份大纲
              </button>
            </div>
          )}
        </ModalWindow>
      )}
    </main>
  );
}
