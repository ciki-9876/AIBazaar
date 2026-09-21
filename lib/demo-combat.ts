import { cardDef, cardFamily } from './demo-cards.ts';
import { cardMechanics, combatValue } from './demo-card-rules.ts';
import { heroDef, heroOwner } from './heroes.ts';
import type { HeroId } from './hero-cards.ts';
export type FighterCard = {
  uid: string;
  id: string;
  at: number;
  rarity: number;
  quality: number;
  level: number;
  flightTime?: number;
};
export const COMBAT_LIMIT = 90;
export const flightTimeOf = (card: FighterCard) =>
  cardDef(card.id).hitType === 'instant'
    ? 0
    : Math.max(0.5, Math.min(3, Math.round((card.flightTime ?? 1.25) * 4) / 4));
export type Hit = {
  side: number;
  kind: 'damage' | 'heal' | 'shield' | 'energy' | 'charge' | 'corrode';
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
  targetUid?: string;
  targetLane?: number;
  targetName?: string;
  barrierAbsorbed?: number;
  healthLoss?: number;
  blocked?: number;
  periodic?: boolean;
  exposedBonus?: number;
  barrierBonus?: number;
};
export type Projectile = Hit & {
  id: string;
  launchedAt: number;
  impactAt: number;
  overflowCap?: number;
};
export type Barrier = { hp: number; maxHp: number; broken: boolean };
export type CombatFrame = {
  time: number;
  hp: number[];
  barriers: Barrier[][];
  corrosion: number[][];
  stored: Record<string, number>;
  heroMeters: number[][];
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
  heroes?: (HeroId | null)[];
  heroPassives?: boolean;
  disabledHeroSides?: number[];
  stage?: 'normal' | 'elite' | 'boss';
  player: FighterCard[];
  enemy: FighterCard[];
  maxHp: number[];
  barrierHp?: number[][];
  weather: number;
  weatherEnabled?: boolean;
  layout: number;
  name: string;
  kind: 'guardian' | 'survivor';
  botId: number | null;
};
const laneOf = (c: FighterCard) => Math.floor(c.at / 3);
const laneName = (lane: number) => ['左路', '中路', '右路'][lane];
export function simulateDuel(d: Duel) {
  for (const [side, board] of [d.player, d.enemy].entries())
    for (const card of board) {
      const owner = d.heroes ? heroOwner(card.id) : cardDef(card.id).hero;
      if (owner && owner !== d.heroes?.[side])
        throw Error('未接入对应回响，不能上阵专属卡');
    }
  const boards = [d.player, d.enemy].map((b) =>
    [...b].sort((a, b) => a.at - b.at),
  );
  const hp = [...d.maxHp],
    energy = [0, 0];
  const sourcePositions = new Map(boards.flat().map((c) => [c.uid, c.at]));
  const barriers = d.maxHp.map((health, side) =>
    [0, 1, 2].map((lane) => {
      const maxHp = Math.max(
        1,
        d.barrierHp?.[side]?.[lane] ?? Math.round(health * 0.3),
      );
      return { hp: maxHp, maxHp, broken: false };
    }),
  );
  const timers = [Array(9).fill(0), Array(9).fill(0)],
    counts = [Array(9).fill(0), Array(9).fill(0)];
  const cap = boards.map(() => 10);
  const frames: CombatFrame[] = [];
  let pending: Projectile[] = [],
    serial = 0;
  const corrosion = [
      [0, 0, 0],
      [0, 0, 0],
    ],
    corrosionSource: ({ uid: string; name: string } | undefined)[][] = [[], []];
  const stored: Record<string, number> = {};
  const heroMeters = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  const activeHero = (side: number) =>
    d.heroPassives === false || d.disabledHeroSides?.includes(side)
      ? null
      : d.heroes?.[side];
  const heroCharge = (side: number, lane: number, time: number, value = 1) => {
    const hero = activeHero(side);
    if (!hero) return;
    for (const c of boards[side].filter((c) => laneOf(c) === lane))
      pending.push({
        id: `hero-${serial++}`,
        kind: 'charge',
        side,
        value,
        source: heroDef(hero).name + ' · 回响',
        sourceUid: `host-${side}-lane-${lane}`,
        targetUid: c.uid,
        targetLane: lane,
        visual: 'charge',
        launchedAt: time,
        impactAt: time + 1.25,
      });
  };
  const onRepair = (
    side: number,
    lane: number,
    value: number,
    time: number,
  ) => {
    if (activeHero(side) !== 'mender' || value <= 0) return;
    heroMeters[side][lane] += value;
    const pulses = Math.floor((heroMeters[side][lane] + 1e-8) / 30);
    if (pulses) {
      heroMeters[side][lane] -= pulses * 30;
      heroCharge(side, lane, time, pulses);
    }
  };
  const repairLane = (side: number, lane: number) =>
    !barriers[side][lane].broken
      ? lane
      : [0, 1, 2]
          .filter((i) => !barriers[side][i].broken)
          .sort(
            (a, b) =>
              barriers[side][a].hp / barriers[side][a].maxHp -
                barriers[side][b].hp / barriers[side][b].maxHp || a - b,
          )[0];
  const damageLane = (id: string, side: number, lane: number) => {
    const def = cardDef(id);
    if (
      (id === 'culture' || def.mechanic?.seekCorrosion) &&
      corrosion[1 - side].some((v) => v > 0)
    )
      return [0, 1, 2].sort(
        (a, b) => corrosion[1 - side][b] - corrosion[1 - side][a] || a - b,
      )[0];
    return lane;
  };
  for (let step = 0; step <= COMBAT_LIMIT * 4; step++) {
    const time = step / 4,
      hits: Hit[] = [],
      fired: string[] = [],
      waiting: string[] = [],
      log: string[] = [];
    const cd = [Array(9).fill(0), Array(9).fill(0)],
      damage = [0, 0];
    if (step === 0)
      for (let side = 0; side < 2; side++)
        if (activeHero(side) === 'breaker')
          for (let lane = 0; lane < 3; lane++) heroCharge(side, lane, time);
    const arrivals = pending.filter((p) => p.impactAt <= time);
    pending = pending.filter((p) => p.impactAt > time);
    if (step > 0 && step % 4 === 0)
      for (let side = 0; side < 2; side++)
        for (let lane = 0; lane < 3; lane++) {
          const source = corrosionSource[side][lane];
          if (corrosion[side][lane] && source)
            arrivals.push({
              id: `tick-${serial++}`,
              kind: 'damage',
              side,
              value: corrosion[side][lane],
              raw: corrosion[side][lane],
              periodic: true,
              source: '侵蚀 · ' + source.name,
              sourceUid: source.uid,
              targetLane: lane,
              visual: 'poison',
              launchedAt: time,
              impactAt: time,
            });
        }
    // Resolve all impacts in a fixed phase order. Board-side iteration must
    // not decide whether same-tick damage breaks a barrier before its repair.
    const impactOrder = {
      damage: 0,
      corrode: 1,
      shield: 2,
      heal: 3,
      energy: 4,
      charge: 5,
    };
    const resolveImpacts = (arrivals: Projectile[]) => {
      damage.fill(0);
      arrivals.sort(
        (a, b) =>
          impactOrder[a.kind] - impactOrder[b.kind] ||
          a.impactAt - b.impactAt ||
          Number(!!a.periodic) - Number(!!b.periodic) ||
          (sourcePositions.get(a.sourceUid ?? '') ?? 9 + (a.targetLane ?? 1)) -
            (sourcePositions.get(b.sourceUid ?? '') ??
              9 + (b.targetLane ?? 1)) ||
          (a.source < b.source ? -1 : a.source > b.source ? 1 : 0),
      );
      for (const shot of arrivals) {
        const hit: Hit = { ...shot },
          lane = hit.targetLane ?? 1;
        if (hit.kind === 'damage') {
          const barrier = barriers[hit.side][lane];
          const buffer =
            barrier.broken || hit.periodic
              ? 0
              : Math.max(
                  0,
                  ...boards[hit.side]
                    .filter(
                      (c) =>
                        (cardFamily(c.id) === 'rubber' ||
                          cardDef(c.id).mechanic?.buffer) &&
                        laneOf(c) === lane,
                    )
                    .map((c) =>
                      cardFamily(c.id) === 'rubber'
                        ? cardMechanics(c.id, c.level, c.quality).buffer
                        : cardDef(c.id).mechanic!.buffer! *
                          (1 + c.level * 0.12) *
                          (1 + c.quality * 0.15),
                    ),
                );
          hit.blocked = Math.min(hit.raw ?? hit.value, buffer);
          hit.value =
            Math.max(0, (hit.raw ?? hit.value) - hit.blocked) +
            (barrier.broken
              ? (hit.exposedBonus ?? 0)
              : (hit.barrierBonus ?? 0));
          hit.targetUid = barrier.broken
            ? `host-${hit.side}-lane-${lane}`
            : `barrier-${hit.side}-${lane}`;
          hit.targetName = `${laneName(lane)}${barrier.broken ? '宿主' : '屏障'}`;
          hit.barrierAbsorbed = Math.min(barrier.hp, hit.value);
          barrier.hp -= hit.barrierAbsorbed;
          hit.healthLoss = hit.value - hit.barrierAbsorbed;
          if (hit.periodic)
            barrier.maxHp = Math.max(1, barrier.maxHp - hit.value);
          if (!hit.periodic && hit.barrierAbsorbed > 0)
            for (const c of boards[hit.side].filter(
              (c) =>
                (cardFamily(c.id) === 'recoil' ||
                  cardDef(c.id).mechanic?.recoil) &&
                laneOf(c) === lane,
            ))
              stored[c.uid] = Math.min(
                cardMechanics(c.id, c.level, c.quality).recoilCap,
                (stored[c.uid] ?? 0) + hit.barrierAbsorbed * 0.5,
              );
          damage[hit.side] += hit.healthLoss;
          if (!barrier.broken && barrier.hp <= 0) {
            barrier.broken = true;
            if (activeHero(1 - hit.side) === 'breaker') {
              heroMeters[1 - hit.side][lane]++;
              for (let target = 0; target < 3; target++)
                heroCharge(1 - hit.side, target, time);
            }
            log.push(
              `${hit.side ? '敌方' : '我方'}${laneName(lane)}屏障损毁，本场不会重建。`,
            );
          }
        } else if (hit.kind === 'corrode') {
          const before = corrosion[hit.side][lane];
          corrosion[hit.side][lane] = Math.min(12, before + hit.value);
          hit.value = corrosion[hit.side][lane] - before;
          corrosionSource[hit.side][lane] = {
            uid: hit.sourceUid ?? `host-${1 - hit.side}-lane-${lane}`,
            name: hit.source,
          };
          hit.targetUid = barriers[hit.side][lane].broken
            ? `host-${hit.side}-lane-${lane}`
            : `barrier-${hit.side}-${lane}`;
          hit.targetName = `${laneName(lane)}侵蚀 ${corrosion[hit.side][lane]} 层`;
        } else if (hit.kind === 'shield') {
          const target = repairLane(hit.side, lane);
          hit.value = 0;
          if (target !== undefined) {
            const barrier = barriers[hit.side][target];
            hit.value = Math.min(shot.value, barrier.maxHp - barrier.hp);
            barrier.hp += hit.value;
            onRepair(hit.side, target, hit.value, time);
            hit.targetLane = target;
            hit.targetUid = `barrier-${hit.side}-${target}`;
            hit.targetName = `${laneName(target)}屏障修复`;
          }
        } else if (hit.kind === 'heal') {
          hit.value = Math.min(shot.value, d.maxHp[hit.side] - hp[hit.side]);
          hp[hit.side] += hit.value;
          const target = repairLane(hit.side, lane);
          if (shot.overflowCap && target !== undefined) {
            const barrier = barriers[hit.side][target];
            const value = Math.min(
              shot.overflowCap,
              shot.value - hit.value,
              barrier.maxHp - barrier.hp,
            );
            barrier.hp += value;
            onRepair(hit.side, target, value, time);
            if (value)
              hits.push({
                ...hit,
                kind: 'shield',
                visual: 'armor',
                value,
                targetLane: target,
                targetUid: `barrier-${hit.side}-${target}`,
                targetName: '溢出治疗修复屏障',
              });
          }
        } else if (hit.kind === 'energy')
          energy[hit.side] = Math.min(
            cap[hit.side],
            energy[hit.side] + hit.value,
          );
        else if (hit.kind === 'charge') {
          const target = boards[hit.side].find((c) => c.uid === hit.targetUid);
          if (target) {
            const before = timers[hit.side][target.at];
            timers[hit.side][target.at] += hit.value;
            hit.value = timers[hit.side][target.at] - before;
            hit.targetLane = laneOf(target);
            hit.targetName = `${laneName(laneOf(target))}·${cardDef(target.id).name}`;
          } else {
            hit.value = 0;
            hit.targetName = '无可用充能目标';
          }
        }
        hits.push(hit);
      }
      // Commit damage to both hosts before checking lethal results.
      for (let side = 0; side < 2; side++)
        hp[side] = Math.max(0, hp[side] - damage[side]);
    };
    resolveImpacts(arrivals);
    const instant: Projectile[] = [];
    for (let side = 0; side < 2; side++) {
      for (const p of boards[side]) {
        const c = cardDef(p.id),
          q = p.quality,
          lane = laneOf(p);
        cd[side][p.at] = c.cd;
        if (!step || hp.some((h) => h <= 0)) continue;
        timers[side][p.at] += 0.25;
        if (timers[side][p.at] < cd[side][p.at]) continue;
        if (energy[side] < c.energyCost) {
          timers[side][p.at] = cd[side][p.at];
          waiting.push(p.uid);
          continue;
        }
        timers[side][p.at] -= cd[side][p.at];
        energy[side] -= c.energyCost;
        fired.push(p.uid);
        const growth = 1 + p.level * 0.12;
        const special = c.mechanic,
          heroGrowth = growth * (1 + q * 0.15);
        const n = ++counts[side][p.at],
          v = combatValue(c.id, p.level, q);
        const mechanism = cardMechanics(c.id, p.level, q);
        let amount = v;
        if (special?.opening && n <= special.opening[0])
          amount += special.opening[1] * heroGrowth;
        if (special?.growth) amount += (n - 1) * special.growth * heroGrowth;
        if (
          special?.intactBonus &&
          !barriers[side][lane].broken &&
          barriers[side][lane].hp > barriers[side][lane].maxHp * 0.5
        )
          amount += special.intactBonus * heroGrowth;
        if (special?.corrosionBonus)
          amount +=
            corrosion[1 - side][lane] * special.corrosionBonus * heroGrowth;
        if (
          special?.smallAllyBonus &&
          boards[side].some(
            (x) =>
              x.uid !== p.uid && laneOf(x) === lane && cardDef(x.id).size === 1,
          )
        )
          amount += special.smallAllyBonus * heroGrowth;
        if (mechanism.openingCount && n <= mechanism.openingCount)
          amount += mechanism.openingBonus;
        if (cardFamily(c.id) === 'culture')
          amount += (n - 1) * mechanism.growthBase * growth;
        if (
          cardFamily(c.id) === 'counterweight' &&
          !barriers[side][lane].broken &&
          barriers[side][lane].hp > barriers[side][lane].maxHp * 0.5
        )
          amount += mechanism.intactBonus;
        if (cardFamily(c.id) === 'recoil' || special?.recoil) {
          amount += stored[p.uid] ?? 0;
          stored[p.uid] = 0;
        }
        const launch = (hit: Hit, overflowCap = 0) =>
          (flightTimeOf(p) === 0 ? instant : pending).push({
            ...hit,
            id: `projectile-${serial++}`,
            launchedAt: time,
            impactAt: time + flightTimeOf(p),
            overflowCap,
          });
        const base = { source: c.name, sourceUid: p.uid, targetLane: lane };
        if (activeHero(side) === 'archivist') {
          heroMeters[side][lane]++;
          if (heroMeters[side][lane] >= 3) {
            heroMeters[side][lane] -= 3;
            const recorded = boards[side]
              .filter((x) => laneOf(x) === lane)
              .sort(
                (a, b) =>
                  cardDef(b.id).size - cardDef(a.id).size ||
                  cardDef(b.id).cd - cardDef(a.id).cd ||
                  a.at - b.at,
              )[0];
            if (recorded) {
              const def = cardDef(recorded.id),
                value = combatValue(
                  recorded.id,
                  recorded.level,
                  recorded.quality,
                ),
                source = {
                  source: '闻砂 · 复写 ' + def.name,
                  sourceUid: `host-${side}-lane-${lane}`,
                  targetLane: lane,
                };
              const copy = (hit: Hit) =>
                pending.push({
                  ...hit,
                  id: `echo-${serial++}`,
                  launchedAt: time,
                  impactAt: time + 1.25,
                });
              if (def.kind === 'damage' || def.kind === 'corrode')
                copy({
                  ...source,
                  kind: def.kind,
                  side: 1 - side,
                  value,
                  raw: value,
                  targetLane:
                    def.kind === 'damage'
                      ? damageLane(recorded.id, side, lane)
                      : lane,
                  visual: def.kind === 'damage' ? 'damage' : 'poison',
                });
              if (def.kind === 'heal')
                copy({
                  ...source,
                  kind: 'heal',
                  side,
                  value,
                  visual: 'heal',
                  targetUid: `host-${side}-lane-${lane}`,
                });
              if (def.kind === 'shield') {
                const primary = repairLane(side, lane);
                const targets = def.mechanic?.allRepair
                  ? [0, 1, 2].filter((i) => !barriers[side][i].broken)
                  : primary === undefined
                    ? []
                    : [primary];
                for (const target of targets)
                  copy({
                    ...source,
                    kind: 'shield',
                    side,
                    value,
                    visual: 'armor',
                    targetLane: target,
                    targetUid: `barrier-${side}-${target}`,
                  });
              }
              if (def.kind === 'charge') {
                const all = def.mechanic?.allCharge;
                const targets = boards[side].filter(
                  (x) => x.uid !== recorded.uid && (laneOf(x) === lane || all),
                );
                for (const target of all ? targets : targets.slice(0, 1))
                  copy({
                    ...source,
                    kind: 'charge',
                    side,
                    value,
                    visual: 'charge',
                    targetUid: target.uid,
                    targetLane: laneOf(target),
                  });
              }
            }
          }
        }
        if (c.kind === 'damage') {
          const targetLane = damageLane(c.id, side, lane);
          launch({
            ...base,
            side: 1 - side,
            kind: 'damage',
            value: amount,
            raw: amount,
            visual: 'damage',
            targetLane,
            exposedBonus:
              cardFamily(c.id) === 'gapblade'
                ? mechanism.exposedBonus
                : (special?.exposed ?? 0) * heroGrowth,
            barrierBonus: (special?.barrierBonus ?? 0) * heroGrowth,
          });
        }
        if (special?.heal)
          launch({
            ...base,
            side,
            kind: 'heal',
            value: special.heal * heroGrowth,
            visual: 'heal',
            targetUid: `host-${side}-lane-${lane}`,
          });
        if (special?.repair) {
          const target = repairLane(side, lane);
          if (target !== undefined)
            launch({
              ...base,
              side,
              kind: 'shield',
              value: special.repair * heroGrowth,
              visual: 'armor',
              targetLane: target,
              targetUid: `barrier-${side}-${target}`,
            });
        }
        if (c.kind === 'corrode') {
          launch({
            ...base,
            side: 1 - side,
            kind: 'corrode',
            value: amount,
            visual: 'poison',
          });
          if (cardFamily(c.id) === 'distiller')
            launch({
              ...base,
              side,
              kind: 'heal',
              value: mechanism.heal,
              visual: 'heal',
              targetUid: `host-${side}-lane-${lane}`,
            });
        }
        if (c.kind === 'shield') {
          const primary = repairLane(side, lane);
          const targets = special?.allRepair
            ? [0, 1, 2].filter((i) => !barriers[side][i].broken)
            : primary === undefined
              ? []
              : [primary];
          for (const target of targets)
            launch({
              ...base,
              side,
              kind: 'shield',
              value: amount,
              visual: 'armor',
              targetLane: target,
              targetUid: `barrier-${side}-${target}`,
            });
        }
        if (c.kind === 'heal')
          launch(
            {
              ...base,
              side,
              kind: 'heal',
              value: amount,
              visual: 'heal',
              targetUid: `host-${side}-lane-${lane}`,
            },
            0,
          );
        if (c.energyGain)
          launch({
            ...base,
            side,
            kind: 'energy',
            value: c.energyGain,
            visual: 'armor',
            targetUid: `host-${side}-lane-${lane}`,
          });
        let advance = c.kind === 'charge' ? v : 0;
        if (n === 1) advance += mechanism.firstCharge;
        if (special?.firstCharge && n === 1)
          advance += special.firstCharge * heroGrowth;
        if (cardFamily(c.id) === 'catalyst' && corrosion[1 - side][lane] > 0)
          advance += mechanism.corrosionCharge;
        if (advance) {
          const others = boards[side].filter(
            (x) =>
              x.uid !== p.uid && (laneOf(x) === lane || special?.allCharge),
          );
          const targets = special?.allCharge ? others : others.slice(0, 1);
          if (!targets.length)
            log.push(
              `${side ? '敌方' : '我方'}·${c.name} [${p.uid}]：无同路充能目标，实际生效 0 秒。`,
            );
          for (const x of targets)
            launch({
              ...base,
              side,
              kind: 'charge',
              value: advance,
              visual: 'charge',
              targetUid: x.uid,
              targetLane: laneOf(x),
            });
        }
      }
    }
    resolveImpacts(instant);
    frames.push({
      time,
      hp: [...hp],
      barriers: structuredClone(barriers),
      corrosion: corrosion.map((row) => [...row]),
      stored: { ...stored },
      heroMeters: heroMeters.map((row) => [...row]),
      energy: [...energy],
      timers: timers.map((a) => [...a]),
      cd,
      fired,
      waiting,
      hits,
      projectiles: pending.map((p) => ({ ...p })),
      log,
    });
    if (hp.some((h) => h <= 0)) break;
  }
  const timedOut = hp.every((h) => h > 0);
  const winner = timedOut || hp.every((h) => h <= 0) ? -1 : hp[1] <= 0 ? 0 : 1;
  return { frames, winner, duration: frames.at(-1)!.time, timedOut };
}
