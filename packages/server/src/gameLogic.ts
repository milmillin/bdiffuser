import type {
  GameState,
  Player,
  WireTile,
  GameResult,
  GameLogEntry,
} from "@bomb-busters/shared";
import type { GameAction } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";
import {
  getUncutTiles,
  getAllTiles,
  getTileByFlatIndex,
} from "./validation.js";
import { dispatchHooks, getBlueAsRedValue } from "./missionHooks.js";

/** Advance to next player with uncut tiles */
export function advanceTurn(state: GameState): void {
  // Turn-scoped equipment effects expire once a turn ends.
  state.turnEffects = undefined;
  const previousPlayerId = state.players[state.currentPlayerIndex]?.id;

  const playerCount = state.players.length;
  let next = (state.currentPlayerIndex + 1) % playerCount;
  let attempts = 0;

  // Skip players with no remaining tiles
  while (attempts < playerCount) {
    const player = state.players[next];
    const uncutCount = getUncutTiles(player).length;
    if (uncutCount > 0) break;
    next = (next + 1) % playerCount;
    attempts++;
  }

  if (attempts >= playerCount) {
    // All stands empty — win!
    state.result = "win";
    state.phase = "finished";
    return;
  }

  state.currentPlayerIndex = next;
  state.turnNumber++;

  // Dispatch endTurn hooks (may override next player index, etc.)
  const endTurnResult = dispatchHooks(state.mission, {
    point: "endTurn",
    state,
    previousPlayerId,
  });

  if (endTurnResult.nextPlayerIndex !== undefined) {
    const idx = endTurnResult.nextPlayerIndex;
    if (idx >= 0 && idx < playerCount) {
      state.currentPlayerIndex = idx;
    }
  }
}

/** Update the cut count for a blue value on the validation track */
function checkValidation(state: GameState, value: number): boolean {
  if (typeof value !== "number") return false;

  let cutCount = 0;
  for (const player of state.players) {
    for (const tile of getAllTiles(player)) {
      if (tile.gameValue === value && tile.cut) {
        cutCount++;
      }
    }
  }

  state.board.validationTrack[value] = cutCount;
  return cutCount >= 4;
}

/** Check if equipment should unlock (threshold wires of matching value cut) */
function checkEquipmentUnlock(state: GameState, value: number, threshold = 2): void {
  if (typeof value !== "number") return;

  let cutCount = 0;
  for (const player of state.players) {
    for (const tile of getAllTiles(player)) {
      if (tile.gameValue === value && tile.cut) {
        cutCount++;
      }
    }
  }

  if (cutCount >= threshold) {
    for (const eq of state.board.equipment) {
      if (eq.unlockValue === value && !eq.unlocked) {
        eq.unlocked = true;
      }
    }
  }
}

/**
 * Clears per-equipment secondary lock metadata once its requirement is met.
 * This is used by mission-12 style "number card on equipment" locks.
 */
function clearSatisfiedSecondaryEquipmentLocks(state: GameState): void {
  const countCutValue = (value: number): number => {
    let count = 0;
    for (const player of state.players) {
      for (const tile of getAllTiles(player)) {
        if (tile.cut && tile.gameValue === value) count++;
      }
    }
    return count;
  };

  for (const card of state.board.equipment) {
    if (card.secondaryLockValue == null) continue;
    const requiredCuts = card.secondaryLockCutsRequired ?? 2;
    if (countCutValue(card.secondaryLockValue) < requiredCuts) continue;
    delete card.secondaryLockValue;
    delete card.secondaryLockCutsRequired;
  }
}

/** Check win: all stands empty */
function checkWin(state: GameState): boolean {
  return state.players.every((p) => getUncutTiles(p).length === 0);
}

/** Check loss: detonator at max */
function checkDetonatorLoss(state: GameState): boolean {
  return state.board.detonatorPosition >= state.board.detonatorMax;
}

/** Update marker confirmed status based on cut tiles */
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

function addLog(state: GameState, playerId: string, action: string, detail: string): void {
  state.log.push({
    turn: state.turnNumber,
    playerId,
    action,
    detail,
    timestamp: Date.now(),
  });
}

