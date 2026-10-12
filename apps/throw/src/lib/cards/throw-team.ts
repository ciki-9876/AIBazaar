import { PRESETS, RELICS, packThrowItems, validThrowLayout, type ItemId, type ItemPlacement, type RelicId, type Style } from './throw-loadout.ts';
import { validDeckBook, type DeckBook } from './throw-enchant.ts';
import { isPerformer, type PerformerId } from './throw-performer.ts';

export type MemberThrowLoadout = { style: Style; layout: ItemPlacement[]; relic: RelicId | null; book?: DeckBook };
export type PreparedThrowLoadout = MemberThrowLoadout & { members?: Partial<Record<PerformerId, MemberThrowLoadout>>; order?: PerformerId[] };
export type SharedThrowPool = { items: readonly ItemId[]; relics: readonly RelicId[]; variants?: readonly string[] };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function validMemberThrowLoadout(value: unknown): value is MemberThrowLoadout {
  return record(value) && typeof value.style === 'string' && Object.hasOwn(PRESETS, value.style)
    && Array.isArray(value.layout) && value.layout.every(record) && validThrowLayout(value.layout as ItemPlacement[])
    && (value.relic === null || RELICS.some(({ id }) => id === value.relic))
    && (value.book === undefined || record(value.book) && Object.values(value.book).every((id) => typeof id === 'string') && validDeckBook(value.book as DeckBook));
}
/** Optional member metadata extends old single-trunk saves without changing storage keys. */
export function validPreparedThrowLoadout(value: unknown): value is PreparedThrowLoadout {
  return validMemberThrowLoadout(value) && (!Object.hasOwn(value, 'order') || Array.isArray((value as PreparedThrowLoadout).order) && (value as PreparedThrowLoadout).order!.length >= 2 && (value as PreparedThrowLoadout).order!.length <= 3 && (value as PreparedThrowLoadout).order!.every(isPerformer) && new Set((value as PreparedThrowLoadout).order).size === (value as PreparedThrowLoadout).order!.length) && (!Object.hasOwn(value, 'members') ||
    (record((value as PreparedThrowLoadout).members) && Object.entries((value as PreparedThrowLoadout).members!).every(([id, kit]) => id !== 'eli' && isPerformer(id) && validMemberThrowLoadout(kit))));
}
export const bookRefs = (book: DeckBook = {}) => Object.entries(book).map(([key, id]) => `${key}:${id}`);
/** A physical item, relic or collected variant can only be assigned to one team member. */
export function freeTeamPool(pool: SharedThrowPool, other: MemberThrowLoadout): SharedThrowPool {
  const assigned = new Set(other.layout.map(({ id }) => id));
  const variants = new Set(bookRefs(other.book));
  return { items: pool.items.filter((id) => !assigned.has(id)), relics: pool.relics.filter((id) => id !== other.relic),
    ...(pool.variants ? { variants: pool.variants.filter((ref) => !variants.has(ref)) } : {}) };
}
/** Trim to the real pool, preserving exact positions and absent (plain) card slots. */
export function fitMemberThrowLoadout(kit: MemberThrowLoadout, pool: SharedThrowPool): MemberThrowLoadout {
  const layout = kit.layout.filter(({ id }) => pool.items.includes(id));
  return { style: kit.style, layout: structuredClone(layout), relic: kit.relic && pool.relics.includes(kit.relic) ? kit.relic : null,
    book: Object.fromEntries(Object.entries(kit.book ?? {}).filter(([key, id]) => !pool.variants || pool.variants.includes(`${key}:${id}`))) };
}
export function initialReserveLoadout(primary: MemberThrowLoadout, candidate: MemberThrowLoadout, pool: SharedThrowPool): MemberThrowLoadout {
  return fitMemberThrowLoadout(candidate, freeTeamPool(pool, primary));
}
/** Final start validation is independent of whichever preparation tab is visible. */
export function validTeamAllocation(primary: MemberThrowLoadout, reserve: MemberThrowLoadout, pool: SharedThrowPool): boolean {
  if (![primary, reserve].every(validMemberThrowLoadout)) return false;
  const free = freeTeamPool(pool, primary);
  return primary.layout.every(({ id }) => pool.items.includes(id)) && (!primary.relic || pool.relics.includes(primary.relic))
    && reserve.layout.every(({ id }) => free.items.includes(id)) && (!reserve.relic || free.relics.includes(reserve.relic))
    && bookRefs(primary.book).every((ref) => !pool.variants || pool.variants.includes(ref))
    && bookRefs(reserve.book).every((ref) => !free.variants || free.variants.includes(ref));
}
export function presetMemberLoadout(style: Style, book: DeckBook = {}): MemberThrowLoadout {
  return { style, layout: packThrowItems(PRESETS[style].items), relic: PRESETS[style].relic, book };
}

export function freeTeamPoolMany(pool: SharedThrowPool, kits: readonly MemberThrowLoadout[]) {
  return kits.reduce((free, kit) => freeTeamPool(free, kit), pool);
}
export function validTeamAllocationMany(kits: readonly MemberThrowLoadout[], pool: SharedThrowPool): boolean {
  let free = pool;
  for (const kit of kits) {
    if (!validMemberThrowLoadout(kit) || kit.layout.some(({ id }) => !free.items.includes(id)) || kit.relic && !free.relics.includes(kit.relic) || free.variants && bookRefs(kit.book).some((ref) => !free.variants!.includes(ref))) return false;
    free = freeTeamPool(free, kit);
  }
  return true;
}
