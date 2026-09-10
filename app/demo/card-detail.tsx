import { Clock3, Shirt } from 'lucide-react';
import { describeCard } from '@/lib/card-description';
import { armorOf, cardMaxHp, reviveTimeOf } from '@/lib/demo-combat';
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
        {RARITY[card.rarity].name} · {QUALITY[card.quality]} · Lv.{card.level}
      </p>
      <div className="ed-detail-values">
        <span>生命 {cardMaxHp(card)}</span>
        <span>
          首次复活 {reviveTimeOf(card)} 秒；每多死亡一次增加 25% 基础时间
        </span>
        {d.effects.map((e, i) => (
          <span key={i}>{e.text}</span>
        ))}
        <span
          title={`${((armorOf(card) / (100 + armorOf(card))) * 100).toFixed(1)}% 伤害减免`}
        >
          <Shirt size={13} />
          护甲 {armorOf(card)}
        </span>
      </div>
      <section>
        <h4>固有效果</h4>
        {d.innate.length ? (
          d.innate.map((line, i) => <p key={i}>{line}</p>)
        ) : (
          <p>无额外固有效果</p>
        )}
      </section>
      <section>
        <h4>天气</h4>
        {d.weather.length ? (
          d.weather.map((w) => (
            <p key={w.name}>
              {w.name}：{w.text}
            </p>
          ))
        ) : (
          <p>无专属天气效果</p>
        )}
      </section>
    </div>
  );
}
