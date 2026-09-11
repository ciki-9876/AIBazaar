'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Layers, Package } from 'lucide-react';
import { dimensions, layout, cells } from '@/lib/cargo-layout';
import { itemName, offerPrice } from '@/lib/demo-engine';
import type { Item } from '@/lib/demo-engine';
type Drag = {
  item: Item;
  from: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  keyboard?: boolean;
};
type Context = {
  drag: Drag | null;
  hover: { zone: string; slot: number } | null;
  start: (item: Item, from: string, x: number, y: number) => void;
  inspect: (item: Item, from: string, target: HTMLElement) => void;
  select: (item: Item, from: string, target: HTMLElement) => void;
  dismiss: () => void;
  loot: (item: Item) => void;
  pickup: (item: Item, from: string) => void;
  drop: (zone: string, slot: number) => void;
};
const CargoContext = createContext<Context>(null!);
export function CargoProvider({
  children,
  onPlace,
  onInspect,
  onDismiss,
  onLoot,
  onSelect,
}: {
  children: ReactNode;
  onPlace: (item: Item, from: string, to: string, slot: number) => void;
  onInspect: (item: Item, from: string, target: HTMLElement) => void;
  onDismiss: () => void;
  onLoot: (item: Item) => void;
  onSelect: (item: Item, from: string, target: HTMLElement) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null),
    [hover, setHover] = useState<Context['hover']>(null);
  const current = useRef(drag),
    suppress = useRef(false);
  const update = (next: Drag | null) => {
    current.current = next;
    setDrag(next);
  };
  const drop = (zone: string, slot: number) => {
    const d = current.current;
    if (!d) return;
    onPlace(d.item, d.from, zone, slot);
    update(null);
    setHover(null);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = current.current;
      if (!d || d.keyboard) return;
      const moved =
        d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
      const next = { ...d, x: e.clientX, y: e.clientY, moved };
      current.current = next;
      setDrag(next);
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-cargo-zone][data-cargo-slot]');
      setHover(
        target
          ? {
              zone: target.dataset.cargoZone!,
              slot: Number(target.dataset.cargoSlot),
            }
          : null,
      );
    };
    const end = (e: PointerEvent) => {
      const d = current.current;
      if (!d || d.keyboard) return;
      if (d.moved) {
        suppress.current = true;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>('[data-cargo-zone][data-cargo-slot]');
        if (target)
          onPlace(
            d.item,
            d.from,
            target.dataset.cargoZone!,
            Number(target.dataset.cargoSlot),
          );
      }
      current.current = null;
      setDrag(null);
      setHover(null);
    };
    const key = (e: KeyboardEvent) => {
      const d = current.current;
      if (!d) return;
      if (e.key === 'Escape') {
        current.current = null;
        setDrag(null);
        setHover(null);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('keydown', key);
    const cancel = () => {
      current.current = null;
      setDrag(null);
      setHover(null);
    };
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [onPlace]);
  return (
    <CargoContext.Provider
      value={{
        drag,
        hover,
        start: (item, from, x, y) => {
          onDismiss();
          suppress.current = false;
          update({ item, from, x, y, startX: x, startY: y, moved: false });
        },
        select: (item, from, target) => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          onSelect(item, from, target);
        },
        dismiss: onDismiss,
        loot: (item) => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          onDismiss();
          onLoot(item);
        },
        inspect: (item, from, target) => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          if (!current.current) onInspect(item, from, target);
        },
        pickup: (item, from) =>
          update({
            item,
            from,
            x: 0,
            y: 0,
            startX: 0,
            startY: 0,
            moved: true,
            keyboard: true,
          }),
        drop,
      }}
    >
      {children}
      {drag?.moved && (
        <div
          className={'ed-cargo-drag ' + (drag.keyboard ? 'keyboard' : '')}
          style={
            drag.keyboard
              ? undefined
              : {
                  left: drag.x + 12,
                  top: drag.y + 12,
                  width:
                    dimensions(drag.item).w * 72 +
                    (dimensions(drag.item).w - 1) * 4,
                  height: 88,
                }
          }
        >
          <b>{itemName(drag.item)}</b>
          <small>{drag.item.volume} 格 · 横放 / Esc 取消</small>
        </div>
      )}
    </CargoContext.Provider>
  );
}
export default function CargoGrid({
  items,
  zone,
  columns,
  capacity,
}: {
  items: Item[];
  zone: string;
  columns: number;
  capacity: number;
}) {
  const ctx = useContext(CargoContext);
  const arranged = layout(items, columns, capacity),
    rows = Math.ceil(capacity / columns);
  const preview =
    ctx.drag && ctx.hover?.zone === zone
      ? cells(ctx.drag.item, ctx.hover.slot, columns, capacity)
      : null;
  const occupied = new Set(
    arranged
      .filter((x) => x.uid !== ctx.drag?.item.uid)
      .flatMap((x) => cells(x, x.slot!, columns, capacity) ?? []),
  );
  const valid = preview && preview.every((c) => !occupied.has(c));
  return (
    <div className="ed-spatial-container">
      <div
        className="ed-spatial-grid"
        style={
          { '--cargo-columns': columns, '--cargo-rows': rows } as CSSProperties
        }
      >
        {Array.from({ length: capacity }, (_, slot) => (
          <button
            key={slot}
            className={
              'ed-cargo-cell ' +
              (preview?.includes(slot) ? (valid ? 'valid' : 'invalid') : '')
            }
            data-cargo-zone={zone}
            data-cargo-slot={slot}
            style={{
              gridColumn: (slot % columns) + 1,
              gridRow: Math.floor(slot / columns) + 1,
            }}
            aria-label={`放置到第 ${slot + 1} 格`}
            onClick={() => ctx.drop(zone, slot)}
          />
        ))}
        {arranged.map((item) => {
          const d = dimensions(item);
          return (
            <button
              key={item.uid}
              className={
                'ed-spatial-item ' +
                (item.type === 'card' ? `rarity-${item.rarity} is-card` : '')
              }
              style={{
                gridColumn: `${(item.slot! % columns) + 1} / span ${d.w}`,
                gridRow: `${Math.floor(item.slot! / columns) + 1} / span ${d.h}`,
              }}
              data-cargo-zone={zone}
              data-cargo-slot={item.slot}
              onPointerDown={(e) => {
                if (e.button !== 0 || ctx.drag?.keyboard) return;
                ctx.start(item, zone, e.clientX, e.clientY);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onMouseEnter={(e) => ctx.inspect(item, zone, e.currentTarget)}
              onMouseLeave={ctx.dismiss}
              onFocus={(e) => ctx.inspect(item, zone, e.currentTarget)}
              onBlur={ctx.dismiss}
              onClick={(e) =>
                ctx.drag?.keyboard
                  ? ctx.drop(zone, item.slot!)
                  : zone === 'loot'
                    ? ctx.loot(item)
                    : ctx.select(item, zone, e.currentTarget)
              }
              aria-label={`${itemName(item)}，${item.volume} 格，悬停查看详情，拖动移动`}
            >
              {item.type === 'card' ? (
                <Layers className="ed-cargo-card-icon" size={14} />
              ) : (
                <Package size={17} />
              )}
              <strong>{itemName(item)}</strong>
              <small>
                {zone === 'shop'
                  ? `${offerPrice(item)} 金币`
                  : item.type === 'physical'
                    ? '未鉴定'
                    : item.type === 'resource' || item.amount > 1
                      ? `×${item.amount}`
                      : `${item.volume} 格`}
              </small>
            </button>
          );
        })}
      </div>
      <p className="ed-grid-help">悬停查看 · 拖动摆放 · 固定横向占格</p>
    </div>
  );
}
export function CarryButton({
  item,
  from,
  onCarry,
}: {
  item: Item;
  from: string;
  onCarry: () => void;
}) {
  const ctx = useContext(CargoContext);
  return (
    <button
      onClick={() => {
        ctx.pickup(item, from);
        onCarry();
      }}
    >
      拿起并选择格子
    </button>
  );
}
