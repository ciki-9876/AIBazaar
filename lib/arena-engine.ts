import { cardDef, cardFamily } from './demo-cards.ts';
import { AMPLIFIERS, arenaCard } from './arena-catalog.ts';
import type { Barrier, CombatFrame, Duel, FighterCard, Hit, Projectile } from './demo-combat.ts';

export type ArenaOptions = {
  version: 1;
  amplifiers: [Array<string | null>, Array<string | null>];
};
export type ArenaFrame = CombatFrame & {
  // Read-only presentation evidence, reconstructed when replaying v1 archives.
  cardState?: Record<string, { activations: number; growth: number; upgrade: number; questHits: number; questAbsorbed: number; rage: number; overdrive: number; regen: number }>;
  links?: Array<{ from: string; to: string; label: string }>;
  amplifierState?: Array<Array<{ stored: number; used: boolean }>>;
  burn: number[][];
  ammo: Record<string, number>;
  amplifierActive: boolean[][];
  haste: Record<string, number>;
  slow: Record<string, number>;
  freeze: Record<string, number>;
  tempo: number[];
};
export type ArenaResult = {
  frames: ArenaFrame[];
  winner: number;
  duration: number;
  timedOut: boolean;
};
type Side = 0 | 1;
type EventKind = 'damage' | 'corrode' | 'burn' | 'shield' | 'heal' | 'charge' | 'slow' | 'freeze' | 'haste' | 'amp' | 'ammo';
type Event = {
  causeUid?: string;
  kind: EventKind;
  tick: number;
  launchedTick: number;
  serial: number;
  sourceUid: string;
  source: string;
  origin: Side;
  lane: number;
  targetSide: Side;
  value: number;
  targetUid?: string;
  projectile?: boolean;
  periodic?: boolean;
  pierce?: number;
  shieldOnly?: number;
  bonusIfBurning?: number;
  bonusIfBroken?: number;
  bonusPerCorrosion?: number;
  slow?: number;
  freeze?: number;
  burn?: number;
  corrode?: number;
  lifesteal?: number;
  procEligible?: boolean;
  free?: boolean;
};
type AmpState = { id: string | null; disabled: boolean; used: boolean; stored: number };
type CardState = {
  timer: number;
  count: number;
  hits: number;
  ammo: number;
  haste: number;
  slow: number;
  freeze: number;
  stored: number;
  growth: number;
  upgrade: number;
  questHits: number;
  questAbsorbed: number;
  rage: number;
  overdrive: number;
  regen: number;
  lastProc: number;
  carry: number;
};
const other = (side: Side): Side => (side === 0 ? 1 : 0);
const laneOf = (card: FighterCard) => Math.floor(card.at / 3);
const colOf = (card: FighterCard) => card.at % 3;
const nOf = (card: FighterCard) => arenaCard(card.id)?.number ?? 0;
const round = (v: number) => Math.round(v * 10) / 10;
const baseState = (card: FighterCard): CardState => ({
  timer: 0, count: 0, hits: 0, ammo: [1, 2].includes(nOf(card)) ? 6 : 0,
  haste: 0, slow: 0, freeze: 0, stored: 0, growth: 0, upgrade: 0,
  questHits: 0, questAbsorbed: 0, rage: 0, overdrive: 0, regen: 0,
  lastProc: -100, carry: 0,
});

export function validateArenaBoard(board: FighterCard[]) {
  const occupied = new Set<number>();
  const ids = new Map<string, number>();
  const uids = new Set<string>();
  for (const card of board) {
    const def = cardDef(card.id);
    if (typeof card.uid !== 'string' || !card.uid || card.rarity !== def.rarity ||
      !Number.isInteger(card.level) || card.level < 0 || card.level > 20 ||
      !Number.isInteger(card.quality) || card.quality < 0 || card.quality > 5)
      throw Error('卡牌身份、稀有度或成长数据无效');
    if (!Number.isInteger(card.at) || card.at < 0 || card.at + def.size > 9 ||
      Math.floor(card.at / 3) !== Math.floor((card.at + def.size - 1) / 3))
      throw Error(`${def.name}不能放在此格`);
    if (uids.has(card.uid)) throw Error('卡牌 UID 重复');
    uids.add(card.uid);
    ids.set(card.id, (ids.get(card.id) ?? 0) + 1);
    if (ids.get(card.id)! > 2) throw Error(`${def.name}每方最多两张`);
    for (let at = card.at; at < card.at + def.size; at++) {
      if (occupied.has(at)) throw Error('卡牌占格重叠');
      occupied.add(at);
    }
  }
  return true;
}

export function placeArenaCard(board: FighterCard[], id: string, at: number, uid: string) {
  const next = [...board, { uid, id, at, rarity: cardDef(id).rarity ?? 0, quality: 0, level: 0 }];
  validateArenaBoard(next);
  return next.sort((a, b) => a.at - b.at || a.uid.localeCompare(b.uid));
}

