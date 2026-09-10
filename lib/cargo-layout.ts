export type CargoItem = {
  uid: string;
  volume: number;
  slot?: number;
  rotated?: boolean;
};
export const dimensions = (item: CargoItem) =>
  item.rotated ? { w: 1, h: item.volume } : { w: item.volume, h: 1 };
export function cells(
  item: CargoItem,
  slot: number,
  columns: number,
  capacity: number,
): number[] | null {
  const { w, h } = dimensions(item);
  if (!Number.isInteger(slot) || slot < 0 || (slot % columns) + w > columns)
    return null;
  const result = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => slot + y * columns + x),
  ).flat();
  return result.every((x) => x < capacity) ? result : null;
}
export function layout<T extends CargoItem>(
  items: T[],
  columns: number,
  capacity: number,
): T[] {
  const occupied = new Set<number>();
  const positions = new Map<string, T>();
  for (const item of items.filter((x) => x.slot !== undefined)) {
    const covered = cells(item, item.slot!, columns, capacity);
    if (!covered || covered.some((c) => occupied.has(c)))
      throw Error('物品越界或重叠，请先整理空位');
    covered.forEach((c) => occupied.add(c));
    positions.set(item.uid, { ...item });
  }
  for (const item of items.filter((x) => x.slot === undefined)) {
    let placed = false;
    for (const rotated of [item.rotated ?? false, !(item.rotated ?? false)]) {
      for (let slot = 0; slot < capacity; slot++) {
        const candidate = { ...item, rotated, slot };
        const covered = cells(candidate, slot, columns, capacity);
        if (covered && covered.every((c) => !occupied.has(c))) {
          covered.forEach((c) => occupied.add(c));
          positions.set(item.uid, candidate);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) throw Error('没有放得下这件物品的连续空位，请移动或旋转物品');
  }
  return items.map((item) => positions.get(item.uid)!);
}
