import type {
  ActionLegalityCode,
  ActionLegalityError,
  BaseEquipmentId,
  EquipmentGuessValue,
  GameAction,
  GameState,
  Player,
  UseEquipmentPayload,
  WireTile,
} from "@bomb-busters/shared";
import { EQUIPMENT_DEFS } from "@bomb-busters/shared";
import {
  getTileByFlatIndex,
  getUncutTiles,
  isRevealRedsForced,
  isPlayersTurn,
} from "./validation.js";
import { executeDualCut } from "./gameLogic.js";
import { dispatchHooks } from "./missionHooks.js";

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
  "coffee_thermos",
  "label_eq",
] as const;

const BASE_EQUIPMENT_SET = new Set<string>(BASE_EQUIPMENT_IDS);

function legalityError(
  code: ActionLegalityCode,
  message: string,
): ActionLegalityError {
  return { code, message };
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

function isMission13NonBlueTarget(
  state: Readonly<GameState>,
  tile: WireTile | undefined,
): boolean {
  return state.mission === 13 && tile?.color !== "blue";
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
  equipmentId: BaseEquipmentId,
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
  equipmentId: BaseEquipmentId,
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

  if (isRevealRedsForced(state, actor)) {
    return legalityError(
      "FORCED_REVEAL_REDS_REQUIRED",
      "You must reveal your remaining red-like wires before taking another action",
    );
  }

  // Mission 17: Sergio (captain) cannot activate equipment cards.
  if (state.mission === 17 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Sergio cannot use equipment cards in mission 17",
    );
  }

  // Mission 28: Captain Lazy cannot activate equipment cards.
  if (state.mission === 28 && actor.isCaptain) {
    return legalityError(
      "MISSION_RULE_VIOLATION",
      "Captain Lazy cannot use equipment cards in mission 28",
    );
  }

  const card = state.board.equipment.find((eq) => eq.id === equipmentId);
  if (!card) {
    return legalityError("EQUIPMENT_NOT_FOUND", "Equipment card not found");
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
  if (!ensureBaseEquipmentId(card.id)) {
    return legalityError(
      "EQUIPMENT_RULE_VIOLATION",
      "Only base equipment cards are supported in this version",
    );
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
      if (state.mission === 58) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "Mission 58 does not allow placing info tokens",
        );
      }
      const tile = getTileByFlatIndex(actor, payload.tileIndex);
      if (!tile) return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      if (tile.cut) {
        return legalityError("TILE_ALREADY_CUT", "Cannot place Post-it on a cut wire");
      }
      if (state.mission === 20 && isXMarkedWire(tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in mission 20",
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
      if (state.mission === 20 && (isXMarkedWire(tileA) || isXMarkedWire(tileB))) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in mission 20",
        );
      }
      if (Math.abs(payload.tileIndexA - payload.tileIndexB) !== 1) {
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
      return null;
    }
    case "talkies_walkies": {
      const teammate = getPlayer(state, payload.teammateId);
      if (!teammate) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Teammate not found");
      }
      if (teammate.id === actor.id) {
        return legalityError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const myTile = getTileByFlatIndex(actor, payload.myTileIndex);
      const teammateTile = getTileByFlatIndex(teammate, payload.teammateTileIndex);
      if (!myTile || !teammateTile) {
        return legalityError("INVALID_TILE_INDEX", "Invalid tile index");
      }
      if (state.mission === 20 && (isXMarkedWire(myTile) || isXMarkedWire(teammateTile))) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in mission 20",
        );
      }
      if (myTile.cut || teammateTile.cut) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Talkies-Walkies can only swap uncut wires",
        );
      }
      return null;
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
    case "coffee_thermos": {
      const target = getPlayer(state, payload.targetPlayerId);
      if (!target) {
        return legalityError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      if (target.id === actor.id) {
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          "Coffee Thermos must pass to another player",
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
        if (state.mission === 20 && isXMarkedWire(tile)) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "X-marked wires are ignored by equipment in mission 20",
          );
        }
      }
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
      const eligibleTiles = getUncutTiles(target).filter((tile) => {
        if (isMission13NonBlueTarget(state, tile)) return false;
        if (state.mission === 20 && isXMarkedWire(tile)) return false;
        return true;
      });
      if (eligibleTiles.length === 0) {
        if (state.mission === 13) {
          return legalityError(
            "MISSION_RULE_VIOLATION",
            "Detectors can only target blue wires in mission 13",
          );
        }
        return legalityError(
          "EQUIPMENT_RULE_VIOLATION",
          state.mission === 20
            ? "Target stand has no non-X uncut wires"
            : "Target stand has no uncut wires",
        );
      }
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
      if (state.mission === 20 && isXMarkedWire(tile)) {
        return legalityError(
          "MISSION_RULE_VIOLATION",
          "X-marked wires are ignored by equipment in mission 20",
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
      return null;
    }
  }
}

