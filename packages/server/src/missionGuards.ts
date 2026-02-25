import type { GameState, Player } from "@bomb-busters/shared";

/**
 * Mission 41 skip condition:
 * a player with only their own tripwire (one yellow) and optional red wires must skip.
 */
export function isMission41PlayerSkippingTurn(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): boolean {
  if (state.mission !== 41) return false;

  const uncutTiles = player.hand.filter((tile) => !tile.cut);
  if (uncutTiles.length === 0) return false;

  const uncutYellowCount = uncutTiles.filter((tile) => tile.color === "yellow").length;
  if (uncutYellowCount !== 1) return false;

  return uncutTiles.every((tile) => tile.color === "yellow" || tile.color === "red");
}
