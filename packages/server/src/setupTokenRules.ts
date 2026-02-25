import type {
  ActionLegalityCode,
  ActionLegalityError,
  GameState,
  Player,
} from "@bomb-busters/shared";
import {
  requiredSetupInfoTokenCountForMissionAndHand,
} from "@bomb-busters/shared";
import { getMission22TokenPassBoardState } from "./mission22TokenPass.js";

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
  const base = requiredSetupInfoTokenCountForMissionAndHand(
    state.mission,
    state.players.length,
    player.isCaptain,
    player.hand,
  );
  if (isAllFalseSetupMode(state)) {
    return 2;
  }
  if (isCaptainFalseSetupMode(state, player)) {
    return 2;
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

function randomSetupTokenValue(rng: () => number): number {
  // Setup draw excludes yellow token for these missions.
  return Math.floor(rng() * 12) + 1;
}

function isMission43TwoPlayerCaptainRandomSetup(state: Readonly<GameState>): boolean {
  return state.mission === 43 && state.players.length === 2;
}

function randomSetupMatchingBlueIndices(player: Readonly<Player>, value: number): number[] {
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
 * Missions with random setup info tokens: each required player receives a
 * random valid info token and it is automatically placed on a matching blue wire.
 *
 * Mission 43 (2-player override): only the Captain's setup token is random.
 */
export function autoPlaceMission13RandomSetupInfoTokens(
  state: GameState,
  rng: () => number = Math.random,
): AutoSetupInfoTokenPlacement[] {
  const randomSetupEnabled =
    state.campaign != null
    && (state.campaign as Record<string, unknown>).randomSetupInfoTokens === true;
  const mission43CaptainRandomOnly = isMission43TwoPlayerCaptainRandomSetup(state);

  if (
    state.phase !== "setup_info_tokens"
    || (!randomSetupEnabled && !mission43CaptainRandomOnly)
  ) {
    return [];
  }

  const placements: AutoSetupInfoTokenPlacement[] = [];
  for (const player of state.players) {
    if (mission43CaptainRandomOnly && !player.isCaptain) {
      continue;
    }

    const required = requiredSetupInfoTokenCount(state, player);
    while (player.infoTokens.length < required) {
      const value = randomSetupTokenValue(rng);
      const indices = randomSetupMatchingBlueIndices(player, value);
      const position = indices.length === 0
        ? -1
        : indices[Math.floor(rng() * indices.length)];
      const token = { value, position, isYellow: false as const };
      player.infoTokens.push(token);
      placements.push({ playerId: player.id, token });
    }
  }

  return placements;
}

function isCaptainFalseSetupMode(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): boolean {
  return (
    player.isCaptain
    && (state.campaign?.falseInfoTokenMode === true || state.mission === 17)
  );
}

function isAllFalseSetupMode(state: Readonly<GameState>): boolean {
  return state.campaign?.falseTokenMode === true || state.mission === 52;
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
    const mission22Board = getMission22TokenPassBoardState(state);
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
    const alreadyDeclared = player.infoTokens.some(
      (token) =>
        token.position === -1 &&
        token.isYellow === isYellowAbsent &&
        token.value === value,
    );
    if (alreadyDeclared) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Cannot declare the same absent value more than once (already placed).",
      );
    }

    if (isYellowAbsent) {
      if (mission22Board.yellowTokens <= 0) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Token value is not available on the board",
        );
      }
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
      if (!mission22Board.numericTokens.includes(value)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Token value is not available on the board",
        );
      }
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

  // Mission 17 and campaign false-info-token mode: captain places false tokens and may not place on red wires.
  if (isCaptainFalseSetupMode(state, player)) {
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

  // Mission 52 and campaign false-token mode: all setup tokens are false and may target blue or red wires.
  if (isAllFalseSetupMode(state)) {
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
