'use client';
/* eslint-disable next/no-html-link-for-pages -- Static export has no server for client RSC navigation. */
import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
// Static hosting serves HTML documents; module navigation must use native anchors.
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Radio,
  ClipboardCheck,
  Download,
  Link2,
  ChevronUp,
  FileText,
  CircleHelp,
  CheckCircle2,
  MessageSquare,
  Printer,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { MODULES, moduleHref, DESIGN_VERSION } from '@/lib/design-data';
import type { ModuleId } from '@/lib/design-data';
import { SPECS } from '@/lib/design-specs-v04';
import {
  REVIEW_KEY,
  emptyReview,
  parseReviews,
  serializeReviews,
  exportReviews,
} from '@/lib/design-review';
import type { Reviews, ModuleReview, ReviewStatus } from '@/lib/design-review';
import { DataTable } from './prototypes';
import DesignPrototype from './prototypes-v04';
const STATUS: Record<ReviewStatus, string> = {
  pending: '待验收',
  changes: '需修改',
  approved: '已确认',
};
export default function DesignWorkspace({ moduleId }: { moduleId: ModuleId }) {
  const currentModule = MODULES.find((m) => m.id === moduleId)!;
  const spec = SPECS[moduleId];
  const [reviews, setReviews] = useState<Reviews>({});
  const reviewsRef = useRef<Reviews>({});
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState('验收记录保存在本机');
  const [reviewMessage, setReviewMessage] = useState('');
  const review = reviews[moduleId] || emptyReview();
  const approved = MODULES.filter(
    (m) => reviews[m.id]?.status === 'approved',
  ).length;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const loaded = parseReviews(localStorage.getItem(REVIEW_KEY));
        reviewsRef.current = loaded;
        setReviews(loaded);
      } catch {
        setSaved('浏览器存储不可用，请导出记录');
      }
      setReady(true);
    });
    const sync = (event: StorageEvent) => {
      if (event.key === REVIEW_KEY) {
        const loaded = parseReviews(event.newValue);
        reviewsRef.current = loaded;
        setReviews(loaded);
      }
    };
    window.addEventListener('storage', sync);
    return () => {
      active = false;
      window.removeEventListener('storage', sync);
    };
  }, []);
  const update = useCallback(
    (patch: Partial<ModuleReview>, explicit = false) => {
      if (!ready) return;
      let latest = reviewsRef.current;
      try {
        latest = {
          ...latest,
          ...parseReviews(localStorage.getItem(REVIEW_KEY)),
        };
      } catch {}
      const previous = latest[moduleId] || emptyReview();
      const nextReview = {
        ...previous,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      if (!explicit && previous.status === 'approved')
        nextReview.status = 'pending';
      const next = { ...latest, [moduleId]: nextReview };
      reviewsRef.current = next;
      setReviews(next);
      try {
        localStorage.setItem(REVIEW_KEY, serializeReviews(next));
        setSaved('验收记录已保存至本机');
      } catch {
        setSaved('保存失败，请导出记录保留');
      }
      setReviewMessage(
        explicit
          ? `本模块已标记为${STATUS[nextReview.status]}。`
          : '修改已保存；修改已确认的模块会重新进入待验收。',
      );
    },
    [moduleId, ready],
  );
  useEffect(() => {
    if (!ready) return;
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifetime = new AbortController();
    const tools: Tool[] = [
      {
        name: 'f9_design_read_module',
        title: '读取当前设计模块',
        description:
          'Read the current elevator design module and its actual local review status.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          moduleId,
          title: currentModule.title,
          criteria: spec.criteria,
          review: reviewsRef.current[moduleId] || emptyReview(),
        }),
      },
      {
        name: 'f9_design_save_note',
        title: '保存模块验收意见',
        description:
          'Save a note on the currently displayed design module. Does not approve the design. Editing an approved module returns it to pending review.',
        inputSchema: {
          type: 'object',
          properties: { note: { type: 'string', maxLength: 5000 } },
          required: ['note'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: unknown) => {
          const note = (input as { note?: unknown })?.note;
          if (typeof note !== 'string' || note.length > 5000)
            throw Error('note must be a string of at most 5000 characters');
          flushSync(() => update({ notes: note }));
          return { moduleId, review: reviewsRef.current[moduleId] };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifetime.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifetime.abort();
  }, [ready, moduleId, currentModule.title, spec.criteria, update]);
  function download() {
    const blob = new Blob(
      [JSON.stringify(exportReviews(reviewsRef.current), null, 2)],
      { type: 'application/json;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f9-elevator-design-review-v04.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReviewMessage('已导出所有模块的验收记录。文件可用于后续逐条讨论。');
  }
  const allChecked = spec.criteria.every((_, i) => review.checks.includes(i));
  const allDecided = spec.decisions.every((d) =>
    d.options.includes(review.decisions[d.id]),
  );
  const index = MODULES.findIndex((m) => m.id === moduleId);
  const next = MODULES[index + 1];
  return (
    <div className="f9design">
      <SidebarProvider key={moduleId} className="ds-provider">
        <Sidebar className="ds-sidebar">
          <SidebarHeader>
            <a href="/design/" className="ds-brand">
              f9<span>design office</span>
            </a>
            <div className="ds-project">
              PROJECT / 002<strong>电梯幸存者</strong>
              <small>系统设计与交互验收</small>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <span className="ds-nav-label">SYSTEM INDEX</span>
            <SidebarMenu>
              {MODULES.map((m) => (
                <SidebarMenuItem key={m.id}>
                  <SidebarMenuButton
                    render={
                      <a
                        href={moduleHref(m.id)}
                        aria-label={`${m.no} ${m.title}`}
                      />
                    }
                    isActive={moduleId === m.id}
                    className="ds-nav-item"
                  >
                    <span>{m.no}</span>
                    <span>{m.title}</span>
                    {reviews[m.id]?.status === 'approved' ? (
                      <Check className="ds-nav-check" />
                    ) : (
                      <i
                        className={
                          reviews[m.id]?.status === 'changes'
                            ? 'needs-changes'
                            : ''
                        }
                      />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="ds-review-progress">
              <span>
                模块确认进度{' '}
                <b>
                  {approved} / {MODULES.length}
                </b>
              </span>
              <Progress
                value={(approved / MODULES.length) * 100}
                aria-label="模块确认进度"
              />
              <small>点击确认前，不会自动视为通过。</small>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <div className="ds-side-note">
              <Radio /> DESIGN REVIEW / v{DESIGN_VERSION}
              <br />
              <span>原型数值为建议值，等待逐项验收。</span>
            </div>
            <a className="ds-old-link" href="/">
              打开上一版战斗原型 <ArrowUpRight />
            </a>
          </SidebarFooter>
        </Sidebar>
        <main className="ds-main">
          <header className="ds-topbar">
            <div>
              <SidebarTrigger />
              <span>f9 game</span>
              <i>/</i>
              <span>设计验收台</span>
            </div>
            <div className="ds-top-actions">
              <button className="ds-ghost" disabled={!ready} onClick={download}>
                <Download />
                导出验收
              </button>
              <button
                className="ds-ghost ds-print-button"
                onClick={() => window.print()}
              >
                <Printer />
                打印本页
              </button>
              <span className="ds-version">
                <b>v{DESIGN_VERSION}</b>
              </span>
            </div>
          </header>
          <div className="ds-content">
            <div className="ds-page-kicker">
              <span>{currentModule.en}</span>
              <span className={'ds-badge status-' + review.status}>
                <i />
                {STATUS[review.status]}
              </span>
            </div>
            <div className="ds-title-row">
              <div>
                <h1>{currentModule.title}</h1>
                <p>{currentModule.summary}</p>
              </div>
              <span className="ds-page-no">{currentModule.no}</span>
            </div>
            <div className="ds-anchor-bar">
              <a href="#prototype">01 交互原型</a>
              <a href="#rules">02 PRD 规则</a>
              <a href="#decisions">03 设计决策</a>
              <a href="#review">04 验收确认</a>
            </div>
            <div className="v3-review-banner">
              <b>v0.4 · 建造与构筑修订版</b>
              　已整合上一版全部意见及后续确认。新增数值和取舍请逐项确认；旧版记录仍保留，新版单独保存。
            </div>
            <section className="ds-section" id="prototype">
              <div className="ds-section-title">
                <h2>{currentModule.short}</h2>
                <span>独立交互样例 · 可重置 · 非完整新游戏</span>
              </div>
              <DesignPrototype key={moduleId} moduleId={moduleId} />
            </section>
            {moduleId === 'overview' && (
              <section className="ds-section">
                <div className="ds-section-title">
                  <h2>一次冒险的闭环</h2>
                  <span>系统之间共享资源，不各自凭空增长</span>
                </div>
                <div className="ds-loop">
                  {[
                    '建设 / 整备',
                    '选择更高楼层',
                    '消耗生存资源',
                    '探索 / 自动战斗',
                    '撤离带回实体',
                    '鉴定 / 培养 / 拆解',
                  ].map((x, i) => (
                    <div key={x}>
                      <span>0{i + 1}</span>
                      <strong>{x}</strong>
                      {i < 5 ? <ArrowRight /> : <ChevronUp />}
                    </div>
                  ))}
                </div>
                <div className="ds-module-grid">
                  {MODULES.slice(1).map((m) => (
                    <a href={moduleHref(m.id)} key={m.id}>
                      <span>
                        {m.no} / {m.en}
                      </span>
                      <h3>
                        {m.title}
                        <ArrowUpRight />
                      </h3>
                      <p>{m.short}</p>
                      <small>
                        {STATUS[reviews[m.id]?.status || 'pending']}
                      </small>
                    </a>
                  ))}
                </div>
              </section>
            )}
            <section className="ds-section ds-prd" id="rules">
              <div className="ds-section-title">
                <h2>
                  <FileText />
                  产品规则 / PRD
                </h2>
                <span>范围、状态、数据与边界</span>
              </div>
              <div className="ds-intent">
                <span>PLAYER OUTCOME</span>
                <p>{spec.goal}</p>
              </div>
              <div className="ds-confirmed">
                <h3>
                  <CheckCircle2 />
                  已确认的设计前提
                </h3>
                <ul>
                  {spec.confirmed.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="ds-rule-sections">
                {spec.rules.map((r, i) => (
                  <article className="ds-rule" key={r.title}>
                    <div className="ds-rule-num">
                      {currentModule.no}.{String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3>{r.title}</h3>
                      <p>{r.body}</p>
                      {r.rows && r.columns && (
                        <DataTable columns={r.columns} rows={r.rows} />
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <div className="ds-schema-block">
                <h3>数据契约与状态归属</h3>
                <DataTable
                  columns={['状态对象', '关键字段', '一致性要求']}
                  rows={spec.data}
                />
              </div>
              <div className="ds-edge-cases">
                <h3>异常分支与防漏洞</h3>
                {spec.edges.map((e, i) => (
                  <div key={e}>
                    <span>E{String(i + 1).padStart(2, '0')}</span>
                    <p>{e}</p>
                  </div>
                ))}
              </div>
              <div className="ds-scope">
                <strong>本模块原型范围</strong>
                <p>{spec.scope}</p>
              </div>
              {spec.depends.length > 0 && (
                <div className="ds-dependencies">
                  <Link2 />
                  <span>关联模块</span>
                  {spec.depends.map((id) => {
                    const m = MODULES.find((x) => x.id === id)!;
                    return (
                      <a key={id} href={moduleHref(id)}>
                        {m.no} {m.title}
                        <ArrowUpRight />
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="ds-section" id="decisions">
              <div className="ds-section-title">
                <h2>
                  <CircleHelp />
                  需要你确认的设计取舍
                </h2>
                <span>建议项不会自动视为你的选择</span>
              </div>
              <div className="ds-decisions">
                {spec.decisions.map((d, i) => (
                  <div className="ds-decision" key={d.id}>
                    <div className="ds-decision-heading">
                      <span>
                        D{currentModule.no}-{i + 1}
                      </span>
                      <h3>{d.title}</h3>
                    </div>
                    <p>{d.why}</p>
                    <RadioGroup
                      value={review.decisions[d.id] || ''}
                      onValueChange={(v) =>
                        update({
                          decisions: { ...review.decisions, [d.id]: String(v) },
                        })
                      }
                      aria-label={d.title}
                      className="ds-decision-options"
                    >
                      {d.options.map((option, j) => (
                        <label
                          key={option}
                          className={
                            review.decisions[d.id] === option ? 'selected' : ''
                          }
                        >
                          <RadioGroupItem
                            value={option}
                            id={`${moduleId}-${d.id}-${j}`}
                            disabled={!ready}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </section>
            <section className="ds-section ds-review" id="review">
              <div className="ds-section-title">
                <h2>
                  <ClipboardCheck />
                  逐项验收
                </h2>
                <span>{saved}</span>
              </div>
              <div className="ds-review-checklist">
                {spec.criteria.map((c, i) => (
                  <label key={c}>
                    <Checkbox
                      checked={review.checks.includes(i)}
                      disabled={!ready}
                      onCheckedChange={(v) =>
                        update({
                          checks: v
                            ? [...new Set([...review.checks, i])]
                            : review.checks.filter((n) => n !== i),
                        })
                      }
                      aria-label={c}
                    />
                    <span>
                      <small>
                        AC-{currentModule.no}-{i + 1}
                      </small>
                      {c}
                    </span>
                  </label>
                ))}
              </div>
              <label className="ds-review-notes" htmlFor={'notes-' + moduleId}>
                <span>
                  <MessageSquare />
                  验收意见 / 修改要求
                </span>
                <Textarea
                  id={'notes-' + moduleId}
                  value={review.notes}
                  maxLength={5000}
                  disabled={!ready}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="例如：同意撤离流程，但希望增加一个可探索的临时避难点……"
                />
              </label>
              <div className="ds-review-actions">
                <button
                  className="ds-button"
                  disabled={!ready || !allChecked || !allDecided}
                  onClick={() => update({ status: 'approved' }, true)}
                >
                  <CheckCircle2 />
                  确认本模块
                </button>
                <button
                  className="ds-ghost"
                  disabled={!ready}
                  onClick={() => update({ status: 'changes' }, true)}
                >
                  标记需要修改
                </button>
                <button
                  className="ds-ghost"
                  disabled={!ready || review.status === 'pending'}
                  onClick={() => update({ status: 'pending' }, true)}
                >
                  恢复待验收
                </button>
                <span>
                  {allChecked && allDecided
                    ? '已完成检查与决策，可以确认。'
                    : '勾选检查项并选择设计决策后，可确认本模块。'}
                </span>
              </div>
              <output className="ds-review-message" aria-live="polite">
                {reviewMessage}
              </output>
              <p className="ds-local-note">
                验收状态仅保存在当前浏览器，不会自动发送给任何人。可导出 JSON
                作为下一轮讨论依据。换浏览器或访问地址时，记录不会自动同步。
              </p>
            </section>
            <div className="ds-page-navigation">
              {index > 0 ? (
                <a href={moduleHref(MODULES[index - 1].id)}>
                  ← {MODULES[index - 1].title}
                </a>
              ) : (
                <span />
              )}
              {next ? (
                <a className="ds-next-page" href={moduleHref(next.id)}>
                  <span>
                    下一模块
                    <strong>
                      {next.no} / {next.title}
                    </strong>
                  </span>
                  <ArrowRight />
                </a>
              ) : (
                <button className="ds-button" onClick={download}>
                  <Download />
                  导出全部验收记录
                </button>
              )}
            </div>
            <footer className="ds-footer">
              <span>F9 / ELEVATOR SURVIVOR · SYSTEM DESIGN v0.4</span>
              <span>设定依据：本次讨论 · 所有平衡数值均为设计建议</span>
            </footer>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
