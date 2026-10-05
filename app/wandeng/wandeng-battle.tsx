'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Grid2X2,
  Swords,
  Flame,
  Droplets,
  Shield,
  Heart,
  Timer,
  Snowflake,
  Puzzle,
  Search,
  Check,
  Package,
  Clock3,
  X,
  LampDesk,
} from './wandeng-pixel-icons';
import { FlatTable } from '../arena/flat-table';
import { ArenaReview } from '../arena/arena-review';
import type { Inspection, Selection } from '../arena/arena-table';
import {
  AMPLIFIERS,
  ARENA_CARDS,
  amplifier,
  arenaCard,
  arenaEffectHelp,
} from '../../lib/arena-catalog';
import {
  CARD_ROLES,
  CARD_RARITIES,
  coreStats,
  CORE_COLORS,
} from '../../lib/arena-card-face';
import { simulateArenaDuel, type ArenaFrame } from '../../lib/arena-engine';
import {
  amplifierStatus,
  arenaReview,
  cardStatus,
  formationRelations,
  LANE_NAMES,
} from '../../lib/arena-presentation';
import { summarizeMatch } from '../../lib/arena-archive';
import {
  fighter,
  previewWandengBattle,
  soulName,
  SOULS,
  parseWandengReplay,
  serializeWandengReplay,
  type Battle,
  type WandengAction,
  type WandengState,
} from '../../lib/wandeng-game';
import type { Duel } from '../../lib/cards/combat';
import { isTrainingCard, trainingText } from '../../lib/training-catalog';
import { Art, SoulCard } from './wandeng-cards';
import {
  EffectNumber,
  SoulHost,
  SoulVeil,
  battlePixelIcon,
} from './wandeng-symbols';

