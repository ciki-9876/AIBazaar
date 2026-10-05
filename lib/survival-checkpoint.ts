import { itemIds, stackLimit, BRAIN_QUALITY } from './survival-stacks.ts';
import { createGuidance, GUIDE_COPY } from './survival-guidance.ts';
import type { OpeningState } from './survival-opening.ts';
import { ITEMS, fits, capacity } from './survival-room.ts';
import { cargoLayout, cargoFits, warehouseRows } from './survival-cargo.ts';
import { ROOM } from './survival-world.ts';
import { decodeSave, encodeSave } from '../packages/core/save-envelope.ts';
import { validRace, racePlayer, raceFloorSeed } from './survival-race.ts';
import { validSeason } from './survival-season-validation.ts';
import { seasonRoomSeed } from './survival-season.ts';

export const OPENING_SAVE_KEY = 'f9-survival-opening-v4';
// The room simulator retains its v6 replay contract; the race envelope is additive.
export const SURVIVAL_RULES_VERSION = 'f9-survival/6';
export const SURVIVAL_RACE_RULES_VERSION = 'f9-survival/7';
export const SURVIVAL_STORAGE_RULES_VERSION = 'f9-survival/8';
export const SURVIVAL_SEASON_RULES_VERSION = 'f9-survival/9';
export function serializeOpeningCheckpoint(state: OpeningState): string {
  return encodeSave(
    'elevator',
    state.version === 9
      ? SURVIVAL_SEASON_RULES_VERSION
      : SURVIVAL_STORAGE_RULES_VERSION,
    state,
  );
}
const stages =
  'waiting eyes where phone put-away door-thought door departing find-light equip-light find-box rustle sound-thought edge reveal fight aftermath return returning home second-departing expedition collapse'.split(
    ' ',
  );
const scenes =
  'rest look-right look-left flicker blackout approach scare plead welcome logo ai-thought warning silence threat ellipsis settlement request mouth feed upgrade thanks lights complete'.split(
    ' ',
  );
const phases =
  'recover-opening dormant quiet home question safe rule offer-food serve-food eat-food depart explore report equip-module upgrade-goal ascend branches complete'.split(
    ' ',
  );
