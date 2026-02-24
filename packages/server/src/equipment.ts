import type {
  ActionLegalityCode,
  ActionLegalityError,
  AnyEquipmentId,
  BaseEquipmentId,
  CharacterId,
  EquipmentGuessValue,
  EquipmentUnlockValue,
  GameAction,
  GameLogDetail,
  GameState,
  Player,
  UseEquipmentPayload,
  WireTile,
} from "@bomb-busters/shared";
import {
  EQUIPMENT_DEFS,
  DOUBLE_DETECTOR_CHARACTERS,
  logTemplate,
  wireLabel,
} from "@bomb-busters/shared";
import {
  areFlatIndicesAdjacentWithinStand,
  areFlatIndicesOnSameStand,
  flatIndexToStandIndex,
  getPlayerStandSizes,
  resolveStandRange,
  getTileByFlatIndex,
  getUncutTiles,
  getAllTiles,
  isRevealRedsForced,
  isPlayersTurn,
  validateDualCutWithHooks,
} from "./validation.js";
import { executeDualCut, advanceTurn, clearSatisfiedSecondaryEquipmentLocks } from "./gameLogic.js";
import { dispatchHooks, hasActiveConstraint, emitMissionFailureTelemetry } from "./missionHooks.js";
import { applyMissionInfoTokenVariant } from "./infoTokenRules.js";
import { pushGameLog } from "./gameLog.js";

const BASE_EQUIPMENT_IDS: readonly BaseEquipmentId[] = [
  "label_neq",
  "talkies_walkies",
  "triple_detector",
  "post_it",
  "super_detector",
  "rewinder",
  "emergency_batteries",
  "general_radar",
  "stabilizer",
  "x_or_y_ray",
  "coffee_mug",
  "label_eq",
] as const;

const BASE_EQUIPMENT_SET = new Set<string>(BASE_EQUIPMENT_IDS);

function legalityError(
  code: ActionLegalityCode,
  message: string,
): ActionLegalityError {
  return { code, message };
}

const MISSION_46_PENDING_SEVENS_MESSAGE =
  "Mission 46: when only 7-value wires remain, you must cut all 4 sevens simultaneously";

function isMission46PendingSevensCut(
  state: Readonly<GameState>,
  actorId: string,
): boolean {
  return (
    state.mission === 46 &&
    state.campaign?.mission46PendingSevensPlayerId === actorId
  );
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function getEquipmentDef(equipmentId: string) {
  return EQUIPMENT_DEFS.find((def) => def.id === equipmentId);
}

function getPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((player) => player.id === playerId);
}

function hasUncutValue(player: Player, value: EquipmentGuessValue): boolean {
  return getUncutTiles(player).some((tile) => tile.gameValue === value);
}

function isXMarkedWire(tile: WireTile | undefined): boolean {
  return tile?.isXMarked === true;
}

function hasXWireEquipmentRestriction(state: Readonly<GameState>): boolean {
  return state.mission === 20 || state.mission === 35;
}

function canPostItTargetCutWire(state: Readonly<GameState>): boolean {
  return state.mission === 24 || state.mission === 40;
}

function isMission13NonBlueTarget(
  state: Readonly<GameState>,
  tile: WireTile | undefined,
): boolean {
  return state.mission === 13 && tile?.color !== "blue";
}

type StandAwarePlayer = Player & {
  standSizes?: number[];
};

function getStandFlatIndices(player: Player, standIndex: number): number[] {
  const range = resolveStandRange(player, standIndex);
  if (!range) return [];

  const indices: number[] = [];
  for (let i = range.start; i < range.endExclusive; i++) {
    indices.push(i);
  }
  return indices;
}

function getDetectorEligibleIndicesForStand(
  state: Readonly<GameState>,
  target: Player,
  standIndex: number,
): number[] {
  const standIndices = getStandFlatIndices(target, standIndex);
  return standIndices.filter((index) => {
    const tile = getTileByFlatIndex(target, index);
    if (!tile || tile.cut) return false;
    if (isMission13NonBlueTarget(state, tile)) return false;
    if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) return false;
    return true;
  });
}

function getSuperDetectorTargetStandIndex(
  target: Player,
  payload: Extract<UseEquipmentPayload, { kind: "super_detector" }>,
): number | null {
  const standSizes = getPlayerStandSizes(target);
  const rawStandIndex = (
    payload as Extract<UseEquipmentPayload, { kind: "super_detector" }> & {
      targetStandIndex?: unknown;
    }
  ).targetStandIndex;

  if (rawStandIndex === undefined) {
    return standSizes.length > 1 ? null : 0;
  }
  if (!Number.isInteger(rawStandIndex)) {
    return null;
  }
  if (resolveStandRange(target, rawStandIndex) == null) {
    return null;
  }
  return rawStandIndex;
}

function getMutableStandSizes(player: Player): number[] | null {
  const standSizes = (player as StandAwarePlayer).standSizes;
  if (!Array.isArray(standSizes) || standSizes.length === 0) return null;
  if (!standSizes.every((size) => Number.isInteger(size) && size >= 0)) return null;
  return standSizes;
}

function adjustStandSize(
  player: Player,
  standIndex: number | null,
  delta: number,
): void {
  if (standIndex == null || delta === 0) return;

  const standSizes = getMutableStandSizes(player);
  if (!standSizes) return;
  if (standIndex < 0 || standIndex >= standSizes.length) return;

  standSizes[standIndex] = Math.max(0, standSizes[standIndex] + delta);
}

function resolveInsertStandIndex(player: Player, insertIndex: number): number | null {
  const standSizes = getPlayerStandSizes(player);
  if (standSizes.length <= 1) return 0;
  if (insertIndex >= player.hand.length) return standSizes.length - 1;
  return flatIndexToStandIndex(player, insertIndex);
}

function buildGeneralRadarDetail(
  state: Readonly<GameState>,
  value: number,
): string {
  const parts = state.players.map((player) => {
    const standSizes = getPlayerStandSizes(player);
    const perStand = standSizes.map((_, standIndex) => {
      const hasValue = getStandFlatIndices(player, standIndex).some((index) => {
        const tile = getTileByFlatIndex(player, index);
        return (
          tile != null &&
          !tile.cut &&
          tile.color === "blue" &&
          tile.gameValue === value &&
          !(hasXWireEquipmentRestriction(state) && isXMarkedWire(tile))
        );
      });
      return hasValue;
    });

    if (perStand.length > 1) {
      const standDetail = perStand
        .map((hasValue, standIndex) => `S${standIndex + 1}:${hasValue ? "yes" : "no"}`)
        .join("|");
      return `${player.name}:${standDetail}`;
    }
    return `${player.name}:${perStand[0] ? "yes" : "no"}`;
  });

  return parts.join(", ");
}

function countCutValue(state: GameState, value: number): number {
  let count = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut && tile.gameValue === value) count++;
    }
  }
  return count;
}