const fmt = (n: number) => Number(n.toFixed(1));
function describe(text: string) {
  return ARENA_CARDS.reduce(
    (s, c) => s.replaceAll(c.name, soulName(c.id)),
    text,
  );
}
function Dialog({
  title,
  close,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`wd-battle-dialog ${wide ? 'wd-wide-dialog' : ''} ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={close} aria-label={`关闭${title}`}>
          <X size={18} aria-hidden="true" /> 关闭
        </button>
      </header>
      {children}
    </dialog>
  );
}
function InspectionDialog({
  value,
  duel,
  frame,
  close,
  select,
  act,
}: {
  value: Inspection;
  duel: Duel;
  frame: ArenaFrame;
  close: () => void;
  select?: (value: Selection) => void;
  act?: (action: WandengAction) => void;
}) {
  const cards = value.side ? duel.enemy : duel.player;
  const card = cards.find((c) => c.uid === value.uid);
  const amp = amplifier(value.id);
  const lane = Math.floor(value.at / 3);
  const title =
    value.kind === 'card' ? soulName(value.id) : `${LANE_NAMES[lane]}增幅器`;
  return (
    <Dialog title={title} close={close}>
      {value.kind === 'card' && card ? (
        <>
          <div className="wd-detail-card">
            <SoulCard card={card} frame={frame} side={value.side} duel={duel} />
          </div>
          <p>
            {isTrainingCard(card.id)
              ? trainingText(card.id, duel.arena?.training)
              : describe(arenaCard(card.id)!.text)}
          </p>
          <p className="wd-detail-state">
            {card.level} 级 · {CARD_ROLES[arenaCard(card.id)!.kind]} ·{' '}
            {cardStatus(card, frame).join(' · ') || '正常运转'}
          </p>
          <p>{describe(formationRelations(card, cards).note)}</p>
          {select && value.side === 0 && (
            <div className="wd-dialog-actions">
              <button
                onClick={() => {
                  select({ id: card.id, uid: card.uid });
                  close();
                }}
              >
                选中并移动
              </button>
              <button
                onClick={() => {
                  act?.({ type: 'place', uid: card.uid, at: null });
                  close();
                }}
              >
                收回口袋
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h3>{amp?.name ?? '未装备'}</h3>
          <p>{amp?.text ?? '每路有一个独立位置，不占用物品格。'}</p>
          <p className="wd-detail-state">
            {amplifierStatus(duel, frame, value.side, lane)}
          </p>
          <p>
            只作用于本路。屏障破裂后，本场永久失效；拆解与修理作用于增幅器。
          </p>
          {act && value.side === 0 && (
            <div className="wd-amp-options">
              <button
                aria-pressed={!value.id}
                onClick={() => {
                  act({ type: 'amplifier', lane, id: null });
                  close();
                }}
              >
                卸下增幅器
              </button>
              {AMPLIFIERS.map((a) => (
                <button
                  key={a.id}
                  aria-pressed={a.id === value.id}
                  onClick={() => {
                    act({ type: 'amplifier', lane, id: a.id });
                    close();
                  }}
                >
                  <strong>{a.name}</strong>
                  <span>{a.text}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <dl className="wd-rulebook">
        {arenaEffectHelp(value.id).map((rule, i) => (
          <div key={i}>
            <dt>{rule.term}</dt>
            <dd>{describe(rule.text)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}

export function PreparationTable({
  state,
  act,
  selected,
  onSelect,
}: {
  state: WandengState;
  act: (action: WandengAction) => void;
  selected: string | null;
  onSelect: (uid: string | null) => void;
}) {
  const battle = useMemo(
    () =>
      previewWandengBattle(
        state,
        state.phase === 'lesson'
          ? 'lesson'
          : state.selectedEvent === 'duel'
            ? 'duel'
            : 'boss',
      ),
    [state],
  );
  const result = useMemo(() => simulateArenaDuel(battle.duel), [battle.duel]);
  const frame = result.frames[0];
  const [inspected, setInspected] = useState<Inspection | null>(null);
  const clock = useRef(0);
  const chosen = state.inventory.find((c) => c.uid === selected);
  const selection = chosen ? { uid: chosen.uid, id: chosen.id } : null;
  return (
    <section className="wd-tactical wd-preparation" aria-label="战前双方阵容">
      <p className="wd-table-note">
        上方为{battle.duel.name}的公开阵容 ·
        下方为你的随行物品。点选或拖动布阵；增幅器独立占位。
      </p>
      <FlatTable
        duel={battle.duel}
        frames={result.frames}
        frame={frame}
        clock={clock}
        editing
        reduced
        detailed
        inspected={inspected}
        selected={selection}
        cardName={soulName}
        describe={describe}
        renderIcon={battlePixelIcon}
        renderHost={(side) => (
          <SoulHost duel={battle.duel} frame={frame} side={side} />
        )}
        renderBarrier={(side, lane) => (
          <SoulVeil frame={frame} side={side} lane={lane} />
        )}
        renderCard={(card, side) => (
          <SoulCard
            card={card}
            frame={frame}
            side={side}
            duel={battle.duel}
            compact
          />
        )}
        onInspect={(value) => {
          onSelect(null);
          setInspected(value);
        }}
        onSelect={(s) => onSelect(s.uid ?? null)}
        onPlace={(at, s = selection ?? undefined) => {
          if (s?.uid) act({ type: 'place', uid: s.uid, at });
        }}
        onAmp={(side, lane) =>
          setInspected({
            kind: 'amplifier',
            id: battle.duel.arena!.amplifiers[side][lane] ?? '',
            side,
            at: lane * 3,
          })
        }
      />
      {selected && (
        <button className="wd-text-button" onClick={() => onSelect(null)}>
          取消放置，查看卡牌
        </button>
      )}
      {inspected && (
        <InspectionDialog
          value={inspected}
          duel={battle.duel}
          frame={frame}
          close={() => setInspected(null)}
          act={act}
          select={(s) => onSelect(s.uid ?? null)}
        />
      )}
    </section>
  );
}

export function BattlePlayback({
  battle,
  previous,
  onFinish,
  replay = false,
  training = false,
  embedded = false,
  actions,
}: {
  battle: Battle;
  previous?: Battle;
  onFinish?: () => void;
  replay?: boolean;
  training?: boolean;
  embedded?: boolean;
  actions?: ReactNode;
}) {
  const result = useMemo(() => simulateArenaDuel(battle.duel), [battle.duel]);
  const review = useMemo(() => {
    const r = arenaReview(battle.duel, result.frames);
    return {
      ...r,
      events: r.events.map((e) => ({ ...e, text: describe(e.text) })),
    };
  }, [battle.duel, result.frames]);
  // Archive metadata is display-only; simulation and saved inputs contain no wall clock.
  const current = useMemo(
    () =>
      summarizeMatch(
        battle.id,
        battle.kind,
        previous?.id ?? null,
        battle.duel,
        result,
      ),
    [battle, previous?.id, result],
  );
  const prior = useMemo(
    () =>
      previous
        ? summarizeMatch(
            previous.id,
            previous.kind,
            null,
            previous.duel,
            simulateArenaDuel(previous.duel),
          )
        : undefined,
    [previous],
  );
  const [tick, setTick] = useState(0),
    [playing, setPlaying] = useState(!replay),
    [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false),
    [detailed, setDetailed] = useState(true);
  const [inspected, setInspected] = useState<Inspection | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const resume = useRef(false),
    clock = useRef(0),
    root = useRef<HTMLElement>(null);
  const [fullError, setFullError] = useState('');
  useEffect(() => {
    if (embedded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [embedded]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const task = requestAnimationFrame(() => setReduced(query.matches));
    return () => cancelAnimationFrame(task);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let handle = 0,
      last = 0;
    function step(now: number) {
      if (last)
        clock.current = Math.min(
          result.duration + 1.4,
          clock.current + Math.min(0.1, (now - last) / 1000) * speed,
        );
      last = now;
      setTick(
        Math.min(
          result.frames.length - 1,
          Math.floor((clock.current + 0.00001) / 0.25),
        ),
      );
      if (clock.current < result.duration + 1.4)
        handle = requestAnimationFrame(step);
      else setPlaying(false);
    }
    handle = requestAnimationFrame(step);
    return () => cancelAnimationFrame(handle);
  }, [playing, speed, result]);
  const frame = result.frames[tick],
    over = tick === result.frames.length - 1;
  function seek(time: number) {
    setPlaying(false);
    clock.current = Math.max(0, Math.min(result.duration, time));
    setTick(
      Math.min(
        result.frames.length - 1,
        Math.floor((clock.current + 0.00001) / 0.25),
      ),
    );
  }
  function inspect(value: Inspection) {
    resume.current = playing && !over;
    setPlaying(false);
    setInspected(value);
  }
  function closeInspection() {
    setInspected(null);
    setPlaying(resume.current);
  }
  return (
    <section
      className={`wd-tactical wd-battle-playback ${embedded ? 'wd-battle-embedded' : ''} ${reduced ? 'wd-reduced' : ''}`}
      ref={root}
    >
      <div className="wd-section-heading">
        <div>
          <small>
            {training ? '对战训练场' : replay ? '旅途回放' : '灵魂对决'} /
            三路自动交锋
          </small>
          <h1>{battle.duel.name}</h1>
        </div>
        <div className="wd-playback">
          {actions}
          <button
            onClick={() => {
              if (over) {
                clock.current = 0;
                setTick(0);
              }
              setPlaying(over || !playing);
            }}
          >
            {over ? '重新播放' : playing ? '暂停' : '继续播放'}
          </button>
          <button onClick={() => setSpeed((s) => (s === 4 ? 1 : s * 2))}>
            {speed}×
          </button>
          <button onClick={() => seek(frame.time + 0.25)}>逐帧 +0.25s</button>
          <button onClick={() => seek(result.duration)}>跳至结果</button>
        </div>
      </div>
      <div className="wd-battle-options">
        <label>
          <input
            type="checkbox"
            checked={detailed}
            onChange={(e) => setDetailed(e.target.checked)}
          />
          详细状态
        </label>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
          减少动态
        </label>
        <button
          onClick={() => {
            resume.current = playing && !over;
            setPlaying(false);
            setReviewOpen(true);
          }}
        >
          对战复盘
        </button>
        <button
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await root.current?.requestFullscreen();
            } catch {
              setFullError('此浏览器暂不支持全屏，可以继续在窗口中回看。');
            }
          }}
        >
          切换全屏
        </button>
        <strong>
          {frame.time.toFixed(2)} / {result.duration.toFixed(2)}s
        </strong>
      </div>
      {fullError && (
        <output className="wd-fullscreen-error">{fullError}</output>
      )}
      <FlatTable
        duel={battle.duel}
        frames={result.frames}
        frame={frame}
        clock={clock}
        editing={false}
        selected={null}
        detailed={detailed}
        reduced={reduced}
        inspected={inspected}
        cardName={soulName}
        describe={describe}
        renderIcon={battlePixelIcon}
        renderHost={(side) => (
          <SoulHost
            duel={battle.duel}
            frame={frame}
            side={side}
            label={
              battle.duel.arena?.training && side === 1
                ? '对手与同行的物品'
                : undefined
            }
          />
        )}
        renderBarrier={(side, lane) => (
          <SoulVeil frame={frame} side={side} lane={lane} />
        )}
        renderNumber={(n) => (
          <EffectNumber kind={n.kind}>
            {n.kind === 'heal' || n.kind === 'repair' ? '+' : '−'}
            {fmt(n.value)}
          </EffectNumber>
        )}
        renderCard={(card, side) => (
          <SoulCard
            card={card}
            frame={frame}
            side={side}
            duel={battle.duel}
            compact
          />
        )}
        onInspect={inspect}
        onSelect={() => {}}
        onPlace={() => {}}
        onAmp={(side, lane) =>
          inspect({
            kind: 'amplifier',
            id: battle.duel.arena!.amplifiers[side][lane] ?? '',
            side,
            at: lane * 3,
          })
        }
      />
      <footer className="wd-battle-footer">
        <label className="wd-timeline">
          对战时间轴
          <input
            aria-label="对战时间轴"
            type="range"
            min={0}
            max={result.duration}
            step={0.25}
            value={frame.time}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </label>
        <div className="wd-battle-summary">
          <p className="wd-live-event" aria-live="off">
            {review.events
              .filter((e) => e.time <= frame.time && frame.time - e.time < 1)
              .slice(-2)
              .map((e) => e.text)
              .join(' / ') ||
              '每件物品按自己的冷却行动。点击物品或增幅器，暂停查看细则。'}
          </p>
          {over && (
            <div className="wd-combat-finish">
              <h2>
                {result.winner === 0
                  ? '它们回应了你的信任。'
                  : result.winner === 1
                    ? '这一场，我们先认输。'
                    : '双方仍在彼此回应。'}
              </h2>
              {onFinish && (
                <button className="wd-primary" onClick={onFinish}>
                  查看对决结果 →
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
      {reviewOpen && (
        <Dialog
          title="对战复盘"
          wide
          className="wd-review-dialog"
          close={() => {
            setReviewOpen(false);
            setPlaying(resume.current);
          }}
        >
          <ArenaReview
            review={review}
            duel={battle.duel}
            time={frame.time}
            onSeek={(t) => {
              seek(t);
              resume.current = false;
              setReviewOpen(false);
            }}
            current={current}
            previous={prior}
            cardName={soulName}
          />
        </Dialog>
      )}
      {inspected && (
        <InspectionDialog
          value={inspected}
          duel={battle.duel}
          frame={frame}
          close={closeInspection}
        />
      )}
    </section>
  );
}

const catalogCategories = [
  { id: 'all', label: '全部旧物', Icon: Grid2X2 },
  { id: 'damage', label: '直击', Icon: Swords },
  { id: 'burn', label: '灼烧', Icon: Flame },
  { id: 'corrode', label: '侵蚀', Icon: Droplets },
  { id: 'shield', label: '屏障', Icon: Shield },
  { id: 'heal', label: '恢复', Icon: Heart },
  { id: 'tempo', label: '节奏', Icon: Timer },
  { id: 'control', label: '控制', Icon: Snowflake },
  { id: 'passive', label: '联动', Icon: Puzzle },
];

export function CollectionDialog({
  state,
  close,
}: {
  state: WandengState;
  close: () => void;
}) {
  const [search, setSearch] = useState(''),
    [kind, setKind] = useState('all');
  const [chosen, setChosen] = useState(
    state.inventory[0]?.id ?? ARENA_CARDS[0].id,
  );
  const cards = ARENA_CARDS.filter(
    (c) =>
      (kind === 'all' || c.kind === kind) &&
      `${soulName(c.id)}${c.name}${c.text}`.includes(search.trim()),
  );
  const owned = new Set(state.inventory.map((c) => c.id));
  const selected = cards.find((c) => c.id === chosen) ?? cards[0];
  const selectedFighter = selected
    ? fighter({
        id: selected.id,
        uid: `catalog-${selected.id}`,
        at: null,
        level: 0,
        origin: '',
      })
    : null;
  const stats = selectedFighter ? coreStats(selectedFighter) : [];
  return (
    <Dialog
      title="旧物图鉴 · 50 件"
      close={close}
      wide
      className="wd-collection-dialog"
    >
      <div className="wd-collection-intro">
        <span>
          <LampDesk size={18} aria-hidden="true" /> 每一件旧物，都有一段故事。
        </span>
        <span>
          <Package size={17} aria-hidden="true" /> 本次同行 <b>{owned.size}</b>{' '}
          / 50
        </span>
      </div>
      <div className="wd-collection-toolbar">
        <fieldset className="wd-category-ribbon" aria-label="筛选旧物定位">
          {catalogCategories.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={`筛选：${label}`}
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              title={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </fieldset>
        <label className="wd-collection-search">
          <Search size={19} aria-hidden="true" />
          <input
            aria-label="搜索旧物"
            placeholder="找一件旧物…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="wd-collection-layout">
        <section className="wd-collection-shelf" aria-label="旧物列表">
          <div className="wd-shelf-heading">
            <span>{catalogCategories.find((c) => c.id === kind)?.label}</span>
            <span>{cards.length} 件旧物</span>
          </div>
          <div className="wd-collection-grid">
            {cards.map((c) => (
              <button
                key={c.id}
                className="wd-collection-tile"
                data-rarity={c.rarity}
                onClick={() => setChosen(c.id)}
                aria-label={`图鉴：${soulName(c.id)}`}
                aria-pressed={selected?.id === c.id}
              >
                <span
                  className={`wd-rarity-dot wd-rarity-${c.rarity}`}
                  title={CARD_RARITIES[c.rarity]}
                  aria-label={CARD_RARITIES[c.rarity]}
                />
                <Art tile={SOULS[c.id]?.tile ?? 0} />
                <strong>{soulName(c.id)}</strong>
                <span className="wd-tile-foot">
                  <span>{c.size} 格</span>
                  {owned.has(c.id) && (
                    <Check size={19} strokeWidth={3} aria-label="本次同行中" />
                  )}
                </span>
              </button>
            ))}
          </div>
          {!cards.length && (
            <div className="wd-collection-empty">
              <Search size={32} aria-hidden="true" />
              <p>这一页还没有找到它。</p>
              <span>试试其他名字、效果，或选择全部旧物。</span>
              <button
                onClick={() => {
                  setSearch('');
                  setKind('all');
                }}
              >
                查看全部旧物
              </button>
            </div>
          )}
        </section>
        {selected ? (
          <aside className="wd-collection-detail" aria-label="旧物详情">
            <header>
              <span className="wd-detail-glyph">
                <LampDesk size={28} aria-hidden="true" />
              </span>
              <div>
                <small>{CARD_ROLES[selected.kind]}</small>
                <h3 aria-live="polite">{soulName(selected.id)}</h3>
              </div>
            </header>
            <div className="wd-collection-meta">
              <span>
                <Grid2X2 size={18} aria-hidden="true" /> {selected.size} 格
              </span>
              <span>
                <Clock3 size={18} aria-hidden="true" />{' '}
                {selected.cd > 0 ? `${selected.cd} 秒` : '联动'}
              </span>
              <span className={`wd-rarity-label wd-rarity-${selected.rarity}`}>
                {CARD_RARITIES[selected.rarity]}
              </span>
            </div>
            <div className="wd-collection-specimen">
              <Art tile={SOULS[selected.id]?.tile ?? 0} />
              <span>
                {owned.has(selected.id)
                  ? '已经在你的行囊里'
                  : '也许会在下一段路遇见'}
              </span>
            </div>
            <div className="wd-collection-rule">
              {stats.length > 0 && (
                <div className="wd-stat-strip" aria-label="基础数值">
                  {stats.map((stat) => (
                    <b
                      key={stat.key}
                      style={{ color: CORE_COLORS[stat.kind] }}
                      title={stat.meaning}
                      aria-label={`${stat.meaning} ${fmt(stat.value)}`}
                    >
                      <EffectNumber kind={stat.kind}>
                        {fmt(stat.value)}
                      </EffectNumber>
                    </b>
                  ))}
                </div>
              )}
              <p>{describe(selected.text)}</p>
              <small>图鉴显示基础等级数值 · 实际效果随局内修缮成长</small>
            </div>
            {SOULS[selected.id]?.story && (
              <p className="wd-collection-story">
                “{SOULS[selected.id].story}”
              </p>
            )}
            <details className="wd-collection-mechanics" key={selected.id}>
              <summary>查看机制细则</summary>
              <dl className="wd-rulebook">
                {arenaEffectHelp(selected.id).map((r, i) => (
                  <div key={i}>
                    <dt>{r.term}</dt>
                    <dd>{describe(r.text)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </aside>
        ) : (
          <aside className="wd-collection-detail wd-detail-empty">
            <LampDesk size={52} aria-hidden="true" />
            <p>为下一次相遇，留一盏灯。</p>
          </aside>
        )}
      </div>
      <footer className="wd-collection-footer">
        <span>
          <Check size={16} aria-hidden="true" /> 勾选表示本次同行
        </span>
        <button onClick={close}>
          <kbd>Esc</kbd> 合上图鉴
        </button>
      </footer>
    </Dialog>
  );
}

export function HistoryDialog({
  state,
  close,
  initial,
}: {
  state: WandengState;
  close: () => void;
  initial?: Battle;
}) {
  const [selected, setSelected] = useState<Battle | null>(initial ?? null),
    [error, setError] = useState('');
  const [replayText, setReplayText] = useState('');
  const index = selected
    ? state.history.findIndex((b) => b.id === selected.id)
    : -1;
  function download() {
    if (!selected) return;
    const blob = new Blob([serializeWandengReplay(selected)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `wandeng-${selected.id.replaceAll(':', '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function loadReplay(text: string) {
    try {
      const battle = parseWandengReplay(text);
      simulateArenaDuel(battle.duel);
      setSelected(battle);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '回放读取失败。');
    }
  }
  if (selected) {
    return (
      <Dialog
        title="对决手记"
        close={close}
        wide
        className="wd-history-playback"
      >
        <BattlePlayback
          key={selected.id + JSON.stringify(selected.duel)}
          battle={selected}
          previous={index > 0 ? state.history[index - 1] : undefined}
          replay
          embedded
          actions={
            <>
              <button onClick={close}>关闭手记</button>
              <button onClick={() => setSelected(null)}>← 回放列表</button>
              <button onClick={download}>导出本场</button>
              <button
                onClick={() => {
                  setReplayText(serializeWandengReplay(selected));
                  setSelected(null);
                }}
              >
                回放文本
              </button>
            </>
          }
        />
      </Dialog>
    );
  }
  return (
    <Dialog title="对决手记" close={close} wide>
      <div className="wd-history-actions">
        <p>最近 30 场。保存完整布阵、等级、增幅器与对手输入，可反复回看。</p>
        <label className="wd-file-button">
          导入回放
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const input = e.currentTarget;
              const f = input.files?.[0];
              if (!f) return;
              try {
                if (f.size > 100000) throw Error('回放文件过大。');
                loadReplay(await f.text());
              } catch (err) {
                setError(err instanceof Error ? err.message : '回放读取失败。');
              }
              input.value = '';
            }}
          />
        </label>
      </div>
      <details className="wd-replay-text" open={!!replayText}>
        <summary>回放文本 · 下载不可用时也能保存</summary>
        <p>导出文本可复制保存。载入仅用于回看，不会覆盖旅途或发放奖励。</p>
        <textarea
          aria-label="回放文本"
          value={replayText}
          onChange={(e) => setReplayText(e.target.value)}
          rows={5}
        />
        <button disabled={!replayText} onClick={() => loadReplay(replayText)}>
          载入文本回放
        </button>
      </details>
      {error && <p role="alert">{error}</p>}
      <nav className="wd-history-list">
        {[...state.history].reverse().map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b)}
          >
            {b.duel.name}
            <small>第 {state.history.indexOf(b) + 1} 场</small>
          </button>
        ))}
      </nav>
      <p>选一场对决，重新看见它们一起行动的时刻。</p>
    </Dialog>
  );
}
