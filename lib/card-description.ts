import { cardDef } from './demo-cards.ts';
import { combatValue } from './demo-card-rules.ts';
import type { FighterCard } from './demo-combat.ts';
export const CARD_ROLES: Record<string, string> = {
  knife: '主输出',
  wire: '副输出 / 引擎',
  coil: '跨路输出',
  brick: '爆发输出',
  bottle: '治疗',
  box: '治疗 / 修复',
  shelter: '防御 / 引擎',
  battery: '防御 / 能量',
  bell: '跨路辅助',
  cell: '能量',
};
export function describeCard(card: FighterCard) {
  const c = cardDef(card.id),
    q = card.quality,
    value = combatValue(c.id, card.level, q);
  const effects = [
    {
      kind: c.kind,
      value,
      text: `${c.kind === 'damage' ? '伤害' : c.kind === 'heal' ? '宿主治疗' : c.kind === 'charge' ? '充能' : c.kind === 'corrode' ? '侵蚀层数' : '屏障修复'} ${value}${c.kind === 'charge' ? ' 秒' : ''}`,
    },
  ];
  if (c.energyGain)
    effects.push({
      kind: 'energy',
      value: c.energyGain + (c.id === 'cell' && q === 2 ? 1 : 0),
      text: `产生能量 ${c.energyGain + (c.id === 'cell' && q === 2 ? 1 : 0)}`,
    });
  if (c.energyCost)
    effects.push({
      kind: 'energy',
      value: -c.energyCost,
      text: `消耗能量 ${c.energyCost}`,
    });
  const innate: string[] = [],
    lock = q === 0 ? '精制解锁：' : '';
  if (c.kind === 'shield' && !c.school)
    innate.push(
      '修复本路屏障；本路已损毁时，改为修复其他路剩余比例最低的屏障。',
    );
  if (c.id === 'knife')
    innate.push(`${lock}每第 3 次攻击追加 ${q === 2 ? 12 : 6} 伤害。`);
  if (c.id === 'coil') {
    innate.push(
      '越线支援：攻击其他路屏障值最低的一路，已破路优先；相同则优先上路。',
    );
    if (q > 0) innate.push(`每第 3 次攻击追加 ${q === 2 ? 24 : 12} 伤害。`);
  }
  if (c.id === 'battery') innate.push('能量上限 +6。');
  if (c.id === 'wire')
    innate.push(
      `${lock}每第 3 次发动，给同路另一张卡牌充能 ${q === 2 ? 2 : 1} 秒。`,
    );
  if (c.id === 'bottle')
    innate.push(`${lock}每第 3 次发动，额外治疗 ${q === 2 ? 25 : 15}。`);
  if (c.id === 'brick')
    innate.push(`${lock}每第 3 次攻击追加 ${q === 2 ? 30 : 18} 伤害。`);
  if (c.id === 'box')
    innate.push(
      `${lock}溢出治疗转为最多 ${q === 2 ? 20 : 12} 屏障修复，优先本路，无法重建。`,
    );
  if (c.id === 'shelter')
    innate.push(
      `${lock}每第 3 次发动，给同路另一张牌充能 ${q === 2 ? 2 : 1} 秒。`,
    );
  if (c.id === 'bell')
    innate.push(
      q > 0
        ? '充能三路全部其他卡牌，自身冷却延长 1 秒。'
        : '给同路另一张牌充能；精制后改为三路全部其他牌，冷却延长 1 秒。',
    );
  if (c.school) {
    const growth = 1 + card.level * 0.12,
      n = (v: number) => Math.round(v * growth * 10) / 10;
    const rules: Record<string, string> = {
      nailer: `前 2 次发动额外造成 ${n(16 + q * 4)} 伤害。`,
      fuse: `给同路另一张牌充能；首次额外充能 ${2 + q * 0.5} 秒。`,
      gapblade: `命中时目标屏障已破，伤害 +${n(12 + q * 4)}。`,
      springbow: `前 3 次发动额外造成 ${n(16 + q * 4)} 伤害。`,
      recoil: `本路屏障承受直接伤害的 50% 储为反冲，上限 ${n(40 + q * 10)}；下次攻击消耗并附加。`,
      sealant: '修复本路屏障；本路已破则支援剩余比例最低的完整屏障。',
      rubber: `本路完整屏障受到直接伤害 −${n(8 + q)}；同路不叠加，不能减免侵蚀。`,
      counterweight: `发动时本路屏障高于一半，伤害 +${n(20 + q * 5)}。`,
      acid: '每层侵蚀每秒削减 1 屏障上限并造成 1 伤害，最多 12 层；破路后持续伤害宿主。',
      culture: `每次发动比上次多 ${n(8 + q * 2)} 伤害。攻击侵蚀最深的一路，同层数优先上路；无侵蚀则攻击本路。`,
      catalyst: `给同路另一张牌充能；敌方本路有侵蚀时，额外充能 ${Math.round((0.8 + q * 0.2) * 10) / 10} 秒。`,
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
  }
  if (c.hero) {
    const m = c.mechanic ?? {},
      g = (1 + card.level * 0.12) * (1 + q * 0.15),
      n = (v: number) => Math.round(v * g * 10) / 10;
    if (m.opening)
      innate.push(
        `前 ${m.opening[0]} 次发动，额外${c.kind === 'shield' ? '修复' : '伤害'} ${n(m.opening[1])}。`,
      );
    if (m.allRepair) {
      const defaultIndex = innate.findIndex((x) => x.startsWith('修复本路'));
      if (defaultIndex >= 0) innate.splice(defaultIndex, 1);
      innate.push('同时修复三路仍完整的屏障，每路独立结算。');
    }
    if (m.exposed)
      innate.push(`命中时目标屏障已破，额外伤害 ${n(m.exposed)}。`);
    if (m.barrierBonus)
      innate.push(`命中时目标屏障完整，额外伤害 ${n(m.barrierBonus)}。`);
    if (m.growth) innate.push(`每次发动比上次多 ${n(m.growth)} 伤害。`);
    if (m.intactBonus)
      innate.push(`发动时本路屏障高于一半，额外伤害 ${n(m.intactBonus)}。`);
    if (m.corrosionBonus)
      innate.push(`发动时，敌方本路每层侵蚀使伤害 +${n(m.corrosionBonus)}。`);
    if (m.smallAllyBonus)
      innate.push(`同路有另一张 1 格卡牌时，伤害 +${n(m.smallAllyBonus)}。`);
    if (m.seekCorrosion)
      innate.push('攻击侵蚀最深的一路；同层数优先上路，无侵蚀则攻击本路。');
    if (m.recoil)
      innate.push(
        `本路屏障承受直接伤害的 50% 储为反冲，上限 ${(40 + q * 10) * (1 + card.level * 0.12)}；下次攻击消耗并附加。`,
      );
    if (m.buffer)
      innate.push(
        `本路完整屏障受到直接伤害 −${n(m.buffer)}；同路只取最高值，不能减免侵蚀。`,
      );
    if (c.kind === 'charge')
      innate.push(
        m.allCharge ? '给三路全部其他卡牌充能。' : '给同路另一张卡牌充能。',
      );
    if (m.firstCharge) innate.push(`首次额外充能 ${n(m.firstCharge)} 秒。`);
    if (c.kind === 'corrode')
      innate.push(
        '每层每秒造成 1 伤害并削减 1 屏障上限，最多 12 层；破路后持续伤害宿主。',
      );
    if (m.heal)
      effects.push({
        kind: 'heal',
        value: n(m.heal),
        text: `宿主治疗 ${n(m.heal)}`,
      });
    if (m.repair)
      effects.push({
        kind: 'shield',
        value: n(m.repair),
        text: `屏障修复 ${n(m.repair)}`,
      });
  }
  return {
    role: c.role ?? CARD_ROLES[c.id],
    cd: c.cd + (c.id === 'bell' && q > 0 ? 1 : 0),
    effects,
    innate,
    weather: [] as { name: string; text: string }[],
  };
}
