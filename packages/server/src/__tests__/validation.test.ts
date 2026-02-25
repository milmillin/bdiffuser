import { describe, it, expect } from "vitest";
import { logText } from "@bomb-busters/shared";
import {
  makeTile,
  makePlayer,
  makeGameState,
  makeRedTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  areFlatIndicesAdjacentWithinStand,
  areFlatIndicesOnSameStand,
  flatIndexToStandIndex,
  getPlayerStandSizes,
  isPlayersTurn,
  resolveStandRange,
  validateActionWithHooks,
  validateDualCut,
  validateDualCutDoubleDetectorLegality,
  validateDualCutWithHooks,
  validateDualCutLegality,
  validateRevealRedsLegality,
  validateSimultaneousCutLegality,
  validateDualCutDoubleDetectorWithHooks,
  validateSoloCutWithHooks,
  validateSoloCutLegality,
  isMission41PlayerSkippingTurn,
} from "../validation";

function withStandSizes<T extends ReturnType<typeof makePlayer>>(
  player: T,
  standSizes: number[],
): T {
  (player as T & { standSizes?: number[] }).standSizes = [...standSizes];
  return player;
}

describe("isPlayersTurn", () => {
  it("returns true when it is the player's turn", () => {
    const state = makeGameState();
    expect(isPlayersTurn(state, "player-1")).toBe(true);
  });

  it("returns false when it is not the player's turn", () => {
    const state = makeGameState();
    expect(isPlayersTurn(state, "player-2")).toBe(false);
  });

  it("returns false when phase is not playing", () => {
    const state = makeGameState({ phase: "lobby" });
    expect(isPlayersTurn(state, "player-1")).toBe(false);
  });
});

describe("stand partition helpers", () => {
  it("resolves stand ranges and flat index mapping from standSizes", () => {
    const player = withStandSizes(makePlayer({
      id: "p1",
      hand: [
        makeTile({ id: "t1", gameValue: 1 }),
        makeTile({ id: "t2", gameValue: 2 }),
        makeTile({ id: "t3", gameValue: 3 }),
        makeTile({ id: "t4", gameValue: 4 }),
      ],
    }), [2, 2]);

    expect(getPlayerStandSizes(player)).toEqual([2, 2]);
    expect(resolveStandRange(player, 0)).toEqual({ standIndex: 0, start: 0, endExclusive: 2 });
    expect(resolveStandRange(player, 1)).toEqual({ standIndex: 1, start: 2, endExclusive: 4 });
    expect(flatIndexToStandIndex(player, 0)).toBe(0);
    expect(flatIndexToStandIndex(player, 1)).toBe(0);
    expect(flatIndexToStandIndex(player, 2)).toBe(1);
    expect(flatIndexToStandIndex(player, 3)).toBe(1);
  });

  it("enforces same-stand adjacency checks across stand boundaries", () => {
    const player = withStandSizes(makePlayer({
      id: "p1",
      hand: [
        makeTile({ id: "t1", gameValue: 1 }),
        makeTile({ id: "t2", gameValue: 2 }),
        makeTile({ id: "t3", gameValue: 3 }),
        makeTile({ id: "t4", gameValue: 4 }),
      ],
    }), [2, 2]);

    expect(areFlatIndicesOnSameStand(player, 0, 1)).toBe(true);
    expect(areFlatIndicesOnSameStand(player, 1, 2)).toBe(false);
    expect(areFlatIndicesAdjacentWithinStand(player, 0, 1)).toBe(true);
    expect(areFlatIndicesAdjacentWithinStand(player, 1, 2)).toBe(false);
  });
});

describe("validateDualCut", () => {
  it("returns null for a valid dual cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "target", 0, 5)).toBeNull();
  });

  it("rejects dual cut with non-integer guess value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "target", 0, 4.5)).toBe(
      "Dual Cut guess value must be YELLOW or an integer from 1 to 12",
    );
  });

  it("rejects dual cut with out-of-range numeric guess value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "target", 0, 13)).toBe(
      "Dual Cut guess value must be YELLOW or an integer from 1 to 12",
    );
  });

  it("rejects dual cut when announced value is absent from actor hand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "target", 0, 7)).toBe(
      "You don't have an uncut wire with that value to announce",
    );
  });

  it("rejects dual cut with YELLOW when actor has no uncut yellow wire", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "target", 0, "YELLOW")).toBe(
      "You don't have an uncut YELLOW wire to announce",
    );
  });

  it("rejects when actor targets themselves", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
    });

    expect(validateDualCut(state, "actor", "actor", 0, 5)).toBe("Cannot target yourself");
  });

  it("rejects dual cut on red wire in mission 13", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeRedTile({ id: "t1" })],
    });
    const state = makeGameState({
      mission: 13,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutLegality(state, "actor", "target", 0, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous red cut");
  });
});

