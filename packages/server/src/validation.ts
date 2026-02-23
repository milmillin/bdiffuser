import type { GameState, Player, WireTile } from "@bomb-busters/shared";

/** Get all uncut tiles in a player's hand */
export function getUncutTiles(player: Player): WireTile[] {
  return player.hand.filter((t) => !t.cut);
}

/** Get all tiles in a player's hand */
export function getAllTiles(player: Player): WireTile[] {
  return player.hand;
}

/** Find a tile by index in the player's hand */
export function getTileByFlatIndex(player: Player, index: number): WireTile | undefined {
  return player.hand[index];
}

/** Check if it's this player's turn */
export function isPlayersTurn(state: GameState, playerId: string): boolean {
  if (state.phase !== "playing") return false;
  const currentPlayer = state.players[state.currentPlayerIndex];
  return currentPlayer?.id === playerId;
}

/** Check if a dual cut action is valid */
export function validateDualCut(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  targetTileIndex: number,
  guessValue: number | "YELLOW",
): string | null {
  if (!isPlayersTurn(state, actorId)) return "Not your turn";

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return "Actor not found";

  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!target) return "Target player not found";

  if (actorId === targetPlayerId) return "Cannot target yourself";

  const targetTile = getTileByFlatIndex(target, targetTileIndex);
  if (!targetTile) return "Invalid tile index";
  if (targetTile.cut) return "Tile already cut";

  // Actor must have an uncut tile with the guessed value
  const actorUncut = getUncutTiles(actor);
  const actorHasValue = actorUncut.some((t) => t.gameValue === guessValue);
  if (!actorHasValue) return "You don't have a wire with that value";

  return null;
}

/** Check if a solo cut action is valid */
export function validateSoloCut(
  state: GameState,
  actorId: string,
  value: number | "YELLOW",
): string | null {
  if (!isPlayersTurn(state, actorId)) return "Not your turn";

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return "Actor not found";

  const actorUncut = getUncutTiles(actor);
  const matchingTiles = actorUncut.filter((t) => t.gameValue === value);

  if (matchingTiles.length === 0) return "You don't have any wires with that value";

  // Solo cut: all remaining copies of this value in the game must be in actor's hand
  // Count total uncut tiles with this value across ALL players
  const totalRemaining = state.players.reduce((sum, p) => {
    return sum + getUncutTiles(p).filter((t) => t.gameValue === value).length;
  }, 0);

  // Count how many have been cut already (for blue wires, 4 copies total)
  if (typeof value === "number") {
    // Blue wire: need either all 4 or the remaining 2 (if 2 already cut)
    const totalCut = state.players.reduce((sum, p) => {
      return sum + getAllTiles(p).filter((t) => t.gameValue === value && t.cut).length;
    }, 0);

    if (totalRemaining !== matchingTiles.length) {
      return "Not all remaining wires of this value are in your hand";
    }

    // Must be either 2 or 4 remaining (pairs)
    if (matchingTiles.length !== 2 && matchingTiles.length !== 4) {
      return "Solo cut requires exactly 2 or 4 matching wires";
    }
  } else {
    // Yellow wire: ALL remaining yellow wires must be in actor's hand
    if (totalRemaining !== matchingTiles.length) {
      return "Not all remaining yellow wires are in your hand";
    }
  }

  return null;
}

/** Check if reveal reds action is valid */
export function validateRevealReds(
  state: GameState,
  actorId: string,
): string | null {
  if (!isPlayersTurn(state, actorId)) return "Not your turn";

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return "Actor not found";

  const uncutTiles = getUncutTiles(actor);
  if (uncutTiles.length === 0) return "No wires to reveal";

  const allRed = uncutTiles.every((t) => t.color === "red");
  if (!allRed) return "Not all remaining wires are red";

  return null;
}
