import type {
  ActionLegalityCode,
  ActionLegalityError,
  GameState,
  Player,
} from "@bomb-busters/shared";

function legalityError(
  code: ActionLegalityCode,
  message: string,
): ActionLegalityError {
  return { code, message };
}

/**
 * Number of setup info tokens this player must place for the active mission.
 */
export function requiredSetupInfoTokenCount(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): number {
  // Mission 11, 2-player override: captain does not place an info token.
  if (state.mission === 11 && state.players.length === 2 && player.isCaptain) {
    return 0;
  }
  return 1;
}

/**
 * Whether a player has completed their setup token obligation.
 */
export function hasCompletedSetupInfoTokens(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): boolean {
  return player.infoTokens.length >= requiredSetupInfoTokenCount(state, player);
}

/**
 * Whether all players have completed setup info token placement.
 */
export function allSetupInfoTokensPlaced(state: Readonly<GameState>): boolean {
  return state.players.every((p) => hasCompletedSetupInfoTokens(state, p));
}

/**
 * Move currentPlayerIndex to the next player (clockwise) who still needs to
 * place setup info tokens. If everyone is complete, index may rotate fully.
 */
export function advanceToNextSetupPlayer(state: GameState): void {
  const playerCount = state.players.length;
  if (playerCount === 0) return;

  for (let i = 0; i < playerCount; i++) {
    const current = state.players[state.currentPlayerIndex];
    if (!hasCompletedSetupInfoTokens(state, current)) return;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;
  }
}

/**
 * Validate a setup info-token placement.
 *
 * Base setup rule:
 * - Token must target one of your own blue wires.
 * - Token value must match that wire's blue value.
 * - Setup never uses yellow tokens.
 */
export function validateSetupInfoTokenPlacement(
  player: Readonly<Player>,
  value: number,
  tileIndex: number,
): ActionLegalityError | null {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Setup info token value must be an integer between 1 and 12",
    );
  }

  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= player.hand.length) {
    return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
  }

  const tile = player.hand[tileIndex];
  if (tile.cut) {
    return legalityError("TILE_ALREADY_CUT", "Cannot place token on a cut wire");
  }

  if (tile.color !== "blue" || typeof tile.gameValue !== "number") {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Setup info token must target one of your blue wires",
    );
  }

  if (tile.gameValue !== value) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Setup info token value must match the targeted blue wire",
    );
  }

  return null;
}
