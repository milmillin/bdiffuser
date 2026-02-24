/** Convert a 0-based tile index to a wire label: 0→"A", 1→"B", ..., 25→"Z", 26→"AA", etc. */
export function wireLabel(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** Wire label with swap indicator: appends `*` if the tile is not on its original owner's stand. */
export function wireLabelOf(
  player: { id: string; hand: readonly { originalOwnerId?: string }[] },
  index: number,
): string {
  const tile = player.hand[index];
  const isSwapped = tile?.originalOwnerId != null && tile.originalOwnerId !== player.id;
  return wireLabel(index) + (isSwapped ? "*" : "");
}
