import type {
  ActionLegalityCode,
  ActionLegalityError,
  GameState,
  Player,
} from "@bomb-busters/shared";
import { requiredSetupInfoTokenCountForMission } from "@bomb-busters/shared";

function legalityError(
  code: ActionLegalityCode,
  message: string,
): ActionLegalityError {
  return { code, message };
}

/**
 * Count how many of the 13 possible wire values (1-12 + YELLOW) are NOT
 * present in the player's uncut hand. Used to cap mission 22 setup tokens.
 */
function countAbsentValues(player: Readonly<Player>): number {
  const present = new Set<number | "YELLOW">();
  for (const tile of player.hand) {
    if (tile.cut) continue;
    if (tile.gameValue === "YELLOW") {
      present.add("YELLOW");
    } else if (typeof tile.gameValue === "number") {
      present.add(tile.gameValue);
    }
  }
  // 13 possible values: 1-12 numeric + YELLOW
  return 13 - present.size;
}

/**
 * Number of setup info tokens this player must place for the active mission.
 */
export function requiredSetupInfoTokenCount(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): number {
  const base = requiredSetupInfoTokenCountForMission(
    state.mission,
    state.players.length,
    player.isCaptain,
  );

  // Mission 22: cap at the number of values absent from the player's hand
  if (state.mission === 22) {
    return Math.min(base, countAbsentValues(player));
  }

  return base;
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

export interface AutoSetupInfoTokenPlacement {
  playerId: string;
  token: {
    value: number;
    position: number;
    isYellow: false;
  };
}

function mission13AvailableBlueValues(player: Readonly<Player>): number[] {
  const values = new Set<number>();
  for (const tile of player.hand) {
    if (tile.cut) continue;
    if (tile.color !== "blue") continue;
    if (typeof tile.gameValue !== "number") continue;
    values.add(tile.gameValue);
  }
  return [...values];
}

function mission13MatchingBlueIndices(player: Readonly<Player>, value: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < player.hand.length; i++) {
    const tile = player.hand[i];
    if (tile.cut) continue;
    if (tile.color !== "blue") continue;
    if (tile.gameValue !== value) continue;
    indices.push(i);
  }
  return indices;
}

/**
 * Mission 13 setup: each required player receives a random valid info token
 * and it is automatically placed on a matching blue wire.
 */
export function autoPlaceMission13RandomSetupInfoTokens(
  state: GameState,
  rng: () => number = Math.random,
): AutoSetupInfoTokenPlacement[] {
  if (state.phase !== "setup_info_tokens" || state.mission !== 13) {
    return [];
  }

  const placements: AutoSetupInfoTokenPlacement[] = [];
  for (const player of state.players) {
    const required = requiredSetupInfoTokenCount(state, player);
    while (player.infoTokens.length < required) {
      const values = mission13AvailableBlueValues(player);
      if (values.length === 0) break;

      const value = values[Math.floor(rng() * values.length)];
      const indices = mission13MatchingBlueIndices(player, value);
      if (indices.length === 0) break;

      const position = indices[Math.floor(rng() * indices.length)];
      const token = { value, position, isYellow: false as const };
      player.infoTokens.push(token);
      placements.push({ playerId: player.id, token });
    }
  }

  return placements;
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
  state: Readonly<GameState>,
  player: Readonly<Player>,
  value: number,
  tileIndex: number,
): ActionLegalityError | null {
  // Mission 22: absent-value tokens placed "next to stand" (position -1).
  // Value 0 = yellow absent, 1-12 = numeric absent.
  if (state.mission === 22) {
    if (tileIndex !== -1) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission 22 setup tokens must be placed next to stand (tileIndex -1)",
      );
    }

    if (!Number.isInteger(value) || value < 0 || value > 12) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission 22 setup token value must be 0 (yellow) or 1-12",
      );
    }

    // Check the value is actually absent from player's uncut hand
    const isYellowAbsent = value === 0;
    if (isYellowAbsent) {
      const hasYellow = player.hand.some(
        (t) => !t.cut && t.gameValue === "YELLOW",
      );
      if (hasYellow) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Cannot declare yellow absent when you have yellow wires",
        );
      }
    } else {
      const hasValue = player.hand.some(
        (t) => !t.cut && t.gameValue === value,
      );
      if (hasValue) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Cannot declare a value absent when you have wires of that value",
        );
      }
    }

    // No duplicate absent tokens for same value
    const alreadyPlaced = player.infoTokens.some((t) => {
      if (isYellowAbsent) return t.isYellow && t.position === -1;
      return !t.isYellow && t.value === value && t.position === -1;
    });
    if (alreadyPlaced) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "You already placed an absent token for this value",
      );
    }

    return null;
  }

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

  const hasTokenOnWire = player.infoTokens.some(
    (token) => token.position === tileIndex || token.positionB === tileIndex,
  );
  if (hasTokenOnWire) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "This wire already has an info token",
    );
  }

  // Mission 17: captain places false tokens and may not place on red wires.
  if (state.mission === 17 && player.isCaptain) {
    if (tile.color === "red") {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Captain false setup tokens cannot target red wires",
      );
    }
    if (typeof tile.gameValue === "number" && tile.gameValue === value) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Captain setup token must be false in mission 17",
      );
    }
    return null;
  }

  // Mission 52: all setup tokens are false and may target blue or red wires.
  if (state.mission === 52) {
    if (tile.color === "yellow") {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission 52 setup tokens can only target blue or red wires",
      );
    }
    if (tile.color === "blue" && typeof tile.gameValue === "number" && tile.gameValue === value) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission 52 setup token must be false",
      );
    }
    return null;
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
