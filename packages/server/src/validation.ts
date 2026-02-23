import type {
  ActionLegalityCode,
  ActionLegalityError,
  GameState,
  Player,
  WireTile,
} from "@bomb-busters/shared";
import { DOUBLE_DETECTOR_CHARACTERS } from "@bomb-busters/shared";
import { dispatchHooks, getBlueAsRedValue } from "./missionHooks.js";

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

function legalityError(
  code: ActionLegalityCode,
  message: string,
): ActionLegalityError {
  return { code, message };
}

/**
 * Whether this player is currently forced to use Reveal Reds.
 * - Standard missions: all remaining uncut wires are red.
 * - Mission 11: all remaining uncut wires are the hidden blue-as-red value.
 */
export function isRevealRedsForced(
  state: Readonly<GameState>,
  player: Readonly<Player>,
): boolean {
  const uncutTiles = getUncutTiles(player);
  if (uncutTiles.length === 0) return false;

  if (state.mission === 11) {
    const hiddenBlueAsRedValue = getBlueAsRedValue(state);
    if (hiddenBlueAsRedValue == null) return false;
    return uncutTiles.every((t) => t.gameValue === hiddenBlueAsRedValue);
  }

  return uncutTiles.every((t) => t.color === "red");
}

/** Check if a dual cut action is valid (base rules only). */
export function validateDualCutLegality(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  targetTileIndex: number,
  guessValue: number | "YELLOW",
): ActionLegalityError | null {
  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!target) {
    return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
  }

  if (actorId === targetPlayerId) {
    return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
  }

  const targetTile = getTileByFlatIndex(target, targetTileIndex);
  if (!targetTile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
  if (targetTile.cut) return legalityError("TILE_ALREADY_CUT", "Tile already cut");

  // Actor must have an uncut tile with the guessed value
  const actorUncut = getUncutTiles(actor);
  const actorHasValue = actorUncut.some((t) => t.gameValue === guessValue);
  if (!actorHasValue) {
    return legalityError(
      "GUESS_VALUE_NOT_IN_HAND",
      "You don't have a wire with that value",
    );
  }

  return null;
}

/** Compatibility wrapper returning just the message string. */
export function validateDualCut(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  targetTileIndex: number,
  guessValue: number | "YELLOW",
): string | null {
  return validateDualCutLegality(
    state,
    actorId,
    targetPlayerId,
    targetTileIndex,
    guessValue,
  )?.message ?? null;
}

/** Check if a dual cut double detector action is valid (base rules only). */
export function validateDualCutDoubleDetectorLegality(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  tileIndex1: number,
  tileIndex2: number,
  guessValue: number,
): ActionLegalityError | null {
  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  // Mission 28: Captain Lazy has no personal equipment.
  if (state.mission === 28 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Captain Lazy cannot use personal equipment in mission 28",
    );
  }

  if (!actor.character || !DOUBLE_DETECTOR_CHARACTERS.has(actor.character)) {
    return legalityError(
      "CHARACTER_ABILITY_WRONG_CHARACTER",
      "Only the Double Detector character can use this ability",
    );
  }

  if (actor.characterUsed && state.mission !== 58) {
    return legalityError(
      "CHARACTER_ABILITY_ALREADY_USED",
      "Character ability already used this mission",
    );
  }

  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!target) {
    return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
  }

  if (actorId === targetPlayerId) {
    return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
  }

  if (tileIndex1 === tileIndex2) {
    return legalityError(
      "DOUBLE_DETECTOR_INVALID_TILES",
      "Must select two different tiles",
    );
  }

  const tile1 = getTileByFlatIndex(target, tileIndex1);
  const tile2 = getTileByFlatIndex(target, tileIndex2);
  if (!tile1 || !tile2) {
    return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
  }
  if (tile1.cut) {
    return legalityError("TILE_ALREADY_CUT", "Tile 1 already cut");
  }
  if (tile2.cut) {
    return legalityError("TILE_ALREADY_CUT", "Tile 2 already cut");
  }

  if (typeof guessValue !== "number") {
    return legalityError(
      "DOUBLE_DETECTOR_GUESS_NOT_BLUE",
      "Guess value must be a number (not yellow)",
    );
  }

  // Actor must have an uncut blue tile with the guessed value
  const actorUncut = getUncutTiles(actor);
  const actorHasValue = actorUncut.some(
    (t) => t.color === "blue" && t.gameValue === guessValue,
  );
  if (!actorHasValue) {
    return legalityError(
      "GUESS_VALUE_NOT_IN_HAND",
      "You don't have an uncut blue wire with that value",
    );
  }

  return null;
}

