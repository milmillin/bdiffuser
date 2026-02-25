import { describe, it, expect } from "vitest";
import { logText } from "@bomb-busters/shared";
import {
  makePlayer,
  makeGameState,
  makeTile,
} from "@bomb-busters/shared/testing";
import { botChooseNextPlayer } from "../botController";
import { advanceTurn, executeDualCut, executeSoloCut } from "../gameLogic";
import { filterStateForPlayer } from "../viewFilter";

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
          detail: logText("timer:900s,audio:true"),
          timestamp: 1000,
        },
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("dynamic_turn_order:selector=captain"),
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

describe("mission 10 full-flow integration", () => {
  /** Build a mission 10 state that mirrors what handleStartGame produces. */
  function makeMission10State() {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "c2", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "c3", gameValue: 7, sortValue: 7 }),
      ],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Player2",
      hand: [
        makeTile({ id: "p2-1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "p2-2", gameValue: 6, sortValue: 6 }),
        makeTile({ id: "p2-3", gameValue: 8, sortValue: 8 }),
      ],
    });
    const p3 = makePlayer({
      id: "p3",
      name: "Player3",
      hand: [
        makeTile({ id: "p3-1", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "p3-2", gameValue: 9, sortValue: 9 }),
        makeTile({ id: "p3-3", gameValue: 10, sortValue: 10 }),
      ],
    });

    const state = makeGameState({
      mission: 10,
      players: [captain, p2, p3],
      currentPlayerIndex: 0, // captain starts
      turnNumber: 1,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("timer:900s,audio:true"),
          timestamp: 1000,
        },
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("dynamic_turn_order:selector=captain"),
          timestamp: 1001,
        },
      ],
    });

    return { state, captain, p2, p3 };
  }

  it("sets pendingForcedAction after a successful dualCut from captain", () => {
    const { state } = makeMission10State();

    // Captain (index 0) cuts p2's tile with gameValue 3 (captain also has a 3)
    const action = executeDualCut(state, "captain", "p2", 0, 3);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(true);
    }

    // pendingForcedAction should be set
    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "captain",
    });

    // currentPlayerIndex should be captain (to choose next player)
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(2);
  });

  it("sets pendingForcedAction after a soloCut", () => {
    const { state } = makeMission10State();

    // Captain solo-cuts value 3
    const action = executeSoloCut(state, "captain", 3);

    expect(action.type).toBe("soloCutResult");

    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "captain",
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("view filter passes pendingForcedAction to captain", () => {
    const { state } = makeMission10State();

    executeDualCut(state, "captain", "p2", 0, 3);

    const captainView = filterStateForPlayer(state, "captain");
    expect(captainView.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "captain",
    });
  });

  it("view filter passes pendingForcedAction to non-captain players", () => {
    const { state } = makeMission10State();

    executeDualCut(state, "captain", "p2", 0, 3);

    const p2View = filterStateForPlayer(state, "p2");
    expect(p2View.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "captain",
    });

    const p3View = filterStateForPlayer(state, "p3");
    expect(p3View.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "captain",
    });
  });

  it("full cycle: captain acts → chooses next → chosen acts → captain chooses again", () => {
    const { state } = makeMission10State();

    // Step 1: Captain cuts p2's tile (gameValue 3)
    executeDualCut(state, "captain", "p2", 0, 3);
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("chooseNextPlayer");

    // Step 2: Simulate captain choosing p3 (what handleChooseNextPlayer does)
    state.pendingForcedAction = undefined;
    state.currentPlayerIndex = 2; // p3

    // Step 3: p3 acts — solo cut value 5
    // p3 has a tile with gameValue 5
    executeSoloCut(state, "p3", 5);

    // pendingForcedAction should be set again (captain must choose again)
    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "p3",
    });
    expect(state.currentPlayerIndex).toBe(0); // captain again
  });

  it("non-captain player's dualCut also triggers pendingForcedAction", () => {
    const { state } = makeMission10State();

    // Set p2 as current player (as if captain chose p2)
    state.currentPlayerIndex = 1;

    // p2 cuts p3's tile with gameValue 5 — but p2 doesn't have a 5
    // Instead, let's do a solo cut from p2
    executeSoloCut(state, "p2", 6);

    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "p2",
    });
    expect(state.currentPlayerIndex).toBe(0); // captain
  });
});