/** Execute a dual cut action. Returns the action for animation. */
export function executeDualCut(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  targetTileIndex: number,
  guessValue: number | "YELLOW",
): GameAction {
  const actor = state.players.find((p) => p.id === actorId)!;
  const target = state.players.find((p) => p.id === targetPlayerId)!;
  const targetTile = getTileByFlatIndex(target, targetTileIndex)!;
  const stabilizer = state.turnEffects?.stabilizer;
  const stabilizerActive =
    stabilizer != null &&
    stabilizer.playerId === actorId &&
    stabilizer.turnNumber === state.turnNumber;

  const isCorrect = targetTile.gameValue === guessValue;

  if (isCorrect) {
    // Success: cut the target tile first. The actor tile is cut only if no hook
    // turns this success into an immediate mission loss.
    targetTile.cut = true;

    // Dispatch resolve hooks (may override equipment unlock threshold, etc.)
    const resolveResult = dispatchHooks(state.mission, {
      point: "resolve",
      state,
      action: { type: "dualCut", actorId, targetPlayerId, targetTileIndex, guessValue },
      cutValue: guessValue,
      cutSuccess: true,
    });

    // Mission hooks may turn a successful cut into an immediate loss
    // (for example mission 11 hidden blue-as-red).
    if (state.phase === "finished" && state.result) {
      updateMarkerConfirmations(state);

      if (state.result === "loss_red_wire") {
        addLog(
          state,
          actorId,
          "dualCut",
          `cut a RED-like hidden wire (${wireLabel(targetTileIndex)}) on ${target.name}'s stand! BOOM!`,
        );
        return {
          type: "dualCutResult",
          actorId,
          targetId: targetPlayerId,
          targetTileIndex,
          guessValue,
          success: false,
          revealedColor: "red",
          revealedValue: targetTile.gameValue,
          explosion: true,
        };
      }

      return {
        type: "gameOver",
        result: state.result,
      };
    }

    const actorUncut = getUncutTiles(actor);
    const actorTile = actorUncut.find((t) => t.gameValue === guessValue);
    if (actorTile) actorTile.cut = true;

    // Check validation and equipment unlock
    if (typeof guessValue === "number") {
      checkValidation(state, guessValue);
      if (!resolveResult.overrideEquipmentUnlock) {
        checkEquipmentUnlock(state, guessValue);
      } else {
        checkEquipmentUnlock(state, guessValue, resolveResult.equipmentUnlockThreshold ?? 2);
      }
    }
    clearSatisfiedSecondaryEquipmentLocks(state);
    updateMarkerConfirmations(state);

    // Check detonator loss (hooks like blue_as_red may have advanced it)
    if (checkDetonatorLoss(state)) {
      state.result = "loss_detonator";
      state.phase = "finished";
      addLog(state, actorId, "dualCut", `guessed ${target.name}'s wire ${wireLabel(targetTileIndex)} to be ${guessValue} ✓ (but detonator triggered)`);
      return {
        type: "dualCutResult",
        actorId,
        targetId: targetPlayerId,
        targetTileIndex,
        guessValue,
        success: true,
        detonatorAdvanced: true,
      };
    }

    addLog(state, actorId, "dualCut", `guessed ${target.name}'s wire ${wireLabel(targetTileIndex)} to be ${guessValue} ✓`);

    // Check win
    if (checkWin(state)) {
      state.result = "win";
      state.phase = "finished";
      return {
        type: "gameOver",
        result: "win",
      };
    }

    advanceTurn(state);

    return {
      type: "dualCutResult",
      actorId,
      targetId: targetPlayerId,
      targetTileIndex,
      guessValue,
      success: true,
    };
  } else {
    // Failure
    const hiddenBlueAsRedValue =
      state.mission === 11 ? getBlueAsRedValue(state) : null;
    const isHiddenRedLikeTarget =
      hiddenBlueAsRedValue != null &&
      typeof targetTile.gameValue === "number" &&
      targetTile.gameValue === hiddenBlueAsRedValue;

    if (targetTile.color === "red" || isHiddenRedLikeTarget) {
      if (stabilizerActive) {
        addLog(
          state,
          actorId,
          "dualCut",
          `guessed ${target.name}'s wire ${wireLabel(targetTileIndex)} to be ${guessValue} ✗ (Stabilizer prevented explosion)`,
        );

        advanceTurn(state);

        return {
          type: "dualCutResult",
          actorId,
          targetId: targetPlayerId,
          targetTileIndex,
          guessValue,
          success: false,
          detonatorAdvanced: false,
          explosion: false,
        };
      }

      // Red wire cut — explosion!
      targetTile.cut = true;
      updateMarkerConfirmations(state);
      state.result = "loss_red_wire";
      state.phase = "finished";
      addLog(
        state,
        actorId,
        "dualCut",
        targetTile.color === "red"
          ? `cut a RED wire (${wireLabel(targetTileIndex)}) on ${target.name}'s stand! BOOM!`
          : `cut a RED-like hidden wire (${wireLabel(targetTileIndex)}) on ${target.name}'s stand! BOOM!`,
      );

      return {
        type: "dualCutResult",
        actorId,
        targetId: targetPlayerId,
        targetTileIndex,
        guessValue,
        success: false,
        revealedColor: "red",
        revealedValue: targetTile.gameValue,
        explosion: true,
      };
    }

    // Blue or yellow wire — wrong guess, wire stays uncut.
    if (!stabilizerActive) {
      state.board.detonatorPosition++;
    }

    // Place info token showing the actual value of the incorrectly guessed tile
    target.infoTokens.push({
      value: typeof targetTile.gameValue === "number" ? targetTile.gameValue : 0,
      position: targetTileIndex,
      isYellow: targetTile.color === "yellow",
    });

    addLog(
      state,
      actorId,
      "dualCut",
      `guessed ${target.name}'s wire ${wireLabel(targetTileIndex)} to be ${guessValue} ✗${stabilizerActive ? " (Stabilizer prevented detonator advance)" : ""}`,
    );

    // Check detonator loss
    if (!stabilizerActive && checkDetonatorLoss(state)) {
      state.result = "loss_detonator";
      state.phase = "finished";
      return {
        type: "dualCutResult",
        actorId,
        targetId: targetPlayerId,
        targetTileIndex,
        guessValue,
        success: false,
        detonatorAdvanced: true,
      };
    }

    advanceTurn(state);

    return {
      type: "dualCutResult",
      actorId,
      targetId: targetPlayerId,
      targetTileIndex,
      guessValue,
      success: false,
      detonatorAdvanced: !stabilizerActive,
    };
  }
}

