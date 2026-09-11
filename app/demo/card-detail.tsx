import { Clock3 } from 'lucide-react';
import { describeCard } from '@/lib/card-description';
import type { FighterCard } from '@/lib/demo-combat';
import { RARITY, QUALITY } from '@/lib/demo-engine';
export default function CardDetail({ card }: { card: FighterCard }) {
  const d = describeCard(card);
  return (
    <div className="ed-card-description">
      <span className="ed-detail-cooldown">
        <Clock3 size={15} />
        {d.cd} 秒
      </span>
      <span className="ed-role">定位 · {d.role}</span>
      <p className="ed-detail-grade">
        {RARITY[card.rarity].name} · {QUALITY[card.quality]} · Lv {card.level}
      </p>
      <div className="ed-detail-values">
        {d.effects.map((e, i) => (
          <span key={i}>{e.text}</span>
        ))}
      </div>
      <section>
        <h4>固有效果</h4>
        {d.innate.length ? (
          d.innate.map((line, i) => <p key={i}>{line}</p>)
        ) : (
          <p>无额外固有效果</p>
        )}
      </section>
    </div>
  );
}
