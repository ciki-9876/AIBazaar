import { cardDef, cardFamily } from './demo-cards.ts';
import { combatValue, cardMechanics } from './demo-card-rules.ts';
import type { FighterCard } from './demo-combat.ts';

export const CARD_ROLES: Record<string, string> = {};
export const CARD_TERMS = {
  direct: {
    name: '直接伤害',
    text: '武器命中时一次结算的伤害，包括附加伤害；不包含侵蚀每秒造成的持续伤害。',
  },
  damage: {
    name: '伤害',
    text: '伤害先由目标路线的屏障承受，超出部分伤及宿主；该路屏障已损毁时直接伤及宿主。卡牌本身不承伤。',
  },
  shield: {
    name: '修复',
    text: '恢复同路我方屏障的生命，不超过当前上限。本路已损毁则支援剩余生命比例最低的未损毁屏障，相同比例优先左路。全部损毁时无效，不能重建屏障。',
  },
  charge: {
    name: '充能',
    text: '推进同路我方最靠左的另一张卡的冷却进度，单位为秒；没有目标时不生效。不代表战斗会缩短同样的时间。',
  },
  corrode: {
    name: '侵蚀',
    text: '每层每秒造成1点伤害，并削减该路屏障上限1点（上限最低为1）。每路最多12层；屏障损毁后持续伤及宿主。侵蚀伤害不触发直接伤害减免或反冲蓄积。',
  },
  heal: {
    name: '治疗',
    text: '恢复我方宿主的战斗生命，不超过上限。不会增加冒险中的生命次数。',
  },
} as const;
export type CardTerm = keyof typeof CARD_TERMS;
export type CardAbility = { when: string; text: string; terms: CardTerm[] };
const number = (value: number) => Math.round(value * 100) / 100;

