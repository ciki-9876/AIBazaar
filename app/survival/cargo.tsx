'use client';
import {
  itemName,
  itemCount,
  BRAIN_DESCRIPTION,
  BRAIN_QUALITY,
} from '@/lib/survival-stacks';
import { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  ShieldCheck,
  RotateCw,
  PackageOpen,
  LayoutGrid,
} from 'lucide-react';
import {
  BAG_COLS,
  BAG_ROWS,
  cargoLayout,
  cargoFits,
  footprint,
  putInBag,
  warehouseRows,
} from '@/lib/survival-cargo';
import {
  capacity,
  firstFit,
  isEquipment,
  SAFE_SIZE,
  type Item,
  type SurvivalAction,
  type SurvivalState,
} from '@/lib/survival-room';
import {
  ITEM_PROPERTIES,
  hasTrait,
  TRAIT_LABELS,
  itemUseDescription,
} from '@/lib/survival-item-traits';
import { GearIcon, gearDescription } from './equipment';
import DestroyItem from './destroy-item';
import { firstTransferTarget } from '@/lib/survival-transfer';

const describe = (item: Item) =>
  gearDescription[item.kind] ||
  (
    {
      water: '主动饮用，恢复 45 饮水。',
      bread: '饱食 +45',
      food: '饱食不高于 35 时自动消耗，恢复 45。',
      medicine: '精神力不高于 45 时自动消耗，恢复 45。',
      scrap: '机械备件，撤离后计入携行价值。',
      core: '驻守者的净水机芯，撤离后计入携行价值。',
    } as Record<string, string>
  )[item.kind];
