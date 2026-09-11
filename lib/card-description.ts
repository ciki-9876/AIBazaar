import { cardDef } from './prototype-v04.ts';
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
      text: `${c.kind === 'damage' ? '伤害' : c.kind === 'heal' ? '宿主治疗' : c.kind === 'charge' ? '充能' : '屏障修复'} ${value}${c.kind === 'charge' ? ' 秒' : ''}`,
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
  if (c.kind === 'shield')
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
  return {
    role: CARD_ROLES[c.id],
    cd: c.cd + (c.id === 'bell' && q > 0 ? 1 : 0),
    effects,
    innate,
    weather: [] as { name: string; text: string }[],
  };
}
