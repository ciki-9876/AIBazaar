import { cardDef, stat } from './prototype-v04.ts';
import { terrainFor } from './prototype-v03.ts';
export type FighterCard = {
  uid: string;
  id: string;
  at: number;
  rarity: number;
  quality: number;
  level: number;
  flightTime?: number;
};
const ARMOR: Record<string, number> = {
  knife: 10,
  wire: 5,
  bottle: 8,
  shelter: 45,
  bell: 5,
  brick: 35,
  box: 25,
  cell: 15,
  coil: 10,
  battery: 40,
};
export const armorOf = (card: Pick<FighterCard, 'id' | 'level' | 'quality'>) =>
  ARMOR[card.id] + card.quality * 5 + card.level * 2;
export const armorDamage = (raw: number, armor: number) =>
  Math.round(((raw * 100) / (100 + Math.max(0, armor))) * 10) / 10;
export function targetText(id: string) {
  if (cardDef(id).kind !== 'damage')
    return '非伤害效果作用于宿主或技能描述的友方卡牌；本牌也可承受攻击。';
  return id === 'coil'
    ? '特技 · 越线狙击：优先攻击其他路最靠后的卡牌；同列优先上路。其他路为空时，改攻同路前排。目标路为空则直击宿主。'
    : '默认攻击同路最靠前的敌方卡牌；同路为空时直击宿主，不享受卡牌护甲。';
}
export function selectTarget(
  source: FighterCard,
  enemies: FighterCard[],
): FighterCard | null {
  const lane = Math.floor(source.at / 3);
  if (source.id === 'coil') {
    const others = enemies
      .filter((x) => Math.floor(x.at / 3) !== lane)
      .sort((a, b) => (b.at % 3) - (a.at % 3) || a.at - b.at);
    if (others.length) return others[0];
  }
  return (
    [...enemies]
      .filter((x) => Math.floor(x.at / 3) === lane)
      .sort((a, b) => a.at - b.at)[0] ?? null
  );
}
export const flightTimeOf = (card: FighterCard) =>
  Math.max(
    0.5,
    Math.min(
      3,
      Math.round(
        (card.flightTime ??
          { coil: 0.75, brick: 1.5, knife: 1, wire: 1, bell: 1.25 }[card.id] ??
          1.25) * 4,
      ) / 4,
    ),
  );