function ensureBaseEquipmentId(
  equipmentId: string,
): equipmentId is BaseEquipmentId {
  return BASE_EQUIPMENT_SET.has(equipmentId);
}

function isLabelEqual(a: WireTile, b: WireTile): boolean {
  if (a.color === "red" && b.color === "red") return true;
  if (a.color === "yellow" && b.color === "yellow") return true;
  if (a.color === "blue" && b.color === "blue") {
    return a.gameValue === b.gameValue;
  }
  return false;
}

function isStabilizerActive(state: GameState, actorId: string): boolean {
  const stabilizer = state.turnEffects?.stabilizer;
  return (
    stabilizer?.playerId === actorId &&
    stabilizer.turnNumber === state.turnNumber
  );
}

function validateEquipmentTiming(
  state: GameState,
  actorId: string,
  equipmentId: AnyEquipmentId,
): ActionLegalityError | null {
  const def = getEquipmentDef(equipmentId);
  if (!def) {
    return legalityError(
      "EQUIPMENT_NOT_FOUND",
      "Unknown equipment definition",
    );
  }

  if (def.useTiming === "in_turn" || def.useTiming === "start_of_turn") {
    if (!isPlayersTurn(state, actorId)) {
      return legalityError(
        "EQUIPMENT_TIMING_VIOLATION",
        "This equipment can only be used during your turn",
      );
    }
  }

  if (def.useTiming === "start_of_turn" && isStabilizerActive(state, actorId)) {
    return legalityError(
      "EQUIPMENT_RULE_VIOLATION",
      "Stabilizer is already active this turn",
    );
  }

  return null;
}