/** Check if a solo cut action is valid (base rules only). */
export function validateSoloCutLegality(
  state: GameState,
  actorId: string,
  value: number | "YELLOW",
): ActionLegalityError | null {
  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  const actorUncut = getUncutTiles(actor);
  const matchingTiles = actorUncut.filter((t) => t.gameValue === value);

  if (matchingTiles.length === 0) {
    return legalityError(
      "NO_MATCHING_WIRES_IN_HAND",
      "You don't have any wires with that value",
    );
  }

  // Solo cut: all remaining copies of this value in the game must be in actor's hand
  // Count total uncut tiles with this value across ALL players
  const totalRemaining = state.players.reduce((sum, p) => {
    return sum + getUncutTiles(p).filter((t) => t.gameValue === value).length;
  }, 0);

  if (typeof value === "number") {
    if (totalRemaining !== matchingTiles.length) {
      return legalityError(
        "SOLO_NOT_ALL_REMAINING_IN_HAND",
        "Not all remaining wires of this value are in your hand",
      );
    }

    // Must be either 2 or 4 remaining (pairs)
    if (matchingTiles.length !== 2 && matchingTiles.length !== 4) {
      return legalityError(
        "SOLO_REQUIRES_TWO_OR_FOUR",
        "Solo cut requires exactly 2 or 4 matching wires",
      );
    }
  } else {
    // Yellow wire: ALL remaining yellow wires must be in actor's hand
    if (totalRemaining !== matchingTiles.length) {
      return legalityError(
        "SOLO_NOT_ALL_REMAINING_IN_HAND",
        "Not all remaining yellow wires are in your hand",
      );
    }
  }

  return null;
}

/** Compatibility wrapper returning just the message string. */
export function validateSoloCut(
  state: GameState,
  actorId: string,
  value: number | "YELLOW",
): string | null {
  return validateSoloCutLegality(state, actorId, value)?.message ?? null;
}

/** Check if reveal reds action is valid (base rules only). */
export function validateRevealRedsLegality(
  state: GameState,
  actorId: string,
): ActionLegalityError | null {
  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  const uncutTiles = getUncutTiles(actor);
  if (uncutTiles.length === 0) {
    return legalityError("NO_WIRES_TO_REVEAL", "No wires to reveal");
  }

  if (state.mission === 11) {
    const hiddenBlueAsRedValue = getBlueAsRedValue(state);
    if (hiddenBlueAsRedValue == null) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission setup is missing hidden value configuration",
      );
    }

    const allHiddenValue = uncutTiles.every(
      (t) => t.gameValue === hiddenBlueAsRedValue,
    );
    if (!allHiddenValue) {
      return legalityError(
        "REVEAL_REDS_REQUIRES_ALL_RED",
        "In this mission, you can only reveal when all remaining wires are the hidden red-like value",
      );
    }

    return null;
  }

  const allRed = uncutTiles.every((t) => t.color === "red");
  if (!allRed) {
    return legalityError(
      "REVEAL_REDS_REQUIRES_ALL_RED",
      "Not all remaining wires are red",
    );
  }

  return null;
}