export type Projectile = Hit & {
  id: string;
  launchedAt: number;
  impactAt: number;
  overflowCap?: number;
};
export type Hit = {
  side: number;
  kind: 'damage' | 'heal' | 'shield' | 'energy' | 'echo' | 'charge';
  value: number;
  source: string;
  sourceUid?: string;
  visual?:
    | 'damage'
    | 'heal'
    | 'armor'
    | 'burn'
    | 'poison'
    | 'freeze'
    | 'charge'
    | 'slow';
  raw?: number;
  armor?: number;
  targetUid?: string;
  targetName?: string;
  shieldAbsorbed?: number;
  healthLoss?: number;
};
export type CombatFrame = {
  time: number;
  hp: number[];
  shield: number[];
  energy: number[];
  timers: number[][];
  cd: number[][];
  fired: string[];
  waiting: string[];
  hits: Hit[];
  projectiles: Projectile[];
  log: string[];
};
export type Duel = {
  player: FighterCard[];
  enemy: FighterCard[];
  maxHp: number[];
  weather: number;
  layout: number;
  name: string;
  kind: 'guardian' | 'survivor';
  botId: number | null;
};
export function simulateDuel(d: Duel) {
  const boards = [d.player, d.enemy].map((b) =>
    [...b].sort((a, b) => a.at - b.at),
  );
  const hp = [...d.maxHp],
    shield = [0, 0],
    energy = [0, 0],
    timers = [Array(9).fill(0), Array(9).fill(0)],
    counts = [Array(9).fill(0), Array(9).fill(0)];
  const cap = boards.map(
    (b) => 10 + (b.some((x) => x.id === 'battery') ? 6 : 0),
  );
  const terrain = terrainFor(d.weather, d.layout);
  const frames: CombatFrame[] = [];
  let pending: Projectile[] = [];
  let serial = 0;
  for (let step = 0; step <= 240; step++) {
    const time = step / 4,
      hits: Hit[] = [],
      fired: string[] = [],
      waiting: string[] = [],
      log: string[] = [],
      cd = [Array(9).fill(0), Array(9).fill(0)];
    // Damage is committed after both owners act, so simultaneous lethal hits are fair.
    const damage = [0, 0];
    // Resolve arrivals first. Launch and impact are separate simulation events.
    for (const shot of pending.filter((x) => x.impactAt <= time)) {
      const hit: Hit = { ...shot };
      if (hit.kind === 'damage') {
        const target = boards[hit.side].find((x) => x.uid === hit.targetUid);
        hit.armor = target ? armorOf(target) : 0;
        hit.value = armorDamage(hit.raw ?? hit.value, hit.armor);
        damage[hit.side] += hit.value;
      } else if (hit.kind === 'heal') {
        hit.value = Math.min(d.maxHp[hit.side] - hp[hit.side], shot.value);
        hp[hit.side] += hit.value;
        const overflow = Math.min(
          shot.overflowCap ?? 0,
          shot.value - hit.value,
        );
        if (overflow > 0) {
          shield[hit.side] += overflow;
          hits.push({
            ...hit,
            kind: 'shield',
            visual: 'armor',
            value: overflow,
          });
        }
      } else if (hit.kind === 'shield') shield[hit.side] += hit.value;
      else if (hit.kind === 'energy')
        energy[hit.side] = Math.min(
          cap[hit.side],
          energy[hit.side] + hit.value,
        );
      else if (hit.kind === 'charge') {
        const target = boards[hit.side].find((x) => x.uid === hit.targetUid);
        if (target) timers[hit.side][target.at] += hit.value;
      }
      hits.push(hit);
    }
    pending = pending.filter((x) => x.impactAt > time);
    for (let side = 0; side < 2; side++)
      for (const p of boards[side]) {
        const c = cardDef(p.id),
          env = terrain[Math.floor(p.at / 3)],
          q = p.quality;
        const shelter = boards[side].some(
          (x) =>
            x.id === 'shelter' &&
            x.quality > 0 &&
            x.uid !== p.uid &&
            Math.floor(x.at / 3) === Math.floor(p.at / 3),
        );
        cd[side][p.at] =
          c.cd +
          (!shelter && ['寒冷', '强风'].includes(env) ? 0.75 : 0) +
          (p.id === 'bell' && q > 0 && env === '强风' ? 1 : 0);
        if (!step) continue;
        timers[side][p.at] += 0.25;
        if (timers[side][p.at] < cd[side][p.at]) continue;
        if (energy[side] < c.energyCost) {
          timers[side][p.at] = cd[side][p.at];
          waiting.push(p.uid);
          continue;
        }
        timers[side][p.at] -= cd[side][p.at];
        energy[side] -= c.energyCost;
        counts[side][p.at]++;
        fired.push(p.uid);
        const n = counts[side][p.at],
          v = stat(c.id, p.rarity, p.level);
        let amount = v;
        if (q > 0 && n % 3 === 0) {
          if (c.id === 'knife') amount += q === 2 ? 12 : 6;
          if (c.id === 'brick' && env === '炎热') amount += q === 2 ? 30 : 18;
          if (c.id === 'coil') amount += q === 2 ? 24 : 12;
          if (c.id === 'bottle' && env === '潮湿') amount += q === 2 ? 25 : 15;
        }
        if (c.kind === 'shield' && q === 2)
          amount += c.id === 'shelter' ? 5 : c.id === 'battery' ? 10 : 0;
        const launch = (hit: Hit, overflowCap = 0) =>
          pending.push({
            ...hit,
            id: `projectile-${serial++}`,
            launchedAt: time,
            impactAt: time + flightTimeOf(p),
            overflowCap,
          });
        const apply = (value: number, echo = false) => {
          if (c.kind === 'damage') {
            const target = selectTarget(p, boards[1 - side]);
            const armor = target ? armorOf(target) : 0;
            const transmitted = armorDamage(value, armor);

            launch({
              side: 1 - side,
              kind: 'damage',
              value: transmitted,
              source: c.name,
              sourceUid: p.uid,
              visual: 'damage',
              raw: value,
              armor,
              targetUid: target?.uid,
              targetName: target ? cardDef(target.id).name : '空路宿主',
            });
          }
          if (c.kind === 'shield') {
            launch({
              side,
              kind: 'shield',
              value,
              source: c.name,
              sourceUid: p.uid,
              targetUid: `host-${side}`,
              visual: 'armor',
            });
          }
          if (c.kind === 'heal') {
            launch(
              {
                side,
                kind: 'heal',
                value,
                source: c.name,
                sourceUid: p.uid,
                targetUid: `host-${side}`,
                visual: 'heal',
              },
              !echo && c.id === 'box' && q > 0 && env === '寒冷'
                ? q === 2
                  ? 20
                  : 12
                : 0,
            );
          }
          if (echo) log.push(`${c.name} · 奇迹回响 ${value}`);
        };
        apply(amount);
        if (c.energyGain) {
          const gain = c.energyGain + (c.id === 'cell' && q === 2 ? 1 : 0);

          launch({
            side,
            kind: 'energy',
            value: gain,
            source: c.name,
            sourceUid: p.uid,
            targetUid: `host-${side}`,
            visual: 'armor',
          });
        }
        const advance =
          c.kind === 'charge'
            ? v + (q === 2 ? 0.5 : 0)
            : c.id === 'wire' && q > 0 && env === '潮湿' && n % 3 === 0
              ? q === 2
                ? 2
                : 1
              : 0;
        const others = boards[side].filter(
          (x) =>
            x.uid !== p.uid && Math.floor(x.at / 3) === Math.floor(p.at / 3),
        );
        const targets =
          c.id === 'bell' && q > 0 && env === '强风'
            ? others
            : others.slice(0, 1);
        if (advance) {
          targets.forEach((x) =>
            launch({
              side,
              kind: 'charge',
              value: advance,
              source: c.name,
              sourceUid: p.uid,
              targetUid: x.uid,
              visual: 'charge',
            }),
          );
          log.push(
            `${c.name} → 同路 ${targets.length} 张牌充能 ${advance.toFixed(1)}s`,
          );
        }
        if (p.rarity === 4 && n % 3 === 0) {
          if (c.kind === 'charge') {
            targets.forEach((x) =>
              launch({
                side,
                kind: 'charge',
                value: advance * 0.5,
                source: c.name,
                sourceUid: p.uid,
                targetUid: x.uid,
                visual: 'charge',
              }),
            );
            log.push(`${c.name} · 充能回响`);
          } else apply(Math.round(amount * 5) / 10, true);
        }
      }
    for (let side = 0; side < 2; side++) {
      let remainingShield = shield[side];
      for (const hit of hits.filter(
        (h) => h.side === side && h.kind === 'damage',
      )) {
        hit.shieldAbsorbed = Math.min(remainingShield, hit.value);
        remainingShield -= hit.shieldAbsorbed;
        hit.healthLoss = hit.value - hit.shieldAbsorbed;
      }
      const absorbed = Math.min(shield[side], damage[side]);
      shield[side] -= absorbed;
      hp[side] = Math.max(0, hp[side] - (damage[side] - absorbed));
    }
    if (time >= 40 && step % 4 === 0) {
      const loss = 8 + (time - 40) * 3;
      for (let side = 0; side < 2; side++) {
        hp[side] = Math.max(0, hp[side] - loss);
        hits.push({
          side,
          kind: 'damage',
          value: loss,
          healthLoss: loss,
          source: '空间坍缩',
        });
      }
      log.push('空间坍缩 · 环境伤害直接作用于宿主，绕过卡牌护甲与宿主护盾');
    }
    frames.push({
      time,
      hp: [...hp],
      shield: [...shield],
      energy: [...energy],
      timers: timers.map((x) => [...x]),
      cd,
      fired,
      waiting,
      hits,
      projectiles: pending.map((x) => ({ ...x })),
      log,
    });
    if (hp.some((x) => x <= 0)) break;
  }
  const winner = hp[0] > hp[1] ? 0 : hp[1] > hp[0] ? 1 : -1;
  return { frames, winner, duration: frames.at(-1)!.time };
}
