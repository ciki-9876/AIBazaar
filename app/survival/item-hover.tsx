'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item, SurvivalState } from '@/lib/survival-room';
import {
  itemName,
  itemCount,
  BRAIN_QUALITY,
  BRAIN_DESCRIPTION,
} from '@/lib/survival-stacks';
import {
  ITEM_PROPERTIES,
  TRAIT_LABELS,
  itemUseDescription,
} from '@/lib/survival-item-traits';
import { GearIcon, gearDescription } from './equipment';
export default function ItemHover({ state }: { state: SurvivalState }) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const [hover, setHover] = useState<{
    item: Item;
    x: number;
    y: number;
    host: Element;
  } | null>(null);
  useEffect(() => {
    const show = (e: PointerEvent) => {
      if (
        e.buttons ||
        document.querySelector('[data-inventory-drag-active="true"]')
      ) {
        setHover(null);
        return;
      }
      const node = (e.target as Element)?.closest<HTMLElement>(
        '[data-item-uid]',
      );
      if (!node) {
        setHover(null);
        return;
      }
      const s = latest.current;
      const item = [
        ...s.bag,
        ...s.safe,
        ...(s.warehouse || []),
        ...s.equipment.map((g) => g.item),
      ].find((i) => i.uid === node.dataset.itemUid);
      if (!item) return;
      const r = node.getBoundingClientRect();
      setHover({
        item,
        x: Math.max(8, Math.min(r.left, innerWidth - 318)),
        y:
          r.top > innerHeight / 2
            ? Math.max(8, r.top - 200)
            : Math.min(innerHeight - 208, r.bottom + 8),
        host:
          node.closest('dialog') || document.querySelector('.survival-page')!,
      });
    };
    const hide = () => setHover(null);
    document.addEventListener('pointerover', show);
    // Inventory owns the gesture and stops propagation. Hide before its capture handler.
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('pointercancel', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointerover', show);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('pointercancel', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);
  if (!hover || !hover.host.isConnected) return null;
  const { item } = hover;
  return createPortal(
    <aside
      className="item-hover"
      role="tooltip"
      style={{ left: hover.x, top: hover.y }}
    >
      <header>
        <GearIcon kind={item.kind} />
        <strong>
          {itemName(item)}
          {itemCount(item) > 1 ? ` ×${itemCount(item)}` : ''}
        </strong>
      </header>
      <div className="item-traits">
        {ITEM_PROPERTIES[item.kind].traits.map((t) => (
          <span key={t}>{TRAIT_LABELS[t]}</span>
        ))}
      </div>
      <p>
        {item.kind === 'lift-material'
          ? BRAIN_DESCRIPTION
          : gearDescription[item.kind] || itemUseDescription(item.kind)}
      </p>
      <small>
        {item.kind === 'lift-material'
          ? `每份 ${BRAIN_QUALITY[item.quality || 'low'].xp} 升级经验 · 堆叠上限 20`
          : `${item.size} 格`}
      </small>
    </aside>,
    hover.host,
  );
}
