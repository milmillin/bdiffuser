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

type StandAwarePlayer = Player & {
  standSizes?: number[];
};

export interface StandRange {
  standIndex: number;
  start: number;
  endExclusive: number;
}

function getNormalizedStandSizes(player: Readonly<Player>): number[] {
  const standSizes = (player as Readonly<StandAwarePlayer>).standSizes;
  if (!Array.isArray(standSizes) || standSizes.length === 0) {
    return [player.hand.length];
  }
  if (!standSizes.every((size) => Number.isInteger(size) && size >= 0)) {
    return [player.hand.length];
  }
  const total = standSizes.reduce((sum, size) => sum + size, 0);
  if (total !== player.hand.length) {
    return [player.hand.length];
  }
  return standSizes;
}

/** Resolve stand sizes for this player, defaulting to a single stand. */
export function getPlayerStandSizes(player: Readonly<Player>): number[] {
  return getNormalizedStandSizes(player);
}

/** Resolve a stand's flat-index range. */
export function resolveStandRange(
  player: Readonly<Player>,
  standIndex: number,
): StandRange | null {
  if (!Number.isInteger(standIndex) || standIndex < 0) return null;

  const standSizes = getNormalizedStandSizes(player);
  if (standIndex >= standSizes.length) return null;

  let start = 0;
  for (let i = 0; i < standSizes.length; i++) {
    const endExclusive = start + standSizes[i];
    if (i === standIndex) {
      return { standIndex, start, endExclusive };
    }
    start = endExclusive;
  }
  return null;
}

/** Resolve which stand owns a given flat tile index. */
export function flatIndexToStandIndex(
  player: Readonly<Player>,
  flatIndex: number,
): number | null {
  if (!Number.isInteger(flatIndex) || flatIndex < 0 || flatIndex >= player.hand.length) {
    return null;
  }

  const standSizes = getNormalizedStandSizes(player);
  let start = 0;
  for (let standIndex = 0; standIndex < standSizes.length; standIndex++) {
    const endExclusive = start + standSizes[standIndex];
    if (flatIndex >= start && flatIndex < endExclusive) {
      return standIndex;
    }
    start = endExclusive;
  }
  return null;
}

/** Check whether two flat indices belong to the same stand. */
export function areFlatIndicesOnSameStand(
  player: Readonly<Player>,
  indexA: number,
  indexB: number,
): boolean {
  const standA = flatIndexToStandIndex(player, indexA);
  const standB = flatIndexToStandIndex(player, indexB);
  return standA != null && standA === standB;
}

