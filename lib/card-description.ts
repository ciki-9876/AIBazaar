import { cardDef } from './demo-cards.ts';
import { combatValue } from './demo-card-rules.ts';
import type { FighterCard } from './demo-combat.ts';
export const CARD_ROLES: Record<string, string> = {};
export function describeCard(card: FighterCard, includeFuture = true) {
  const c = cardDef(card.id),
    q = card.quality,
    value = combatValue(c.id, card.level, q);
  const effects = [
    {
      kind: c.kind,
      value,
      text:
        (c.kind === 'damage'
          ? '伤害'
          : c.kind === 'charge'
            ? '充能'
            : c.kind === 'corrode'
              ? '侵蚀层数'
              : '屏障修复') +
        ' ' +
        value +
        (c.kind === 'charge' ? ' 秒' : ''),
    },
  ];
  const innate: string[] = [];
  const growth = 1 + card.level * 0.12,
    n = (v: number) => Math.round(v * growth * 10) / 10;
  const rules: Record<string, string> = {
    nailer: `前 2 次发动额外造成 ${n(16 + q * 4)} 伤害。`,
    fuse: `给同路起点最靠左的其他牌充能；无目标不生效；首次额外充能 ${2 + q * 0.5} 秒。`,
    gapblade: `命中时目标屏障已破，伤害 +${n(12 + q * 4)}。`,
    springbow: `前 3 次发动额外造成 ${n(16 + q * 4)} 伤害。`,
    recoil: `本路屏障承受直接伤害的 50% 储为反冲，上限 ${n(40 + q * 10)}；下次攻击消耗并附加。`,
    sealant: '修复本路屏障；本路已破则支援剩余比例最低的未损毁屏障。',
    rubber: `本路未损毁屏障受到直接伤害 −${n(8 + q)}；同路不叠加，不能减免侵蚀。主动修复本路；本路已破则支援剩余比例最低的未损毁屏障。`,
    counterweight: `发动时本路屏障剩余生命高于当前上限50%，伤害 +${n(20 + q * 5)}。`,
    acid: '每层侵蚀每秒削减 1 屏障上限并造成 1 伤害，最多 12 层；破路后持续伤害宿主。',
    culture: `每次发动比上次多 ${n(8 + q * 2)} 伤害。攻击侵蚀最深的一路，同层数优先上路；无侵蚀则攻击本路。`,
    catalyst: `给同路起点最靠左的其他牌充能；无目标不生效；敌方本路有侵蚀时，额外充能 ${Math.round((0.8 + q * 0.2) * 10) / 10} 秒。`,
    distiller:
      '叠加侵蚀，并治疗宿主。侵蚀每层每秒伤害 1、削减屏障上限 1，最多 12 层。',
  };
  innate.push(rules[c.id]);
  if (c.id === 'distiller')
    effects.push({
      kind: 'heal',
      value: n(5 + q * 3),
      text: `宿主治疗 ${n(5 + q * 3)}`,
    });
  const short: Record<string, string> = {
    nailer: '前2次追加伤害',
    springbow: '前3次追加伤害',
    fuse: '同路首发额外充能',
    gapblade: '命中已破路时追加伤害',
    recoil: '承伤蓄反冲；下次消耗',
    sealant: '修复本路；破路后支援',
    rubber: '本路直接伤害减免',
    counterweight: '本路屏障过半追加伤害',
    acid: '叠层侵蚀；削减上限',
    culture: '逐次成长；追踪侵蚀',
    catalyst: '敌本路有侵蚀则额外充能',
    distiller: '侵蚀并治疗宿主',
  };
  const future: { quality: number; effects: string[]; innate: string[] }[] =
    includeFuture
      ? [1, 2]
          .filter((tier) => tier > q)
          .map((quality) => {
            const next = describeCard({ ...card, quality }, false);
            return {
              quality,
              effects: next.effects.map((e) => e.text),
              innate: next.innate,
            };
          })
      : [];
  return {
    role: c.role ?? '',
    cd: c.cd,
    effects,
    innate,
    unlocked: [] as string[],
    future,
    summary: short[c.id],
    weather: [] as { name: string; text: string }[],
  };
}