export function describeCard(card: FighterCard, includeFuture = true) {
  const c = cardDef(card.id),
    q = card.quality;
  const value = combatValue(c.id, card.level, q);
  const m = cardMechanics(c.id, card.level, q);
  const term = c.kind as CardTerm;
  const effects = [
    {
      kind: c.kind,
      value,
      text: `${CARD_TERMS[term].name} ${value}${term === 'charge' ? ' 秒' : term === 'corrode' ? ' 层' : ''}`,
    },
  ];
  const abilities: CardAbility[] = [];
  const add = (when: string, text: string, terms: CardTerm[]) =>
    abilities.push({ when, text, terms });
  const target =
    cardFamily(c.id) === 'culture' ? '侵蚀层数最多那一路的敌方' : '同路敌方';
  const action =
    term === 'damage'
      ? `对${target}造成${value}点伤害。`
      : term === 'shield'
        ? `修复${value}点屏障。`
        : term === 'charge'
          ? `为同路另一张卡充能${value}秒。`
          : `对同路敌方施加${value}层侵蚀（每路上限12层）。`;
  add(
    `每${c.cd}秒`,
    action,
    cardFamily(c.id) === 'culture' ? [term, 'corrode'] : [term],
  );
  const notes: string[] = [];
  if (m.openingCount)
    add(
      `前${m.openingCount}次发动`,
      `额外造成${number(m.openingBonus)}点伤害。`,
      ['damage'],
    );
  if (cardFamily(c.id) === 'fuse')
    add('首次发动', `额外充能${number(m.firstCharge)}秒。`, ['charge']);
  if (cardFamily(c.id) === 'gapblade')
    add(
      '命中时',
      `若目标路线的屏障已损毁，额外造成${number(m.exposedBonus)}点伤害。`,
      ['damage'],
    );
  if (cardFamily(c.id) === 'recoil') {
    add(
      '本路屏障承伤后',
      `将实际承受的直接伤害的50%储为反冲，最多${number(m.recoilCap)}点。`,
      ['damage'],
    );
    add('下次发动', '耗尽反冲，附加等量伤害。', ['damage']);
    notes.push(
      '只记录屏障实际吸收的直接伤害；被减免的伤害、溢出到宿主的伤害和侵蚀均不积存反冲。',
    );
  }
  if (cardFamily(c.id) === 'rubber') {
    add('本路屏障未损毁时', `每次受到的直接伤害减少${number(m.buffer)}点。`, [
      'direct',
    ]);
    notes.push('同路有多张缓冲垫时只取最高减免，不叠加；不能减免侵蚀。');
  }
  if (cardFamily(c.id) === 'counterweight')
    add(
      '发动时',
      `若同路我方屏障生命高于当前上限的50%，额外造成${number(m.intactBonus)}点伤害。`,
      ['damage'],
    );
  if (cardFamily(c.id) === 'culture') {
    add('再次发动', `比上次多造成${number(m.growth)}点伤害。`, ['damage']);
    notes.push(
      '没有侵蚀时攻击本路；侵蚀层数相同优先左路。目标在发动时选定，成长只在本场战斗中积累。',
    );
  }
  if (cardFamily(c.id) === 'catalyst')
    add(
      '发动时',
      `若同路敌方有侵蚀，额外充能${number(m.corrosionCharge)}秒。`,
      ['corrode', 'charge'],
    );
  if (cardFamily(c.id) === 'distiller') {
    abilities[0].text += `治疗宿主${number(m.heal)}点生命。`;
    abilities[0].terms.push('heal');
    effects.push({
      kind: 'heal',
      value: number(m.heal),
      text: `治疗 ${number(m.heal)}`,
    });
  }
  if (['fuse', 'catalyst'].includes(c.id))
    notes.push(
      '充能目标在发动时选定；效果到达目标后推进冷却。加成不改变目标。',
    );
  if (cardFamily(c.id) === 'sealant' || cardFamily(c.id) === 'rubber')
    notes.push('修复在效果到达时结算；期间屏障损毁会重新寻找可支援路线。');
  const short: Record<string, string> = {
    slingshot: '弹丸命中造成伤害',
    nailer: `前2次伤害+${number(m.openingBonus)}`,
    springbow: `前3次伤害+${number(m.openingBonus)}`,
    fuse: `首次充能 +${number(m.firstCharge)}秒`,
    gapblade: `破路伤害+${number(m.exposedBonus)}`,
    recoil: `承伤蓄反冲`,
    sealant: '破路转为支援',
    rubber: `直接伤害 −${number(m.buffer)}`,
    counterweight: `屏障过半伤害+${number(m.intactBonus)}`,
    acid: '侵蚀上限12层',
    culture: `伤害逐次+${number(m.growth)}`,
    catalyst: `侵蚀时充能+${number(m.corrosionCharge)}秒`,
    distiller: '侵蚀并治疗',
  };
  for (const ability of abilities)
    if (ability.text.includes('直接伤害') && !ability.terms.includes('direct'))
      ability.terms.push('direct');
  const keywords = [...new Set(abilities.flatMap((a) => a.terms))].map(
    (id) => ({ id, ...CARD_TERMS[id] }),
  );
  const innate = abilities.map((a) => `${a.when}：${a.text}`);
  const future: {
    quality: number;
    effects: string[];
    innate: string[];
    abilities: CardAbility[];
  }[] = includeFuture
    ? [1, 2]
        .filter((tier) => tier > q)
        .map((quality) => {
          const next = describeCard({ ...card, quality }, false);
          return {
            quality,
            effects: next.effects.map((e) => e.text),
            innate: next.innate,
            abilities: next.abilities,
          };
        })
    : [];
  return {
    hitType: c.hitType ?? 'projectile',
    role: c.role ?? '',
    cd: c.cd,
    effects,
    abilities,
    keywords,
    notes,
    innate,
    unlocked: [] as string[],
    future,
    summary: short[cardFamily(c.id)],
    weather: [] as { name: string; text: string }[],
  };
}
