import { MAX_THROW } from './throw-poker.ts';

/** Clicking always replaces a box selection; clicks never accumulate cards. */
export function clickThrowSelection(selected: string[], uid: string): string[] {
  return selected.length === 1 && selected[0] === uid ? [] : [uid];
}

/**
 * v12 box selection (ADR-0060): the box keeps what it already holds and adds
 * newly covered cards nearest the drag's start first, until five. Cards the
 * box covers beyond that are ignored, and `capped` tells the table to say so.
 * `boxed` lists the covered cards nearest-first; `fresh` starts a new gesture.
 */
export function boxThrowSelection(previous: string[], boxed: string[], fresh: boolean) {
  const kept = fresh ? [] : previous.filter((id) => boxed.includes(id)).slice(0, MAX_THROW);
  for (const id of boxed) if (kept.length < MAX_THROW && !kept.includes(id)) kept.push(id);
  return { selected: kept, capped: boxed.length > kept.length };
}
