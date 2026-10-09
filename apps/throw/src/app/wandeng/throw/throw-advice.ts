import type { ItemId } from '../../../lib/cards/throw-loadout.ts';
import type { DuelTerms } from '../../../lib/cards/throw-duel.ts';

/** Advice follows the equipped objects, including custom trunks, not the preset name. */
export function throwAdvice(items: readonly ItemId[], terms?: DuelTerms | null) {
  const has = (...ids: ItemId[]) => ids.some((id) => items.includes(id));
  const advice: string[] = [];
  const singleOnly = terms?.maxCards === 1;
  const allowSingle = !terms?.minCards || terms.minCards <= 1;
  if (singleOnly || (allowSingle && has('quick', 'needle', 'tempo'))) advice.push('单张连甩');
  if (!singleOnly && has('pair', 'umbrella')) advice.push('出对子');
  if (!singleOnly && has('sequence') && (!terms?.maxCards || terms.maxCards >= 3)) advice.push('凑三张起顺子');
  if (!singleOnly && has('suit') && (!terms?.maxCards || terms.maxCards >= 3)) advice.push('凑三张起同花');
  if (has('focus') && (!terms?.maxCards || terms.maxCards >= 5)) advice.push('攒五张组合爆发');
  const suitHints: [ItemId[], number, string][] = [
    [['ward'], 0, '多出黑桃 ♠'],
    [['mend', 'wash'], 1, '多出红心 ♥'],
    [['poison', 'slow'], 2, '多出梅花 ♣'],
    [['cinder'], 3, '多出方块 ♦'],
  ];
  for (const [ids, suit, text] of suitHints)
    if ((!terms?.suits || terms.suits.includes(suit as 0 | 1 | 2 | 3)) && has(...ids)) advice.push(text);
  if (has('tempo') && allowSingle) advice.push('交替花色');
  if (has('growth')) advice.push('连续出同一纯花色');
  if (terms?.minCards && terms.minCards > 1) advice.unshift(`每手至少 ${terms.minCards} 张`);
  return advice.length ? advice.slice(0, 5) : ['看准时机，甩出高点数'];
}