export function validateUseEquipment(
  state: GameState,
  actorId: string,
  equipmentId: AnyEquipmentId,
  payload: UseEquipmentPayload,
): ActionLegalityError | null {
  if (state.pendingForcedAction) {
    return legalityError(
      "FORCED_ACTION_PENDING",
      "A forced action must be resolved before you can act",
    );
  }

  const actor = getPlayer(state, actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  if (isMission46PendingSevensCut(state, actorId)) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      MISSION_46_PENDING_SEVENS_MESSAGE,
    );
  }

  if (isRevealRedsForced(state, actor)) {
    return legalityError(
      "FORCED_REVEAL_REDS_REQUIRED",
      "You must reveal your remaining red-like wires before taking another action",
    );
  }

  if (hasActiveConstraint(state, actorId, "G")) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Constraint G: You cannot use Equipment cards or your own personal equipment",
    );
  }

  // Mission 17: Sergio (captain) cannot activate equipment cards.
  if (state.mission === 17 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Sergio cannot use equipment cards in mission 17",
    );
  }

  // Mission 14: Intern (captain) cannot use the Stabilizer.
  if (state.mission === 14 && actor.isCaptain && equipmentId === "stabilizer") {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "The Intern cannot use the Stabilizer in mission 14",
    );
  }

  // Mission 28: Captain Lazy cannot activate equipment cards.
  if (state.mission === 28 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Captain Lazy cannot use equipment cards in mission 28",
    );
  }

  // Mission 18: General Radar is used automatically; block manual use.
  if (state.mission === 18 && equipmentId === "general_radar") {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "General Radar is used automatically in mission 18",
    );
  }

  // Mission 18: during cutter sub-turn, no equipment can be used.
  if (state.campaign?.mission18DesignatorIndex != null) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Equipment cannot be used during the designated cut action",
    );
  }

  const card = state.board.equipment.find((eq) => eq.id === equipmentId);
  if (!card) {
    return legalityError("EQUIPMENT_NOT_FOUND", "Equipment card not found");
  }
  if (card.faceDown) {
    return legalityError(
      "EQUIPMENT_LOCKED",
      "Equipment card is face-down and cannot be used yet",
    );
  }
  if (!card.unlocked) {
    return legalityError("EQUIPMENT_LOCKED", "Equipment card is still locked");
  }
  if (card.secondaryLockValue !== undefined) {
    const requiredCuts = card.secondaryLockCutsRequired ?? 2;
    const cutCount = countCutValue(state, card.secondaryLockValue);
    if (cutCount < requiredCuts) {
      return legalityError(
        "EQUIPMENT_LOCKED",
        `Equipment still locked: need ${requiredCuts} cuts of value ${card.secondaryLockValue}`,
      );
    }
  }
  if (card.used) {
    return legalityError("EQUIPMENT_ALREADY_USED", "Equipment card is already used");
  }
  if (payload.kind !== equipmentId) {
    return legalityError(
      "EQUIPMENT_INVALID_PAYLOAD",
      "Payload kind does not match equipment card",
    );
  }

  const timingError = validateEquipmentTiming(state, actorId, equipmentId);
  if (timingError) return timingError;

  switch (payload.kind) {
    case "rewinder":
    case "stabilizer":
      return null;
    case "general_radar":
      if (!isIntegerInRange(payload.value, 1, 12)) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Radar value must be 1-12");
      }
      return null;
    case "post_it": {
      if (hasActiveConstraint(state, actorId, "H")) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Constraint H: Post-it cannot be used",
        );
      }
      if (state.mission === 58) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Mission 58 does not allow placing info tokens",
        );
      }
      const tile = getTileByFlatIndex(actor, payload.tileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.cut && !canPostItTargetCutWire(state)) {
        return legalityError("TILE_ALREADY_CUT", "Cannot place Post-it on a cut wire");
      }
      if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in this mission",
        );
      }
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Post-it can only target your blue wires",
        );
      }
      if (actor.infoTokens.some((t) => t.position === payload.tileIndex)) {
        return legalityError("EQUIPMENT_RULE_VIOLATION", "This wire already has an info token");
      }
      return null;
    }
    case "label_eq":
    case "label_neq": {
      if (state.mission === 58) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Mission 58 does not allow placing info tokens",
        );
      }
      const tileA = getTileByFlatIndex(actor, payload.tileIndexA);
      const tileB = getTileByFlatIndex(actor, payload.tileIndexB);
      if (!tileA || !tileB) {
        return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      }
      if (hasXWireEquipmentRestriction(state) && (isXMarkedWire(tileA) || isXMarkedWire(tileB))) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in this mission",
        );
      }
      if (!areFlatIndicesAdjacentWithinStand(actor, payload.tileIndexA, payload.tileIndexB)) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Label cards require two adjacent wires",
        );
      }
      const equal = isLabelEqual(tileA, tileB);
      if (payload.kind === "label_eq" && !equal) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Label = requires two adjacent wires with the same value",
        );
      }
      if (payload.kind === "label_neq" && equal) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Label != requires two adjacent wires with different values",
        );
      }
      if (payload.kind === "label_neq" && tileA.cut && tileB.cut) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Label != cannot target two cut wires",
        );
      }
      return null;
    }
    case "talkies_walkies": {
      return validateTalkiesWalkiesPayload(state, actor, payload);
    }
    case "emergency_batteries": {
      const selected = [...new Set(payload.playerIds)];
      if (selected.length < 1 || selected.length > 2) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Select one or two players for Emergency Batteries",
        );
      }
      for (const playerId of selected) {
        const player = getPlayer(state, playerId);
        if (!player) {
          return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
        }
        if (!player.characterUsed) {
          return legalityError(
            "EQUIPMENT_RULE_VIOLATION",
            `${player.name} has not used a character ability`,
          );
        }
      }
      return null;
    }
    case "coffee_mug": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Coffee Mug must pass to another player",
        );
      }
      if (getUncutTiles(target).length === 0) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Target player has no remaining wires",
        );
      }
      return null;
    }
    case "triple_detector": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      if (!isIntegerInRange(payload.guessValue, 1, 12)) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Triple Detector guess must be a blue value (1-12)",
        );
      }
      if (!hasUncutValue(actor, payload.guessValue)) {
        return legalityError(
          "GUESS_VALUE_NOT_IN_HAND",
          "You don't have an uncut wire with that value",
        );
      }
      const indices = [...new Set(payload.targetTileIndices)];
      if (indices.length !== 3) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Triple Detector requires exactly 3 target wires",
        );
      }
      for (const index of indices) {
        const tile = getTileByFlatIndex(target, index);
        if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
        if (tile.cut) return legalityError("TILE_ALREADY_CUT", "Tile already cut");
        if (isMission13NonBlueTarget(state, tile)) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "Detectors can only target blue wires in mission 13",
          );
        }
        if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "X-marked wires are ignored by equipment in this mission",
          );
        }
      }
      if (!indices.every((index) => areFlatIndicesOnSameStand(target, indices[0], index))) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Triple Detector targets must all be on the same stand",
        );
      }

      const chosenTileIndex = chooseDetectorTarget(target, indices, payload.guessValue);
      const missionHookError = validateDualCutWithHooks(
        state,
        actorId,
        payload.targetPlayerId,
        chosenTileIndex,
        payload.guessValue,
      );
      if (missionHookError) return missionHookError;

      return null;
    }
    case "super_detector": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      if (!isIntegerInRange(payload.guessValue, 1, 12)) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Super Detector guess must be a blue value (1-12)",
        );
      }
      if (!hasUncutValue(actor, payload.guessValue)) {
        return legalityError(
          "GUESS_VALUE_NOT_IN_HAND",
          "You don't have an uncut wire with that value",
        );
      }

      const standSizes = getPlayerStandSizes(target);
      const targetStandIndex = getSuperDetectorTargetStandIndex(target, payload);
      if (targetStandIndex == null) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          standSizes.length > 1
            ? "Super Detector requires targetStandIndex for players with multiple stands"
            : "Invalid Super Detector stand index",
        );
      }
      if (resolveStandRange(target, targetStandIndex) == null) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Invalid Super Detector stand index",
        );
      }

      const eligibleIndices = getDetectorEligibleIndicesForStand(
        state,
        target,
        targetStandIndex,
      );
      if (eligibleIndices.length === 0) {
        if (state.mission === 13) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "Detectors can only target blue wires in mission 13",
          );
        }
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          hasXWireEquipmentRestriction(state)
            ? "Target stand has no non-X uncut wires"
            : "Target stand has no uncut wires",
        );
      }

      const chosenTileIndex = chooseDetectorTarget(
        target,
        eligibleIndices,
        payload.guessValue,
      );
      const missionHookError = validateDualCutWithHooks(
        state,
        actorId,
        payload.targetPlayerId,
        chosenTileIndex,
        payload.guessValue,
      );
      if (missionHookError) return missionHookError;

      return null;
    }
    case "x_or_y_ray": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const tile = getTileByFlatIndex(target, payload.targetTileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.cut) return legalityError("TILE_ALREADY_CUT", "Tile already cut");
      if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in this mission",
        );
      }
      if (isMission13NonBlueTarget(state, tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Detectors can only target blue wires in mission 13",
        );
      }
      const { guessValueA, guessValueB } = payload;
      if (guessValueA === guessValueB) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "X or Y Ray requires two different announced values",
        );
      }
      if (
        (typeof guessValueA === "number" && !isIntegerInRange(guessValueA, 1, 12)) ||
        (typeof guessValueB === "number" && !isIntegerInRange(guessValueB, 1, 12))
      ) {
        return legalityError(
          "EQUIPMENT_INVALID_PAYLOAD",
          "Announced blue values must be between 1 and 12",
        );
      }
      if (!hasUncutValue(actor, guessValueA) || !hasUncutValue(actor, guessValueB)) {
        return legalityError(
          "GUESS_VALUE_NOT_IN_HAND",
          "You must have both announced values in your hand",
        );
      }

      const effectiveGuessValue =
        tile.gameValue === guessValueA
          ? guessValueA
          : tile.gameValue === guessValueB
            ? guessValueB
            : guessValueA;
      const missionHookError = validateDualCutWithHooks(
        state,
        actorId,
        payload.targetPlayerId,
        payload.targetTileIndex,
        effectiveGuessValue,
      );
      if (missionHookError) return missionHookError;

      return null;
    }

    case "false_bottom": {
      const reserve = state.campaign?.equipmentReserve;
      if (!reserve || reserve.length === 0) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "No equipment cards available in reserve",
        );
      }
      return null;
    }
    case "single_wire_label": {
      const tile = getTileByFlatIndex(actor, payload.tileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.color !== "blue" || typeof tile.gameValue !== "number") {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Single Wire Label can only target blue wires",
        );
      }
      // The value must appear exactly once in the stand (cut wires included)
      const valueCount = getAllTiles(actor).filter(
        (t) => t.color === "blue" && t.gameValue === tile.gameValue,
      ).length;
      if (valueCount !== 1) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Single Wire Label requires the value to appear only once on your stand",
        );
      }
      if (actor.infoTokens.some((t) => t.position === payload.tileIndex && t.singleWire)) {
        return legalityError("EQUIPMENT_RULE_VIOLATION", "This wire already has a single-wire label");
      }
      return null;
    }
    case "emergency_drop": {
      const anyUsed = state.board.equipment.some(
        (eq) => eq.used && eq.id !== "emergency_drop",
      );
      if (!anyUsed) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "No used equipment cards to restore",
        );
      }
      return null;
    }
    case "fast_pass": {
      if (!isIntegerInRange(payload.value, 1, 12)) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Fast Pass value must be 1-12");
      }
      const matchingUncut = getUncutTiles(actor).filter(
        (t) => t.gameValue === payload.value,
      );
      if (matchingUncut.length < 2) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Fast Pass requires at least 2 uncut wires of the chosen value in your hand",
        );
      }
      return null;
    }
    case "disintegrator":
      return null;
    case "grappling_hook": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const tile = getTileByFlatIndex(target, payload.targetTileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.cut) return legalityError("TILE_ALREADY_CUT", "Cannot take a cut wire");
      return null;
    }
  }
}

function addLog(
  state: GameState,
  playerId: string,
  action: string,
  detail: GameLogDetail | string,
): void {
  pushGameLog(state, {
    playerId,
    action,
    detail,
  });
}

