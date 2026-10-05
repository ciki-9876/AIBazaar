import { ITEMS, ROOM, type SurvivalState } from './survival-room.ts';
import { itemIds, stackLimit } from './survival-stacks.ts';
import { canonicalJson } from '../packages/core/serialization.ts';
import { createSeasonWorld } from './survival-season-world.ts';
import {
  rescueUnits,
  seasonPlayer,
  seasonRoomSeed,
  seasonRoomKey,
  type SeasonState,
} from './survival-season.ts';

const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const point = (v: { x: number; z: number }) =>
  v &&
  number(v.x) &&
  number(v.z) &&
  v.x >= 0 &&
  v.x <= ROOM.width &&
  v.z >= 0 &&
  v.z <= ROOM.depth;
const unique = (values: unknown[]) => new Set(values).size === values.length;
export function validSeason(
  value: unknown,
  room: SurvivalState,
): value is SeasonState {
  try {
    const s = value as SeasonState;
    if (
      room.seasonRules &&
      canonicalJson(room.world) !==
        canonicalJson(createSeasonWorld(room.seed, room.floor!))
    )
      return false;
    if (
      !s ||
      s.version !== 1 ||
      !integer(s.seed, 0xffffffff) ||
      !integer(s.tick) ||
      !integer(s.phaseTick) ||
      !integer(s.serial) ||
      !integer(s.eliminations, 31) ||
      typeof s.initialized !== 'boolean' ||
      typeof s.broadcastSeen !== 'boolean' ||
      s.tutorialTicket !== true ||
      ![
        'entry',
        'gathering',
        'broadcast',
        'boarding',
        'live',
        'victory',
        'defeat',
      ].includes(s.phase)
    )
      return false;
    if (
      !Array.isArray(s.actors) ||
      !s.actors.length ||
      s.actors.length > 32 ||
      !unique(s.actors.map((a) => a.id)) ||
      s.actors.filter((a) => a.controller === 'player').length !== 1 ||
      seasonPlayer(s)?.controller !== 'player'
    )
      return false;
    const actors = new Set(s.actors.map((a) => a.id));
    for (const a of s.actors)
      if (
        !a.id ||
        typeof a.name !== 'string' ||
        typeof a.number !== 'string' ||
        !['player', 'external'].includes(a.controller) ||
        !['alive', 'dead', 'winner'].includes(a.status) ||
        !integer(a.floor, 100) ||
        a.floor < 3 ||
        !point(a.position) ||
        typeof a.inLift !== 'boolean' ||
        ![a.hp, a.food, a.water].every(
          (v) => number(v) && v >= 0 && v <= 100,
        ) ||
        !Array.isArray(a.passes) ||
        a.passes.length > 10 ||
        !unique(a.passes.map((p) => p.id)) ||
        !a.passes.every(
          (p) =>
            typeof p.id === 'string' && !!p.id && typeof p.source === 'string',
        ) ||
        !Array.isArray(a.qualified) ||
        !unique(a.qualified) ||
        !a.qualified.every(
          (f) => integer(f, 100) && f >= 10 && f % 10 === 0 && f <= a.floor,
        ) ||
        (a.status === 'dead' && a.hp !== 0)
      )
        return false;
    if (
      !Array.isArray(s.checkpoints) ||
      s.checkpoints.length !== 10 ||
      !Array.isArray(s.golden) ||
      !unique(s.golden.map((g) => g.id))
    )
      return false;
    for (const [i, p] of s.checkpoints.entries()) {
      if (
        p.floor !== (i + 1) * 10 ||
        !Array.isArray(p.arrived) ||
        !Array.isArray(p.roster) ||
        ![p.arrived, p.roster].every(
          (ids) => unique(ids) && ids.every((id) => actors.has(id)),
        ) ||
        !integer(p.x, 31) ||
        !integer(p.issued, 32) ||
        typeof p.settled !== 'boolean' ||
        (p.frozenAt !== null && (!integer(p.frozenAt) || p.frozenAt > s.tick))
      )
        return false;
      const tokens = s.golden.filter((g) => g.floor === p.floor);
      if (
        p.frozenAt === null
          ? p.roster.length || p.issued || p.x || p.settled || tokens.length
          : !p.arrived.length ||
            p.issued !== p.roster.length - p.x ||
            tokens.length !== p.issued ||
            p.x !==
              Math.min(
                p.floor === 100
                  ? Math.max(0, p.roster.length - 1)
                  : s.eliminations,
                Math.max(0, p.roster.length - 1),
              )
      )
        return false;
      if (p.floor > 10 && p.frozenAt !== null && !s.checkpoints[i - 1].settled)
        return false;
      for (const [n, g] of tokens.entries())
        if (
          g.id !== `gold:${s.seed}:${p.floor}:${n}` ||
          !point(g.position) ||
          !['ground', 'carried', 'redeemed'].includes(g.status) ||
          (g.status === 'ground'
            ? g.owner !== null
            : !g.owner || !p.roster.includes(g.owner))
        )
          return false;
    }
    for (const a of s.actors)
      for (const floor of a.qualified)
        if (
          s.golden.filter(
            (g) =>
              g.floor === floor && g.status === 'redeemed' && g.owner === a.id,
          ).length !== 1
        )
          return false;
    for (const g of s.golden)
      if (
        g.status === 'redeemed' &&
        !s.actors.find((a) => a.id === g.owner)?.qualified.includes(g.floor)
      )
        return false;
    if (
      ['live', 'victory', 'defeat'].includes(s.phase) !== s.initialized ||
      (['boarding', 'live', 'victory', 'defeat'].includes(s.phase) &&
        !s.broadcastSeen)
    )
      return false;
    if (
      s.phase === 'victory'
        ? !s.result ||
          s.result.floor !== 100 ||
          !s.actors.some(
            (a) =>
              a.id === s.result?.actor &&
              a.status === 'winner' &&
              a.qualified.includes(100),
          )
        : s.phase === 'defeat'
          ? seasonPlayer(s).status !== 'dead' || !s.result
          : s.result !== null
    )
      return false;
    if (
      !Array.isArray(s.sources) ||
      s.sources.length > 32 * 96 * 3 ||
      !unique(s.sources.map((q) => q.id)) ||
      !s.sources.every(
        (q) =>
          point(q) &&
          actors.has(q.actor) &&
          integer(q.floor, 99) &&
          q.floor >= 5 &&
          q.floor % 10 !== 0 &&
          integer(q.amount, 2) &&
          q.amount >= 1 &&
          q.duration === 90 &&
          typeof q.taken === 'boolean' &&
          q.id.startsWith(`ordinary:${s.seed}:${q.actor}:${q.floor}:`),
      )
    )
      return false;
    if (
      !s.work ||
      typeof s.work !== 'object' ||
      !Object.entries(s.work).every(
        ([id, w]) =>
          actors.has(id) &&
          integer(w.ticks, 89) &&
          s.sources.some(
            (q) => q.id === w.source && !q.taken && q.actor === id,
          ),
      )
    )
      return false;
    if (
      !Array.isArray(s.events) ||
      s.events.length > 128 ||
      !unique(s.events.map((e) => e.id)) ||
      !s.events.every(
        (e) =>
          integer(e.id) &&
          e.id < s.serial &&
          integer(e.at) &&
          e.at <= s.tick &&
          actors.has(e.actor) &&
          typeof e.text === 'string' &&
          e.text.length < 500,
      )
    )
      return false;
    if (
      !s.worlds ||
      Array.isArray(s.worlds) ||
      typeof s.worlds !== 'object' ||
      Object.keys(s.worlds).length > 100 ||
      Object.hasOwn(s.worlds, seasonRoomKey(room.floor!))
    )
      return false;
    const allItems = [
      ...room.bag,
      ...room.safe,
      ...room.equipment.map((e) => e.item),
      ...(room.warehouse || []),
      ...room.caches.flatMap((c) => c.contents),
    ];
    for (const [key, w] of Object.entries(s.worlds)) {
      const match = /^(shared|player):(\d+)$/.exec(key),
        floor = match ? Number(match[2]) : 0;
      if (
        canonicalJson(w.world) !==
        canonicalJson(createSeasonWorld(w.seed, floor))
      )
        return false;
      if (
        !match ||
        floor < 4 ||
        floor > 100 ||
        key !== seasonRoomKey(floor) ||
        w.seed !== seasonRoomSeed(s.seed, floor) ||
        w.world.seed !== w.seed ||
        Object.hasOwn(w, 'bag') ||
        Object.hasOwn(w, 'player') ||
        !integer(w.tick) ||
        !integer(w.serial) ||
        !integer(w.rng, 0xffffffff) ||
        !integer(w.lootBudget, 36) ||
        !Array.isArray(w.caches) ||
        !Array.isArray(w.enemies) ||
        !Array.isArray(w.spawns) ||
        !w.caches.every(
          (c) =>
            point(c) &&
            integer(c.available) &&
            typeof c.opened === 'boolean' &&
            Array.isArray(c.contents),
        ) ||
        !w.enemies.every(
          (e) =>
            point(e) &&
            number(e.hp) &&
            number(e.maxHp) &&
            e.hp >= 0 &&
            e.maxHp > 0,
        ) ||
        !w.spawns.every((e) => point(e) && integer(e.at))
      )
        return false;
      if (
        !w.world.bounds ||
        !Object.values(w.world.bounds).every(number) ||
        !Array.isArray(w.world.modules) ||
        !Array.isArray(w.world.obstacles) ||
        !w.world.obstacles.every(
          (o) => point(o) && number(o.w) && number(o.d) && o.w > 0 && o.d > 0,
        ) ||
        !Array.isArray(w.world.gates) ||
        !w.world.gates.every(point) ||
        ![w.fog.explored, w.fog.visible].every(
          (v) =>
            Array.isArray(v) &&
            v.length === ROOM.width * ROOM.depth &&
            v.every((x) => x === 0 || x === 1),
        )
      )
        return false;
      allItems.push(...w.caches.flatMap((c) => c.contents));
    }
    if (
      !allItems.every(
        (i) =>
          !!i.uid &&
          ITEMS[i.kind]?.size === i.size &&
          typeof i.name === 'string' &&
          number(i.value) &&
          (!i.stack ||
            (Array.isArray(i.stack) &&
              i.stack.every((id) => typeof id === 'string' && !!id) &&
              i.stack.length < stackLimit(i))),
      )
    )
      return false;
    if (
      !unique(allItems.flatMap(itemIds)) ||
      [
        ...room.safe,
        ...room.equipment.map((e) => e.item),
        ...(room.warehouse || []),
      ].some((i) => i.kind === 'golden')
    )
      return false;
    for (const i of allItems.filter((i) => i.kind === 'golden'))
      if (
        !s.golden.some((g) => g.id === i.uid && g.status !== 'redeemed') ||
        i.stack?.length
      )
        return false;
    const carried = s.golden.filter(
      (g) => g.status === 'carried' && g.owner === 'player',
    );
    if (
      carried.length !== room.bag.filter((i) => i.kind === 'golden').length ||
      carried.some((g) => !room.bag.some((i) => i.uid === g.id))
    )
      return false;
    if (room.rescueReserved?.length && !rescueUnits(room)) return false;
    if (
      (room.floor || 1) >= 4 &&
      (room.seed !== seasonRoomSeed(s.seed, room.floor!) ||
        room.seasonRules !== true ||
        !integer(room.lootBudget, 36))
    )
      return false;
    return seasonPlayer(s).floor === room.floor;
  } catch {
    return false;
  }
}
