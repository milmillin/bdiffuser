import { describe, it, expect } from "vitest";
import {
  makePlayer,
  makeGameState,
  makeTile,
} from "@bomb-busters/shared/testing";
import { botChooseNextPlayer } from "../botController";
import { advanceTurn } from "../gameLogic";

// Import missionHooks to register built-in handlers (side-effect)
import "../missionHooks";

describe("botChooseNextPlayer", () => {
  it("selects next clockwise player with uncut tiles", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1" })],
    });
    const state = makeGameState({
      players: [captain, p2, p3],
      currentPlayerIndex: 0,
    });

    const idx = botChooseNextPlayer(state, "captain");
    // Clockwise from captain (index 0) → p2 (index 1)
    expect(idx).toBe(1);
  });

  it("skips players with no uncut tiles", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", cut: true })], // all cut
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1" })],
    });
    const state = makeGameState({
      players: [captain, p2, p3],
      currentPlayerIndex: 0,
    });

    const idx = botChooseNextPlayer(state, "captain");
    // p2 has no uncut tiles → skip to p3 (index 2)
    expect(idx).toBe(2);
  });

  it("can select the captain themselves if they have uncut tiles", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", cut: true })],
    });
    const state = makeGameState({
      players: [captain, p2],
      currentPlayerIndex: 0,
    });

    const idx = botChooseNextPlayer(state, "captain");
    // p2 has no uncut tiles → wraps to captain (index 0)
    expect(idx).toBe(0);
  });

  it("returns null for unknown captain id", () => {
    const state = makeGameState({
      players: [makePlayer({ id: "p1" })],
    });

    expect(botChooseNextPlayer(state, "unknown")).toBeNull();
  });

  it("respects excluded player when an alternative exists", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1" })],
    });
    const state = makeGameState({
      players: [captain, p2, p3],
      currentPlayerIndex: 0,
    });

    // Exclude p2 (the immediate clockwise player), should choose p3.
    const idx = botChooseNextPlayer(state, "captain", "p2");
    expect(idx).toBe(2);
  });

  it("falls back to excluded player when no alternative exists", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", cut: true })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", cut: true })],
    });
    const state = makeGameState({
      players: [captain, p2, p3],
      currentPlayerIndex: 0,
    });

    const idx = botChooseNextPlayer(state, "captain", "p2");
    expect(idx).toBe(1);
  });
});

describe("mission 10 advanceTurn integration", () => {
  it("sets pendingForcedAction when advancing turn on mission 10", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const state = makeGameState({
      mission: 10,
      players: [captain, p2],
      currentPlayerIndex: 1, // p2 just acted
      turnNumber: 1,
      log: [
        // Setup logs from mission 10 hooks
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "timer:900s,audio:true",
          timestamp: 1000,
        },
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "dynamic_turn_order:selector=captain",
          timestamp: 1001,
        },
      ],
    });

    advanceTurn(state);

    // Should set forced action for captain
    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "p2",
    });
    // currentPlayerIndex should be captain (index 0)
    expect(state.currentPlayerIndex).toBe(0);
    // Turn number should have advanced
    expect(state.turnNumber).toBe(2);
  });

  it("does not set pendingForcedAction for mission 1", () => {
    const p1 = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const state = makeGameState({
      mission: 1,
      players: [p1, p2],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    advanceTurn(state);

    expect(state.pendingForcedAction).toBeUndefined();
    expect(state.currentPlayerIndex).toBe(1); // normal clockwise
  });
});