// ── Helpers shared with campaign equipment execution ────────

/** Update the cut count for a blue value on the validation track. */
function updateValidationTrack(state: GameState, value: number): void {
  if (typeof value !== "number") return;
  let cutCount = 0;
  for (const player of state.players) {
    for (const tile of getAllTiles(player)) {
      if (tile.gameValue === value && tile.cut) cutCount++;
    }
  }
  state.board.validationTrack[value] = cutCount;
}

function countCutTilesByValue(state: GameState, value: EquipmentUnlockValue): number {
  let cutCount = 0;
  for (const player of state.players) {
    for (const tile of getAllTiles(player)) {
      if (tile.gameValue === value && tile.cut) cutCount++;
    }
  }
  return cutCount;
}

/** Check if equipment should unlock (threshold wires of matching value cut). */
function checkEquipUnlock(state: GameState, value: EquipmentUnlockValue, threshold = 2): void {
  if (countCutTilesByValue(state, value) >= threshold) {
    for (const eq of state.board.equipment) {
      if (eq.unlockValue === value && !eq.unlocked) eq.unlocked = true;
    }
  }
}

/** Check win: all stands empty. */
function checkWin(state: GameState): boolean {
  return state.players.every((p) => getUncutTiles(p).length === 0);
}

/** Update marker confirmed status based on cut tiles. */
function updateMarkerConfirmations(state: GameState): void {
  for (const marker of state.board.markers) {
    const sortValue = marker.color === "red" ? marker.value + 0.5 : marker.value + 0.1;
    let found = false;
    for (const player of state.players) {
      for (const tile of getAllTiles(player)) {
        if (tile.color === marker.color && Math.abs(tile.sortValue - sortValue) < 0.01 && tile.cut) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    marker.confirmed = found;
  }
}

/** Check loss: detonator at max. */
function checkDetonatorLoss(state: GameState): boolean {
  return state.board.detonatorPosition >= state.board.detonatorMax;
}

function markEquipmentUsed(state: GameState, equipmentId: AnyEquipmentId): void {
  const card = state.board.equipment.find((equipment) => equipment.id === equipmentId);
  if (card) card.used = true;
}

function hasSwappableTalkiesTile(state: GameState, player: Player): boolean {
  return player.hand.some(
    (tile) => !tile.cut && !(hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)),
  );
}

function validateTalkiesWalkiesPayload(
  state: GameState,
  actor: Player,
  payload: Extract<UseEquipmentPayload, { kind: "talkies_walkies" }>,
): ActionLegalityError | null {
  const teammate = getPlayer(state, payload.teammateId);
  if (!teammate) {
    return legalityError("TARGET_PLAYER_NOT_FOUND", "Teammate not found");
  }
  if (teammate.id === actor.id) {
    return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
  }

  const myTile = getTileByFlatIndex(actor, payload.myTileIndex);
  if (!myTile) {
    return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
  }
  if (hasXWireEquipmentRestriction(state) && isXMarkedWire(myTile)) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "X-marked wires are ignored by equipment in this mission",
    );
  }
  if (myTile.cut) {
    return legalityError(
      "EQUIPMENT_RULE_VIOLATION",
      "Talkies-Walkies can only swap uncut wires",
    );
  }

  if (typeof payload.teammateTileIndex === "number") {
    const teammateTile = getTileByFlatIndex(teammate, payload.teammateTileIndex);
    if (!teammateTile) {
      return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
    }
    if (hasXWireEquipmentRestriction(state) && isXMarkedWire(teammateTile)) {
      return legalityError(
        "MISSION_RULE_VIOLATION",
        "X-marked wires are ignored by equipment in this mission",
      );
    }
    if (teammateTile.cut) {
      return legalityError(
        "EQUIPMENT_RULE_VIOLATION",
        "Talkies-Walkies can only swap uncut wires",
      );
    }
    return null;
  }

  if (!hasSwappableTalkiesTile(state, teammate)) {
    return legalityError(
      "EQUIPMENT_RULE_VIOLATION",
      "Target player has no swappable uncut wires",
    );
  }

  return null;
}

function swapTalkiesWires(
  state: GameState,
  actor: Player,
  teammate: Player,
  myTileIndex: number,
  teammateTileIndex: number,
): void {
  const actorTransfer = collectSwappedWireTokens(state, actor, myTileIndex);
  const teammateTransfer = collectSwappedWireTokens(state, teammate, teammateTileIndex);

  const mine = actor.hand[myTileIndex];
  const theirs = teammate.hand[teammateTileIndex];
  actor.hand[myTileIndex] = theirs;
  teammate.hand[teammateTileIndex] = mine;

  // Base rule: token on a swapped wire follows that wire.
  for (const token of teammateTransfer) {
    actor.infoTokens.push({
      ...token,
      position: myTileIndex,
    });
  }
  for (const token of actorTransfer) {
    teammate.infoTokens.push({
      ...token,
      position: teammateTileIndex,
    });
  }

  // Re-sort each stand segment by sortValue and remap info-token positions.
  resortHandByStandAndRemapTokens(actor);
  resortHandByStandAndRemapTokens(teammate);
}

function collectSwappedWireTokens(
  state: Readonly<GameState>,
  owner: Player,
  swappedIndex: number,
): Player["infoTokens"] {
  const transferable: Player["infoTokens"] = [];

  owner.infoTokens = owner.infoTokens.filter((token) => {
    if (token.position !== swappedIndex || token.positionB != null) {
      return true;
    }

    // Mission 24 FAQ override: x1/x2/x3 tokens are discarded when swapped.
    if (state.mission === 24 && token.countHint != null) {
      return false;
    }

    transferable.push(token);
    return false;
  });

  return transferable;
}

function resortHandByStandAndRemapTokens(player: Player): void {
  const oldOrder = player.hand.map((t) => t.id);
  const standSizes = getPlayerStandSizes(player);
  let cursor = 0;

  for (const standSize of standSizes) {
    const start = cursor;
    const endExclusive = Math.min(start + standSize, player.hand.length);
    if (endExclusive - start > 1) {
      const sortedStand = player.hand
        .slice(start, endExclusive)
        .sort((a, b) => a.sortValue - b.sortValue);
      for (let i = 0; i < sortedStand.length; i += 1) {
        player.hand[start + i] = sortedStand[i]!;
      }
    }
    cursor = endExclusive;
  }

  // Build old→new index mapping.
  const newIndexOf = new Map<string, number>();
  for (let i = 0; i < player.hand.length; i++) {
    newIndexOf.set(player.hand[i].id, i);
  }

  for (const token of player.infoTokens) {
    const oldTileId = oldOrder[token.position];
    const newIdx = newIndexOf.get(oldTileId);
    if (newIdx != null) token.position = newIdx;

    if (token.positionB != null) {
      const oldTileIdB = oldOrder[token.positionB];
      const newIdxB = newIndexOf.get(oldTileIdB);
      if (newIdxB != null) token.positionB = newIdxB;
    }
  }
}