describe("mission 35 X-wire cut lock", () => {
  it("rejects dual cut on an X-marked wire while yellow wires remain uncut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3, isXMarked: true }),
        makeTile({ id: "t2", color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutLegality(state, "actor", "target", 0, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 35");
  });

  it("allows dual cut on an X-marked wire after all yellow wires are cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3, isXMarked: true }),
        makeTile({ id: "t2", color: "yellow", gameValue: "YELLOW", cut: true }),
      ],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutLegality(state, "actor", "target", 0, 5);
    expect(error).toBeNull();
  });

  it("rejects dual cut when actor only has X-marked matching wires while yellow wires remain", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "x5", color: "blue", gameValue: 5, isXMarked: true })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeYellowTile({ id: "y1" })],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, target, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutLegality(state, "actor", "target", 0, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 35");
  });

  it("rejects solo cut that includes an X-marked wire while yellow wires remain uncut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5, isXMarked: true }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateSoloCutLegality(state, "actor", 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 35");
  });

  it("allows solo cut with X-marked wire after all yellow wires are cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5, isXMarked: true }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW", cut: true })],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateSoloCutLegality(state, "actor", 5);
    expect(error).toBeNull();
  });
});

describe("structured legality errors", () => {
  it("returns reason code for self-target dual cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutLegality(state, "actor", "actor", 0, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("CANNOT_TARGET_SELF");
    expect(error!.message).toBe("Cannot target yourself");
  });

  it("returns reason code for solo cut missing value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
    });

    const error = validateSoloCutLegality(state, "actor", 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("NO_MATCHING_WIRES_IN_HAND");
  });

  it("returns reason code for reveal reds with non-red tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 4 })],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
    });

    const error = validateRevealRedsLegality(state, "actor");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("REVEAL_REDS_REQUIRES_ALL_RED");
  });
});

describe("validateSimultaneousCutLegality", () => {
  it("allows a valid multi-wire cut with enough matching values in hand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const targetA = makePlayer({
      id: "target-a",
      hand: [makeTile({ id: "ta1", gameValue: 1 })],
    });
    const targetB = makePlayer({
      id: "target-b",
      hand: [makeTile({ id: "tb1", gameValue: 2 })],
    });
    const state = makeGameState({
      players: [actor, targetA, targetB],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousCutLegality(state, "actor", [
      { targetPlayerId: "target-a", targetTileIndex: 0, guessValue: 5 },
      { targetPlayerId: "target-b", targetTileIndex: 0, guessValue: 5 },
    ]);

    expect(error).toBeNull();
  });

  it("rejects fewer than 2 targets", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 1 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousCutLegality(state, "actor", [
      { targetPlayerId: "target", targetTileIndex: 0, guessValue: 5 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("rejects duplicated wire targets inside the same action", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 1 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousCutLegality(state, "actor", [
      { targetPlayerId: "target", targetTileIndex: 0, guessValue: 5 },
      { targetPlayerId: "target", targetTileIndex: 0, guessValue: 5 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("rejects when actor lacks enough matching values for all guesses", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const targetA = makePlayer({
      id: "target-a",
      hand: [makeTile({ id: "ta1", gameValue: 1 })],
    });
    const targetB = makePlayer({
      id: "target-b",
      hand: [makeTile({ id: "tb1", gameValue: 2 })],
    });
    const state = makeGameState({
      players: [actor, targetA, targetB],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousCutLegality(state, "actor", [
      { targetPlayerId: "target-a", targetTileIndex: 0, guessValue: 5 },
      { targetPlayerId: "target-b", targetTileIndex: 0, guessValue: 5 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("GUESS_VALUE_NOT_IN_HAND");
  });
});

describe("mission 11 reveal validation", () => {
  it("allows revealReds when all remaining wires are the hidden red-like value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 7 }),
        makeTile({ id: "a2", color: "blue", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const error = validateRevealRedsLegality(state, "actor");
    expect(error).toBeNull();
  });

  it("rejects revealReds when remaining hand is not only the hidden red-like value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 7 }),
        makeTile({ id: "a2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const error = validateRevealRedsLegality(state, "actor");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("REVEAL_REDS_REQUIRES_ALL_RED");
  });

});

describe("mission 13 reveal validation", () => {
  it("rejects revealReds when player has only red wires remaining", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeRedTile({ id: "r1" })],
    });
    const teammateA = makePlayer({
      id: "teammate-a",
      hand: [makeRedTile({ id: "r2" })],
    });
    const teammateB = makePlayer({
      id: "teammate-b",
      hand: [makeRedTile({ id: "r3" })],
    });
    const state = makeGameState({
      mission: 13,
      players: [actor, teammateA, teammateB],
      currentPlayerIndex: 0,
    });

    const error = validateRevealRedsLegality(state, "actor");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous red cut");
  });
});

describe("mission 48 simultaneous yellow validation", () => {
  it("rejects yellow dual cut guesses", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous 3-yellow");
  });

  it("rejects numeric dual cut guesses against yellow wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 4,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous 3-yellow");
  });

  it("rejects dual detector attempts when either wire is yellow", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "t2", gameValue: 4 }),
      ],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 4,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous 3-yellow");
  });

  it("rejects yellow solo cuts", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "a2", color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("simultaneous 3-yellow");
  });

  it("allows non-yellow cuts", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).toBeNull();
  });
});

