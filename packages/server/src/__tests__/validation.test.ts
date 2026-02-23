import { describe, it, expect } from "vitest";
import { makeTile, makePlayer, makeGameState } from "@bomb-busters/shared/testing";
import { isPlayersTurn, validateDualCut } from "../validation";

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