function chooseDetectorTarget(
  target: Player,
  indices: number[],
  guessValue: number,
): number {
  const matching = indices.filter((index) => {
    const tile = getTileByFlatIndex(target, index);
    return tile?.gameValue === guessValue;
  });
  if (matching.length > 0) return matching[0];

  const safeFail = indices.find((index) => {
    const tile = getTileByFlatIndex(target, index);
    return tile != null && !tile.cut && tile.color !== "red";
  });
  return safeFail ?? indices[0];
}

/** Return all matching tile indices for a detector guess. */
function findMatchingDetectorIndices(
  target: Player,
  indices: number[],
  guessValue: number,
): number[] {
  return indices.filter((index) => {
    const tile = getTileByFlatIndex(target, index);
    return (
      tile != null &&
      tile.color === "blue" &&
      typeof tile.gameValue === "number" &&
      tile.gameValue === guessValue
    );
  });
}

function setNextPlayerFromCoffee(
  state: GameState,
  targetPlayerId: string,
): void {
  const targetIndex = state.players.findIndex((player) => player.id === targetPlayerId);
  if (targetIndex === -1) return;

  state.turnEffects = undefined;
  state.currentPlayerIndex = targetIndex;
  state.turnNumber++;

  const endTurnResult = dispatchHooks(state.mission, {
    point: "endTurn",
    state,
  });
  if (endTurnResult.nextPlayerIndex !== undefined) {
    const idx = endTurnResult.nextPlayerIndex;
    if (idx >= 0 && idx < state.players.length) {
      state.currentPlayerIndex = idx;
    }
  }
}

