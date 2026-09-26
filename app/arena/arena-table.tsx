'use client';
import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type DragEvent,
} from 'react';
import { Flame, Snowflake, Shield, ShieldOff, Zap } from 'lucide-react';
import { arenaCard, amplifier } from '@/lib/arena-catalog';
import { cardDef } from '@/lib/demo-cards';
import {
  cardStatus,
  amplifierStatus,
  EFFECT_COLORS,
  formationRelations,
  hitEndpoint,
  LANE_NAMES,
  placementPreview,
  rounded,
  type ReviewEvent,
} from '@/lib/arena-presentation';
import type { ArenaFrame } from '@/lib/arena-engine';
import type { Duel, FighterCard } from '@/lib/demo-combat';
import type { Anchor, BoardAnchors } from '@/app/art/slice/scene';

const Scene = lazy(() => import('@/app/art/slice/scene'));
export type Selection = { id: string; uid?: string };
export type Inspection = {
  kind: 'card' | 'amplifier';
  id: string;
  side: number;
  at: number;
  uid?: string;
};
type Props = {
  duel: Duel;
  frames: ArenaFrame[];
  frame: ArenaFrame;
  clock: { current: number };
  editing: boolean;
  selected: Selection | null;
  reduced: boolean;
  detailed: boolean;
  events: ReviewEvent[];
  inspected: Inspection | null;
  onInspect: (value: Inspection) => void;
  onPlace: (at: number, selection?: Selection) => void;
  onSelect: (selection: Selection) => void;
  onAmp: (side: number, lane: number) => void;
};

