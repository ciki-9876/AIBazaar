import type { Item } from './survival-room.ts';
import { itemCount, itemIds, sameStack } from './survival-stacks.ts';

export type SettlementItem = Item & { location: string };
/** Display groups only: never turn the receipt into inventory or change its unit identities. */
export function settlementCards(receipt: readonly SettlementItem[]) {
  const cards: {
    key: string;
    item: Item;
    location: string;
    count: number;
    ids: string[];
  }[] = [];
  for (const item of receipt) {
    const card = cards.find(
      (c) => c.location === item.location && sameStack(c.item, item),
    );
    if (card) {
      card.count += itemCount(item);
      card.ids.push(...itemIds(item));
    } else
      cards.push({
        key: item.uid,
        item,
        location: item.location,
        count: itemCount(item),
        ids: itemIds(item),
      });
  }
  return cards;
}
