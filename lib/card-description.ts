import { cardDef, stat } from './prototype-v04.ts';
import type { FighterCard } from './demo-combat.ts';
export const CARD_ROLES: Record<string, string> = {
  knife: '主输出',
  wire: '副输出',
  coil: '主输出',
  brick: '副输出',
  bottle: '治疗',
  box: '治疗',
  shelter: '防御',
  battery: '防御 / 辅助',
  bell: '辅助',
  cell: '辅助',
};
export function describeCard(card: FighterCard) {
  const c = cardDef(card.id),
    q = card.quality;
  const value =
    stat(card.id, card.rarity, card.level) +
    (q === 2
      ? c.kind === 'charge'
        ? 0.5
        : c.id === 'shelter'
          ? 5
          : c.id === 'battery'
            ? 10
            : 0
      : 0);
  const effects = [
    {
      kind: c.kind,
      value,
      text: `${c.kind === 'damage' ? '伤害' : c.kind === 'heal' ? '治疗' : c.kind === 'charge' ? '充能' : '护盾'} ${value}${c.kind === 'charge' ? ' 秒' : ''}`,
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
  const innate: string[] = [];
  const weather: { name: string; text: string }[] = [];
  const lock = q === 0 ? '精制解锁：' : '';
  if (c.id === 'knife')
    innate.push(`${lock}每第 3 次攻击追加 ${q === 2 ? 12 : 6} 伤害。`);
  if (c.id === 'coil') {
    innate.push('越线狙击：攻击其他路最后排；同列优先上路，无目标改攻同路。');
    if (q > 0) innate.push(`每第 3 次攻击追加 ${q === 2 ? 24 : 12} 伤害。`);
  }
  if (c.id === 'battery') innate.push('能量上限 +6。');
  if (c.id === 'wire')
    weather.push({
      name: '潮湿',
      text: `${lock}每第 3 次发动，给同路另一张卡牌充能 ${q === 2 ? 2 : 1} 秒。`,
    });
  if (c.id === 'bottle')
    weather.push({
      name: '潮湿',
      text: `${lock}每第 3 次发动额外治疗 ${q === 2 ? 25 : 15}。`,
    });
  if (c.id === 'brick')
    weather.push({
      name: '炎热',
      text: `${lock}每第 3 次攻击追加 ${q === 2 ? 30 : 18} 伤害。`,
    });
  if (c.id === 'box')
    weather.push({
      name: '寒冷',
      text: `${lock}溢出治疗转为最多 ${q === 2 ? 20 : 12} 护盾。`,
    });
  if (c.id === 'shelter')
    weather.push({
      name: '寒冷 / 强风',
      text: `${lock}同路其他卡牌免受环境冷却惩罚。`,
    });
  if (c.id === 'bell')
    weather.push({
      name: '强风',
      text: `${lock}充能同路全部其他卡牌，自身冷却延长 1 秒。`,
    });
  if (card.rarity === 4)
    innate.push('奇迹回响：每第 3 次发动，追加一次 50% 主效果。');
  return { role: CARD_ROLES[c.id], cd: c.cd, effects, innate, weather };
}
