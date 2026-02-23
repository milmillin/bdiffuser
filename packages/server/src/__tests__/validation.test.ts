import { describe, it, expect } from "vitest";
import { makeTile, makePlayer, makeGameState } from "@bomb-busters/shared/testing";
import {
  isPlayersTurn,
  validateActionWithHooks,
  validateDualCut,
  validateDualCutLegality,
  validateRevealRedsLegality,
  validateSoloCutLegality,
} from "../validation";

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
          detail: "blue_as_red:7",
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
          detail: "blue_as_red:7",
          timestamp: 1000,
        },
      ],
    });

    const error = validateRevealRedsLegality(state, "actor");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("REVEAL_REDS_REQUIRES_ALL_RED");
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
