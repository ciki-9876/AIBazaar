import { Clock3 } from 'lucide-react';
import { describeCard } from '@/lib/card-description';
import type { FighterCard } from '@/lib/demo-combat';
import { RARITY, QUALITY } from '@/lib/demo-engine';
import { cardDef, SCHOOLS } from '@/lib/demo-cards';
import { heroDef, heroOwner } from '@/lib/heroes';
export default function CardDetail({
  card,
  heroContext = false,
}: {
  card: FighterCard;
  heroContext?: boolean;
}) {
  const d = describeCard(card);
  const school = cardDef(card.id).school;
  const hero = heroContext ? heroOwner(card.id) : cardDef(card.id).hero;
  return (
    <div className="ed-card-description">
      <span className="ed-detail-cooldown">
        <Clock3 size={15} />
        {d.cd} 秒
      </span>
      <span className="ed-role">定位 · {d.role}</span>
      {school && <span className="ed-role">流派 · {SCHOOLS[school]}</span>}
      {hero && (
        <span className="ed-role">{heroDef(hero).name} · 专属记忆遗物</span>
      )}
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