describe("mission 49 oxygen recipient validation helper", () => {
  it("rejects soloCut when recipient is the acting player", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateSoloCutWithHooks(state, "actor", 4, "actor");

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("recipient must be a teammate");
  });

  it("accepts soloCut with valid teammate recipient", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateSoloCutWithHooks(state, "actor", 4, "teammate");

    expect(error).toBeNull();
  });

  it("rejects dualCut when recipient is the acting player", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 4 })],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutWithHooks(
      state,
      "actor",
      "teammate",
      0,
      4,
      "actor",
    );

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("recipient must be a teammate");
  });

  it("accepts dualCut with valid teammate recipient", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 4 })],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutWithHooks(
      state,
      "actor",
      "teammate",
      0,
      4,
      "teammate",
    );

    expect(error).toBeNull();
  });

  it("rejects dualCutDoubleDetector when recipient is the acting player", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t1", gameValue: 4 }),
        makeTile({ id: "t2", gameValue: 4 }),
      ],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutDoubleDetectorWithHooks(
      state,
      "actor",
      "teammate",
      0,
      1,
      4,
      "actor",
    );

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("recipient must be a teammate");
  });

  it("accepts dualCutDoubleDetector with valid teammate recipient", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t1", gameValue: 4 }),
        makeTile({ id: "t2", gameValue: 4 }),
      ],
    });
    const state = makeGameState({
      mission: 49,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutDoubleDetectorWithHooks(
      state,
      "actor",
      "teammate",
      0,
      1,
      4,
      "teammate",
    );

    expect(error).toBeNull();
  });
});

describe("mission 41 Iberian yellow mode validation", () => {
  it("rejects dual cut attempts on tripwire tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 41,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("mission special action");
  });

  it("rejects solo cut attempts of yellow tripwire values", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "a2", color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 41,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("mission special action");
  });

  it("allows mission 41 non-yellow cuts", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 6 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 7, color: "blue" })],
    });
    const state = makeGameState({
      mission: 41,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 6,
    });

    expect(error).toBeNull();
  });

  it("matches mission 41 skip detection helper", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "r1", gameValue: "RED", color: "red", sortValue: 2.5 }),
      ],
    });
    const other = makePlayer({ id: "other", hand: [makeTile({ id: "o1", gameValue: 4 })] });
    const state = makeGameState({
      mission: 41,
      players: [actor, other],
      currentPlayerIndex: 0,
    });

    expect(isMission41PlayerSkippingTurn(state, actor)).toBe(true);
  });

  it("blocks any mission 41 action from players who should skip", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "r1", gameValue: "RED", color: "red", sortValue: 2.5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 41,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "teammate",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("skip");
  });
});

