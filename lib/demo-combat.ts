import { cardDef } from './prototype-v04.ts';
import { combatValue } from './demo-card-rules.ts';
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
export type Hit = {
  side: number;
  kind: 'damage' | 'heal' | 'shield' | 'energy' | 'charge';
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
const laneName = (lane: number) => ['上路', '中路', '下路'][lane];
export function simulateDuel(d: Duel) {
  const boards = [d.player, d.enemy].map((b) =>
    [...b].sort((a, b) => a.at - b.at),
  );
  const hp = [...d.maxHp],
    energy = [0, 0];
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
  const cap = boards.map(
    (b) => 10 + (b.some((c) => c.id === 'battery') ? 6 : 0),
  );
  const frames: CombatFrame[] = [];
  let pending: Projectile[] = [],
    serial = 0;
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
  for (let step = 0; step <= COMBAT_LIMIT * 4; step++) {
    const time = step / 4,
      hits: Hit[] = [],
      fired: string[] = [],
      waiting: string[] = [],
      log: string[] = [];
    const cd = [Array(9).fill(0), Array(9).fill(0)],
      damage = [0, 0];
    const arrivals = pending.filter((p) => p.impactAt <= time);
    pending = pending.filter((p) => p.impactAt > time);
    for (const shot of arrivals) {
      const hit: Hit = { ...shot },
        lane = hit.targetLane ?? 1;
      if (hit.kind === 'damage') {
        const barrier = barriers[hit.side][lane];
        hit.targetUid = barrier.broken
          ? `host-${hit.side}-lane-${lane}`
          : `barrier-${hit.side}-${lane}`;
        hit.targetName = `${laneName(lane)}${barrier.broken ? '宿主' : '屏障'}`;
        hit.barrierAbsorbed = Math.min(barrier.hp, hit.raw ?? hit.value);
        barrier.hp -= hit.barrierAbsorbed;
        hit.healthLoss = (hit.raw ?? hit.value) - hit.barrierAbsorbed;
        damage[hit.side] += hit.healthLoss;
        if (!barrier.broken && barrier.hp <= 0) {
          barrier.broken = true;
          log.push(
            `${hit.side ? '敌方' : '我方'}${laneName(lane)}屏障损毁，本场不会重建。`,
          );
        }
      } else if (hit.kind === 'shield') {
        const target = repairLane(hit.side, lane);
        hit.value = 0;
        if (target !== undefined) {
          const barrier = barriers[hit.side][target];
          hit.value = Math.min(shot.value, barrier.maxHp - barrier.hp);
          barrier.hp += hit.value;
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
        if (target) timers[hit.side][target.at] += hit.value;
      }
      hits.push(hit);
    }
    // Commit damage to both hosts before checking lethal results.
    for (let side = 0; side < 2; side++)
      hp[side] = Math.max(0, hp[side] - damage[side]);
    for (let side = 0; side < 2; side++) {
      for (const p of boards[side]) {
        const c = cardDef(p.id),
          q = p.quality,
          lane = laneOf(p);
        cd[side][p.at] = c.cd + (c.id === 'bell' && q > 0 ? 1 : 0);
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
        const n = ++counts[side][p.at],
          v = combatValue(c.id, p.level, q);
        let amount = v;
        if (q > 0 && n % 3 === 0)
          amount +=
            {
              knife: q === 2 ? 12 : 6,
              brick: q === 2 ? 30 : 18,
              coil: q === 2 ? 24 : 12,
              bottle: q === 2 ? 25 : 15,
            }[c.id] ?? 0;
        const launch = (hit: Hit, overflowCap = 0) =>
          pending.push({
            ...hit,
            id: `projectile-${serial++}`,
            launchedAt: time,
            impactAt: time + flightTimeOf(p),
            overflowCap,
          });
        const base = { source: c.name, sourceUid: p.uid, targetLane: lane };
        if (c.kind === 'damage') {
          const targetLane =
            c.id === 'coil'
              ? [0, 1, 2]
                  .filter((i) => i !== lane)
                  .sort(
                    (a, b) =>
                      barriers[1 - side][a].hp - barriers[1 - side][b].hp ||
                      a - b,
                  )[0]
              : lane;
          launch({
            ...base,
            side: 1 - side,
            kind: 'damage',
            value: amount,
            raw: amount,
            visual: 'damage',
            targetLane,
          });
        }
        if (c.kind === 'shield') {
          const target = repairLane(side, lane);
          if (target !== undefined)
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
            c.id === 'box' && q > 0 ? (q === 2 ? 20 : 12) : 0,
          );
        if (c.energyGain)
          launch({
            ...base,
            side,
            kind: 'energy',
            value: c.energyGain + (c.id === 'cell' && q === 2 ? 1 : 0),
            visual: 'armor',
            targetUid: `host-${side}-lane-${lane}`,
          });
        const advance =
          c.kind === 'charge'
            ? v
            : c.id === 'wire' && q > 0 && n % 3 === 0
              ? q === 2
                ? 2
                : 1
              : 0;
        if (advance) {
          const others = boards[side].filter(
            (x) =>
              x.uid !== p.uid &&
              (laneOf(x) === lane || (c.id === 'bell' && q > 0)),
          );
          const targets =
            c.id === 'bell' && q > 0 ? others : others.slice(0, 1);
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
        if (c.id === 'shelter' && q > 0 && n % 3 === 0) {
          const target = boards[side].find(
            (x) => x.uid !== p.uid && laneOf(x) === lane,
          );
          if (target)
            launch({
              ...base,
              side,
              kind: 'charge',
              value: q === 2 ? 2 : 1,
              visual: 'charge',
              targetUid: target.uid,
            });
        }
      }
    }
    frames.push({
      time,
      hp: [...hp],
      barriers: structuredClone(barriers),
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