export function executeUseEquipment(
  state: GameState,
  actorId: string,
  equipmentId: AnyEquipmentId,
  payload: UseEquipmentPayload,
): GameAction {
  const actor = state.players.find((player) => player.id === actorId)!;
  markEquipmentUsed(state, equipmentId);

  switch (payload.kind) {
    case "rewinder": {
      const before = state.board.detonatorPosition;
      state.board.detonatorPosition = Math.max(0, state.board.detonatorPosition - 1);
      const moved = before - state.board.detonatorPosition;
      addLog(state, actorId, "useEquipment", `used Rewinder (${moved > 0 ? "-1 detonator" : "detonator unchanged"})`);
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "rewinder",
        detail: moved > 0 ? "Detonator moved back by 1" : "Detonator already at 0",
      };
    }
    case "post_it": {
      const tile = getTileByFlatIndex(actor, payload.tileIndex)!;
      const value = tile.gameValue as number;
      actor.infoTokens.push(applyMissionInfoTokenVariant(state, {
        value,
        position: payload.tileIndex,
        isYellow: false,
      }, actor));
      addLog(state, actorId, "useEquipment", `used Post-it on wire ${wireLabel(payload.tileIndex)} with value ${value}`);
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "post_it",
      };
    }
    case "label_eq":
    case "label_neq": {
      actor.infoTokens.push({
        value: 0,
        position: payload.tileIndexA,
        positionB: payload.tileIndexB,
        isYellow: false,
        relation: payload.kind === "label_eq" ? "eq" : "neq",
      });
      addLog(
        state,
        actorId,
        "useEquipment",
        `used ${payload.kind === "label_eq" ? "Label =" : "Label !="} on wire ${wireLabel(payload.tileIndexA)} and wire ${wireLabel(payload.tileIndexB)}`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: payload.kind,
      };
    }
    case "talkies_walkies": {
      const teammate = state.players.find((player) => player.id === payload.teammateId)!;
      if (typeof payload.teammateTileIndex !== "number") {
        state.pendingForcedAction = {
          kind: "talkiesWalkiesTileChoice",
          actorId,
          targetPlayerId: teammate.id,
          actorTileIndex: payload.myTileIndex,
          source: "equipment",
        };
        addLog(
          state,
          actorId,
          "useEquipment",
          `used Talkies-Walkies with ${teammate.name} (selected wire ${wireLabel(payload.myTileIndex)}; waiting for ${teammate.name} to choose)`,
        );
        return {
          type: "equipmentUsed",
          equipmentId,
          playerId: actorId,
          effect: "talkies_walkies_pending",
        };
      }

      swapTalkiesWires(
        state,
        actor,
        teammate,
        payload.myTileIndex,
        payload.teammateTileIndex,
      );

      addLog(
        state,
        actorId,
        "useEquipment",
        `used Talkies-Walkies with ${teammate.name} (swapped wires ${wireLabel(payload.myTileIndex)}/${wireLabel(payload.teammateTileIndex)})`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "talkies_walkies",
      };
    }
    case "emergency_batteries": {
      const uniqueTargets = [...new Set(payload.playerIds)];
      for (const playerId of uniqueTargets) {
        const player = state.players.find((p) => p.id === playerId);
        if (player) player.characterUsed = false;
      }
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Emergency Batteries on ${uniqueTargets.length} player(s)`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "emergency_batteries",
      };
    }
    case "general_radar": {
      const details = buildGeneralRadarDetail(state, payload.value);
      addLog(state, actorId, "useEquipment", `used General Radar (${payload.value}) -> ${details}`);
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "general_radar",
        detail: details,
      };
    }
    case "stabilizer": {
      state.turnEffects = {
        ...state.turnEffects,
        stabilizer: {
          playerId: actorId,
          turnNumber: state.turnNumber,
        },
      };
      addLog(state, actorId, "useEquipment", "used Stabilizer");
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "stabilizer",
      };
    }
    case "coffee_mug": {
      addLog(
        state,
        actorId,
        "useEquipment",
        logTemplate("equipment.coffee_mug.pass_turn", {
          targetPlayerId: payload.targetPlayerId,
        }),
      );
      setNextPlayerFromCoffee(state, payload.targetPlayerId);
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "coffee_mug",
      };
    }
    case "triple_detector": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const matchingIndices = findMatchingDetectorIndices(
        target,
        payload.targetTileIndices,
        payload.guessValue,
      );
      // Always create forced action — hides match count from other players
      state.pendingForcedAction = {
        kind: "detectorTileChoice",
        targetPlayerId: payload.targetPlayerId,
        actorId,
        matchingTileIndices: matchingIndices,
        guessValue: payload.guessValue,
        source: "tripleDetector",
        originalTargetTileIndices: payload.targetTileIndices,
        equipmentId,
      };
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Triple Detector on ${target.name} (${payload.targetTileIndices.join(",")}) guessing ${payload.guessValue} — Waiting for ${target.name} to confirm...`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "triple_detector_pending",
      };
    }
    case "super_detector": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const targetStandIndex = getSuperDetectorTargetStandIndex(target, payload) ?? 0;
      const uncutIndices = getDetectorEligibleIndicesForStand(
        state,
        target,
        targetStandIndex,
      );
      const matchingIndices = findMatchingDetectorIndices(
        target,
        uncutIndices,
        payload.guessValue,
      );
      // Always create forced action — hides match count from other players
      state.pendingForcedAction = {
        kind: "detectorTileChoice",
        targetPlayerId: payload.targetPlayerId,
        actorId,
        matchingTileIndices: matchingIndices,
        guessValue: payload.guessValue,
        source: "superDetector",
        originalTargetTileIndices: uncutIndices,
        equipmentId,
      };
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Super Detector on ${target.name} stand ${targetStandIndex + 1} guessing ${payload.guessValue} — Waiting for ${target.name} to confirm...`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "super_detector_pending",
      };
    }
    case "x_or_y_ray": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const tile = getTileByFlatIndex(target, payload.targetTileIndex)!;
      const guessed =
        tile.gameValue === payload.guessValueA
          ? payload.guessValueA
          : tile.gameValue === payload.guessValueB
            ? payload.guessValueB
            : payload.guessValueA;

      addLog(
        state,
        actorId,
        "useEquipment",
        `used X or Y Ray on ${target.name}'s wire ${wireLabel(payload.targetTileIndex)} (${String(payload.guessValueA)}|${String(payload.guessValueB)})`,
      );

      return executeDualCut(
        state,
        actorId,
        payload.targetPlayerId,
        payload.targetTileIndex,
        guessed,
        undefined,
        `${String(payload.guessValueA)}|${String(payload.guessValueB)}`,
      );
    }
    case "false_bottom": {
      const reserve = state.campaign?.equipmentReserve ?? [];
      const drawn = reserve.splice(0, 2);
      for (const card of drawn) {
        if (countCutTilesByValue(state, card.unlockValue) >= 2) card.unlocked = true;
        state.board.equipment.push(card);
      }
      addLog(
        state,
        actorId,
        "useEquipment",
        `used False Bottom — ${drawn.length} equipment card(s) added: ${drawn.map((c) => c.name).join(", ")}`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "false_bottom",
        detail: `Added ${drawn.length} equipment card(s)`,
      };
    }
    case "single_wire_label": {
      const tile = getTileByFlatIndex(actor, payload.tileIndex)!;
      const value = tile.gameValue as number;
      actor.infoTokens.push({
        value,
        position: payload.tileIndex,
        isYellow: false,
        singleWire: true,
      });
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Single Wire Label on wire ${wireLabel(payload.tileIndex)} (value ${value} appears once)`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "single_wire_label",
      };
    }
    case "emergency_drop": {
      let restored = 0;
      for (const eq of state.board.equipment) {
        if (eq.used && eq.id !== "emergency_drop") {
          eq.used = false;
          restored++;
        }
      }
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Emergency Drop — ${restored} equipment card(s) restored`,
      );
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "emergency_drop",
        detail: `Restored ${restored} equipment card(s)`,
      };
    }
    case "fast_pass": {
      // Cut exactly 2 matching uncut wires of the specified value
      const matchingUncut = actor.hand
        .map((tile, index) => ({ tile, index }))
        .filter((e) => !e.tile.cut && e.tile.gameValue === payload.value);
      const toCut = matchingUncut.slice(0, 2);

      // Cut first tile; mission hooks may immediately end the game.
      toCut[0].tile.cut = true;

      // Dispatch resolve hooks (blue_as_red, nano progression, etc.)
      const resolveResult = dispatchHooks(state.mission, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId, value: payload.value, tilesCut: toCut.length },
        cutValue: payload.value,
        cutSuccess: true,
      });

      // Check if hooks ended the game (e.g. blue_as_red explosion)
      if (state.phase === "finished" && state.result) {
        updateMarkerConfirmations(state);
        addLog(
          state,
          actorId,
          "useEquipment",
          `used Fast Pass — cut value ${payload.value} triggered a hook effect!`,
        );
        return { type: "gameOver", result: state.result };
      }

      // Cut remaining tiles
      for (let i = 1; i < toCut.length; i++) {
        toCut[i].tile.cut = true;
      }

      updateValidationTrack(state, payload.value);
      if (!resolveResult.overrideEquipmentUnlock) {
        checkEquipUnlock(state, payload.value);
      } else {
        checkEquipUnlock(state, payload.value, resolveResult.equipmentUnlockThreshold ?? 2);
      }
      clearSatisfiedSecondaryEquipmentLocks(state);
      updateMarkerConfirmations(state);

      // Check detonator loss (hooks may have advanced the detonator)
      if (checkDetonatorLoss(state)) {
        state.result = "loss_detonator";
        state.phase = "finished";
        emitMissionFailureTelemetry(state, "loss_detonator", actorId, null);
        addLog(
          state,
          actorId,
          "useEquipment",
          `used Fast Pass — detonator triggered!`,
        );
        return { type: "gameOver", result: "loss_detonator" };
      }

      addLog(
        state,
        actorId,
        "useEquipment",
        `used Fast Pass — solo cut ${toCut.length} wire(s) of value ${payload.value}`,
      );

      if (checkWin(state)) {
        state.result = "win";
        state.phase = "finished";
        return { type: "gameOver", result: "win" };
      }

      advanceTurn(state);

      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "fast_pass",
        detail: `Cut ${toCut.length} wire(s) of value ${payload.value}`,
      };
    }
    case "disintegrator": {
      // Draw random value 1-12
      const drawnValue = Math.floor(Math.random() * 12) + 1;
      let totalCut = 0;

      // Collect all matching uncut blue wires
      const toCutDisintegrator: { tile: WireTile; playerId: string }[] = [];
      for (const player of state.players) {
        for (const tile of player.hand) {
          if (!tile.cut && tile.color === "blue" && tile.gameValue === drawnValue) {
            toCutDisintegrator.push({ tile, playerId: player.id });
          }
        }
      }

      // Cut wires one at a time, dispatching resolve hooks after each
      let resolveResultDisintegrator: ReturnType<typeof dispatchHooks> = {};
      for (const { tile } of toCutDisintegrator) {
        tile.cut = true;
        totalCut++;

        resolveResultDisintegrator = dispatchHooks(state.mission, {
          point: "resolve",
          state,
          action: { type: "soloCut", actorId, value: drawnValue, tilesCut: totalCut },
          cutValue: drawnValue,
          cutSuccess: true,
        });

        // If hooks ended the game (e.g. blue_as_red explosion), stop immediately
        if (state.phase === "finished" && state.result) {
          updateMarkerConfirmations(state);
          addLog(
            state,
            actorId,
            "useEquipment",
            `used Disintegrator — drew value ${drawnValue}, triggered a hook effect!`,
          );
          return { type: "gameOver", result: state.result };
        }
      }

      updateValidationTrack(state, drawnValue);
      if (!resolveResultDisintegrator.overrideEquipmentUnlock) {
        checkEquipUnlock(state, drawnValue);
      } else {
        checkEquipUnlock(state, drawnValue, resolveResultDisintegrator.equipmentUnlockThreshold ?? 2);
      }
      clearSatisfiedSecondaryEquipmentLocks(state);
      updateMarkerConfirmations(state);

      // Check detonator loss (hooks may have advanced the detonator)
      if (checkDetonatorLoss(state)) {
        state.result = "loss_detonator";
        state.phase = "finished";
        emitMissionFailureTelemetry(state, "loss_detonator", actorId, null);
        addLog(
          state,
          actorId,
          "useEquipment",
          `used Disintegrator — drew value ${drawnValue}, detonator triggered!`,
        );
        return { type: "gameOver", result: "loss_detonator" };
      }

      addLog(
        state,
        actorId,
        "useEquipment",
        `used Disintegrator — drew value ${drawnValue}, cut ${totalCut} wire(s)`,
      );

      if (checkWin(state)) {
        state.result = "win";
        state.phase = "finished";
        return { type: "gameOver", result: "win" };
      }

      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "disintegrator",
        detail: `Drew ${drawnValue}, cut ${totalCut} wire(s)`,
      };
    }
    case "grappling_hook": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const targetStandIndex = flatIndexToStandIndex(target, payload.targetTileIndex);
      const wire = target.hand[payload.targetTileIndex];

      // Remove wire from target's hand
      target.hand.splice(payload.targetTileIndex, 1);
      adjustStandSize(target, targetStandIndex, -1);

      // Shift target's info token positions
      target.infoTokens = target.infoTokens
        .filter((t) => t.position !== payload.targetTileIndex)
        .map((t) => ({
          ...t,
          position: t.position > payload.targetTileIndex ? t.position - 1 : t.position,
          ...(t.positionB !== undefined && t.positionB > payload.targetTileIndex
            ? { positionB: t.positionB - 1 }
            : {}),
        }));

      // Insert wire into actor's hand in sorted order (by sortValue)
      let insertIndex = actor.hand.length;
      for (let i = 0; i < actor.hand.length; i++) {
        if (actor.hand[i].sortValue > wire.sortValue) {
          insertIndex = i;
          break;
        }
      }
      const actorStandIndex = resolveInsertStandIndex(actor, insertIndex);
      actor.hand.splice(insertIndex, 0, wire);
      adjustStandSize(actor, actorStandIndex, 1);

      // Shift actor's info token positions for tokens at or after insert point
      actor.infoTokens = actor.infoTokens.map((t) => ({
        ...t,
        position: t.position >= insertIndex ? t.position + 1 : t.position,
        ...(t.positionB !== undefined && t.positionB >= insertIndex
          ? { positionB: t.positionB + 1 }
          : {}),
      }));

      addLog(
        state,
        actorId,
        "useEquipment",
        `used Grappling Hook — took wire from ${target.name}'s stand (position ${wireLabel(payload.targetTileIndex)})`,
      );

      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "grappling_hook",
      };
    }
  }
}

