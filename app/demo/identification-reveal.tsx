'use client';
import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { itemName, RARITY_LABELS, type Item } from '@/lib/demo-engine';
import CardDetail from './card-detail';
export const QUALITY_COLORS = [
  '#adb5b5',
  '#6ac58b',
  '#68aef9',
  '#ffac49',
  '#ec78eb',
];
export default function IdentificationReveal({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.focus()},[]);
  const [beat, setBeat] = useState(0),
    rarity = item.rarity ?? 0;
  const done = beat >= rarity + 3,
    tier = Math.min(rarity, Math.max(0, beat - 1));
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setBeat((n) => n + 1), 750);
    return () => clearTimeout(timer);
  }, [beat, done]);
  return (
    <dialog
      open
      ref={dialog}
      tabIndex={-1}
      onKeyDown={e=>{
        if(e.key!=='Tab')return;
        const controls=dialog.current?.querySelectorAll<HTMLElement>('button,summary');
        if(!controls?.length){e.preventDefault();return;}
        const first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){e.preventDefault();first.focus()}
      }}
      className={`identification-reveal ${done ? 'revealed' : ''}`}
      aria-modal="true"
      aria-label="鉴定揭晓"
      style={{ '--reveal-color': QUALITY_COLORS[tier] } as CSSProperties}
    >
      <div className="identify-orbit" aria-hidden="true" />
      <div className="identify-core">
        <Sparkles size={62} />
        <small>{done ? '鉴定完成' : '共鸣正在增强'}</small>
        <h1>{done ? itemName(item) : '未知之物'}</h1>
        <strong>{RARITY_LABELS[tier]}</strong>
      </div>
      {done && (
        <section>
          <CardDetail card={{ ...item, at: item.at ?? 0, rarity }} />
          <button className="ed-primary" onClick={onClose}>
            收下新卡
          </button>
        </section>
      )}
    </dialog>
  );
}
