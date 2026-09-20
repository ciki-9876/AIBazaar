import { Clock3 } from 'lucide-react';
import {
  describeCard,
  CARD_TERMS,
  type CardAbility,
} from '@/lib/card-description';
import type { FighterCard } from '@/lib/demo-combat';
import { RARITY, QUALITY } from '@/lib/demo-engine';
import { cardDef, SCHOOLS } from '@/lib/demo-cards';
import { heroDef, heroOwner } from '@/lib/heroes';

function Rule({ ability }: { ability: CardAbility }) {
  const names: string[] = ability.terms.map((id) => CARD_TERMS[id].name);
  const pieces = ability.text.split(/(伤害|修复|充能|侵蚀|治疗)/);
  return (
    <p className="ed-ability-line">
      <span className="ed-ability-timing">{ability.when}</span>
      {pieces.map((part, i) =>
        names.includes(part) ? (
          <strong key={i}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
export default function CardDetail({ card }: { card: FighterCard }) {
  const d = describeCard(card);
  const school = cardDef(card.id).school;
  const hero = heroOwner(card.id);
  return (
    <div className="ed-card-description">
      {['damage', 'corrode'].includes(cardDef(card.id).kind) && (
        <span className="ed-hit-type">
          {d.hitType === 'instant' ? '即时命中' : '弹道命中'}
        </span>
      )}
      <span className="ed-detail-cooldown">
        <Clock3 size={15} />
        {d.cd} 秒
      </span>
      <span className="ed-role">
        {school ? SCHOOLS[school] + ' · ' : ''}
        {d.role}
      </span>
      {hero && <span className="ed-role">归属 · {heroDef(hero).name}</span>}
      <p className="ed-detail-grade">
        {RARITY[card.rarity].name} · {QUALITY[card.quality]} · Lv {card.level}
      </p>
      <section className="ed-current-abilities" aria-label="当前能力">
        {d.abilities.map((ability, i) => (
          <Rule key={i} ability={ability} />
        ))}
      </section>
      <details className="ed-keyword-reference">
        <summary>关键词 · {d.keywords.map((k) => k.name).join(' / ')}</summary>
        <dl>
          {d.keywords.map((k) => (
            <div key={k.id}>
              <dt>{k.name}</dt>
              <dd>{k.text}</dd>
            </div>
          ))}
        </dl>
        {d.notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))}
      </details>
      {d.future.length > 0 && (
        <details className="ed-future-effects">
          <summary>升阶变化 · 尚未生效</summary>
          {d.future.map((tier) => (
            <section key={tier.quality}>
              <h4>{QUALITY[tier.quality]}</h4>
              {tier.abilities
                .filter((a, i) => a.text !== d.abilities[i]?.text)
                .map((ability, i) => (
                  <Rule key={i} ability={ability} />
                ))}
            </section>
          ))}
        </details>
      )}
    </div>
  );
}