function addLog(state: GameState, playerId: string, action: string, detail: string): void {
  state.log.push({
    turn: state.turnNumber,
    playerId,
    action,
    detail,
    timestamp: Date.now(),
  });
}

function markEquipmentUsed(state: GameState, equipmentId: BaseEquipmentId): void {
  const card = state.board.equipment.find((equipment) => equipment.id === equipmentId);
  if (card) card.used = true;
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
  equipmentId: BaseEquipmentId,
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
      actor.infoTokens.push({
        value,
        position: payload.tileIndex,
        isYellow: false,
      });
      addLog(state, actorId, "useEquipment", `used Post-it on wire ${payload.tileIndex} with value ${value}`);
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
        `used ${payload.kind === "label_eq" ? "Label =" : "Label !="} on ${payload.tileIndexA} and ${payload.tileIndexB}`,
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
      const mine = actor.hand[payload.myTileIndex];
      const theirs = teammate.hand[payload.teammateTileIndex];
      actor.hand[payload.myTileIndex] = theirs;
      teammate.hand[payload.teammateTileIndex] = mine;
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Talkies-Walkies with ${teammate.name} (swapped wires ${payload.myTileIndex}/${payload.teammateTileIndex})`,
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
      const details = state.players
        .map((player) => {
          const hasValue = getUncutTiles(player).some(
            (tile) =>
              tile.color === "blue" &&
              tile.gameValue === payload.value &&
              !(state.mission === 20 && isXMarkedWire(tile)),
          );
          return `${player.name}:${hasValue ? "yes" : "no"}`;
        })
        .join(", ");
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
    case "coffee_thermos": {
      addLog(state, actorId, "useEquipment", `used Coffee Thermos and passed turn to ${payload.targetPlayerId}`);
      setNextPlayerFromCoffee(state, payload.targetPlayerId);
      return {
        type: "equipmentUsed",
        equipmentId,
        playerId: actorId,
        effect: "coffee_thermos",
      };
    }
    case "triple_detector": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const chosenTileIndex = chooseDetectorTarget(
        target,
        payload.targetTileIndices,
        payload.guessValue,
      );
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Triple Detector on ${target.name} (${payload.targetTileIndices.join(",")})`,
      );
      return executeDualCut(
        state,
        actorId,
        payload.targetPlayerId,
        chosenTileIndex,
        payload.guessValue,
      );
    }
    case "super_detector": {
      const target = state.players.find((player) => player.id === payload.targetPlayerId)!;
      const uncutIndices = target.hand
        .map((tile, index) => ({ tile, index }))
        .filter(
          (entry) =>
            !entry.tile.cut &&
            !(state.mission === 20 && isXMarkedWire(entry.tile)),
        )
        .map((entry) => entry.index);
      const chosenTileIndex = chooseDetectorTarget(
        target,
        uncutIndices,
        payload.guessValue,
      );
      addLog(
        state,
        actorId,
        "useEquipment",
        `used Super Detector on ${target.name}`,
      );
      return executeDualCut(
        state,
        actorId,
        payload.targetPlayerId,
        chosenTileIndex,
        payload.guessValue,
      );
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
        `used X or Y Ray on ${target.name}'s wire ${payload.targetTileIndex} (${String(payload.guessValueA)}|${String(payload.guessValueB)})`,
      );

      return executeDualCut(
        state,
        actorId,
        payload.targetPlayerId,
        payload.targetTileIndex,
        guessed,
      );
    }
  }
}