describe("mission 18 designated cut value enforcement", () => {
  it("rejects dual cut guesses that do not match the active Number card value", () => {
    const cutter = makePlayer({
      id: "cutter",
      hand: [
        makeTile({ id: "c1", gameValue: 5 }),
        makeTile({ id: "c2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const designator = makePlayer({
      id: "designator",
      isCaptain: true,
      hand: [makeTile({ id: "d1", gameValue: 9 })],
    });
    const state = makeGameState({
      mission: 18,
      players: [cutter, target, designator],
      currentPlayerIndex: 0,
      campaign: {
        mission18DesignatorIndex: 2,
        numberCards: {
          visible: [{ id: "m18-card", value: 7, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "cutter",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("value 7");
  });

  it("rejects solo cut values that do not match the active Number card value", () => {
    const cutter = makePlayer({
      id: "cutter",
      hand: [
        makeTile({ id: "c1", gameValue: 5 }),
        makeTile({ id: "c2", gameValue: 5 }),
        makeTile({ id: "c3", gameValue: 7 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
    });
    const designator = makePlayer({
      id: "designator",
      isCaptain: true,
      hand: [makeTile({ id: "d1", gameValue: 9 })],
    });
    const state = makeGameState({
      mission: 18,
      players: [cutter, teammate, designator],
      currentPlayerIndex: 0,
      campaign: {
        mission18DesignatorIndex: 2,
        numberCards: {
          visible: [{ id: "m18-card", value: 7, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "cutter",
      value: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("value 7");
  });

  it("allows cut actions when the announced value matches the active Number card", () => {
    const cutter = makePlayer({
      id: "cutter",
      hand: [makeTile({ id: "c1", gameValue: 7 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const designator = makePlayer({
      id: "designator",
      isCaptain: true,
      hand: [makeTile({ id: "d1", gameValue: 9 })],
    });
    const state = makeGameState({
      mission: 18,
      players: [cutter, target, designator],
      currentPlayerIndex: 0,
      campaign: {
        mission18DesignatorIndex: 2,
        numberCards: {
          visible: [{ id: "m18-card", value: 7, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "cutter",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 7,
    });

    expect(error).toBeNull();
  });
});

describe("mission 9 sequence-priority validation", () => {
  it("rejects blocked sequence value in mission 9", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "c1", value: 2, faceUp: true },
            { id: "c2", value: 5, faceUp: true },
            { id: "c3", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("rejects blocked dualCutDoubleDetector value in mission 9", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 2 }),
        makeTile({ id: "t2", color: "blue", gameValue: 8 }),
      ],
    });
    const state = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "c1", value: 2, faceUp: true },
            { id: "c2", value: 5, faceUp: true },
            { id: "c3", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("rejects blocked soloCut value in mission 9", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "c1", value: 2, faceUp: true },
            { id: "c2", value: 5, faceUp: true },
            { id: "c3", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("allows yellow soloCut value in mission 9 sequence mode", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "a2", color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "c1", value: 2, faceUp: true },
            { id: "c2", value: 5, faceUp: true },
            { id: "c3", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: "YELLOW",
    });

    expect(error).toBeNull();
  });

  it("allows yellow dualCut value in mission 9 sequence mode", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "yellow", gameValue: "YELLOW" })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "c1", value: 2, faceUp: true },
            { id: "c2", value: 5, faceUp: true },
            { id: "c3", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).toBeNull();
  });
});

describe("mission 23/39 simultaneous four target protection", () => {
  it("mission 23: rejects regular cuts of the Number-card value before special action", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 23,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "m23-target", value: 5, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 23");
    expect(error!.message).toContain("simultaneous four-wire special action");
  });

  it("mission 23: still allows cuts of non-protected values", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 3 }), makeTile({ id: "a2", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 }), makeTile({ id: "t2", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 23,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "m23-target", value: 5, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 3,
    });

    expect(error).toBeNull();
  });

  it("mission 39: rejects Double Detector cuts of the Number-card value before special action", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 6 })],
      character: "double_detector",
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 6 }), makeTile({ id: "t2", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 39,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "m39-target", value: 6, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 6,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 39");
    expect(error!.message).toContain("simultaneous four-wire special action");
  });
});

describe("mission 46 sevens-last validation", () => {
  it("rejects dual cut of value 7 while actor still has other cuttable wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "a1", sortValue: 7.1 }),
        makeYellowTile({ id: "a2", sortValue: 4.1 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1", sortValue: 7.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("rejects dual cut of value 7 when target still has non-sevens", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeYellowTile({ id: "a1", sortValue: 7.1 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1", sortValue: 7.1 }), makeYellowTile({ id: "t2", sortValue: 4.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("rejects solo cut of value 7 while actor still has yellow wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 7 }),
        makeTile({ id: "a2", gameValue: 7 }),
        makeYellowTile({ id: "a3", sortValue: 4.1 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1", sortValue: 5.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 7,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("rejects value 7 cut when non-sevens remain in actor hand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "a1", sortValue: 7.1 }),
        makeYellowTile({ id: "a2", sortValue: 4.1 }),
        makeTile({ id: "a3", color: "red", gameValue: "RED" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1", sortValue: 7.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("rejects double detector attempt on a 7 tile when non-sevens remain in actor hand", () => {
    const actor = makePlayer({
      id: "actor",
      character: "character_2",
      hand: [
        makeTile({ id: "a1", gameValue: 7 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeYellowTile({ id: "t1", sortValue: 4.1 }),
        makeYellowTile({ id: "t2", sortValue: 7.1 }),
      ],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 7,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("rejects simultaneous cut of value 7 while actor still has other cuttable wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 7 }),
        makeTile({ id: "a2", gameValue: 7 }),
        makeYellowTile({ id: "a3", sortValue: 4.1 }),
      ],
    });
    const targetA = makePlayer({
      id: "target-a",
      hand: [makeYellowTile({ id: "ta1", sortValue: 7.1 })],
    });
    const targetB = makePlayer({
      id: "target-b",
      hand: [makeYellowTile({ id: "tb1", sortValue: 7.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, targetA, targetB],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "simultaneousCut",
      actorId: "actor",
      cuts: [
        { targetPlayerId: "target-a", targetTileIndex: 0, guessValue: 7 },
        { targetPlayerId: "target-b", targetTileIndex: 0, guessValue: 7 },
      ],
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Mission 46: 7-value wires must be cut last");
  });

  it("allows dual cut on non-seven yellow wires while mission 46 sevens remain", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeYellowTile({ id: "a1", sortValue: 7.1 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1", sortValue: 4.1 })],
    });
    const state = makeGameState({
      mission: 46,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: "YELLOW",
    });

    expect(error).toBeNull();
  });

  it("blocks other actions while mission 46 forced simultaneous cut is pending", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 7 })],
    });
    const teammates = [
      makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 7 })] }),
      makePlayer({ id: "p3", hand: [makeTile({ id: "t3", gameValue: 7 })] }),
      makePlayer({ id: "p4", hand: [makeTile({ id: "t4", gameValue: 7 })] }),
    ];

    const state = makeGameState({
      mission: 46,
      players: [actor, ...teammates],
      currentPlayerIndex: 0,
      campaign: { mission46PendingSevensPlayerId: "actor" },
      pendingForcedAction: { kind: "mission46SevensCut", playerId: "actor" },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "p2",
      targetTileIndex: 0,
      guessValue: 7,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("allows the simultaneous four-cut when mission 46 forced action is active", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 7 })],
    });
    const teammates = [
      makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 7 })] }),
      makePlayer({ id: "p3", hand: [makeTile({ id: "t3", gameValue: 7 })] }),
      makePlayer({ id: "p4", hand: [makeTile({ id: "t4", gameValue: 7 })] }),
    ];

    const state = makeGameState({
      mission: 46,
      players: [actor, ...teammates],
      currentPlayerIndex: 0,
      campaign: { mission46PendingSevensPlayerId: "actor" },
      pendingForcedAction: { kind: "mission46SevensCut", playerId: "actor" },
    });

    const targets = [
      { playerId: "actor", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ];

    const error = validateActionWithHooks(state, {
      type: "simultaneousFourCut",
      actorId: "actor",
      targets,
    });

    expect(error).toBeNull();
  });
});

describe("mission 38 captain flipped-wire validation", () => {
  it("rejects non-captain dual cut targeting the captain's flipped wire", () => {
    const captainFlippedTile = makeTile({ id: "c2", gameValue: 2 });
    (captainFlippedTile as unknown as { upsideDown?: boolean }).upsideDown = true;

    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", gameValue: 1 }),
        captainFlippedTile,
      ],
    });
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 2 })],
      character: "character_3",
    });
    const state = makeGameState({
      mission: 38,
      players: [captain, actor],
      currentPlayerIndex: 1,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "captain",
      targetTileIndex: 1,
      guessValue: 2,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe(
      "Mission 38: only the Captain can cut the Captain's flipped wire",
    );
  });

  it("rejects non-captain Double Detector when one target is the captain's flipped wire", () => {
    const captainFlippedTile = makeTile({ id: "c2", gameValue: 2 });
    (captainFlippedTile as unknown as { upsideDown?: boolean }).upsideDown = true;

    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", gameValue: 1 }),
        captainFlippedTile,
      ],
    });
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 2 })],
      character: "double_detector",
      characterUsed: false,
    });
    const state = makeGameState({
      mission: 38,
      players: [captain, actor],
      currentPlayerIndex: 1,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "captain",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 2,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe(
      "Mission 38: only the Captain can cut the Captain's flipped wire",
    );
  });

  it("allows non-captain cuts on non-flipped captain wires", () => {
    const captainFlippedTile = makeTile({ id: "c2", gameValue: 2 });
    (captainFlippedTile as unknown as { upsideDown?: boolean }).upsideDown = true;

    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", gameValue: 1 }),
        captainFlippedTile,
      ],
    });
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const state = makeGameState({
      mission: 38,
      players: [captain, actor],
      currentPlayerIndex: 1,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "captain",
      targetTileIndex: 0,
      guessValue: 1,
    });

    expect(error).toBeNull();
  });
});

