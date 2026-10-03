'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Shield, ShieldOff, Flame, Droplets, Plus, Gem } from 'lucide-react';
import { amplifier, arenaCard } from '@/lib/arena-catalog';
import { cardDef } from '@/lib/cards/catalog';
import {
  amplifierStatus,
  cardStatus,
  formationRelations,
  LANE_NAMES,
  placementPreview,
  rounded,
} from '@/lib/arena-presentation';
import {
  combatNumbers,
  numberPose,
  NUMBER_LIFETIME,
  type CombatNumber,
} from '@/lib/arena-numbers';
import {
  flatEffectPath,
  flatPathPoint,
  flatSurfacePoint,
  type FlatAnchors,
} from '@/lib/flat-battle-geometry';
import { CORE_COLORS } from '@/lib/arena-card-face';
import type { FighterCard } from '@/lib/cards/combat';
import type { ArenaTableProps, Selection } from './arena-table';
import { CollectibleCard } from './collectible-card';

const FX_COLORS: Record<string, string> = {
  ...CORE_COLORS,
  corrode: '#44ab74',
  repair: CORE_COLORS.shield,
  charge: '#b6adff',
  trigger: '#b6adff',
  haste: '#b6adff',
  slow: '#ba8ef2',
  freeze: '#89edff',
  ammo: '#ffdbad',
};

