'use client';
import { BAG_COLS, BAG_ROWS } from '@/lib/survival-cargo';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from 'react';
import { transferItem, type Transfer } from '@/lib/survival-transfer';
import type { SurvivalAction, SurvivalState } from '@/lib/survival-room';
import { GearIcon } from './equipment';
import { itemName } from '@/lib/survival-stacks';

export default function InventoryDrag({
  state,
  act,
  children,
}: {
  state: SurvivalState;
  act: (a: SurvivalAction) => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<{
    uid: string;
    x: number;
    y: number;
    active: boolean;
    rotated: boolean;
    pointer: number;
  } | null>(null);
  const [ghost, setGhost] = useState<{
    uid: string;
    x: number;
    y: number;
    valid: boolean;
  } | null>(null);
  const suppress = useRef(false);
  useEffect(() => {
    const reset = () => {
      const p = pending.current;
      if (p && root.current?.hasPointerCapture(p.pointer))
        root.current.releasePointerCapture(p.pointer);
      pending.current = null;
      suppress.current = false;
      setGhost(null);
    };
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, []);

  const targetAt = (x: number, y: number): Transfer | null => {
    const drag = pending.current;
    if (!drag) return null;
    for (const node of root.current!.querySelectorAll<HTMLElement>(
      '[data-drop-zone]',
    )) {
      const r = node.getBoundingClientRect();
      if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      const zone = node.dataset.dropZone as Transfer['zone'];
      const cols = zone === 'bag' ? BAG_COLS : zone === 'equipment' ? 10 : 1;
      const rows = zone === 'bag' ? BAG_ROWS : 1;
      return {
        type: 'transfer',
        uid: drag.uid,
        zone,
        slot:
          Math.floor(((y - r.top) / r.height) * rows) * cols +
          Math.floor(((x - r.left) / r.width) * cols),
        rotated: zone === 'bag' && drag.rotated,
      };
    }
    return null;
  };
  const item =
    ghost &&
    [...state.bag, ...state.safe, ...state.equipment.map((e) => e.item)].find(
      (i) => i.uid === ghost.uid,
    );
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-drag-uid]',
    );
    if (!el || e.button !== 0) return;
    // Own drag gestures across both grids. Clicks and keyboard controls stay available.
    e.preventDefault();
    e.stopPropagation();
    suppress.current = false;
    pending.current = {
      uid: el.dataset.dragUid!,
      rotated: el.dataset.rotated === 'true',
      x: e.clientX,
      y: e.clientY,
      active: false,
      pointer: e.pointerId,
    };
  };
  return (
    <div
      ref={root}
      className="inventory-drag-root"
      onPointerDownCapture={down}
      onPointerMoveCapture={(e) => {
        const p = pending.current;
        if (!p) return;
        e.stopPropagation();
        if (!p.active && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5)
          return;
        p.active = true;
        root.current!.setPointerCapture(e.pointerId);
        const target = targetAt(e.clientX, e.clientY);
        setGhost({
          uid: p.uid,
          x: e.clientX,
          y: e.clientY,
          valid: !!target && transferItem(state, target) !== state,
        });
      }}
      onPointerUpCapture={(e) => {
        const p = pending.current;
        if (!p) return;
        e.stopPropagation();
        if (p.active) {
          suppress.current = true;
          const target = targetAt(e.clientX, e.clientY);
          if (target) act(target);
        }
        if (root.current!.hasPointerCapture(e.pointerId))
          root.current!.releasePointerCapture(e.pointerId);
        pending.current = null;
        setGhost(null);
      }}
      onPointerCancelCapture={() => {
        pending.current = null;
        setGhost(null);
      }}
      onClickCapture={(e) => {
        if (suppress.current) {
          e.stopPropagation();
          e.preventDefault();
          suppress.current = false;
        }
      }}
    >
      {children}
      {ghost && item && (
        <div
          className={`inventory-drag-ghost ${ghost.valid ? 'valid' : 'invalid'}`}
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          <GearIcon kind={item.kind} />
          <span>{itemName(item)}</span>
          <small>{ghost.valid ? '放置 / 交换' : '无法放置'}</small>
        </div>
      )}
    </div>
  );
}