/** Versioned local prototype checkpoint, separate from card-game saves. */
export function readOpeningCheckpoint(text: string): OpeningState | null {
  try {
    let payload: unknown;
    try {
      payload = decodeSave(text, 'elevator', SURVIVAL_SEASON_RULES_VERSION);
    } catch {
      try {
        payload = decodeSave(text, 'elevator', SURVIVAL_STORAGE_RULES_VERSION);
      } catch {
        try {
          payload = decodeSave(text, 'elevator', SURVIVAL_RACE_RULES_VERSION);
        } catch {
          payload = decodeSave(text, 'elevator', SURVIVAL_RULES_VERSION);
        }
      }
    }
    const envelope = JSON.parse(text) as Record<string, unknown>;
    const s = payload as OpeningState,
      r = s.room,
      a = s.afterlight;
    if (
      envelope.rulesVersion &&
      envelope.rulesVersion !== SURVIVAL_SEASON_RULES_VERSION &&
      envelope.rulesVersion !== SURVIVAL_STORAGE_RULES_VERSION &&
      (s.version === 7) !==
        (envelope.rulesVersion === SURVIVAL_RACE_RULES_VERSION)
    )
      return null;
    if (
      (s.version === 9) !==
      (envelope.rulesVersion === SURVIVAL_SEASON_RULES_VERSION)
    )
      return null;
    // v6/v7 lack these optional banks: interpret absence as empty, preserving UIDs.
    if (
      (r.warehouse !== undefined && !Array.isArray(r.warehouse)) ||
      (r.liftParts !== undefined &&
        (!Number.isInteger(r.liftParts) ||
          r.liftParts < 0 ||
          r.liftParts > 2)) ||
      (r.liftLevel !== undefined &&
        (!Number.isInteger(r.liftLevel) || r.liftLevel < 0 || r.liftLevel > 5))
    )
      return null;
    // Keep the same storage slot and migrate the previous playable chapter.
    if ((s as { version: number }).version === 4) {
      (s as { version: number }).version = 5;
      a.breadGiven = a.breadEaten = [
        'depart',
        'explore',
        'report',
        'branches',
        'complete',
      ].includes(a.phase);
      s.lift.choosingFloor = false;
      r.floor = s.lift.trips ? 2 : 1;
    }
    if ((s as { version: number }).version === 5) {
      s.version = 6;
      s.guidance = createGuidance();
      s.lift.highestFloor = r.floor || (s.lift.trips ? 2 : 1);
      a.equipmentTaught = false;
      a.waterFound = a.collected.some((i) => i.kind === 'water');
      a.failedReturn = false;
      // Preserve live geometry/UIDs from old saves; only new floors use the new manifest.
      r.world.theme = r.seed === 92620 ? 'wasteland' : 'maintenance';
      r.caches = r.caches.map((c) =>
        r.floor === 2 ? { ...c, manualEquip: true } : c,
      );
      if (a.breadEaten && r.player.water > 60) r.player.water = 60;
      s.guidance.startFood = r.player.food;
      s.guidance.startWater = r.player.water;
    }
    if (
      ![6, 7, 9].includes(s.version) ||
      (s.version === 7 ? !validRace(s.race) : s.race !== undefined) ||
      (s.version === 9
        ? s.season && !validSeason(s.season, r)
        : s.season !== undefined) ||
      !stages.includes(s.stage) ||
      !scenes.includes(s.homecoming.scene) ||
      !phases.includes(a.phase)
    )
      return null;
    const finite = (v: unknown): v is number =>
      typeof v === 'number' && Number.isFinite(v);
    if (
      (r.liftExperience !== undefined &&
        (!finite(r.liftExperience) || r.liftExperience < 0)) ||
      !finite(s.beat) ||
      !finite(s.homecoming.tick) ||
      !finite(a.tick) ||
      !finite(r.tick) ||
      !finite(r.rng) ||
      !finite(r.serial) ||
      !(
        [92620, 92621, 92622, 92623].includes(r.seed) ||
        (s.race && r.seed === raceFloorSeed(r.floor || 1)) ||
        (s.season && r.seed === seasonRoomSeed(s.season.seed, r.floor || 1))
      ) ||
      r.world.seed !== r.seed
    )
      return null;
    if (
      r.world.theme === 'pavilion' &&
      (!validGardenManifest(r.world.garden) || r.world.garden.seed !== r.seed)
    )
      return null;
    if (
      !['ready', 'departing', 'running', 'extracted', 'dead'].includes(
        r.status,
      ) ||
      !['pending', 'protected', 'skipped'].includes(a.safeChoice)
    )
      return null;
    for (const key of [
      'equipmentTaught',
      'waterFound',
      'failedReturn',
      'mapSeen',
      'needsSeen',
      'breadGiven',
      'breadEaten',
      'moduleSeen',
      'moduleDeferred',
      'linked',
      'tracesSeen',
      'freedomSeen',
    ] as const)
      if (typeof a[key] !== 'boolean') return null;
    if (
      typeof a.hint !== 'string' ||
      !finite(a.hintUntil) ||
      !finite(a.returnCount) ||
      !Array.isArray(a.departureOwned)
    )
      return null;
    if (
      typeof s.lift.repaired !== 'boolean' ||
      typeof s.lift.choosingFloor !== 'boolean' ||
      !(s.season
        ? Number.isInteger(r.floor) && r.floor! >= 3 && r.floor! <= 100
        : s.race
          ? Number.isInteger(r.floor) &&
            (r.floor || 0) >= 3 &&
            (r.floor || 0) <= 100 &&
            racePlayer(s.race).floor === r.floor
          : [1, 2, 3].includes(r.floor || 1)) ||
      !(s.race || s.season
        ? s.lift.highestFloor === r.floor
        : [1, 2, 3].includes(s.lift.highestFloor)) ||
      !finite(s.lift.trips) ||
      !Array.isArray(s.dropped)
    )
      return null;
    if (
      ![
        r.player.x,
        r.player.z,
        r.player.hp,
        r.player.water,
        r.player.food,
        r.player.energy,
        r.player.facing,
        r.player.hurtUntil,
        r.nextWave,
        r.departureTick,
        r.extraction,
        r.wave,
      ].every(finite)
    )
      return null;
    if (
      r.player.x < 0 ||
      r.player.x > ROOM.width ||
      r.player.z < 0 ||
      r.player.z > ROOM.depth
    )
      return null;
    if (
      ![r.player.hp, r.player.water, r.player.food, r.player.energy].every(
        (v) => v >= 0 && v <= 100,
      )
    )
      return null;
    if (
      ![r.fog.explored, r.fog.visible].every(
        (v) =>
          Array.isArray(v) &&
          v.length === ROOM.width * ROOM.depth &&
          v.every((x) => x === 0 || x === 1),
      )
    )
      return null;
    if (a.breadEaten && !a.breadGiven) return null;
    if (
      a.phase === 'eat-food' &&
      (!a.breadGiven ||
        a.breadEaten ||
        ![...r.bag, ...r.safe].some(
          (i) => i.kind === 'bread' && i.uid === 'anbo-welcome-bread',
        ))
    )
      return null;
    if (
      s.lift.choosingFloor &&
      (s.stage !== 'home' ||
        s.homecoming.scene !== 'complete' ||
        !a.breadEaten ||
        !['depart', 'upgrade-goal', 'ascend', 'branches', 'complete'].includes(
          a.phase,
        ))
    )
      return null;
    if (
      !s.guidance ||
      !Array.isArray(s.guidance.seen) ||
      !s.guidance.seen.every((id) => Object.hasOwn(GUIDE_COPY, id)) ||
      !finite(s.guidance.startFood) ||
      !finite(s.guidance.startWater) ||
      (s.guidance.active &&
        (!Object.hasOwn(GUIDE_COPY, s.guidance.active.id) ||
          !finite(s.guidance.active.remaining)))
    )
      return null;
    const validItem = (i: (typeof r.bag)[number]) =>
      i &&
      typeof i.uid === 'string' &&
      !!i.uid &&
      ITEMS[i.kind]?.size === i.size &&
      typeof i.name === 'string' &&
      finite(i.value) &&
      (!i.quality || Object.hasOwn(BRAIN_QUALITY, i.quality)) &&
      (!i.stack ||
        (Array.isArray(i.stack) &&
          i.stack.every((id) => typeof id === 'string' && !!id) &&
          i.stack.length < stackLimit(i)));
    const all = [
      ...r.bag,
      ...r.safe,
      ...r.equipment.map((e) => e.item),
      ...(r.warehouse || []),
      ...r.caches.flatMap((c) => c.contents),
    ];
    if (
      !all.every(validItem) ||
      (!s.season && all.some((i) => i.kind === 'golden')) ||
      new Set(all.flatMap(itemIds)).size !== all.flatMap(itemIds).length ||
      ![...a.collected, ...a.used, ...r.lost].every(validItem)
    )
      return null;
    if (
      capacity(r.bag) > 16 ||
      capacity(r.safe) > 1 ||
      capacity(r.warehouse || []) > 4 * warehouseRows(r.liftLevel) ||
      !r.equipment.every((e) =>
        fits(r.equipment, e.item.size, e.slot, e.item.uid),
      )
    )
      return null;
    const layout = cargoLayout(r.bag);
    const storageLayout = cargoLayout(
      r.warehouse || [],
      warehouseRows(r.liftLevel),
    );
    if (
      storageLayout.length !== (r.warehouse || []).length ||
      !storageLayout.every((p) =>
        cargoFits(
          storageLayout,
          p.item.size,
          p.slot,
          p.rotated,
          p.item.uid,
          warehouseRows(r.liftLevel),
        ),
      )
    )
      return null;
    if (
      !layout.every((p) =>
        cargoFits(layout, p.item.size, p.slot, p.rotated, p.item.uid),
      )
    )
      return null;
    if (
      !r.caches.every(
        (c) =>
          finite(c.x) &&
          finite(c.z) &&
          finite(c.available) &&
          typeof c.opened === 'boolean',
      )
    )
      return null;
    if (
      !r.enemies.every(
        (e) =>
          finite(e.hp) &&
          finite(e.x) &&
          finite(e.z) &&
          (e.level === undefined ||
            (Number.isInteger(e.level) && e.level >= 1)),
      ) ||
      !r.spawns.every((e) => finite(e.at) && finite(e.x) && finite(e.z))
    )
      return null;
    if (
      !Array.isArray(r.world.modules) ||
      !Array.isArray(r.world.obstacles) ||
      !Array.isArray(r.world.gates) ||
      !Array.isArray(r.effects) ||
      !Array.isArray(r.path)
    )
      return null;
    // Earlier meal saves could be completely full, before manual-use waste protection.
    if (
      s.afterlight.phase === 'eat-food' &&
      !s.afterlight.breadEaten &&
      r.player.food >= 100
    )
      return { ...s, room: { ...r, player: { ...r.player, food: 55 } } };
    return s;
  } catch {
    return null;
  }
}
import { validGardenManifest } from './survival-pavilion.ts';
