'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Item, SurvivalAction } from '@/lib/survival-room';
import { itemCount, itemName } from '@/lib/survival-stacks';

export default function DestroyItem({
  item,
  act,
  disabled = false,
}: {
  item: Item;
  act: (a: SurvivalAction) => void;
  disabled?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <fieldset
      className="destroy-confirm"
      aria-label={`永久销毁${itemName(item)}`}
    >
      <small>永久删除{itemCount(item) > 1 ? ` ×${itemCount(item)}` : ''}</small>
      <button
        className="destroy-danger"
        onClick={() => {
          act({ type: 'destroy', uid: item.uid });
          setConfirm(false);
        }}
      >
        确认销毁
      </button>
      <button onClick={() => setConfirm(false)}>取消</button>
    </fieldset>
  ) : (
    <button
      disabled={disabled}
      title={disabled ? '当前引导需要这件物品' : '永久删除整件物品或整组堆叠'}
      onClick={() => setConfirm(true)}
    >
      <Trash2 size={14} /> 销毁
    </button>
  );
}