/** Compatibility wrapper returning just the message string. */
export function validateRevealReds(
  state: GameState,
  actorId: string,
): string | null {
  return validateRevealRedsLegality(state, actorId)?.message ?? null;
}

export type ValidatableAction =
  | {
      type: "dualCut";
      actorId: string;
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
    }
  | {
      type: "dualCutDoubleDetector";
      actorId: string;
      targetPlayerId: string;
      tileIndex1: number;
      tileIndex2: number;
      guessValue: number;
    }
  | {
      type: "soloCut";
      actorId: string;
      value: number | "YELLOW";
    }
  | {
      type: "revealReds";
      actorId: string;
    };

/** Validate an action with both base rules and mission hook validation. */
export function validateActionWithHooks(
  state: GameState,
  action: ValidatableAction,
): ActionLegalityError | null {
  // Block all cut actions while a forced action is pending
  if (state.pendingForcedAction) {
    return legalityError(
      "FORCED_ACTION_PENDING",
      "A forced action must be resolved before you can act",
    );
  }

  const actor = state.players.find((p) => p.id === action.actorId);
  if (!actor) {
    return legalityError("ACTOR_NOT_FOUND", "Actor not found");
  }

  if (action.type !== "revealReds" && isRevealRedsForced(state, actor)) {
    return legalityError(
      "FORCED_REVEAL_REDS_REQUIRED",
      "You must reveal your remaining red-like wires before taking another action",
    );
  }

  switch (action.type) {
    case "dualCut": {
      const baseError = validateDualCutLegality(
        state,
        action.actorId,
        action.targetPlayerId,
        action.targetTileIndex,
        action.guessValue,
      );
      if (baseError) return baseError;
      break;
    }
    case "dualCutDoubleDetector": {
      const baseError = validateDualCutDoubleDetectorLegality(
        state,
        action.actorId,
        action.targetPlayerId,
        action.tileIndex1,
        action.tileIndex2,
        action.guessValue,
      );
      if (baseError) return baseError;
      break;
    }
    case "soloCut": {
      const baseError = validateSoloCutLegality(
        state,
        action.actorId,
        action.value,
      );
      if (baseError) return baseError;
      break;
    }
    case "revealReds": {
      const baseError = validateRevealRedsLegality(state, action.actorId);
      if (baseError) return baseError;
      break;
    }
  }

  // Double Detector validation is mission-agnostic at the moment.
  // Hook validation currently accepts core turn actions only.
  if (action.type === "dualCutDoubleDetector") {
    return null;
  }

  const hookResult = dispatchHooks(state.mission, {
    point: "validate",
    state,
    action,
  });
  if (hookResult.validationError) {
    return legalityError(
      hookResult.validationCode ?? "MISSION_RULE_VIOLATION",
      hookResult.validationError,
    );
  }

  return null;
}

export function validateDualCutWithHooks(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  targetTileIndex: number,
  guessValue: number | "YELLOW",
): ActionLegalityError | null {
  return validateActionWithHooks(state, {
    type: "dualCut",
    actorId,
    targetPlayerId,
    targetTileIndex,
    guessValue,
  });
}

export function validateSoloCutWithHooks(
  state: GameState,
  actorId: string,
  value: number | "YELLOW",
): ActionLegalityError | null {
  return validateActionWithHooks(state, { type: "soloCut", actorId, value });
}

export function validateRevealRedsWithHooks(
  state: GameState,
  actorId: string,
): ActionLegalityError | null {
  return validateActionWithHooks(state, { type: "revealReds", actorId });
}

export function validateDualCutDoubleDetectorWithHooks(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  tileIndex1: number,
  tileIndex2: number,
  guessValue: number,
): ActionLegalityError | null {
  return validateActionWithHooks(state, {
    type: "dualCutDoubleDetector",
    actorId,
    targetPlayerId,
    tileIndex1,
    tileIndex2,
    guessValue,
  });
}
