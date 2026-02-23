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

/** Advance to next player with uncut tiles */
export function advanceTurn(state: GameState): void {
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

/** Check if equipment should unlock (2 wires of matching value cut) */
function checkEquipmentUnlock(state: GameState, value: number): void {
  if (typeof value !== "number") return;

  let cutCount = 0;
  for (const player of state.players) {
    for (const tile of getAllTiles(player)) {
      if (tile.gameValue === value && tile.cut) {
        cutCount++;
      }
    }
  }

  if (cutCount >= 2) {
    for (const eq of state.board.equipment) {
      if (eq.unlockValue === value && !eq.unlocked) {
        eq.unlocked = true;
      }
    }
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

  const isCorrect = targetTile.gameValue === guessValue;

  if (isCorrect) {
    // Success: cut both the target tile and one of actor's matching tiles
    targetTile.cut = true;

    const actorUncut = getUncutTiles(actor);
    const actorTile = actorUncut.find((t) => t.gameValue === guessValue);
    if (actorTile) actorTile.cut = true;

    // Check validation and equipment unlock
    if (typeof guessValue === "number") {
      checkValidation(state, guessValue);
      checkEquipmentUnlock(state, guessValue);
    }
    updateMarkerConfirmations(state);

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
    if (targetTile.color === "red") {
      // Red wire cut — explosion!
      targetTile.cut = true;
      updateMarkerConfirmations(state);
      state.result = "loss_red_wire";
      state.phase = "finished";
      addLog(state, actorId, "dualCut", `cut a RED wire (${wireLabel(targetTileIndex)}) on ${target.name}'s stand! BOOM!`);

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

    // Blue or yellow wire — wrong guess, wire stays uncut
    state.board.detonatorPosition++;

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
      `guessed ${target.name}'s wire ${wireLabel(targetTileIndex)} to be ${guessValue} ✗`,
    );

    // Check detonator loss
    if (checkDetonatorLoss(state)) {
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
      detonatorAdvanced: true,
    };
  }
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

  for (const tile of matchingTiles) {
    tile.cut = true;
  }

  if (typeof value === "number") {
    checkValidation(state, value);
    checkEquipmentUnlock(state, value);
  }
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

  let revealed = 0;
  for (const tile of uncutTiles) {
    tile.cut = true;
    revealed++;
  }
  updateMarkerConfirmations(state);

  addLog(state, actorId, "revealReds", `revealed ${revealed} red wire(s)`);

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