/** Execute a dual cut double detector action. Returns the action for animation. */
export function executeDualCutDoubleDetector(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  tileIndex1: number,
  tileIndex2: number,
  guessValue: number,
): GameAction {
  const actor = state.players.find((p) => p.id === actorId)!;
  const target = state.players.find((p) => p.id === targetPlayerId)!;
  const tile1 = getTileByFlatIndex(target, tileIndex1)!;
  const tile2 = getTileByFlatIndex(target, tileIndex2)!;

  // Always mark ability as used
  actor.characterUsed = true;

  const match1 = tile1.gameValue === guessValue;
  const match2 = tile2.gameValue === guessValue;

  if (match1 && match2) {
    // Both match: cut first designated tile + actor's matching tile
    tile1.cut = true;

    const actorUncut = getUncutTiles(actor);
    const actorTile = actorUncut.find(
      (t) => t.color === "blue" && t.gameValue === guessValue,
    );
    if (actorTile) actorTile.cut = true;

    if (typeof guessValue === "number") {
      checkValidation(state, guessValue);
      checkEquipmentUnlock(state, guessValue);
    }
    clearSatisfiedSecondaryEquipmentLocks(state);
    updateMarkerConfirmations(state);

    addLog(
      state,
      actorId,
      "dualCutDoubleDetector",
      `used Double Detector on ${target.name}'s wires ${wireLabel(tileIndex1)} & ${wireLabel(tileIndex2)} guessing ${guessValue} — both match! Wire ${wireLabel(tileIndex1)} cut.`,
    );

    if (checkWin(state)) {
      state.result = "win";
      state.phase = "finished";
      return { type: "gameOver", result: "win" };
    }

    advanceTurn(state);

    return {
      type: "dualCutDoubleDetectorResult",
      actorId,
      targetId: targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
      outcome: "both_match",
      cutTileIndex: tileIndex1,
    };
  }

  if (match1 || match2) {
    // One match: cut the matching tile + actor's matching tile
    const matchingTileIndex = match1 ? tileIndex1 : tileIndex2;
    const matchingTile = match1 ? tile1 : tile2;
    matchingTile.cut = true;

    const actorUncut = getUncutTiles(actor);
    const actorTile = actorUncut.find(
      (t) => t.color === "blue" && t.gameValue === guessValue,
    );
    if (actorTile) actorTile.cut = true;

    if (typeof guessValue === "number") {
      checkValidation(state, guessValue);
      checkEquipmentUnlock(state, guessValue);
    }
    clearSatisfiedSecondaryEquipmentLocks(state);
    updateMarkerConfirmations(state);

    addLog(
      state,
      actorId,
      "dualCutDoubleDetector",
      `used Double Detector on ${target.name}'s wires ${wireLabel(tileIndex1)} & ${wireLabel(tileIndex2)} guessing ${guessValue} — wire ${wireLabel(matchingTileIndex)} matches and is cut.`,
    );

    if (checkWin(state)) {
      state.result = "win";
      state.phase = "finished";
      return { type: "gameOver", result: "win" };
    }

    advanceTurn(state);

    return {
      type: "dualCutDoubleDetectorResult",
      actorId,
      targetId: targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
      outcome: "one_match",
      cutTileIndex: matchingTileIndex,
    };
  }

  // None match: detonator +1, place info token on one of the two wires
  state.board.detonatorPosition++;

  // Determine which wire gets the info token:
  // If exactly one is red, place on the non-red wire per rule text
  const tile1IsRed = tile1.color === "red";
  const tile2IsRed = tile2.color === "red";
  let infoTokenTileIndex: number;
  let infoTokenTile: WireTile;
  if (tile1IsRed && !tile2IsRed) {
    infoTokenTileIndex = tileIndex2;
    infoTokenTile = tile2;
  } else if (!tile1IsRed && tile2IsRed) {
    infoTokenTileIndex = tileIndex1;
    infoTokenTile = tile1;
  } else {
    // Both non-red or both red: place on the first wire
    infoTokenTileIndex = tileIndex1;
    infoTokenTile = tile1;
  }

  target.infoTokens.push({
    value:
      typeof infoTokenTile.gameValue === "number"
        ? infoTokenTile.gameValue
        : 0,
    position: infoTokenTileIndex,
    isYellow: infoTokenTile.color === "yellow",
  });

  updateMarkerConfirmations(state);

  addLog(
    state,
    actorId,
    "dualCutDoubleDetector",
    `used Double Detector on ${target.name}'s wires ${wireLabel(tileIndex1)} & ${wireLabel(tileIndex2)} guessing ${guessValue} — no match. Detonator +1.`,
  );

  if (checkDetonatorLoss(state)) {
    state.result = "loss_detonator";
    state.phase = "finished";
    return {
      type: "dualCutDoubleDetectorResult",
      actorId,
      targetId: targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
      outcome: "none_match",
      detonatorAdvanced: true,
      infoTokenPlacedIndex: infoTokenTileIndex,
    };
  }

  advanceTurn(state);

  return {
    type: "dualCutDoubleDetectorResult",
    actorId,
    targetId: targetPlayerId,
    tileIndex1,
    tileIndex2,
    guessValue,
    outcome: "none_match",
    detonatorAdvanced: true,
    infoTokenPlacedIndex: infoTokenTileIndex,
  };
}

