'use client';
import type { ReactNode } from 'react';
import SharedInventoryDrag from '../../packages/ui/inventory-drag';
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
  return (
    <SharedInventoryDrag<Transfer>
      resolve={(root, source, x, y) => {
        for (const node of root.querySelectorAll<HTMLElement>(
          '[data-drop-slot]',
        )) {
          const bounds = node.getBoundingClientRect();
          if (
            x < bounds.left ||
            x >= bounds.right ||
            y < bounds.top ||
            y >= bounds.bottom
          )
            continue;
          const zone = node.closest<HTMLElement>('[data-drop-zone]')!.dataset
            .dropZone as Transfer['zone'];
          return {
            value: {
              type: 'transfer',
              uid: source.id,
              zone,
              slot: Number(node.dataset.dropSlot),
              rotated: zone === 'bag' && source.data.rotated === 'true',
            },
            bounds: {
              x: bounds.left,
              y: bounds.top,
              width: bounds.width,
              height: bounds.height,
            },
          };
        }
        return null;
      }}
      canDrop={(_, target) => transferItem(state, target) !== state}
      onDrop={(_, target) => act(target)}
      renderGhost={(source, valid) => {
        const item = [
          ...state.bag,
          ...state.safe,
          ...(state.warehouse || []),
          ...state.equipment.map((entry) => entry.item),
        ].find((entry) => entry.uid === source.id);
        return (
          item && (
            <>
              <GearIcon kind={item.kind} />
              <span>{itemName(item)}</span>
              <small>{valid ? '放置 / 交换' : '无法放置'}</small>
            </>
          )
        );
      }}
    >
      {children}
    </SharedInventoryDrag>
  );
}
