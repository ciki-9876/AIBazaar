import type { CombatFrame } from './demo-combat.ts';

export const SETTLE_SECONDS = 1.4;
export type SurfaceEvent = {
  time: number;
  side: number;
  lane: number;
  sourceUid?: string;
  kind: 'impact' | 'core' | 'repair' | 'block' | 'break' | 'death';
  value: number;
};

// Derive presentation from resolved events, never from a second damage model.
// Overflow produces both a barrier contact and a core contact at the same time.
export function surfaceEvents(frames: CombatFrame[]): SurfaceEvent[] {
  const events: SurfaceEvent[] = [];
  frames.forEach((frame, index) => {
    for (const hit of frame.hits) {
      const base = {
        time: frame.time,
        side: hit.side,
        lane: hit.targetLane ?? 0,
        sourceUid: hit.sourceUid,
      };
      if ((hit.barrierAbsorbed ?? 0) > 0)
        events.push({ ...base, kind: 'impact', value: hit.barrierAbsorbed! });
      if ((hit.healthLoss ?? 0) > 0)
        events.push({ ...base, kind: 'core', value: hit.healthLoss! });
      if ((hit.blocked ?? 0) > 0)
        events.push({ ...base, kind: 'block', value: hit.blocked! });
      if (hit.kind === 'shield' && hit.value > 0)
        events.push({ ...base, kind: 'repair', value: hit.value });
    }
    if (!index) return;
    for (let side = 0; side < 2; side++) {
      for (let lane = 0; lane < 3; lane++) {
        if (
          frame.barriers[side][lane].broken &&
          !frames[index - 1].barriers[side][lane].broken
        )
          events.push({
            time: frame.time,
            side,
            lane,
            kind: 'break',
            value: 1,
          });
      }
      if (frame.hp[side] <= 0 && frames[index - 1].hp[side] > 0)
        events.push({
          time: frame.time,
          side,
          lane: 1,
          kind: 'death',
          value: 1,
        });
    }
  });
  return events;
}

export function pulseAt(time: number, started: number, duration: number) {
  const age = (time - started) / duration;
  return age >= 0 && age < 1 ? Math.sin(Math.PI * age) : 0;
}

export type BattleFeedback = {
  key: string;
  time: number;
  side: number;
  lane: number;
  absorbed: number;
  core: number;
  blocked: number;
  repair: number;
  broken: boolean;
  sources: string[];
};

// Merge simultaneous contacts on the same lane. Never substitute raw damage for
// actual loss, or invent useful repair when the resolved value was zero.
export function battleFeedback(frames: CombatFrame[]): BattleFeedback[] {
  return frames.flatMap((frame, index) => {
    const groups = new Map<string, BattleFeedback>();
    const group = (side: number, lane: number) => {
      const key = `${frame.time}/${side}/${lane}`;
      if (!groups.has(key))
        groups.set(key, {
          key,
          time: frame.time,
          side,
          lane,
          absorbed: 0,
          core: 0,
          blocked: 0,
          repair: 0,
          broken: false,
          sources: [],
        });
      return groups.get(key)!;
    };
    for (const hit of frame.hits) {
      const repair = hit.kind === 'shield' ? hit.value : 0;
      if (!(hit.barrierAbsorbed || hit.healthLoss || hit.blocked || repair))
        continue;
      const value = group(hit.side, hit.targetLane ?? 0);
      value.absorbed += hit.barrierAbsorbed ?? 0;
      value.core += hit.healthLoss ?? 0;
      value.blocked += hit.blocked ?? 0;
      value.repair += repair;
      const source = `${hit.source}${hit.sourceUid ? ` [${hit.sourceUid}]` : ''}`;
      if (!value.sources.includes(source)) value.sources.push(source);
    }
    if (index)
      frame.barriers.forEach((barriers, side) =>
        barriers.forEach((b, lane) => {
          if (b.broken && !frames[index - 1].barriers[side][lane].broken)
            group(side, lane).broken = true;
        }),
      );
    return [...groups.values()];
  });
}