// ── Character E1-E4 Personal Abilities ─────────────────────

/** Maps each expert character to the payload kind of their personal ability. */
const CHARACTER_ABILITY_MAP: Partial<Record<CharacterId, string>> = {
  character_e1: "general_radar",
  character_e2: "talkies_walkies",
  character_e3: "triple_detector",
  character_e4: "x_or_y_ray",
};

/**
 * Validate a character ability use (E1-E4 personal equipment).
 * Reuses the same payload validation as the corresponding equipment card,
 * but checks character + characterUsed instead of equipment card state.
 */
export function validateCharacterAbility(
  state: GameState,
  actorId: string,
  payload: UseEquipmentPayload,
): ActionLegalityError | null {
  if (state.pendingForcedAction) {
    return legalityError(
      "FORCED_ACTION_PENDING",
      "A forced action must be resolved before you can act",
    );
  }

  const actor = getPlayer(state, actorId);
  if (!actor) return legalityError("ACTOR_NOT_FOUND", "Actor not found");

  if (isMission46PendingSevensCut(state, actorId)) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      MISSION_46_PENDING_SEVENS_MESSAGE,
    );
  }

  if (isRevealRedsForced(state, actor)) {
    return legalityError(
      "FORCED_REVEAL_REDS_REQUIRED",
      "You must reveal your remaining red-like wires before taking another action",
    );
  }

  if (hasActiveConstraint(state, actorId, "G")) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Constraint G: You cannot use Equipment cards or your own personal equipment",
    );
  }

  // Must have an expert character
  if (!actor.character || DOUBLE_DETECTOR_CHARACTERS.has(actor.character)) {
    return legalityError(
      "CHARACTER_ABILITY_WRONG_CHARACTER",
      "Only expert characters (E1-E4) can use character abilities this way",
    );
  }

  // Payload kind must match the character's ability
  const expectedKind = CHARACTER_ABILITY_MAP[actor.character];
  if (!expectedKind || payload.kind !== expectedKind) {
    return legalityError(
      "EQUIPMENT_INVALID_PAYLOAD",
      "Ability payload does not match your character",
    );
  }

  // One-use-per-mission
  if (actor.characterUsed && state.mission !== 58) {
    return legalityError(
      "CHARACTER_ABILITY_ALREADY_USED",
      "Character ability already used this mission",
    );
  }

  // Mission-specific blocks
  if (state.mission === 17 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Sergio cannot use personal equipment in mission 17",
    );
  }
  if (state.mission === 28 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Captain Lazy cannot use personal equipment in mission 28",
    );
  }

  // Timing: general_radar and talkies_walkies are "anytime",
  // triple_detector and x_or_y_ray are "in_turn" (require your turn)
  if (payload.kind === "triple_detector" || payload.kind === "x_or_y_ray") {
    if (!isPlayersTurn(state, actorId)) {
      return legalityError(
        "EQUIPMENT_TIMING_VIOLATION",
        "This ability can only be used during your turn",
      );
    }
  }

  // Reuse the payload-specific validation from the equipment switch
  // (skipping equipment card existence/unlock/used checks)
  switch (payload.kind) {
    case "general_radar":
      if (!isIntegerInRange(payload.value, 1, 12)) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Radar value must be 1-12");
      }
      return null;

    case "talkies_walkies": {
      return validateTalkiesWalkiesPayload(state, actor, payload);
    }

    case "triple_detector": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      if (target.id === actor.id) return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      if (!isIntegerInRange(payload.guessValue, 1, 12)) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Guess must be a blue value (1-12)");
      }
      if (!hasUncutValue(actor, payload.guessValue)) {
        return legalityError("GUESS_VALUE_NOT_IN_HAND", "You don't have an uncut wire with that value");
      }
      const indices = [...new Set(payload.targetTileIndices)];
      if (indices.length !== 3) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Triple Detector requires exactly 3 target wires");
      }
      for (const index of indices) {
        const tile = getTileByFlatIndex(target, index);
        if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
        if (tile.cut) return legalityError("TILE_ALREADY_CUT", "Tile already cut");
        if (isMission13NonBlueTarget(state, tile)) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "Detectors can only target blue wires in mission 13",
          );
        }
        if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "X-marked wires are ignored by equipment in this mission",
          );
        }
      }
      if (!indices.every((index) => areFlatIndicesOnSameStand(target, indices[0], index))) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Triple Detector targets must all be on the same stand",
        );
      }
      const chosenTileIndex = chooseDetectorTarget(target, indices, payload.guessValue);
      return validateDualCutWithHooks(state, actorId, payload.targetPlayerId, chosenTileIndex, payload.guessValue);
    }

    case "x_or_y_ray": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      if (target.id === actor.id) return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      const tile = getTileByFlatIndex(target, payload.targetTileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.cut) return legalityError("TILE_ALREADY_CUT", "Tile already cut");
      if (hasXWireEquipmentRestriction(state) && isXMarkedWire(tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in this mission",
        );
      }
      if (isMission13NonBlueTarget(state, tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Detectors can only target blue wires in mission 13",
        );
      }
      const { guessValueA, guessValueB } = payload;
      if (guessValueA === guessValueB) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "X or Y Ray requires two different announced values");
      }
      if (
        (typeof guessValueA === "number" && !isIntegerInRange(guessValueA, 1, 12)) ||
        (typeof guessValueB === "number" && !isIntegerInRange(guessValueB, 1, 12))
      ) {
        return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Announced blue values must be between 1 and 12");
      }
      if (!hasUncutValue(actor, guessValueA) || !hasUncutValue(actor, guessValueB)) {
        return legalityError("GUESS_VALUE_NOT_IN_HAND", "You must have both announced values in your hand");
      }
      const effectiveGuessValue =
        tile.gameValue === guessValueA ? guessValueA
          : tile.gameValue === guessValueB ? guessValueB
            : guessValueA;
      return validateDualCutWithHooks(state, actorId, payload.targetPlayerId, payload.targetTileIndex, effectiveGuessValue);
    }

    default:
      return legalityError("EQUIPMENT_INVALID_PAYLOAD", "Invalid character ability payload");
  }
}