/** Check adjacency constrained to a single stand boundary. */
export function areFlatIndicesAdjacentWithinStand(
  player: Readonly<Player>,
  indexA: number,
  indexB: number,
): boolean {
  return Math.abs(indexA - indexB) === 1 && areFlatIndicesOnSameStand(player, indexA, indexB);
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

function hasXWireEquipmentRestriction(state: Readonly<GameState>): boolean {
  return state.mission === 20 || state.mission === 35;
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

  // Mission 18: during cutter sub-turn, the designated cutter is not
  // forced to reveal reds — the designator chose them to cut.
  if (state.campaign?.mission18DesignatorIndex != null) {
    return false;
  }

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

export interface SimultaneousCutTarget {
  targetPlayerId: string;
  targetTileIndex: number;
  guessValue: number | "YELLOW";
}

function formatGuessValue(value: number | "YELLOW"): string {
  return typeof value === "number" ? String(value) : "YELLOW";
}

/** Check if a simultaneous multi-wire cut action is valid (base rules only). */
export function validateSimultaneousCutLegality(
  state: GameState,
  actorId: string,
  cuts: readonly SimultaneousCutTarget[],
): ActionLegalityError | null {
  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  if (cuts.length < 2) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Simultaneous cut requires at least 2 target wires",
    );
  }

  const seenTargets = new Set<string>();
  const requiredByGuess = new Map<number | "YELLOW", number>();

  for (const cut of cuts) {
    const target = state.players.find((p) => p.id === cut.targetPlayerId);
    if (!target) {
      return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
    }

    if (actorId === cut.targetPlayerId) {
      return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
    }

    const targetKey = `${cut.targetPlayerId}:${cut.targetTileIndex}`;
    if (seenTargets.has(targetKey)) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Cannot target the same wire twice in one simultaneous cut",
      );
    }
    seenTargets.add(targetKey);

    const targetTile = getTileByFlatIndex(target, cut.targetTileIndex);
    if (!targetTile) {
      return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
    }
    if (targetTile.cut) {
      return legalityError("TILE_ALREADY_CUT", "Tile already cut");
    }

    requiredByGuess.set(
      cut.guessValue,
      (requiredByGuess.get(cut.guessValue) ?? 0) + 1,
    );
  }

  const availableByGuess = new Map<number | "YELLOW", number>();
  for (const tile of getUncutTiles(actor)) {
    if (tile.gameValue === "RED") continue;
    availableByGuess.set(
      tile.gameValue,
      (availableByGuess.get(tile.gameValue) ?? 0) + 1,
    );
  }

  for (const [guessValue, required] of requiredByGuess) {
    const available = availableByGuess.get(guessValue) ?? 0;
    if (available < required) {
      return legalityError(
        "GUESS_VALUE_NOT_IN_HAND",
        `You need ${required} uncut wire(s) of value ${formatGuessValue(guessValue)} for this simultaneous cut`,
      );
    }
  }

  return null;
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

  // Mission 17: Sergio/captain has no personal equipment.
  if (state.mission === 17 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Sergio cannot use personal equipment in mission 17",
    );
  }

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
  if (!areFlatIndicesOnSameStand(target, tileIndex1, tileIndex2)) {
    return legalityError(
      "DOUBLE_DETECTOR_INVALID_TILES",
      "Double Detector targets must be on the same stand",
    );
  }
  if (tile1.cut) {
    return legalityError("TILE_ALREADY_CUT", "Tile 1 already cut");
  }
  if (tile2.cut) {
    return legalityError("TILE_ALREADY_CUT", "Tile 2 already cut");
  }

  // Missions 20/35: X-marked wires are ignored by personal equipment.
  if (hasXWireEquipmentRestriction(state) && (tile1.isXMarked || tile2.isXMarked)) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "X-marked wires cannot be targeted by personal equipment in this mission",
    );
  }

  // Mission 13: detector effects can only target blue wires.
  if (state.mission === 13 && (tile1.color !== "blue" || tile2.color !== "blue")) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Detectors can only target blue wires in mission 13",
    );
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

  if (state.mission === 13) {
    const allRed = uncutTiles.every((t) => t.color === "red");
    if (allRed) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "Mission 13 requires the simultaneous red cut action instead of Reveal Reds",
      );
    }
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

/** Check if a simultaneous red cut action is valid (base rules only). */
export function validateSimultaneousRedCutLegality(
  state: GameState,
  actorId: string,
  targets: Array<{ playerId: string; tileIndex: number }>,
): ActionLegalityError | null {
  if (state.mission !== 13) {
    return legalityError(
      "SIMULTANEOUS_RED_CUT_WRONG_MISSION",
      "Simultaneous red cut is only available in mission 13",
    );
  }

  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  // Check if any player has uncut red wires
  const anyUncutRed = state.players.some((p) =>
    p.hand.some((t) => !t.cut && t.color === "red"),
  );
  if (!anyUncutRed) {
    return legalityError("NO_UNCUT_RED_WIRES", "No player has uncut red wires");
  }

  if (targets.length !== 3) {
    return legalityError(
      "SIMULTANEOUS_RED_CUT_INVALID_TARGETS",
      "Must designate exactly 3 wires",
    );
  }

  const seenTargets = new Set<string>();
  for (const target of targets) {
    const player = state.players.find((p) => p.id === target.playerId);
    if (!player) {
      return legalityError("TARGET_PLAYER_NOT_FOUND", `Target player ${target.playerId} not found`);
    }

    const targetKey = `${target.playerId}:${target.tileIndex}`;
    if (seenTargets.has(targetKey)) {
      return legalityError(
        "SIMULTANEOUS_RED_CUT_INVALID_TARGETS",
        "Cannot target the same wire twice",
      );
    }
    seenTargets.add(targetKey);

    const tile = getTileByFlatIndex(player, target.tileIndex);
    if (!tile) {
      return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
    }
    if (tile.cut) {
      return legalityError("TILE_ALREADY_CUT", "Tile already cut");
    }
  }

  return null;
}