describe("validateActionWithHooks", () => {
  it("returns null for valid base action when mission has no validate hooks", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      mission: 1,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });
    expect(error).toBeNull();
  });
});

describe("forced reveal reds state", () => {
  it("blocks dualCut when actor has only red wires remaining", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 3,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_REVEAL_REDS_REQUIRED");
  });

  it("blocks soloCut in mission 11 when only hidden red-like value remains", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 7 }),
        makeTile({ id: "a2", color: "blue", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 7,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_REVEAL_REDS_REQUIRED");
  });

  it("does not force revealReds checks in mission 59 when all remaining wires are red", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 59,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "m59-v1", value: 1, faceUp: true },
            { id: "m59-v2", value: 2, faceUp: true },
            { id: "m59-v3", value: 3, faceUp: true },
            { id: "m59-v4", value: 4, faceUp: true },
            { id: "m59-v5", value: 5, faceUp: true },
            { id: "m59-v6", value: 6, faceUp: true },
            { id: "m59-v7", value: 7, faceUp: true },
            { id: "m59-v8", value: 8, faceUp: true },
            { id: "m59-v9", value: 9, faceUp: true },
            { id: "m59-v10", value: 10, faceUp: true },
            { id: "m59-v11", value: 11, faceUp: true },
            { id: "m59-v12", value: 12, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 6,
          facing: 1,
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 7,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("GUESS_VALUE_NOT_IN_HAND");
  });

  it("does not force revealReds checks in mission 26 when all remaining wires are red", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 26,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "m26-visible-1", value: 1, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("GUESS_VALUE_NOT_IN_HAND");
  });

  it("allows revealReds while in forced reveal state", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const state = makeGameState({
      mission: 3,
      players: [actor],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "revealReds",
      actorId: "actor",
    });

    expect(error).toBeNull();
  });

  it("allows mission 48 simultaneous yellow action in 4-player games even when actor must reveal reds", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const teammateA = makePlayer({
      id: "teammate-a",
      hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
    });
    const teammateB = makePlayer({
      id: "teammate-b",
      hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })],
    });
    const teammateC = makePlayer({
      id: "teammate-c",
      hand: [makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, teammateA, teammateB, teammateC],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "simultaneousRedCut",
      actorId: "actor",
      targets: [
        { playerId: "teammate-a", tileIndex: 0 },
        { playerId: "teammate-b", tileIndex: 0 },
        { playerId: "teammate-c", tileIndex: 0 },
      ],
    });

    expect(error).toBeNull();
  });

  it("mission 48 with 3 players still requires actor to hold yellow for simultaneous action", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const teammateA = makePlayer({
      id: "teammate-a",
      hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
    });
    const teammateB = makePlayer({
      id: "teammate-b",
      hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })],
    });
    const state = makeGameState({
      mission: 48,
      players: [actor, teammateA, teammateB],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "simultaneousRedCut",
      actorId: "actor",
      targets: [
        { playerId: "teammate-a", tileIndex: 0 },
        { playerId: "teammate-a", tileIndex: 0 },
        { playerId: "teammate-b", tileIndex: 0 },
      ],
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("uncut yellow wire");
  });
});