const brief: Partial<Record<Item['kind'], string>> = {
  golden: '只能带回一张 · 自动兑换本点资格',
  bread: '饱食 +45',
  water: '主动饮用 · 饮水 +45',
  food: '饱食 ≤35 自动使用 · +45',
  medicine: '精神力 ≤45 自动使用 · +45',
  'lift-material': '用于升级电梯',
  'energy-core': '投喂后接通照明',
  scrap: '机械备件',
  core: '净水机芯',
  capacitor: '相邻武器伤害 +25%',
  coolant: '相邻武器频率 +20%',
};
export default function CargoGrid({
  state,
  act,
  delivery,
  minimal = false,
  focusBread = false,
  zone = 'bag',
  allowStorage = false,
}: {
  state: SurvivalState;
  act: (action: SurvivalAction) => void;
  minimal?: boolean;
  focusBread?: boolean;
  zone?: 'bag' | 'warehouse';
  allowStorage?: boolean;
  delivery?: {
    drag: (item: Item | null, point: { x: number; y: number }) => void;
    drop: (item: Item, point: { x: number; y: number }) => boolean;
    select: (item: Item) => void;
  };
}) {
  const [selected, setSelected] = useState<string | null>(() =>
      focusBread
        ? state.bag.find((i) => i.kind === 'bread')?.uid || null
        : null,
    ),
    [rotated, setRotated] = useState(false),
    [dragging, setDragging] = useState(false),
    [hover, setHover] = useState<number | null>(null);
  const pointer = useRef<{
    x: number;
    y: number;
    active: boolean;
    slot: number | null;
    target: HTMLButtonElement;
    id: number;
  } | null>(null);
  useEffect(() => {
    const cancel = () => {
      const drag = pointer.current;
      pointer.current = null;
      if (drag?.target.hasPointerCapture(drag.id))
        drag.target.releasePointerCapture(drag.id);
      delivery?.drag(null, { x: 0, y: 0 });
      setDragging(false);
      setHover(null);
    };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, [delivery]);
  const suppressClick = useRef(false);
  const storage = zone === 'warehouse',
    rows = storage ? warehouseRows(state.liftLevel) : BAG_ROWS;
  const items = storage ? state.warehouse || [] : state.bag;
  const layout = cargoLayout(items, rows),
    placement = layout.find((p) => p.item.uid === selected),
    safeItem = !storage && state.safe.find((i) => i.uid === selected),
    chosen = placement?.item || safeItem;
  const select = (item: Item, rotation = false) => {
    setSelected((current) => (current === item.uid ? null : item.uid));
    delivery?.select(item);
    setRotated(rotation);
  };
  const allowed = (slot: number) =>
    !!placement &&
    cargoFits(
      layout,
      placement.item.size,
      slot,
      rotated,
      placement.item.uid,
      rows,
    );
  const place = (slot: number) => {
    if (placement && allowed(slot))
      act(
        storage
          ? { type: 'transfer', uid: placement.item.uid, zone, slot, rotated }
          : { type: 'cargo-move', uid: placement.item.uid, slot, rotated },
      );
    setDragging(false);
    setHover(null);
  };
  const ghost =
    placement && hover !== null
      ? footprint(placement.item.size, rotated)
      : null;
  return (
    <section
      className={`cargo-management ${delivery ? 'delivery' : ''} ${minimal ? 'cargo-minimal' : ''} ${storage ? 'warehouse-grid-panel' : ''}`}
      aria-label={storage ? '仓库格子管理' : '背包格子管理'}
    >
      <div className="cargo-grid-header">
        <span>
          <Backpack size={17} />
          {storage ? '仓库' : delivery || minimal ? '背包' : '普通背包'}{' '}
          <b>
            {capacity(items)} / {BAG_COLS * rows}
          </b>
        </span>
        <button
          onClick={() => {
            act({ type: storage ? 'warehouse-pack' : 'cargo-pack' });
            setSelected(null);
          }}
          disabled={!items.length}
        >
          <LayoutGrid size={13} />
          整理
        </button>
      </div>
      {!delivery && !minimal && (
        <p className="cargo-hint">
          拖动物品，或选中后点击空格放置。可旋转；装备在这里不生效。
        </p>
      )}
      <div className="cargo-grid-body">
        <div className="cargo-grid-viewport">
          <div
            className={`cargo-grid ${dragging ? 'dragging' : ''}`}
            aria-label={`4 列 ${rows} 行${storage ? '仓库' : '背包'}`}
            data-drop-zone={zone}
            style={{ gridTemplateRows: `repeat(${rows}, var(--cargo-cell))` }}
          >
            {Array.from({ length: BAG_COLS * rows }, (_, slot) => (
              <button
                key={slot}
                className={`cargo-cell ${selected && allowed(slot) ? 'available' : ''} ${dragging && hover === slot ? 'drop-target' : ''}`}
                data-drop-slot={slot}
                style={{
                  gridColumn: (slot % BAG_COLS) + 1,
                  gridRow: Math.floor(slot / BAG_COLS) + 1,
                }}
                aria-label={`${storage ? '仓库' : '背包'}第 ${slot + 1} 格`}
                onClick={() => place(slot)}
              >
                {!delivery && !minimal && (
                  <span>{String(slot + 1).padStart(2, '0')}</span>
                )}
              </button>
            ))}
            {layout.map((p) => {
              const shape = footprint(p.item.size, p.rotated);
              return (
                <button
                  key={p.item.uid}
                  data-drag-uid={p.item.uid}
                  data-item-uid={p.item.uid}
                  data-rotated={p.rotated}
                  className={`cargo-piece ${p.item.kind} ${selected === p.item.uid ? 'selected' : ''}`}
                  style={{
                    gridColumn: `${(p.slot % BAG_COLS) + 1} / span ${shape.w}`,
                    gridRow: `${Math.floor(p.slot / BAG_COLS) + 1} / span ${shape.h}`,
                  }}
                  aria-label={`${storage ? '仓库' : '背包'}中的${itemName(p.item)}，${p.item.size} 格，第 ${p.slot + 1} 格，${p.rotated ? '纵向' : '横向'}`}
                  onClick={(e) => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      if (e.detail > 0) return;
                    }
                    if (selected === p.item.uid && rotated !== p.rotated)
                      place(p.slot);
                    else select(p.item, p.rotated);
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    suppressClick.current = false;
                    pointer.current = {
                      x: e.clientX,
                      y: e.clientY,
                      active: false,
                      slot: null,
                      target: e.currentTarget,
                      id: e.pointerId,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const drag = pointer.current;
                    if (!drag) return;
                    if (
                      !drag.active &&
                      Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5
                    )
                      return;
                    if (!drag.active) {
                      setSelected(p.item.uid);
                      setRotated(p.rotated);
                      delivery?.select(p.item);
                      setDragging(true);
                      drag.active = true;
                    }
                    delivery?.drag(p.item, { x: e.clientX, y: e.clientY });
                    const cells = Array.from(
                      e.currentTarget.parentElement!.querySelectorAll(
                        '.cargo-cell',
                      ),
                    );
                    const index = cells.findIndex((cell) => {
                      const r = cell.getBoundingClientRect();
                      return (
                        e.clientX >= r.left &&
                        e.clientX < r.right &&
                        e.clientY >= r.top &&
                        e.clientY < r.bottom
                      );
                    });
                    drag.slot = index < 0 ? null : index;
                    setHover(drag.slot);
                  }}
                  onPointerUp={(e) => {
                    const drag = pointer.current;
                    if (drag?.active) {
                      suppressClick.current = true;
                      const safeRect = e.currentTarget
                        .closest('.cargo-management')
                        ?.querySelector('.safe-pocket')
                        ?.getBoundingClientRect();
                      const protectedDrop =
                        !delivery &&
                        safeRect &&
                        e.clientX >= safeRect.left &&
                        e.clientX <= safeRect.right &&
                        e.clientY >= safeRect.top &&
                        e.clientY <= safeRect.bottom;
                      if (protectedDrop)
                        act({ type: 'protect', uid: p.item.uid });
                      const delivered =
                        protectedDrop ||
                        delivery?.drop(p.item, {
                          x: e.clientX,
                          y: e.clientY,
                        });
                      if (
                        !delivered &&
                        drag.slot !== null &&
                        cargoFits(
                          layout,
                          p.item.size,
                          drag.slot,
                          p.rotated,
                          p.item.uid,
                          rows,
                        )
                      )
                        act({
                          type: 'transfer',
                          zone,
                          uid: p.item.uid,
                          slot: drag.slot,
                          rotated: p.rotated,
                        });
                    }
                    delivery?.drag(null, { x: 0, y: 0 });
                    pointer.current = null;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setDragging(false);
                    setHover(null);
                  }}
                  onPointerCancel={() => {
                    delivery?.drag(null, { x: 0, y: 0 });
                    pointer.current = null;
                    setDragging(false);
                    setHover(null);
                  }}
                >
                  <GearIcon kind={p.item.kind} size={30} />
                  {state.rescueReserved?.includes(p.item.uid) && (
                    <em className="stack-count">锁</em>
                  )}
                  {p.item.kind === 'lift-material' && (
                    <em className="stack-count">{itemCount(p.item)}</em>
                  )}
                  <strong>
                    {delivery && p.item.kind === 'energy-core'
                      ? '核心'
                      : itemName(p.item)}
                  </strong>
                  {!delivery && !minimal && (
                    <small>
                      {p.item.size} 格 · 价值 {p.item.value}
                    </small>
                  )}
                </button>
              );
            })}
            {ghost &&
              placement &&
              hover !== null &&
              (hover % BAG_COLS) + ghost.w <= BAG_COLS &&
              Math.floor(hover / BAG_COLS) + ghost.h <= rows && (
                <span
                  className={`cargo-ghost ${allowed(hover) ? 'valid' : 'invalid'}`}
                  style={{
                    gridColumn: `${(hover % BAG_COLS) + 1} / span ${ghost.w}`,
                    gridRow: `${Math.floor(hover / BAG_COLS) + 1} / span ${ghost.h}`,
                  }}
                />
              )}
          </div>
        </div>
        {!delivery && !storage && (
          <div className="safe-pocket" data-drop-zone="safe">
            <span>
              <ShieldCheck size={15} />
              安全容器 <b>{capacity(state.safe)} / 1</b>
            </span>
            {state.safe.length ? (
              state.safe.map((i) => (
                <button
                  key={i.uid}
                  data-drag-uid={i.uid}
                  data-item-uid={i.uid}
                  className={`cargo-safe-piece ${selected === i.uid ? 'selected' : ''}`}
                  data-drop-slot={0}
                  onClick={() => select(i)}
                  aria-label={`安全容器中的${itemName(i)}`}
                >
                  <GearIcon kind={i.kind} size={26} />
                  <strong>{itemName(i)}</strong>
                  {i.kind === 'lift-material' && (
                    <em className="stack-count">{itemCount(i)}</em>
                  )}
                  {!minimal && (
                    <small>{state.seasonRules ? '救援保留' : '失败保留'}</small>
                  )}
                </button>
              ))
            ) : (
              <div className="cargo-safe-empty" data-drop-slot={0}>
                <ShieldCheck size={22} />
                {!minimal && <small>可保护一格物品</small>}
              </div>
            )}
            {!minimal && <p>此处物品暂停生效</p>}
          </div>
        )}
      </div>
      {!delivery && (!minimal || chosen) && (
        <div className="cargo-inspector">
          {chosen ? (
            <>
              <div>
                <strong>{itemName(chosen)}</strong>
                <div className="item-traits">
                  {ITEM_PROPERTIES[chosen.kind].traits.map((t) => (
                    <span key={t}>{TRAIT_LABELS[t]}</span>
                  ))}
                </div>
                <p>
                  {safeItem
                    ? minimal
                      ? `${state.seasonRules ? '救援保留' : '失败保留'} · 暂停生效`
                      : '安全保管中。取出后放回普通背包。'
                    : chosen.kind === 'lift-material'
                      ? `${BRAIN_DESCRIPTION} · 每份 ${BRAIN_QUALITY[chosen.quality || 'low'].xp} 经验`
                      : itemUseDescription(chosen.kind)
                        ? itemUseDescription(chosen.kind) +
                          (ITEM_PROPERTIES[chosen.kind].use?.automaticBelow !==
                          undefined
                            ? ` · ≤${ITEM_PROPERTIES[chosen.kind].use!.automaticBelow} 自动补给`
                            : '')
                        : minimal && brief[chosen.kind]
                          ? brief[chosen.kind]
                          : describe(chosen)}
                </p>
                {placement && !minimal && (
                  <small>
                    当前{placement.rotated ? '纵向' : '横向'}放置
                    {rotated !== placement.rotated
                      ? ` · 待放置：${rotated ? '纵向' : '横向'}`
                      : ''}
                    。{chosen.size > 1 ? '旋转后点击可容纳的起始格。' : ''}
                  </small>
                )}
              </div>
              <div className="cargo-buttons">
                {!storage && hasTrait(chosen.kind, 'usable') && placement && (
                  <button
                    className="eat-bread"
                    disabled={
                      state.player[ITEM_PROPERTIES[chosen.kind].use!.stat] >=
                      100
                    }
                    onClick={() => act({ type: 'consume', uid: chosen.uid })}
                  >
                    {chosen.kind === 'water'
                      ? '饮用'
                      : chosen.kind === 'medicine'
                        ? '使用'
                        : '吃掉'}
                  </button>
                )}

                {placement && (
                  <button
                    disabled={
                      chosen.size === 1 || (chosen.size > rows && !rotated)
                    }
                    onClick={() => setRotated(!rotated)}
                  >
                    <RotateCw size={14} />
                    旋转
                  </button>
                )}
                {!delivery && !storage && placement && isEquipment(chosen) && (
                  <button
                    disabled={firstFit(state.equipment, chosen.size) < 0}
                    onClick={() =>
                      act({
                        type: 'equip',
                        uid: chosen.uid,
                        slot: firstFit(state.equipment, chosen.size),
                      })
                    }
                  >
                    装备
                  </button>
                )}
                {!delivery && !storage && chosen.kind !== 'golden' && (
                  <button
                    disabled={
                      safeItem
                        ? !putInBag(state.bag, chosen)
                        : capacity(state.safe) + chosen.size > SAFE_SIZE
                    }
                    onClick={() =>
                      act({
                        type: safeItem ? 'unprotect' : 'protect',
                        uid: chosen.uid,
                      })
                    }
                  >
                    {safeItem ? '取回背包' : '保护'}
                  </button>
                )}
                {allowStorage && placement && chosen.kind !== 'golden' && (
                  <button
                    disabled={
                      state.rescueReserved?.includes(chosen.uid) ||
                      !firstTransferTarget(
                        state,
                        chosen,
                        storage ? 'bag' : 'warehouse',
                      )
                    }
                    onClick={() => {
                      const target = firstTransferTarget(
                        state,
                        chosen,
                        storage ? 'bag' : 'warehouse',
                      );
                      if (target) act(target);
                    }}
                  >
                    {storage ? '取回行囊' : '存入仓库'}
                  </button>
                )}
                {!delivery &&
                  chosen.kind !== 'golden' &&
                  !state.rescueReserved?.includes(chosen.uid) && (
                    <DestroyItem
                      key={chosen.uid}
                      item={chosen}
                      act={act}
                      disabled={
                        focusBread && chosen.uid === 'anbo-welcome-bread'
                      }
                    />
                  )}
                {!storage && placement && state.status === 'running' && (
                  <button
                    onClick={() =>
                      act({
                        type: state.seasonRules ? 'drop' : 'discard',
                        uid: chosen.uid,
                      })
                    }
                  >
                    {state.seasonRules ? '扔下 1 件' : '放下'}
                  </button>
                )}
                {!storage &&
                  placement &&
                  state.seasonRules &&
                  state.status === 'running' &&
                  itemCount(chosen) > 1 && (
                    <button
                      onClick={() =>
                        act({
                          type: 'drop',
                          uid: chosen.uid,
                          quantity: itemCount(chosen),
                        })
                      }
                    >
                      整叠扔下 ×{itemCount(chosen)}
                    </button>
                  )}
              </div>
            </>
          ) : (
            <p>
              <PackageOpen size={17} />
              {state.seasonRules
                ? '选择物品查看或扔下'
                : '选择一件物品查看用途或调整位置。'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