function FlatEffects({
  p,
  anchors,
  renderNumber,
  viewport,
}: {
  p: ArenaTableProps;
  anchors: FlatAnchors;
  renderNumber?: (number: CombatNumber) => ReactNode;
  viewport: { left: number; right: number };
}) {
  const root = useRef<HTMLDivElement>(null);
  const numbers = useMemo(
    () => combatNumbers(p.duel, p.frames),
    [p.duel, p.frames],
  );
  const visible = numbers.filter((n) => {
    const at = flatSurfacePoint(anchors, n.side, n.lane, n.column, n.surface);
    return (
      at &&
      at.x >= viewport.left &&
      at.x <= viewport.right &&
      n.time <= p.frame.time &&
      p.frame.time - n.time < NUMBER_LIFETIME
    );
  });
  const projectiles = p.frame.projectiles;
  const contacts = p.frames
    .filter((f) => f.time <= p.frame.time && p.frame.time - f.time < 0.4)
    .flatMap((f) => [
      ...f.hits
        .filter((h) => h.sourceUid && h.targetUid && h.value > 0)
        .map((h, i) => ({
          ...h,
          kind: h.kind,
          sourceUid: h.sourceUid,
          targetUid: h.targetUid,
          time: f.time,
          id: `${f.time}-hit-${i}`,
        })),
      ...(f.links ?? []).map((link, i) => ({
        kind: 'trigger',
        side: 0,
        value: 0,
        source: '',
        sourceUid: link.from,
        targetUid: link.to,
        time: f.time,
        id: `${f.time}-link-${i}`,
      })),
    ]);
  useEffect(() => {
    let handle = 0;
    const nodes = root.current?.querySelectorAll<HTMLElement>('[data-number]');
    const shots =
      root.current?.querySelectorAll<HTMLElement>('[data-projectile]');
    const beams = root.current?.querySelectorAll<HTMLElement>('[data-contact]');
    function draw() {
      nodes?.forEach((node, i) => {
        const pose = numberPose(visible[i], p.clock.current, p.reduced);
        node.style.opacity = String(pose.opacity);
        node.style.transform = `translate(calc(-50% + ${pose.x}px), ${pose.y}px) scale(${pose.scale})`;
      });
      shots?.forEach((node, i) => {
        const shot = projectiles[i];
        const path = flatEffectPath(shot, p.duel, p.frame, anchors);
        const progress =
          (p.clock.current - shot.launchedAt) /
          Math.max(0.01, shot.impactAt - shot.launchedAt);
        if (!path || progress < 0 || progress >= 1 || p.reduced) {
          node.style.opacity = '0';
          return;
        }
        node.style.opacity = '1';
        const point = flatPathPoint(path, progress);
        node.style.transform = `translate(${point.x}px, ${point.y}px)`;
        // Artwork follows the resolved trajectory; the travel/contact anchors stay unchanged.
        node.style.setProperty(
          '--shot-angle',
          `${Math.atan2(path.to.y - path.from.y, path.to.x - path.from.x) + Math.PI / 2}rad`,
        );
      });
      beams?.forEach((node, i) => {
        node.style.opacity = String(
          Math.max(0, 1 - (p.clock.current - contacts[i].time) / 0.4),
        );
      });
      handle = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(handle);
  }, [
    anchors,
    p.clock,
    p.reduced,
    p.frame.barriers,
    p.duel,
    p.frame,
    visible,
    projectiles,
    contacts,
  ]);
  return (
    <div
      className="flat-effects"
      ref={root}
      aria-hidden="true"
      style={{ position: 'fixed', overflow: 'visible' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 calc(100% - ${viewport.right}px) 0 ${viewport.left}px)`,
        }}
      >
        {contacts.map((h) => {
          const path =
            h.kind === 'trigger'
              ? {
                  from: anchors[h.sourceUid ?? ''],
                  to: anchors[h.targetUid ?? ''],
                }
              : flatEffectPath(
                  h as import('@/lib/cards/combat').Hit,
                  p.duel,
                  p.frame,
                  anchors,
                );
          const from = path?.from,
            to = path?.to;
          const length =
            from && to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
          return (
            <i
              key={h.id}
              data-contact
              data-kind={h.kind}
              className="flat-contact"
              style={{
                left: from?.x ?? 0,
                top: from?.y ?? 0,
                width: length,
                transform: `rotate(${from && to ? Math.atan2(to.y - from.y, to.x - from.x) : 0}rad)`,
                color: FX_COLORS[h.kind] ?? '#eee',
                opacity: 0,
              }}
            />
          );
        })}
        {projectiles.map((s) => (
          <i
            key={s.id}
            data-projectile
            data-kind={s.kind}
            className="flat-projectile"
            style={{ color: FX_COLORS[s.kind] ?? '#eee', opacity: 0 }}
          >
            <span className="flat-projectile-sprite" />
          </i>
        ))}
      </div>
      {visible.map((n) => {
        const anchor = flatSurfacePoint(
          anchors,
          n.side,
          n.lane,
          n.column,
          n.surface,
        );
        return (
          <b
            key={n.id}
            data-number
            className="flat-number"
            style={{
              left: anchor?.x ?? 0,
              top: anchor?.y ?? 0,
              color: FX_COLORS[n.kind],
              opacity: 0,
            }}
          >
            {renderNumber ? (
              renderNumber(n)
            ) : (
              <>
                {n.kind === 'heal' || n.kind === 'repair' ? '+' : '−'}
                {rounded(n.value)}
              </>
            )}
          </b>
        );
      })}
    </div>
  );
}

export function FlatTable(
  p: ArenaTableProps & {
    renderCard?: (card: FighterCard, side: number) => ReactNode;
    cardName?: (id: string) => string;
    describe?: (text: string) => string;
    renderBarrier?: (side: number, lane: number) => ReactNode;
    renderHost?: (side: number) => ReactNode;
    renderNumber?: (number: CombatNumber) => ReactNode;
    renderIcon?: (
      kind:
        | 'shield'
        | 'broken-shield'
        | 'burn'
        | 'corrode'
        | 'amplifier'
        | 'plus',
    ) => ReactNode;
  },
) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<FlatAnchors>({});
  const [viewport, setViewport] = useState({ left: 0, right: 0 });
  const [over, setOver] = useState<number | null>(null),
    [hover, setHover] = useState<FighterCard | null>(null);
  const all = [...p.duel.player, ...p.duel.enemy];
  const focus = hover ?? all.find((c) => c.uid === p.inspected?.uid);
  const focusSide =
    focus && p.duel.enemy.some((c) => c.uid === focus.uid) ? 1 : 0;
  const relation = focus
    ? formationRelations(focus, focusSide ? p.duel.enemy : p.duel.player)
    : null;
  const preview =
    p.editing && p.selected && over !== null
      ? placementPreview(p.duel.player, p.selected.id, over, p.selected.uid)
      : null;
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const next: FlatAnchors = {};
      el.querySelectorAll<HTMLElement>('[data-anchor]').forEach((node) => {
        const rect = node.getBoundingClientRect();
        next[node.dataset.anchor!] = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      });
      setAnchors(next);
      const scroller = el.parentElement!.getBoundingClientRect();
      setViewport({ left: scroller.left, right: scroller.right });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(stage.current!);
    window.addEventListener('scroll', measure, true);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measure, true);
    };
  }, [p.duel]);
  function drop(e: DragEvent, at: number) {
    e.preventDefault();
    setOver(null);
    if (!p.editing) return;
    try {
      const raw: unknown = JSON.parse(
        e.dataTransfer.getData('application/f9-card'),
      );
      if (
        raw &&
        typeof raw === 'object' &&
        'id' in raw &&
        typeof raw.id === 'string' &&
        arenaCard(raw.id)
      ) {
        const selection: Selection = { id: raw.id };
        if ('uid' in raw && typeof raw.uid === 'string')
          selection.uid = raw.uid;
        p.onPlace(at, selection);
      }
    } catch {
      /* Non-card drops cannot alter a formation. */
    }
  }
  function cardSlot(
    e: { clientX: number; currentTarget: HTMLElement },
    c: FighterCard,
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      c.at +
      Math.max(
        0,
        Math.min(
          cardDef(c.id).size - 1,
          Math.floor(
            ((e.clientX - rect.left) / rect.width) * cardDef(c.id).size,
          ),
        ),
      )
    );
  }
  function barrier(side: number, lane: number) {
    const b = p.frame.barriers[side][lane],
      amp = p.duel.arena?.amplifiers[side][lane],
      info = amplifier(amp);
    return (
      <div className={`flat-barrier ${b.broken ? 'broken' : ''}`} key={lane}>
        {p.renderBarrier && (
          <div
            className="flat-barrier-art"
            data-anchor={`barrier-${side}-${lane}`}
          >
            {p.renderBarrier(side, lane)}
          </div>
        )}
        <div
          className="flat-barrier-top"
          data-anchor={p.renderBarrier ? undefined : `barrier-${side}-${lane}`}
        >
          <span>
            {p.renderIcon ? (
              p.renderIcon(b.broken ? 'broken-shield' : 'shield')
            ) : b.broken ? (
              <ShieldOff size={13} />
            ) : (
              <Shield size={13} />
            )}
            <b>{rounded(b.hp)}</b>
            <small>/{b.maxHp}</small>
          </span>
          <span className="flat-status">
            {!!p.frame.burn[side][lane] && (
              <span title="灼烧层数">
                {p.renderIcon ? p.renderIcon('burn') : <Flame size={12} />}
                {p.frame.burn[side][lane]}
              </span>
            )}
            {!!p.frame.corrosion[side][lane] && (
              <span title="侵蚀层数">
                {p.renderIcon ? (
                  p.renderIcon('corrode')
                ) : (
                  <Droplets size={12} />
                )}
                {p.frame.corrosion[side][lane]}
              </span>
            )}
            {b.broken && <small>已破屏</small>}
          </span>
        </div>
        <div className="flat-barrier-track">
          <i style={{ width: `${(100 * b.hp) / b.maxHp}%` }} />
        </div>
        <button
          className={`flat-amp ${amp && !p.frame.amplifierActive[side][lane] ? 'disabled' : ''}`}
          data-anchor={`amp-${side}-${lane}`}
          aria-label={`${side ? '敌方' : '我方'}${LANE_NAMES[lane]}增幅器：${info?.name ?? '未装备'}`}
          title={
            info
              ? `${info.text} · ${amplifierStatus(p.duel, p.frame, side, lane)}`
              : '装备本路增幅器'
          }
          onClick={() => p.onAmp(side, lane)}
        >
          {p.renderIcon ? (
            p.renderIcon(amp ? 'amplifier' : 'plus')
          ) : amp ? (
            <Gem size={11} />
          ) : (
            <Plus size={11} />
          )}
          <span>{info?.name ?? '添加增幅器'}</span>
          {amp && !p.frame.amplifierActive[side][lane] && <small>失效</small>}
        </button>
      </div>
    );
  }
  function board(side: number) {
    const cards = side ? p.duel.enemy : p.duel.player;
    return (
      <div className={`flat-board ${side ? 'enemy' : 'own'}`}>
        {[0, 1, 2].map((lane) => (
          <div
            className="flat-lane"
            key={lane}
            aria-label={`${side ? '敌方' : '我方'}${LANE_NAMES[lane]}`}
          >
            {[0, 1, 2].map((col) => {
              const at = lane * 3 + col,
                occupied = cards.some(
                  (c) => c.at <= at && c.at + cardDef(c.id).size > at,
                );
              const marked =
                side === 0 &&
                over !== null &&
                p.selected &&
                at >= over &&
                at < over + cardDef(p.selected.id).size;
              return (
                <button
                  key={`slot-${at}`}
                  data-anchor={`slot-${side}-${at}`}
                  className={`flat-slot ${occupied ? 'occupied' : ''} ${marked ? (preview?.allowed ? 'allowed' : 'blocked') : ''}`}
                  style={{ gridColumn: col + 1, gridRow: 1 }}
                  disabled={side === 1 || !p.editing || occupied}
                  aria-label={`${side ? '敌方' : '我方'}${LANE_NAMES[lane]}第${col + 1}格`}
                  onMouseEnter={() => setOver(at)}
                  onMouseLeave={() => setOver(null)}
                  onFocus={() => setOver(at)}
                  onBlur={() => setOver(null)}
                  onDragOver={(e) => {
                    if (side === 0 && p.editing) {
                      e.preventDefault();
                      setOver(at);
                    }
                  }}
                  onDragEnter={(e) => {
                    if (side === 0 && p.editing) {
                      e.preventDefault();
                      setOver(at);
                    }
                  }}
                  onDrop={(e) => drop(e, at)}
                  onClick={() => p.selected && p.onPlace(at)}
                >
                  <span>＋</span>
                  <small>{String(at + 1).padStart(2, '0')}</small>
                </button>
              );
            })}
            {cards
              .filter((c) => Math.floor(c.at / 3) === lane)
              .map((c) => {
                const def = cardDef(c.id),
                  state = cardStatus(c, p.frame);
                const active = !p.editing && p.frame.fired.includes(c.uid);
                return (
                  <button
                    key={c.uid}
                    data-anchor={c.uid}
                    className={`flat-card-button ${p.selected?.uid === c.uid ? 'selected' : ''} ${p.inspected?.uid === c.uid ? 'inspected' : ''} ${relation?.targets.includes(c.uid) ? 'related' : ''}`}
                    style={
                      {
                        gridColumn: `${(c.at % 3) + 1} / span ${def.size}`,
                        gridRow: 1,
                      } as CSSProperties
                    }
                    draggable={side === 0 && p.editing}
                    aria-label={`${side ? '敌方' : '我方'}${p.cardName?.(c.id) ?? def.name}，${def.size}格，查看卡牌`}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => {
                      setHover(null);
                      setOver(null);
                    }}
                    onDragStart={(e) => {
                      const selection = { id: c.id, uid: c.uid };
                      p.onSelect(selection);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData(
                        'application/f9-card',
                        JSON.stringify(selection),
                      );
                    }}
                    onDragOver={(e) => {
                      if (side === 0 && p.editing) {
                        e.preventDefault();
                        setOver(cardSlot(e, c));
                      }
                    }}
                    onDragEnter={(e) => {
                      if (side === 0 && p.editing) {
                        e.preventDefault();
                        setOver(cardSlot(e, c));
                      }
                    }}
                    onDrop={(e) => {
                      if (side === 0) drop(e, cardSlot(e, c));
                    }}
                    onClick={(e) => {
                      if (side === 0 && p.editing && p.selected)
                        p.onPlace(cardSlot(e, c));
                      else
                        p.onInspect({
                          kind: 'card',
                          id: c.id,
                          uid: c.uid,
                          side,
                          at: c.at,
                        });
                    }}
                  >
                    {p.renderCard ? (
                      p.renderCard(c, side)
                    ) : (
                      <CollectibleCard
                        card={c}
                        frame={p.frame}
                        side={side}
                        duel={p.duel}
                        active={active}
                        reduced={p.reduced}
                      />
                    )}
                    {p.detailed && state.length > 0 && (
                      <span className="flat-card-state">
                        {state.join(' · ')}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    );
  }
  function host(side: number) {
    return (
      <div className={`flat-host-surface flat-host-side-${side}`}>
        {p.renderHost?.(side)}
        <div className="flat-host-anchors" aria-hidden="true">
          {[0, 1, 2].map((lane) => (
            <i key={lane} data-anchor={`host-${side}-lane-${lane}`} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flat-table-stage"
      ref={stage}
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      <div className="flat-table-scroll">
        <div className="flat-table" ref={root}>
          {host(1)}
          <div className="flat-barriers">
            {[0, 1, 2].map((l) => barrier(1, l))}
          </div>
          {board(1)}
          <div className="flat-midline">
            {LANE_NAMES.map((name, l) => (
              <span key={name}>
                <i />
                {name}
                <small>0{l + 1}</small>
                <i />
              </span>
            ))}
            <output
              className={`flat-placement ${preview && !preview.allowed ? 'invalid' : ''}`}
            >
              {preview
                ? preview.reason
                : (relation?.note &&
                    (p.describe?.(relation.note) ?? relation.note)) ||
                  (p.editing
                    ? '布置卡牌 · 三路自动交锋'
                    : `AUTO BATTLE · ${p.frame.time.toFixed(1)}s`)}
            </output>
          </div>
          {board(0)}
          <div className="flat-barriers">
            {[0, 1, 2].map((l) => barrier(0, l))}
          </div>
          {host(0)}
          <span className="flat-screen-corner tl" />
          <span className="flat-screen-corner tr" />
          <span className="flat-screen-corner bl" />
          <span className="flat-screen-corner br" />
        </div>
      </div>
      {!p.editing && (
        <FlatEffects
          p={p}
          anchors={anchors}
          viewport={viewport}
          renderNumber={p.renderNumber}
        />
      )}
    </div>
  );
}