describe("forced action blocking", () => {
  it("blocks dualCut when a forced action is pending", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      pendingForcedAction: { kind: "chooseNextPlayer", captainId: "actor" },
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("blocks soloCut when a forced action is pending", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
      pendingForcedAction: { kind: "chooseNextPlayer", captainId: "actor" },
    });

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 5,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("blocks revealReds when a forced action is pending", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "red", gameValue: "RED" })],
    });
    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
      pendingForcedAction: { kind: "chooseNextPlayer", captainId: "actor" },
    });

    const error = validateActionWithHooks(state, {
      type: "revealReds",
      actorId: "actor",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("allows actions when no forced action is pending", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });
    expect(error).toBeNull();
  });
});

describe("validateDualCutDoubleDetectorLegality", () => {
  const baseDDSetup = (characterId: string) => {
    const actor = makePlayer({
      id: "actor",
      character: characterId as import("@bomb-busters/shared").CharacterId,
      characterUsed: false,
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    return { actor, target, state };
  };

  it("allows character_2 to use Double Detector", () => {
    const { state } = baseDDSetup("character_2");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("rejects Double Detector when actor does not hold the announced value", () => {
    const { state } = baseDDSetup("double_detector");
    state.players[0].hand = [makeTile({ id: "a1", color: "blue", gameValue: 4 })];

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error?.code).toBe("GUESS_VALUE_NOT_IN_HAND");
    expect(error?.message).toBe(
      "You don't have an uncut wire with that value to announce",
    );
  });

  it("allows character_3 to use Double Detector", () => {
    const { state } = baseDDSetup("character_3");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("allows character_4 to use Double Detector", () => {
    const { state } = baseDDSetup("character_4");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("allows character_5 to use Double Detector", () => {
    const { state } = baseDDSetup("character_5");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("allows double_detector character to use Double Detector", () => {
    const { state } = baseDDSetup("double_detector");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("rejects Double Detector with non-integer guess value", () => {
    const { state } = baseDDSetup("double_detector");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 4.5);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("DOUBLE_DETECTOR_GUESS_NOT_BLUE");
    expect(error!.message).toBe("Double Detector guess value must be a number from 1 to 12");
  });

  it("rejects Double Detector with out-of-range guess value", () => {
    const { state } = baseDDSetup("double_detector");
    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 13);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("DOUBLE_DETECTOR_GUESS_NOT_BLUE");
    expect(error!.message).toBe("Double Detector guess value must be a number from 1 to 12");
  });

  it("blocks Double Detector when Constraint G is active", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 32;
    state.campaign = {
      constraints: {
        global: [{ id: "G", name: "Constraint G", description: "", active: true }],
        perPlayer: {},
        deck: [],
      },
    };

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe(
      "Constraint G: You cannot use Equipment cards or your own personal equipment",
    );
  });

  it("rejects Double Detector tiles that cross stand boundaries", () => {
    const { state } = baseDDSetup("double_detector");
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 2 }),
        makeTile({ id: "t2", gameValue: 3 }),
        makeTile({ id: "t3", gameValue: 5 }),
        makeTile({ id: "t4", gameValue: 8 }),
      ],
    }), [2, 2]);
    state.players[1] = target;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 1, 2, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("DOUBLE_DETECTOR_INVALID_TILES");
    expect(error!.message).toBe("Double Detector targets must be on the same stand");
  });

  it("rejects reused Double Detector outside mission 58", () => {
    const { state } = baseDDSetup("double_detector");
    state.players[0].characterUsed = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("CHARACTER_ABILITY_ALREADY_USED");
  });

  it("allows reused Double Detector in mission 58", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 58;
    state.players[0].characterUsed = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).toBeNull();
  });

  it("mission 28: captain cannot use Double Detector", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 28;
    state.players[0].isCaptain = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 17: captain cannot use Double Detector", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 17;
    state.players[0].isCaptain = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 20: Double Detector cannot target X-marked wires", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 20;
    state.players[1].hand[0].isXMarked = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 35: Double Detector cannot target X-marked wires", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 35;
    state.players[1].hand[0].isXMarked = true;

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 35: Double Detector cannot be resolved when actor only has matching X-marked wires", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      characterUsed: false,
      hand: [makeTile({ id: "x5", color: "blue", gameValue: 5, isXMarked: true })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeYellowTile({ id: "y1" })],
    });
    const state = makeGameState({
      mission: 35,
      players: [actor, target, teammate],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 35");
  });

  it("mission 13: Double Detector cannot target non-blue wires", () => {
    const { state } = baseDDSetup("double_detector");
    state.mission = 13;
    state.players[1].hand[0] = makeRedTile({ id: "t1" });

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("rejects actor with null character", () => {
    const actor = makePlayer({
      id: "actor",
      character: null,
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const error = validateDualCutDoubleDetectorLegality(state, "actor", "target", 0, 1, 5);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("CHARACTER_ABILITY_WRONG_CHARACTER");
  });
});

describe("mission 65 personal number cards validation", () => {
  function mission65State(
    actorHandValues: number[],
    actorCards: Array<{ value: number; faceUp?: boolean }>,
    targetHandValues: number[],
  ) {
    const actor = makePlayer({
      id: "actor",
      hand: actorHandValues.map((value, idx) =>
        makeTile({ id: `a${idx + 1}`, gameValue: value }),
      ),
    });
    const target = makePlayer({
      id: "target",
      hand: targetHandValues.map((value, idx) =>
        makeTile({ id: `t${idx + 1}`, gameValue: value }),
      ),
    });

    return makeGameState({
      mission: 65,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [],
          deck: [],
          discard: [],
          playerHands: {
            actor: actorCards.map((card, idx) => ({
              id: `c-actor-${idx + 1}`,
              value: card.value,
              faceUp: card.faceUp ?? true,
            })),
            target: [{ id: "c-target-1", value: 9, faceUp: true }],
          },
        },
      },
    });
  }

  it("rejects dual cut when guessed value is not on actor face-up Number cards", () => {
    const state = mission65State([6], [{ value: 4 }], [2]);

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 6,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 65");
  });

  it("rejects solo cut when chosen value is not on actor face-up Number cards", () => {
    const state = mission65State([6, 6], [{ value: 4 }], [2]);

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: "actor",
      value: 6,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("Mission 65");
  });

  it("allows cut actions when guessed value is on actor face-up Number cards", () => {
    const state = mission65State([6], [{ value: 6 }], [2]);

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 6,
    });

    expect(error).toBeNull();
  });
});