export function ArenaTable(p: Props) {
  const [anchors, setAnchors] = useState<Anchor[]>([]),
    [board, setBoard] = useState<BoardAnchors>({
      barriers: [],
      cores: [],
      lanes: [],
    });
  const [ready, setReady] = useState(false),
    [over, setOver] = useState<number>(),
    [hover, setHover] = useState<FighterCard | null>(null);
  const onAnchors = useCallback((a: Anchor[]) => setAnchors(a), []),
    onBoard = useCallback((b: BoardAnchors) => setBoard(b), []),
    onReady = useCallback(() => setReady(true), []);
  const all = [...p.duel.player, ...p.duel.enemy];
  const focused = hover ?? all.find((c) => c.uid === p.inspected?.uid);
  const focusedSide = focused
    ? p.duel.player.some((c) => c.uid === focused.uid)
      ? 0
      : 1
    : 0;
  const relations = focused
    ? formationRelations(focused, focusedSide ? p.duel.enemy : p.duel.player)
    : null;
  const preview =
    over !== undefined && p.selected && p.editing
      ? placementPreview(p.duel.player, p.selected.id, over, p.selected.uid)
      : null;
  const focusLane =
    over !== undefined && p.selected
      ? Math.floor(over / 3)
      : focused
        ? Math.floor(focused.at / 3)
        : undefined;
  const recent = p.editing
    ? []
    : p.events.filter(
        (e) => e.time <= p.frame.time && p.frame.time - e.time < 1,
      );
  const recentFrames = useMemo(
    () =>
      p.frames.filter(
        (f) => f.time <= p.frame.time && p.frame.time - f.time < 0.65,
      ),
    [p.frames, p.frame.time],
  );
  const fired = new Set(
    p.editing
      ? []
      : recentFrames.flatMap((f) => [
          ...f.fired,
          ...(f.links ?? []).map((l) => l.to),
        ]),
  );
  function point(uid: string) {
    const c = all.find((x) => x.uid === uid);
    if (c) {
      const side = p.duel.player.includes(c) ? 0 : 1,
        a = anchors[side * 9 + c.at],
        b = anchors[side * 9 + c.at + cardDef(c.id).size - 1];
      return a && b
        ? { x: (a.x + b.x + b.w) / 2, y: a.y + a.h / 2 }
        : undefined;
    }
    const shield = /^(?:barrier|amp)-(\d)-(\d)$/.exec(uid);
    if (shield)
      return board.barriers[Number(shield[1]) * 3 + Number(shield[2])];
    const host = /^host-(\d)/.exec(uid);
    if (host) return board.cores[Number(host[1])];
  }
  const links = p.editing
    ? focused && relations
      ? relations.targets.map((to) => ({
          from: focused.uid,
          to,
          kind: 'charge',
        }))
      : []
    : recentFrames
        .flatMap((f) => [
          ...(f.links ?? []).map((l) => ({ ...l, kind: 'charge' })),
          ...f.hits
            .filter(
              (h) =>
                h.value > 0 &&
                !h.periodic &&
                h.sourceUid &&
                ['charge', 'haste', 'slow', 'freeze', 'ammo'].includes(h.kind),
            )
            .map((h) => ({
              from: h.sourceUid!,
              to: hitEndpoint(h),
              kind: h.kind,
            })),
        ])
        .filter(
          (l, i, ls) =>
            ls.findIndex((x) => x.from === l.from && x.to === l.to) === i,
        )
        .slice(-8);
  function drop(e: DragEvent, at: number) {
    e.preventDefault();
    setOver(undefined);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/f9-card'));
      if (arenaCard(data.id)) p.onPlace(at, data);
    } catch {
      /* Foreign drags never mutate the board. */
    }
  }
  function drag(e: DragEvent, c: FighterCard) {
    const data = { id: c.id, uid: c.uid };
    p.onSelect(data);
    e.dataTransfer.setData('application/f9-card', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  }
  function slotWithinCard(
    e: { clientX: number; currentTarget: HTMLButtonElement },
    c: FighterCard,
  ) {
    const rect = e.currentTarget.getBoundingClientRect(),
      size = cardDef(c.id).size;
    return (
      c.at +
      Math.max(
        0,
        Math.min(
          size - 1,
          Math.floor(((e.clientX - rect.left) / rect.width) * size),
        ),
      )
    );
  }
  const laneWidth =
    board.lanes.length > 1
      ? Math.min(
          210,
          Math.max(115, (board.lanes[1].x - board.lanes[0].x) * 0.86),
        )
      : 160;
  return (
    <div className={`tac-table ${p.reduced ? 'reduce-motion' : ''}`}>
      <Suspense fallback={<div className="tac-loading">正在点亮战术桌…</div>}>
        <Scene
          duel={p.duel}
          frame={p.frame}
          frames={p.frames}
          clock={p.clock}
          reduced={p.reduced}
          selected={p.selected?.uid ?? focused?.uid}
          focusLane={focusLane}
          chamber={{
            view: 'table',
            opened: true,
            taken: true,
            cleared: false,
            arena: true,
          }}
          materialStyle="tactile"
          onAnchors={onAnchors}
          onBoardAnchors={onBoard}
          onReady={onReady}
        />
      </Suspense>
      {!ready && <div className="tac-loading">装备就位中…</div>}
      {ready && (
        <div className="tac-overlay">
          {board.lanes.map((a, l) => (
            <div
              className={`tac-lane-name ${focusLane === l ? 'focused' : ''}`}
              key={l}
              style={{ left: a.x, top: a.y - 12 }}
            >
              <small>0{l + 1}</small>
              {LANE_NAMES[l]}
              {[1, 0].map(
                (s) =>
                  p.frame.barriers[s][l].broken && (
                    <b key={s}>{s ? '敌方' : '我方'}暴露</b>
                  ),
              )}
            </div>
          ))}
          {[1, 0].flatMap((side) =>
            [0, 1, 2].map((lane) => {
              const a = board.barriers[side * 3 + lane];
              if (!a) return null;
              const b = p.frame.barriers[side][lane],
                amp = amplifier(p.duel.arena!.amplifiers[side][lane]);
              const active = p.frame.amplifierActive[side][lane],
                burn = p.frame.burn[side][lane],
                corrode = p.frame.corrosion[side][lane];
              return (
                <div
                  key={`${side}-${lane}`}
                  className={`tac-lane-hud ${side ? 'enemy' : 'own'} ${b.broken ? 'broken' : ''} ${burn ? 'burning' : ''}`}
                  style={{
                    left: a.x,
                    top: a.y + (side ? -62 : 12),
                    width: laneWidth,
                  }}
                >
                  <div className="tac-shield-line">
                    {b.broken ? <ShieldOff size={13} /> : <Shield size={13} />}
                    <span>{LANE_NAMES[lane]}</span>
                    <strong>
                      {b.broken
                        ? '已破 · 暴露'
                        : `${rounded(b.hp)} / ${rounded(b.maxHp)}`}
                    </strong>
                  </div>
                  <div className="tac-shield-meter">
                    <i style={{ width: `${(100 * b.hp) / b.maxHp}%` }} />
                  </div>
                  <button
                    className={`tac-amp ${active ? 'active' : 'inactive'}`}
                    disabled={!amp && !(p.editing && side === 0)}
                    onClick={() => p.onAmp(side, lane)}
                    aria-label={`${side ? '敌方' : '我方'}${LANE_NAMES[lane]}增幅器${amp ? ` ${amp.name}` : ' 未装备'}`}
                  >
                    <i />
                    {amp?.name ??
                      (p.editing && side === 0
                        ? '＋ 安装增幅器'
                        : '未装备增幅器')}
                    {amp && (
                      <small>
                        {amplifierStatus(p.duel, p.frame, side, lane)}
                      </small>
                    )}
                  </button>
                  {(burn > 0 || corrode > 0) && (
                    <div className="tac-lane-status">
                      {burn > 0 && (
                        <span className="burn">
                          <Flame size={11} />
                          灼烧 {burn}
                        </span>
                      )}
                      {corrode > 0 && (
                        <span className="corrode">◈ 侵蚀 {corrode}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }),
          )}
          {p.editing &&
            anchors.slice(0, 9).map((a, at) => {
              const occupant = p.duel.player.find(
                (c) => at >= c.at && at < c.at + cardDef(c.id).size,
              );
              if (occupant) return null;
              const allowed = p.selected
                ? placementPreview(
                    p.duel.player,
                    p.selected.id,
                    at,
                    p.selected.uid,
                  ).allowed
                : false;
              return (
                <button
                  key={at}
                  className={`tac-slot ${p.selected ? (allowed ? 'allowed' : 'unavailable') : ''}`}
                  style={{ left: a.x, top: a.y, width: a.w, height: a.h }}
                  onClick={() => {
                    p.onPlace(at);
                    setOver(undefined);
                  }}
                  onMouseEnter={() => setOver(at)}
                  onMouseLeave={() => setOver(undefined)}
                  onFocus={() => setOver(at)}
                  onBlur={() => setOver(undefined)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(at);
                  }}
                  onDrop={(e) => drop(e, at)}
                  aria-label={`放在${LANE_NAMES[Math.floor(at / 3)]}第${(at % 3) + 1}格`}
                >
                  <span>＋</span>
                  <small>{(at % 3) + 1}</small>
                </button>
              );
            })}
          {[1, 0].flatMap((side) =>
            (side ? p.duel.enemy : p.duel.player).map((c) => {
              const def = cardDef(c.id),
                a = anchors[side * 9 + c.at],
                b = anchors[side * 9 + c.at + def.size - 1];
              if (!a || !b) return null;
              const cd = p.frame.cd[side][c.at],
                progress = cd
                  ? Math.min(1, p.frame.timers[side][c.at] / cd)
                  : 0,
                states = cardStatus(c, p.frame),
                freeze = p.frame.freeze[c.uid] > 0;
              const related = relations?.targets.includes(c.uid),
                chosen =
                  p.inspected?.uid === c.uid || p.selected?.uid === c.uid;
              return (
                <button
                  key={c.uid}
                  className={`tac-equipment ${side ? 'enemy' : 'own'} ${fired.has(c.uid) ? 'fired' : ''} ${related ? 'related' : ''} ${chosen ? 'chosen' : ''} ${freeze ? 'frozen' : ''}`}
                  style={{
                    left: a.x,
                    top: a.y,
                    width: b.x + b.w - a.x,
                    height: a.h,
                  }}
                  draggable={p.editing && side === 0}
                  onDragStart={(e) => drag(e, c)}
                  onDragEnd={() => setOver(undefined)}
                  onDragOver={(e) => {
                    if (p.editing && side === 0) {
                      e.preventDefault();
                      setOver(slotWithinCard(e, c));
                    }
                  }}
                  onDrop={(e) => side === 0 && drop(e, slotWithinCard(e, c))}
                  onMouseEnter={() => setHover(c)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c)}
                  onBlur={() => setHover(null)}
                  onClick={(e) =>
                    p.editing && side === 0 && p.selected?.uid
                      ? p.onPlace(slotWithinCard(e, c))
                      : p.onInspect({
                          kind: 'card',
                          id: c.id,
                          uid: c.uid,
                          side,
                          at: c.at,
                        })
                  }
                  aria-label={`查看${side ? '敌方' : '我方'}${LANE_NAMES[Math.floor(c.at / 3)]}${def.name}的效果`}
                >
                  {freeze && (
                    <Snowflake className="tac-freeze-icon" size={20} />
                  )}
                  <div className="tac-equipment-label">
                    <strong>{def.name}</strong>
                    <span>
                      {freeze
                        ? '冻结'
                        : [1, 2].includes(arenaCard(c.id)?.number ?? 0) &&
                            p.frame.ammo[c.uid] === 0
                          ? '待装填'
                          : cd
                            ? `${rounded(Math.max(0, cd - p.frame.timers[side][c.at]))}s`
                            : '被动'}
                    </span>
                    <div
                      className={`tac-cooldown ${p.frame.haste[c.uid] > 0 ? 'haste' : ''} ${p.frame.slow[c.uid] > 0 ? 'slow' : ''}`}
                    >
                      <i style={{ width: `${progress * 100}%` }} />
                    </div>
                    {states.length > 0 && (
                      <small>
                        {states.slice(0, p.detailed ? 3 : 1).join(' · ')}
                      </small>
                    )}
                  </div>
                </button>
              );
            }),
          )}
          {p.editing &&
            over !== undefined &&
            p.selected &&
            preview &&
            (() => {
              const a = anchors[over],
                last = over + cardDef(p.selected.id).size - 1,
                b = anchors[Math.min(last, Math.floor(over / 3) * 3 + 2)];
              if (!a || !b) return null;
              return (
                <div
                  className={`tac-placement ${preview.allowed ? 'valid' : 'invalid'}`}
                  style={{
                    left: a.x,
                    top: a.y,
                    width: b.x + b.w - a.x,
                    height: a.h,
                  }}
                >
                  <span>
                    {cardDef(p.selected.id).name} ·{' '}
                    {cardDef(p.selected.id).size}格<br />
                    {preview.allowed ? '点击或松手放置' : preview.reason}
                  </span>
                </div>
              );
            })()}
          <svg className="tac-connections" aria-hidden="true">
            <defs>
              <marker
                id="tac-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {links.map((l, i) => {
              const a = point(l.from),
                b = point(l.to);
              if (!a || !b) return null;
              return (
                <path
                  key={`${l.from}-${l.to}-${i}`}
                  d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 35} ${b.x} ${b.y}`}
                  stroke={EFFECT_COLORS[l.kind]}
                  markerEnd="url(#tac-arrow)"
                />
              );
            })}
          </svg>
          {!p.editing &&
            board.lanes.map((a, l) => {
              const events = recent
                .filter(
                  (e) =>
                    e.lane === l &&
                    (p.detailed || e.important || e.kind === 'link'),
                )
                .slice(-2);
              return events.length ? (
                <div
                  className="tac-feedback"
                  key={l}
                  style={{ left: a.x, top: a.y + 8, width: laneWidth }}
                >
                  {events.map((e) => (
                    <span
                      key={e.id}
                      style={{
                        borderColor: EFFECT_COLORS[e.kind] ?? '#deb97c',
                      }}
                    >
                      {e.important
                        ? e.text
                        : `${e.side ? '敌' : '我'} · ${e.text.split('：').at(-1)}`}
                    </span>
                  ))}
                </div>
              ) : null;
            })}
        </div>
      )}
      {focused && relations?.note && (
        <div className="tac-relation-note">
          <Zap size={12} />
          {relations.note}
        </div>
      )}
    </div>
  );
}