/** Execute a solo cut action */
export function executeSoloCut(
  state: GameState,
  actorId: string,
  value: number | "YELLOW",
): GameAction {
  const actor = state.players.find((p) => p.id === actorId)!;
  const actorUncut = getUncutTiles(actor);
  const matchingTiles = actorUncut.filter((t) => t.gameValue === value);

  // Cut one matching tile first; mission hooks may immediately end the mission.
  if (matchingTiles[0]) {
    matchingTiles[0].cut = true;
  }

  // Dispatch resolve hooks
  const resolveResult = dispatchHooks(state.mission, {
    point: "resolve",
    state,
    action: { type: "soloCut", actorId, value },
    cutValue: value,
    cutSuccess: true,
  });

  if (state.phase === "finished" && state.result) {
    updateMarkerConfirmations(state);
    if (state.result === "loss_red_wire") {
      addLog(
        state,
        actorId,
        "soloCut",
        `solo cut a RED-like hidden value (${value}) and triggered an explosion!`,
      );
    }
    return { type: "gameOver", result: state.result };
  }

  for (let i = 1; i < matchingTiles.length; i++) {
    matchingTiles[i].cut = true;
  }

  if (typeof value === "number") {
    checkValidation(state, value);
    if (!resolveResult.overrideEquipmentUnlock) {
      checkEquipmentUnlock(state, value);
    } else {
      checkEquipmentUnlock(state, value, resolveResult.equipmentUnlockThreshold ?? 2);
    }
  }
  clearSatisfiedSecondaryEquipmentLocks(state);
  updateMarkerConfirmations(state);

  addLog(state, actorId, "soloCut", `solo cut ${matchingTiles.length} wire(s) of value ${value}`);

  if (checkWin(state)) {
    state.result = "win";
    state.phase = "finished";
    return { type: "gameOver", result: "win" };
  }

  advanceTurn(state);

  return {
    type: "soloCutResult",
    actorId,
    value,
    tilesCut: matchingTiles.length,
  };
}

/** Execute reveal reds action */
export function executeRevealReds(
  state: GameState,
  actorId: string,
): GameAction {
  const actor = state.players.find((p) => p.id === actorId)!;
  const uncutTiles = getUncutTiles(actor);
  const hiddenBlueAsRedValue = state.mission === 11 ? getBlueAsRedValue(state) : null;

  let revealed = 0;
  for (const tile of uncutTiles) {
    tile.cut = true;
    revealed++;
  }
  updateMarkerConfirmations(state);

  if (state.mission === 11 && hiddenBlueAsRedValue != null) {
    addLog(
      state,
      actorId,
      "revealReds",
      `revealed ${revealed} hidden red-like wire(s) of value ${hiddenBlueAsRedValue}`,
    );
  } else {
    addLog(state, actorId, "revealReds", `revealed ${revealed} red wire(s)`);
  }

  if (checkWin(state)) {
    state.result = "win";
    state.phase = "finished";
    return { type: "gameOver", result: "win" };
  }

  advanceTurn(state);

  return {
    type: "revealRedsResult",
    actorId,
    tilesRevealed: revealed,
  };
}