describe("constraint I/J stand boundaries", () => {
  function buildConstraintState(constraintId: "I" | "J") {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 2 }),
        makeTile({ id: "t2", gameValue: 3 }),
        makeTile({ id: "t3", gameValue: 5 }),
        makeTile({ id: "t4", gameValue: 8 }),
      ],
    }), [2, 2]);

    return makeGameState({
      mission: 32,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        constraints: {
          global: [
            { id: constraintId, name: `Constraint ${constraintId}`, description: "", active: true },
          ],
          perPlayer: {},
          deck: [],
        },
      },
    });
  }

  it("constraint I blocks far-right within the targeted stand", () => {
    const state = buildConstraintState("I");

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 1,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Constraint I: You cannot cut the far-right wire");
  });

  it("constraint J blocks far-left within the targeted stand", () => {
    const state = buildConstraintState("J");

    const error = validateActionWithHooks(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 2,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Constraint J: You cannot cut the far-left wire");
  });

  it("constraint I blocks Double Detector when it could cut a far-right wire", () => {
    const state = buildConstraintState("I");
    state.players[0]!.character = "double_detector";

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 0,
      tileIndex2: 1,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Constraint I: You cannot cut the far-right wire");
  });

  it("constraint J blocks Double Detector when it could cut a far-left wire", () => {
    const state = buildConstraintState("J");
    state.players[0]!.character = "double_detector";

    const error = validateActionWithHooks(state, {
      type: "dualCutDoubleDetector",
      actorId: "actor",
      targetPlayerId: "target",
      tileIndex1: 2,
      tileIndex2: 3,
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toBe("Constraint J: You cannot cut the far-left wire");
  });
});
