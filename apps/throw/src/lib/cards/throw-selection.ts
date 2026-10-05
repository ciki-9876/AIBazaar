/** Clicking always replaces a box selection; clicks never accumulate cards. */
export function clickThrowSelection(selected: string[], uid: string): string[] {
  return selected.length === 1 && selected[0] === uid ? [] : [uid];
}