/** Check if a simultaneous four-of-value cut action is valid. */
export function validateSimultaneousFourCutLegality(
  state: GameState,
  actorId: string,
  targets: Array<{ playerId: string; tileIndex: number }>,
): ActionLegalityError | null {
  if (state.mission !== 23 && state.mission !== 39) {
    return legalityError(
      "SIMULTANEOUS_FOUR_CUT_WRONG_MISSION",
      "Simultaneous four-of-value cut is only available in mission 23 or 39",
    );
  }

  if (!isPlayersTurn(state, actorId)) {
    return legalityError("NOT_YOUR_TURN", "Not your turn");
  }

  if (state.campaign?.mission23SpecialActionDone) {
    return legalityError(
      "SIMULTANEOUS_FOUR_CUT_ALREADY_DONE",
      "The simultaneous four-of-value cut has already been completed",
    );
  }

  const numberCard = state.campaign?.numberCards?.visible?.[0];
  if (!numberCard) {
    return legalityError(
      "SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS",
      "No Number card is in play",
    );
  }

  if (targets.length !== 4) {
    return legalityError(
      "SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS",
      "Must designate exactly 4 wires",
    );
  }

  const seenTargets = new Set<string>();
  for (const target of targets) {
    const player = state.players.find((p) => p.id === target.playerId);
    if (!player) {
      return legalityError("TARGET_PLAYER_NOT_FOUND", `Target player ${target.playerId} not found`);
    }

    const targetKey = `${target.playerId}:${target.tileIndex}`;
    if (seenTargets.has(targetKey)) {
      return legalityError(
        "SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS",
        "Cannot target the same wire twice",
      );
    }
    seenTargets.add(targetKey);

    const tile = getTileByFlatIndex(player, target.tileIndex);
    if (!tile) {
      return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
    }
    if (tile.cut) {
      return legalityError("TILE_ALREADY_CUT", "Tile already cut");
    }
  }

  return null;
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
      type: "simultaneousCut";
      actorId: string;
      cuts: readonly SimultaneousCutTarget[];
    }
  | {
      type: "soloCut";
      actorId: string;
      value: number | "YELLOW";
    }
  | {
      type: "revealReds";
      actorId: string;
    }
  | {
      type: "simultaneousRedCut";
      actorId: string;
      targets: Array<{ playerId: string; tileIndex: number }>;
    }
  | {
      type: "simultaneousFourCut";
      actorId: string;
      targets: Array<{ playerId: string; tileIndex: number }>;
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

  if (action.type !== "revealReds" && action.type !== "simultaneousRedCut" && isRevealRedsForced(state, actor)) {
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
    case "simultaneousCut": {
      const baseError = validateSimultaneousCutLegality(
        state,
        action.actorId,
        action.cuts,
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
    case "simultaneousRedCut": {
      const baseError = validateSimultaneousRedCutLegality(
        state,
        action.actorId,
        action.targets,
      );
      if (baseError) return baseError;
      break;
    }
    case "simultaneousFourCut": {
      const baseError = validateSimultaneousFourCutLegality(
        state,
        action.actorId,
        action.targets,
      );
      if (baseError) return baseError;
      break;
    }
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

export function validateSimultaneousCutWithHooks(
  state: GameState,
  actorId: string,
  cuts: readonly SimultaneousCutTarget[],
): ActionLegalityError | null {
  return validateActionWithHooks(state, {
    type: "simultaneousCut",
    actorId,
    cuts,
  });
}

export function validateSimultaneousRedCutWithHooks(
  state: GameState,
  actorId: string,
  targets: Array<{ playerId: string; tileIndex: number }>,
): ActionLegalityError | null {
  return validateActionWithHooks(state, { type: "simultaneousRedCut", actorId, targets });
}

export function validateSimultaneousFourCutWithHooks(
  state: GameState,
  actorId: string,
  targets: Array<{ playerId: string; tileIndex: number }>,
): ActionLegalityError | null {
  return validateActionWithHooks(state, {
    type: "simultaneousFourCut",
    actorId,
    targets,
  });
}
