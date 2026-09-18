import { Clock3 } from 'lucide-react';
import { describeCard } from '@/lib/card-description';
import type { FighterCard } from '@/lib/demo-combat';
import { RARITY, QUALITY } from '@/lib/demo-engine';
import { cardDef, SCHOOLS } from '@/lib/demo-cards';
import { heroDef, heroOwner } from '@/lib/heroes';
export default function CardDetail({ card }: { card: FighterCard }) {
  const d = describeCard(card);
  const school = cardDef(card.id).school;
  const hero = heroOwner(card.id);
  return (
    <div className="ed-card-description">
      <span className="ed-detail-cooldown">
        <Clock3 size={15} />
        {d.cd} 秒
      </span>
      <span className="ed-role">定位 · {d.role}</span>
      {school && <span className="ed-role">流派 · {SCHOOLS[school]}</span>}
      {hero && <span className="ed-role">归属 · {heroDef(hero).name}</span>}
      <p className="ed-detail-grade">
        {RARITY[card.rarity].name} · {QUALITY[card.quality]} · Lv {card.level}
      </p>
      <div className="ed-detail-values">
        {d.effects.map((e, i) => (
          <span key={i}>{e.text}</span>
        ))}
      </div>
      <section>
        <h4>当前基础效果</h4>
        {d.innate.length ? (
          d.innate.map((line, i) => <p key={i}>{line}</p>)
        ) : (
          <p>按上述周期发动，无额外条件。</p>
        )}
      </section>
      {d.unlocked.length > 0 && (
        <section>
          <h4>当前已解锁 · {QUALITY[card.quality]}</h4>
          {d.unlocked.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      )}
      {d.future.length > 0 && (
        <details className="ed-future-effects">
          <summary>未来品阶效果 · 当前未生效</summary>
          {d.future.map((tier) => (
            <section key={tier.quality}>
              <h4>{QUALITY[tier.quality]}后</h4>
              <p>{tier.effects.join(' · ')}</p>
              {tier.innate.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </section>
          ))}
        </details>
      )}
    </div>
  );
}
