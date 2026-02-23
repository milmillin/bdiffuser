import { describe, it, expect } from "vitest";
import {
  makeTile,
  makePlayer,
  makeGameState,
  makeRedTile,
} from "@bomb-busters/shared/testing";
import {
  validateSimultaneousRedCutLegality,
  validateSimultaneousRedCutWithHooks,
} from "../validation";
import { executeSimultaneousRedCut } from "../gameLogic";

describe("validateSimultaneousRedCutLegality", () => {
  it("rejects non-mission-13 games", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile()] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousRedCutLegality(state, "p1");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_RED_CUT_WRONG_MISSION");
  });

  it("rejects when not actor's turn", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile()] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousRedCutLegality(state, "p2");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects when no player has uncut red wires", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "b2", gameValue: 4 })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousRedCutLegality(state, "p1");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("NO_UNCUT_RED_WIRES");
  });

  it("accepts valid simultaneous red cut", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 }), makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousRedCutLegality(state, "p1");
    expect(error).toBeNull();
  });
});

describe("validateSimultaneousRedCutWithHooks", () => {
  it("rejects when a forced action is pending", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile()] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "p1",
        lastPlayerId: "p1",
      },
    });
    const error = validateSimultaneousRedCutWithHooks(state, "p1");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("accepts when reveal reds would be forced (simultaneous red cut is allowed)", () => {
    // Player has only red wires — reveal reds would normally be forced,
    // but simultaneousRedCut should also be allowed
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousRedCutWithHooks(state, "p1");
    expect(error).toBeNull();
  });
});

describe("executeSimultaneousRedCut", () => {
  it("cuts one red wire per player who has one", () => {
    const p1Red = makeRedTile({ id: "red-1" });
    const p2Red = makeRedTile({ id: "red-2" });
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 }), p1Red] }),
        makePlayer({ id: "p2", hand: [p2Red, makeTile({ id: "b2", gameValue: 4 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1");

    expect(p1Red.cut).toBe(true);
    expect(p2Red.cut).toBe(true);
    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.cuts).toHaveLength(2);
      expect(action.totalCut).toBe(2);
      expect(action.actorId).toBe("p1");
    }
  });

  it("skips players with no red wires", () => {
    const p1Red = makeRedTile({ id: "red-1" });
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [p1Red] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "b2", gameValue: 4 })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "b3", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1");

    expect(p1Red.cut).toBe(true);
    if (action.type === "simultaneousRedCutResult") {
      expect(action.cuts).toHaveLength(1);
      expect(action.cuts[0].playerId).toBe("p1");
      expect(action.totalCut).toBe(1);
    }
  });

  it("triggers win when all tiles are cut", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1");

    expect(state.result).toBe("win");
    expect(state.phase).toBe("finished");
    expect(action.type).toBe("gameOver");
  });

  it("advances turn after cutting", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({
          id: "p1",
          hand: [makeRedTile({ id: "red-1" }), makeTile({ id: "b1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeRedTile({ id: "red-2" }), makeTile({ id: "b2", gameValue: 4 })],
        }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    executeSimultaneousRedCut(state, "p1");

    expect(state.turnNumber).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("returns correct action shape", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({
          id: "p1",
          hand: [makeRedTile({ id: "red-1" }), makeTile({ id: "b1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "b2", gameValue: 4 }), makeRedTile({ id: "red-2" })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1");

    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.actorId).toBe("p1");
      expect(action.cuts).toEqual([
        { playerId: "p1", tileIndex: 0 },
        { playerId: "p2", tileIndex: 1 },
      ]);
      expect(action.totalCut).toBe(2);
    }
  });
});