export function simulateArenaDuel(d: Duel): ArenaResult {
  const options = d.arena;
  if (!options || options.version !== 1) throw Error('对战博弈规则版本不匹配');
  if (!Array.isArray(options.amplifiers) || options.amplifiers.length !== 2 ||
    !Array.isArray(d.maxHp) || d.maxHp.length !== 2 || d.maxHp.some((hp) => !Number.isFinite(hp) || hp <= 0))
    throw Error('对战博弈输入无效');
  const boards = [d.player, d.enemy].map((b) => [...b].sort((a, c) => a.at - c.at || a.uid.localeCompare(c.uid))) as [FighterCard[], FighterCard[]];
  boards.forEach(validateArenaBoard);
  if (new Set(boards.flat().map((card) => card.uid)).size !== boards[0].length + boards[1].length)
    throw Error('双方卡牌 UID 重复');
  for (const row of options.amplifiers) {
    if (row.length !== 3 || row.some((id) => id && !AMPLIFIERS.some((a) => a.id === id)))
      throw Error('增幅器布阵无效');
  }
  const state = new Map<string, CardState>();
  const cardsByUid = new Map<string, FighterCard>();
  const owner = new Map<string, Side>();
  boards.forEach((board, side) => board.forEach((card) => {
    state.set(card.uid, baseState(card));
    cardsByUid.set(card.uid, card);
    owner.set(card.uid, side as Side);
  }));
  const hp = [...d.maxHp];
  const barrier: Barrier[][] = d.maxHp.map((maxHp, side) => [0, 1, 2].map((lane) => {
    const v = Math.max(1, d.barrierHp?.[side]?.[lane] ?? Math.round(maxHp * 0.3));
    return { hp: v, maxHp: v, broken: false };
  }));
  const amps: AmpState[][] = options.amplifiers.map((row) => row.map((id) => ({ id, disabled: false, used: false, stored: 0 })));
  const burn = [[0, 0, 0], [0, 0, 0]];
  const corrosion = [[0, 0, 0], [0, 0, 0]];
  const burnSource = Array.from({ length: 2 }, () => Array<string>(3).fill(''));
  const corrosionSource = Array.from({ length: 2 }, () => Array<string>(3).fill(''));
  const tempo = [0, 0];
  const heated = Array.from({ length: 2 }, () => Array<boolean>(9).fill(false));
  const chilled = Array.from({ length: 2 }, () => Array<boolean>(9).fill(false));
  for (let side = 0; side < 2; side++) for (const card of boards[side]) {
    const lane = laneOf(card), n = nOf(card);
    if (n === 30) { barrier[side][lane].hp += 40; barrier[side][lane].maxHp += 40; }
    if (n === 14 || n === 40) for (const next of [lane - 1, lane + 1]) if (next >= 0 && next < 3) {
      (n === 14 ? heated : chilled)[side][next * 3 + 1] = true;
    }
  }
  for (let side = 0; side < 2; side++) for (let lane = 0; lane < 3; lane++) {
    if (amps[side][lane].id === 'amp-01') { barrier[side][lane].hp += 30; barrier[side][lane].maxHp += 30; }
  }
  const activeAmp = (side: Side, lane: number, id?: string) => {
    const amp = amps[side][lane];
    return !barrier[side][lane].broken && !amp.disabled && !!amp.id && (!id || amp.id === id);
  };
  const factor = (card: FighterCard) => 1 + card.level * 0.12 + card.quality * 0.15;
  const value = (card: FighterCard, base: number) => round(base * factor(card) * (1 + state.get(card.uid)!.upgrade));
  const stacks = (card: FighterCard, base: number) => {
    const st = state.get(card.uid)!;
    const amount = base * factor(card) * (1 + st.upgrade) + st.carry;
    const whole = Math.floor(amount + 1e-9);
    st.carry = amount - whole;
    return whole;
  };
  const duration = (card: FighterCard, base: number, cap: number) =>
    Math.min(cap, base + 0.25 * Math.floor(card.level / 2) + 0.25 * card.quality);
  const sameLane = (side: Side, lane: number) => boards[side].filter((x) => laneOf(x) === lane);
  const adjacent = (a: FighterCard, b: FighterCard) =>
    a.uid !== b.uid && laneOf(a) === laneOf(b) &&
    (a.at + cardDef(a.id).size === b.at || b.at + cardDef(b.id).size === a.at);
  const neighbors = (side: Side, card: FighterCard) => boards[side].filter((x) => adjacent(card, x));
  const targetCard = (side: Side, lane: number) => sameLane(side, lane).sort((a, b) => {
    const ar = Math.max(0, cardDef(a.id).cd - state.get(a.uid)!.timer);
    const br = Math.max(0, cardDef(b.id).cd - state.get(b.uid)!.timer);
    return ar - br || a.at - b.at || a.uid.localeCompare(b.uid);
  })[0];
  const weakerAdjacent = (side: Side, lane: number, intactOnly = false) =>
    [lane - 1, lane + 1].filter((x) => x >= 0 && x < 3 && (!intactOnly || !barrier[side][x].broken))
      .sort((a, b) => barrier[side][a].hp / barrier[side][a].maxHp - barrier[side][b].hp / barrier[side][b].maxHp || a - b)[0];
  const source = (uid: string) => cardsByUid.get(uid) ? cardDef(cardsByUid.get(uid)!.id).name : uid;
  let serial = 0;
  const pending: Event[] = [];
  let now = 0;
  let links: NonNullable<ArenaFrame['links']> = [];
  const put = (input: Omit<Event, 'serial' | 'tick' | 'launchedTick' | 'source'> & { delay?: number; source?: string }) => {
    const { delay = 0, ...rest } = input;
    if (input.causeUid) links.push({ from: input.causeUid, to: input.sourceUid, label: input.causeUid.startsWith('barrier-') ? '灼烧触发' : '触发' });
    pending.push({ ...rest, source: input.source ?? source(input.sourceUid), tick: now + Math.round(delay * 4), launchedTick: now, serial: serial++ });
  };
  const frames: ArenaFrame[] = [];
  const procTimes = new Map<string, number>();
  const healBand = new Map<string, number>();
  const baseDirect = (card: FighterCard) => {
    const base: Record<number, number> = { 1: 12, 2: 20, 3: 75, 4: 7, 5: 8, 6: 26, 8: 27, 9: 50, 10: 5, 13: 28, 17: 7, 18: 8, 19: 10, 20: 12, 25: 9, 26: 22, 41: 26, 43: 9, 44: 23, 46: 10, 48: 28, 50: 38 };
    return base[nOf(card)] ?? cardDef(card.id).power;
  };
  const canProc = (key: string, seconds: number) => {
    if (now - (procTimes.get(key) ?? -1000) < seconds * 4) return false;
    procTimes.set(key, now);
    return true;
  };

  for (now = 0; now <= 360; now++) {
    links = [];
    const time = now / 4;
    const hits: Hit[] = [], log: string[] = [], fired: string[] = [], waiting: string[] = [];
    const hostDamage = [0, 0];
    const delayedHeals: { side: Side; lane: number; value: number; uid: string; name: string }[] = [];
    const localHit = (ev: Event, kind: Hit['kind'], actual: number, extras: Partial<Hit> = {}) => {
      hits.push({ side: ev.targetSide, kind, value: round(actual), source: ev.source, sourceUid: ev.sourceUid,
        targetLane: ev.lane, targetUid: extras.targetUid, targetName: extras.targetName,
        visual: kind === 'burn' ? 'burn' : kind === 'corrode' ? 'poison' : kind === 'shield' ? 'armor' : kind === 'heal' ? 'heal' : kind === 'charge' ? 'charge' : kind === 'freeze' ? 'freeze' : kind === 'slow' ? 'slow' : 'damage',
        periodic: ev.periodic, ...extras });
    };
    const applyDamage = (ev: Event) => {
      const defender = ev.targetSide, lane = ev.lane, b = barrier[defender][lane];
      const attackerCard = cardsByUid.get(ev.sourceUid);
      let amount = ev.value + (ev.bonusIfBurning && burn[defender][lane] > 0 ? ev.bonusIfBurning : 0)
        + (ev.bonusIfBroken && b.broken ? ev.bonusIfBroken : 0)
        + (ev.bonusPerCorrosion ? Math.min(9, corrosion[defender][lane] * ev.bonusPerCorrosion) : 0);
      if (attackerCard && ev.projectile && !ev.periodic && laneOf(attackerCard) === lane && activeAmp(ev.origin, lane, 'amp-04'))
        amount += Math.min(8, amount * 0.15);
      if (attackerCard && !ev.periodic && laneOf(attackerCard) === lane && activeAmp(ev.origin, lane, 'amp-07')) {
        amount += amps[ev.origin][lane].stored;
        amps[ev.origin][lane].stored = 0;
      }
      let blocked = 0;
      if (!b.broken && !ev.periodic) {
        let buffer = 0;
        for (const card of sameLane(defender, lane)) {
          if (nOf(card) === 22) buffer = Math.max(buffer, value(card, 10));
          if (cardFamily(card.id) === 'rubber') buffer = Math.max(buffer, 8 * factor(card));
        }
        blocked = Math.min(amount, buffer);
        amount -= blocked;
        if (activeAmp(defender, lane, 'amp-02')) {
          const extra = Math.min(8, amount * 0.2);
          blocked += extra;
          amount -= extra;
        }
      }
      const pierce = b.broken ? 0 : Math.min(amount, ev.pierce ?? 0);
      const toBarrier = b.broken ? 0 : Math.min(b.hp, Math.max(0, amount - pierce));
      b.hp -= toBarrier;
      const bonusBarrier = b.broken ? 0 : Math.min(b.hp, ev.shieldOnly ?? 0);
      b.hp -= bonusBarrier;
      const toHost = b.broken ? amount : pierce + Math.max(0, amount - pierce - toBarrier);
      const actualHostLoss = Math.min(Math.max(0, toHost), Math.max(0, hp[defender] - hostDamage[defender]));
      hostDamage[defender] += actualHostLoss;
      if (ev.periodic && ev.kind === 'corrode' && !b.broken)
        b.maxHp = Math.max(1, b.maxHp - amount);
      localHit(ev, ev.periodic && (ev.kind === 'corrode' || ev.kind === 'burn') ? ev.kind : 'damage', amount + bonusBarrier, { raw: ev.value, blocked: round(blocked), barrierAbsorbed: round(toBarrier + bonusBarrier),
        healthLoss: round(actualHostLoss), targetUid: b.broken ? `host-${defender}-lane-${lane}` : `barrier-${defender}-${lane}`,
        targetName: `${['左路', '中路', '右路'][lane]}${b.broken ? '宿主' : '屏障'}` });
      if (actualHostLoss > 0 && ev.lifesteal) delayedHeals.push({ side: ev.origin, lane: laneOf(attackerCard ?? { at: lane * 3 } as FighterCard), value: actualHostLoss * ev.lifesteal, uid: ev.sourceUid, name: ev.source });
      if (ev.slow && ev.targetUid && amount > 0) put({ kind: 'slow', sourceUid: ev.sourceUid, origin: ev.origin, targetSide: defender, lane, value: ev.slow, targetUid: ev.targetUid });
      if (toBarrier + bonusBarrier > 0 && !ev.periodic) {
        for (const card of sameLane(defender, lane)) {
          const st = state.get(card.uid)!;
          if (nOf(card) === 23) {
            const key = `${card.uid}:${Math.floor(now / 4)}`;
            const allowed = Math.max(0, value(card, 15) - (healBand.get(key) ?? 0));
            const amount = Math.min(allowed, value(card, 10), toBarrier * 0.25);
            healBand.set(key, (healBand.get(key) ?? 0) + amount);
            if (amount > 0) delayedHeals.push({ side: defender, lane, value: amount, uid: card.uid, name: cardDef(card.id).name });
          }
          if (nOf(card) === 26) st.stored = Math.min(value(card, 45), st.stored + toBarrier * 0.8);
          if (nOf(card) === 47) { st.questHits++; st.questAbsorbed += toBarrier; }
          if (nOf(card) === 50 && st.overdrive <= 0) st.rage = Math.min(30, st.rage + toBarrier);
          if (cardFamily(card.id) === 'recoil') st.stored = Math.min(40 * factor(card), st.stored + toBarrier * 0.5);
        }
        if (activeAmp(defender, lane, 'amp-07')) amps[defender][lane].stored = Math.min(24, amps[defender][lane].stored + toBarrier * 0.4);
        if (activeAmp(defender, lane, 'amp-10') && !amps[defender][lane].used) {
          amps[defender][lane].used = true;
          const weapon = sameLane(defender, lane).find((c) => baseDirect(c) > 0 && (arenaCard(c.id) ? !['passive', 'shield', 'heal', 'tempo'].includes(arenaCard(c.id)!.kind) : ['damage', 'corrode'].includes(cardDef(c.id).kind)));
          if (weapon) put({ kind: 'damage', sourceUid: weapon.uid, causeUid: `amp-${defender}-${lane}`, source: '跃迁栓', origin: defender as Side, targetSide: other(defender), lane,
            value: Math.min(32, baseDirect(weapon) * 0.6), delay: 1.25, projectile: true, free: true });
        }
      }
      if (!b.broken && b.hp <= 0) {
        b.hp = 0; b.broken = true;
        log.push(`${defender ? '敌方' : '我方'}${['左', '中', '右'][lane]}路屏障损毁，增幅器失效。`);
      }
      if (ev.procEligible && attackerCard && !ev.periodic && amount > 0) {
        for (const card of neighbors(ev.origin, attackerCard)) if (nOf(card) === 12 && canProc(`ignite:${card.uid}`, 2))
          put({ kind: 'burn', sourceUid: card.uid, causeUid: attackerCard.uid, origin: ev.origin, targetSide: defender, lane, value: stacks(card, 2) });
      }
    };
    const process = () => {
      let processed = 0;
      const priority: Record<EventKind, number> = { damage: 0, corrode: 1, burn: 1, shield: 2, heal: 3, slow: 4, freeze: 4, haste: 4, amp: 4, ammo: 4, charge: 5 };
      while (pending.some((e) => e.tick <= now)) {
        const due = pending.filter((e) => e.tick <= now).sort((a, b) => priority[a.kind] - priority[b.kind] || a.tick - b.tick || a.serial - b.serial);
        processed += due.length;
        if (processed > 150) throw Error('效果连锁超过每帧上限');
        for (const ev of due) pending.splice(pending.indexOf(ev), 1);
        for (const ev of due) {
          const lane = ev.lane, side = ev.targetSide, b = barrier[side][lane], card = cardsByUid.get(ev.sourceUid);
          if (ev.kind === 'damage') applyDamage(ev);
          else if (ev.kind === 'corrode') {
            if (ev.periodic) { applyDamage({ ...ev, kind: 'corrode' });
              if (card) for (const grow of sameLane(ev.origin, lane)) if (nOf(grow) === 18) state.get(grow.uid)!.growth = Math.min(value(grow, 40), state.get(grow.uid)!.growth + value(grow, 4));
            } else {
              const before = corrosion[side][lane];
              const effective = Math.max(0, Math.min(12 - before, ev.value - (activeAmp(side, lane, 'amp-03') && ev.value > 1 ? 1 : 0)));
              corrosion[side][lane] += effective;
              if (effective > 0) corrosionSource[side][lane] = ev.sourceUid;
              localHit(ev, 'corrode', effective, { targetUid: `barrier-${side}-${lane}`, targetName: `侵蚀 ${corrosion[side][lane]} 层` });
            }
          } else if (ev.kind === 'burn') {
            if (ev.periodic) { applyDamage({ ...ev, kind: 'burn' });
              for (const c of sameLane(ev.origin, lane)) if (nOf(c) === 15 && canProc(`heat:${c.uid}`, 1)) {
                const target = sameLane(ev.origin, lane).find((x) => x.uid !== c.uid);
                if (target) put({ kind: 'charge', sourceUid: c.uid, causeUid: `barrier-${side}-${lane}`, origin: ev.origin, targetSide: ev.origin, lane, value: duration(c, 0.5, 1.5), targetUid: target.uid });
              }
            } else {
              const heatedCell = card ? card.at : -1;
              const isHot = card && laneOf(card) === lane && heated[ev.origin][heatedCell] && !chilled[ev.origin][heatedCell];
              const localAmp = card && laneOf(card) === lane && activeAmp(ev.origin, lane, 'amp-05');
              const applied = Math.min(24 - burn[side][lane], ev.value + (isHot ? 2 : 0) + (localAmp ? 1 : 0));
              burn[side][lane] += applied;
              if (applied > 0) burnSource[side][lane] = ev.sourceUid;
              localHit(ev, 'burn', applied, { targetUid: `barrier-${side}-${lane}`, targetName: `灼烧 ${burn[side][lane]} 层` });
            }
          } else if (ev.kind === 'shield') {
            let asked = ev.value;
            if (card && laneOf(card) === lane && activeAmp(side, lane, 'amp-06')) asked += Math.min(8, asked * 0.25);
            const actual = b.broken ? 0 : Math.min(asked, Math.max(0, b.maxHp - b.hp));
            b.hp += actual;
            localHit(ev, 'shield', actual, { targetUid: `barrier-${side}-${lane}`, targetName: '屏障修复' });
          } else if (ev.kind === 'heal') {
            const actual = Math.min(ev.value, Math.max(0, d.maxHp[side] - hp[side]));
            hp[side] += actual;
            localHit(ev, 'heal', actual, { targetUid: `host-${side}-lane-${lane}`, targetName: '宿主治疗' });
          } else if (ev.kind === 'charge') {
            const st = ev.targetUid ? state.get(ev.targetUid) : undefined;
            const actual = st && st.freeze <= 0 ? ev.value : 0;
            if (st) st.timer += actual;
            localHit(ev, 'charge', actual, { targetUid: ev.targetUid, targetName: actual ? '充能' : '无效充能' });
          } else if (ev.kind === 'slow' || ev.kind === 'freeze' || ev.kind === 'haste') {
            const target = ev.targetUid ? cardsByUid.get(ev.targetUid) : undefined;
            let actual = target ? ev.value : 0;
            if (target && (ev.kind === 'slow' || ev.kind === 'freeze')) {
              if (ev.kind === 'freeze' && card && chilled[ev.origin][card.at]) actual += 0.5;
              const tSide = owner.get(target.uid)!;
              const flying = neighbors(tSide, target).some((x) => nOf(x) === 35);
              if (flying) actual *= 0.5;
              if (activeAmp(tSide, laneOf(target), 'amp-09')) actual *= 0.5;
              actual = Math.max(0.25, Math.floor(actual * 4 + 1e-9) / 4);
            }
            if (target) {
              const st = state.get(target.uid)!;
              st[ev.kind] = Math.max(st[ev.kind], actual);
            }
            localHit(ev, ev.kind, actual, { targetUid: target?.uid, targetName: target ? cardDef(target.id).name : '无目标' });
            if (ev.kind === 'slow' && actual > 0) for (const watcher of sameLane(ev.origin, lane)) if (nOf(watcher) === 39 && canProc(`dual:${watcher.uid}`, 4)) {
              const ally = sameLane(ev.origin, lane).find((x) => x.uid !== watcher.uid);
              if (ally) put({ kind: 'haste', sourceUid: watcher.uid, causeUid: ev.sourceUid, origin: ev.origin, targetSide: ev.origin, lane, value: duration(watcher, 1.5, 4), targetUid: ally.uid });
            }
          } else if (ev.kind === 'amp') {
            const amp = amps[side][lane];
            const actual = ev.value > 0 && amp.id && !b.broken && !amp.disabled ? 1 : ev.value < 0 && amp.id && !b.broken && amp.disabled ? 1 : 0;
            if (actual) amp.disabled = ev.value > 0;
            localHit(ev, 'amp', actual, { targetName: actual ? (amp.disabled ? '增幅器拆解' : '增幅器复机') : '增幅器未改变' });
          } else if (ev.kind === 'ammo') {
            const st = ev.targetUid ? state.get(ev.targetUid) : undefined;
            const actual = st ? Math.min(ev.value, 6 - st.ammo) : 0;
            if (st) st.ammo += actual;
            localHit(ev, 'ammo', actual, { targetUid: ev.targetUid, targetName: '弹药装填' });
          }
        }
      }
    };
    if (now > 0 && now % 4 === 0) for (let side = 0; side < 2; side++) for (let lane = 0; lane < 3; lane++) {
      if (corrosion[side][lane] > 0) put({ kind: 'corrode', sourceUid: corrosionSource[side][lane] || `host-${other(side as Side)}-lane-${lane}`,
        source: '侵蚀', origin: other(side as Side), targetSide: side as Side, lane, value: corrosion[side][lane], periodic: true });
    }
    if (now > 0 && now % 2 === 0) for (let side = 0; side < 2; side++) for (let lane = 0; lane < 3; lane++) {
      if (burn[side][lane] > 0) {
        put({ kind: 'burn', sourceUid: burnSource[side][lane] || `host-${other(side as Side)}-lane-${lane}`,
          source: '灼烧', origin: other(side as Side), targetSide: side as Side, lane, value: burn[side][lane], periodic: true });
        burn[side][lane]--;
      }
    }
    process();
    for (let side = 0; side < 2; side++) hp[side] = Math.max(0, hp[side] - hostDamage[side]);
    hostDamage.fill(0);
    for (const healing of delayedHeals.splice(0)) put({ kind: 'heal', sourceUid: healing.uid, source: healing.name,
      origin: healing.side, targetSide: healing.side, lane: healing.lane, value: healing.value });
    process();
    if (now > 0 && hp.every((h) => h > 0)) {
      for (let side = 0; side < 2; side++) for (const card of boards[side]) {
        const st = state.get(card.uid)!, def = cardDef(card.id), lane = laneOf(card);
        if (!def.cd) continue;
        const originalCd = def.cd;
        const cd = nOf(card) === 50 && st.overdrive > 0 ? 4 : originalCd;
        const rate = st.freeze > 0 ? 0 : Math.min(2.5, (st.haste > 0 ? 2 : 1) * (st.slow > 0 ? 0.5 : 1) * (activeAmp(side as Side, lane, 'amp-08') && barrier[side][lane].hp > barrier[side][lane].maxHp / 2 ? 1.15 : 1));
        st.timer += 0.25 * rate;
        if (st.timer + 1e-9 < cd || st.freeze > 0) continue;
        if ([1, 2].includes(nOf(card)) && st.ammo <= 0) { st.timer = cd; waiting.push(card.uid); continue; }
        st.timer -= cd;
        st.count++;
        fired.push(card.uid);
        if (nOf(card) !== 38) tempo[side] = Math.min(6, tempo[side] + 1);
        const s = side as Side, enemy = other(s), num = nOf(card), family = cardFamily(card.id);
        const shotLanes: number[] = [];
        const attack = (amount: number, targetLane = lane, extra: Partial<Event> = {}, travel = 1.25) => {
          shotLanes.push(targetLane);
          put({ kind: 'damage', sourceUid: card.uid, origin: s, targetSide: enemy, lane: targetLane, value: value(card, amount) + st.growth,
            delay: travel, projectile: travel > 0, procEligible: true, ...extra });
        };
        const corrode = (amount: number, targetLane = lane, travel = 1.25) =>
          put({ kind: 'corrode', sourceUid: card.uid, origin: s, targetSide: enemy, lane: targetLane, value: stacks(card, amount), delay: travel, projectile: travel > 0 });
        const ignite = (amount: number, targetLane = lane, travel = 1.25) =>
          put({ kind: 'burn', sourceUid: card.uid, origin: s, targetSide: enemy, lane: targetLane, value: stacks(card, amount), delay: travel, projectile: travel > 0 });
        const shield = (amount: number, targetLane = lane) => put({ kind: 'shield', sourceUid: card.uid, origin: s, targetSide: s, lane: targetLane, value: value(card, amount) });
        const heal = (amount: number) => put({ kind: 'heal', sourceUid: card.uid, origin: s, targetSide: s, lane, value: value(card, amount) });
        const charge = (uid: string | undefined, amount: number) => uid && put({ kind: 'charge', sourceUid: card.uid, origin: s, targetSide: s, lane, value: duration(card, amount, amount + 1), targetUid: uid });
        const close = neighbors(s, card)[0];
        switch (num) {
          case 1: st.ammo--; attack(12); break;
          case 2: { const shots = Math.min(2, st.ammo); st.ammo -= shots; for (let i = 0; i < shots; i++) attack(20, lane, {}, 1.25 + i * 0.25); break; }
          case 3: attack(75); break;
          case 4: attack(7, lane, { bonusIfBroken: value(card, 15) }, 0); break;
          case 5: attack(8, lane, { slow: duration(card, 2, 4), targetUid: targetCard(enemy, lane)?.uid }); break;
          case 6: attack(st.count % 3 === 0 ? 52 : 26); break;
          case 8: attack(27, weakerAdjacent(enemy, lane) ?? lane); break;
          case 9: attack(50, lane, { pierce: value(card, 10) }); break;
          case 10: attack(5, lane, {}, 0); if (!barrier[enemy][lane].broken && activeAmp(enemy, lane)) put({ kind: 'amp', sourceUid: card.uid, origin: s, targetSide: enemy, lane, value: 1 }); break;
          case 11: ignite(8); break;
          case 13: attack(28, lane, { bonusIfBurning: value(card, 18) }); break;
          case 14: ignite(5, lane, 0); break;
          case 15: ignite(3); break;
          case 16: { corrode(3); const next = weakerAdjacent(enemy, lane); if (next !== undefined) corrode(2, next); break; }
          case 17: attack(7); corrode(1); break;
          case 18: attack(8); break;
          case 19: attack(10, lane, { bonusPerCorrosion: 0.75 * factor(card) }); break;
          case 20: { attack(12, lane, {}, 0); const consumed = Math.min(6, burn[enemy][lane]); burn[enemy][lane] -= consumed; if (consumed >= 2) corrode(Math.floor(consumed / 2), lane, 0); break; }
          case 21: shield(14); break;
          case 24: st.regen = Math.min(value(card, 3), st.regen + value(card, 1)); break;
          case 25: attack(9, lane, { lifesteal: 0.5 }, 0); break;
          case 26: attack(22 + st.stored / factor(card)); st.stored = 0; break;
          case 27: { const cleaned = Math.min(corrosion[s][lane], stacks(card, 3)); corrosion[s][lane] -= cleaned; if (cleaned) shield(8); break; }
          case 28: heal(20); burn[s][lane] = Math.max(0, burn[s][lane] - stacks(card, 4)); break;
          case 29: shield(barrier[s][lane].hp < barrier[s][lane].maxHp * 0.4 ? 30 : 8); break;
          case 30: shield(10); break;
          case 31: charge(close?.uid, 1); break;
          case 32: if (close) put({ kind: 'haste', sourceUid: card.uid, origin: s, targetSide: s, lane, value: duration(card, 2, 4), targetUid: close.uid }); break;
          case 33: put({ kind: 'slow', sourceUid: card.uid, origin: s, targetSide: enemy, lane, value: duration(card, 2, 4), targetUid: targetCard(enemy, lane)?.uid }); break;
          case 34: put({ kind: 'freeze', sourceUid: card.uid, origin: s, targetSide: enemy, lane, value: duration(card, 1, 2), targetUid: targetCard(enemy, lane)?.uid }); break;
          case 35: shield(6); break;
          case 36: if (activeAmp(s, lane) || !amps[s][lane].id || barrier[s][lane].broken) shield(12); else put({ kind: 'amp', sourceUid: card.uid, origin: s, targetSide: s, lane, value: -1 }); break;
          case 37: { const target = neighbors(s, card).filter((x) => [1, 2].includes(nOf(x))).sort((a, b) => state.get(a.uid)!.ammo - state.get(b.uid)!.ammo || a.at - b.at)[0]; if (target) put({ kind: 'ammo', sourceUid: card.uid, origin: s, targetSide: s, lane, value: Math.min(4, 2 + Math.floor(card.level / 3) + card.quality), targetUid: target.uid }); break; }
          case 38: if (tempo[s] >= 4) { tempo[s] -= 4; for (const l of [lane - 1, lane + 1]) if (l >= 0 && l < 3) { const target = sameLane(s, l)[0]; if (target) put({ kind: 'charge', sourceUid: card.uid, origin: s, targetSide: s, lane: l, value: duration(card, 1.5, 2.5), targetUid: target.uid }); } } break;
          case 40: { const target = targetCard(enemy, lane); if (target) put({ kind: 'freeze', sourceUid: card.uid, origin: s, targetSide: enemy, lane, value: duration(card, 0.75, 2), targetUid: target.uid }); break; }
          case 41: attack(sameLane(s, lane).length === 1 ? 48 : 26); break;
          case 43: { const occupied = boards[enemy].some((x) => laneOf(x) === lane && x.at <= lane * 3 + colOf(card) && lane * 3 + colOf(card) < x.at + cardDef(x.id).size);
            attack(9, lane, { shieldOnly: occupied && !barrier[enemy][lane].broken ? value(card, 5) : 0 }); break; }
          case 44: attack(23, barrier[enemy][lane].broken ? weakerAdjacent(enemy, lane, true) ?? lane : lane); break;
          case 46: { const solo = sameLane(s, lane).length === 1; attack(solo ? 30 : 10); if (solo) charge(card.uid, 1); break; }
          case 47: if (st.questHits >= 2 && st.questAbsorbed >= 45) attack(30); else shield(8); break;
          case 48: if (!barrier[s][lane].broken && barrier[s][lane].hp <= barrier[s][lane].maxHp / 2) shield(24); else attack(28); break;
          case 50: attack(st.overdrive > 0 ? 56 : 38); break;
          default: {
            if (family === 'nailer') attack(def.power + (st.count <= 2 ? 16 : 0));
            else if (family === 'gapblade') attack(def.power + (barrier[enemy][lane].broken ? 6 : 0), lane, {}, 0);
            else if (family === 'springbow') attack(def.power + (st.count <= 3 ? 16 : 0));
            else if (family === 'recoil') { attack(def.power + st.stored / factor(card)); st.stored = 0; }
            else if (family === 'sealant') shield(def.power, barrier[s][lane].broken ? [0, 1, 2].filter((l) => !barrier[s][l].broken).sort((a, b) => barrier[s][a].hp / barrier[s][a].maxHp - barrier[s][b].hp / barrier[s][b].maxHp || a - b)[0] ?? lane : lane);
            else if (family === 'rubber') shield(def.power);
            else if (family === 'counterweight') attack(def.power + (!barrier[s][lane].broken && barrier[s][lane].hp > barrier[s][lane].maxHp / 2 ? 20 : 0));
            else if (family === 'acid') corrode(def.power);
            else if (family === 'culture') attack(def.power + (st.count - 1) * 8, [0, 1, 2].sort((a, b) => corrosion[enemy][b] - corrosion[enemy][a] || a - b)[0]);
            else if (family === 'distiller') { corrode(def.power); heal(5); }
            else if (family === 'fuse' || family === 'catalyst') charge(sameLane(s, lane).find((x) => x.uid !== card.uid)?.uid, def.power + (family === 'fuse' && st.count === 1 ? 2 : family === 'catalyst' && corrosion[enemy][lane] > 0 ? 0.8 : 0));
            else if (family === 'slingshot') attack(def.power);
          }
        }
        for (const watcher of boards[side]) if (watcher.uid !== card.uid) {
          const wn = nOf(watcher), ws = state.get(watcher.uid)!;
          if (wn === 7 && adjacent(watcher, card) && ['damage', 'control', 'corrode', 'burn'].includes(cardDef(card.id).kind) && canProc(`echo:${watcher.uid}`, 2))
            put({ kind: 'damage', sourceUid: watcher.uid, causeUid: card.uid, origin: s, targetSide: enemy, lane: shotLanes[0] ?? lane, value: value(watcher, 6), delay: 1.25, projectile: true, free: true });
          if (wn === 42 && adjacent(watcher, card) && canProc(`resonate:${watcher.uid}:${card.uid}`, 3))
            put({ kind: 'charge', sourceUid: watcher.uid, causeUid: card.uid, origin: s, targetSide: s, lane, value: duration(watcher, 0.5, 1.5), targetUid: card.uid });
          if (wn === 49 && adjacent(watcher, card) && ws.upgrade === 0) {
            const key = `upgrade-count:${watcher.uid}:${card.uid}`;
            const used = (procTimes.get(key) ?? 0) + 1;
            procTimes.set(key, used);
            if (used >= 3) { state.get(card.uid)!.upgrade = Math.min(0.36, 0.2 + 0.02 * watcher.level + 0.03 * watcher.quality); ws.upgrade = 1; links.push({ from: watcher.uid, to: card.uid, label: '升阶' }); }
          }
          if (wn === 45 && laneOf(watcher) !== lane && colOf(watcher) === colOf(card)) {
            for (const mate of boards[side]) if (mate.uid !== card.uid && laneOf(mate) !== laneOf(watcher) && colOf(mate) === colOf(watcher))
              state.get(mate.uid)!.growth = Math.min(10, state.get(mate.uid)!.growth + 1);
          }
        }
      }
      process();
      for (let side = 0; side < 2; side++) hp[side] = Math.max(0, hp[side] - hostDamage[side]);
      hostDamage.fill(0);
      for (const healing of delayedHeals.splice(0)) put({ kind: 'heal', sourceUid: healing.uid, source: healing.name,
        origin: healing.side, targetSide: healing.side, lane: healing.lane, value: healing.value });
      process();
      if (now % 4 === 0) for (let side = 0; side < 2; side++) {
        const regen = boards[side].reduce((sum, card) => sum + state.get(card.uid)!.regen, 0);
        if (regen > 0) {
          const actual = Math.min(regen, Math.max(0, d.maxHp[side] - hp[side]));
          hp[side] += actual;
          hits.push({ kind: 'heal', side, source: '再生', value: round(actual), targetLane: 1, targetUid: `host-${side}-lane-1`, visual: 'heal', periodic: true });
        }
      }
      for (const st of state.values()) {
        st.haste = Math.max(0, st.haste - 0.25); st.slow = Math.max(0, st.slow - 0.25); st.freeze = Math.max(0, st.freeze - 0.25);
        if (st.overdrive > 0) st.overdrive = Math.max(0, st.overdrive - 0.25);
        else if (st.rage >= 30) { st.rage = 0; st.overdrive = 6; }
      }
    }
    const timers = [Array<number>(9).fill(0), Array<number>(9).fill(0)];
    const cd = [Array<number>(9).fill(0), Array<number>(9).fill(0)];
    boards.forEach((board, side) => board.forEach((card) => { timers[side][card.at] = state.get(card.uid)!.timer; cd[side][card.at] = nOf(card) === 50 && state.get(card.uid)!.overdrive > 0 ? 4 : cardDef(card.id).cd; }));
    frames.push({ time, hp: hp.map(round), barriers: structuredClone(barrier), corrosion: corrosion.map((x) => [...x]), burn: burn.map((x) => [...x]),
      links: [...links], cardState: Object.fromEntries([...state].map(([uid, s]) => [uid, { activations: s.count, growth: round(s.growth), upgrade: s.upgrade, questHits: s.questHits, questAbsorbed: round(s.questAbsorbed), rage: round(s.rage), overdrive: s.overdrive, regen: round(s.regen) }])),
      amplifierState: amps.map(row=>row.map(a=>({stored:round(a.stored),used:a.used}))),
      stored: Object.fromEntries([...state].map(([uid, s]) => [uid, round(s.stored)])), heroMeters: [[0, 0, 0], [0, 0, 0]], energy: [0, 0], timers, cd, fired, waiting, hits,
      projectiles: pending.filter((ev) => ev.tick > now).map((ev): Projectile => ({
        id: `arena-${ev.serial}`, side: ev.targetSide, kind: ev.kind, value: ev.value, source: ev.source,
        sourceUid: ev.sourceUid, targetLane: ev.lane, targetUid: ev.targetUid, launchedAt: ev.launchedTick / 4, impactAt: ev.tick / 4,
        visual: ev.kind === 'burn' ? 'burn' : ev.kind === 'corrode' ? 'poison' : ev.kind === 'freeze' ? 'freeze' : ev.kind === 'slow' ? 'slow' : 'damage',
      })), log, ammo: Object.fromEntries([...state].map(([uid, s]) => [uid, s.ammo])),
      amplifierActive: amps.map((row, side) => row.map((a, lane) => !!a.id && !a.disabled && !barrier[side][lane].broken)),
      haste: Object.fromEntries([...state].map(([uid, s]) => [uid, s.haste])), slow: Object.fromEntries([...state].map(([uid, s]) => [uid, s.slow])),
      freeze: Object.fromEntries([...state].map(([uid, s]) => [uid, s.freeze])), tempo: [...tempo] });
    if (hp.some((h) => h <= 0)) break;
  }
  const timedOut = hp.every((h) => h > 0);
  const winner = timedOut || hp.every((h) => h <= 0) ? -1 : hp[1] <= 0 ? 0 : 1;
  return { frames, winner, duration: frames.at(-1)!.time, timedOut };
}