/**
 * Execute a character ability use (E1-E4 personal equipment).
 * Marks characterUsed and reuses the same execution logic as equipment cards.
 */
export function executeCharacterAbility(
  state: GameState,
  actorId: string,
  payload: UseEquipmentPayload,
): GameAction {
  const actor = state.players.find((player) => player.id === actorId)!;

  // Mark ability as used (unless mission 58 grants unlimited uses)
  if (state.mission !== 58) {
    actor.characterUsed = true;
  }

  switch (payload.kind) {
    case "general_radar": {
      const details = buildGeneralRadarDetail(state, payload.value);
      addLog(state, actorId, "characterAbility", `used General Radar (${payload.value}) -> ${details}`);
      return {
        type: "equipmentUsed",
        equipmentId: "general_radar",
        playerId: actorId,
        effect: "general_radar",
        detail: details,
      };
    }

    case "talkies_walkies": {
      const teammate = state.players.find((player) => player.id === payload.teammateId)!;
      if (typeof payload.teammateTileIndex !== "number") {
        state.pendingForcedAction = {
          kind: "talkiesWalkiesTileChoice",
          actorId,
          targetPlayerId: teammate.id,
          actorTileIndex: payload.myTileIndex,
          source: "characterAbility",
        };
        addLog(
          state,
          actorId,
          "characterAbility",
          `used Walkie-Talkies with ${teammate.name} (selected wire ${wireLabel(payload.myTileIndex)}; waiting for ${teammate.name} to choose)`,
        );
        return {
          type: "equipmentUsed",
          equipmentId: "talkies_walkies",
          playerId: actorId,
          effect: "talkies_walkies_pending",
        };
      }

      swapTalkiesWires(
        state,
        actor,
        teammate,
        payload.myTileIndex,
        payload.teammateTileIndex,
      );

      addLog(
        state,
        actorId,
        "characterAbility",
        `used Walkie-Talkies with ${teammate.name} (swapped wires ${wireLabel(payload.myTileIndex)}/${wireLabel(payload.teammateTileIndex)})`,
      );
      return {
        type: "equipmentUsed",
        equipmentId: "talkies_walkies",
        playerId: actorId,
        effect: "talkies_walkies",
      };
    }

    case "triple_detector": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const matchingIndices = findMatchingDetectorIndices(
        target,
        payload.targetTileIndices,
        payload.guessValue,
      );
      // Always create forced action — hides match count from other players
      state.pendingForcedAction = {
        kind: "detectorTileChoice",
        targetPlayerId: payload.targetPlayerId,
        actorId,
        matchingTileIndices: matchingIndices,
        guessValue: payload.guessValue,
        source: "tripleDetector",
        originalTargetTileIndices: payload.targetTileIndices,
      };
      addLog(
        state,
        actorId,
        "characterAbility",
        `used Triple Detector on ${target.name} (${payload.targetTileIndices.join(",")}) guessing ${payload.guessValue} — Waiting for ${target.name} to confirm...`,
      );
      return {
        type: "equipmentUsed",
        equipmentId: "triple_detector",
        playerId: actorId,
        effect: "triple_detector_pending",
      };
    }

    case "x_or_y_ray": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const tile = getTileByFlatIndex(target, payload.targetTileIndex)!;
      const guessed =
        tile.gameValue === payload.guessValueA
          ? payload.guessValueA
          : tile.gameValue === payload.guessValueB
            ? payload.guessValueB
            : payload.guessValueA;

      addLog(
        state,
        actorId,
        "characterAbility",
        `used X or Y Ray on ${target.name}'s wire ${wireLabel(payload.targetTileIndex)} (${String(payload.guessValueA)}|${String(payload.guessValueB)})`,
      );
      return executeDualCut(
        state,
        actorId,
        payload.targetPlayerId,
        payload.targetTileIndex,
        guessed,
      );
    }

    default: {
      addLog(state, actorId, "characterAbility", "used unknown ability");
      return {
        type: "equipmentUsed",
        equipmentId: "unknown",
        playerId: actorId,
      };
    }
  }
}

export function resolveTalkiesWalkiesTileChoice(
  state: GameState,
  teammateTileIndex: number,
): GameAction {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "talkiesWalkiesTileChoice") {
    throw new Error("No pending Walkie-Talkies tile-choice forced action");
  }

  const actor = state.players.find((player) => player.id === forced.actorId);
  if (!actor) throw new Error("Talkies-Walkies actor not found");

  const teammate = state.players.find((player) => player.id === forced.targetPlayerId);
  if (!teammate) throw new Error("Talkies-Walkies target player not found");

  swapTalkiesWires(state, actor, teammate, forced.actorTileIndex, teammateTileIndex);
  state.pendingForcedAction = undefined;

  addLog(
    state,
    forced.actorId,
    forced.source === "equipment" ? "useEquipment" : "characterAbility",
    `used Walkie-Talkies with ${teammate.name} (swapped wires ${wireLabel(forced.actorTileIndex)}/${wireLabel(teammateTileIndex)})`,
  );

  return {
    type: "equipmentUsed",
    equipmentId: "talkies_walkies",
    playerId: forced.actorId,
    effect: "talkies_walkies",
  };
}
