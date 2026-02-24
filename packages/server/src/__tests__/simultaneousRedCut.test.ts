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

const VALID_TARGETS = [
  { playerId: "p1", tileIndex: 0 },
  { playerId: "p2", tileIndex: 0 },
  { playerId: "p3", tileIndex: 0 },
] as const;

describe("validateSimultaneousRedCutLegality", () => {
  it("rejects non-mission-13 games", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [...VALID_TARGETS]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_RED_CUT_WRONG_MISSION");
  });

  it("rejects when not actor's turn", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p2", [...VALID_TARGETS]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects when no player has uncut red wires", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "b2", gameValue: 4 })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "b3", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const targets = [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ];

    const error = validateSimultaneousRedCutLegality(state, "p1", targets);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("NO_UNCUT_RED_WIRES");
  });

  it("rejects when exactly 3 wires are not designated", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_RED_CUT_INVALID_TARGETS");
  });

  it("rejects duplicate wire designations", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" }), makeTile({ id: "b1", gameValue: 1 })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_RED_CUT_INVALID_TARGETS");
  });

  it("accepts valid simultaneous red cut target designation", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 }), makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
  });

  it("allows non-red designations so execution can resolve failure", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 }), makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
  });
});

describe("validateSimultaneousRedCutWithHooks", () => {
  it("rejects when a forced action is pending", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "p1",
        lastPlayerId: "p1",
      },
    });

    const error = validateSimultaneousRedCutWithHooks(state, "p1", [...VALID_TARGETS]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });

  it("accepts when reveal reds would be forced", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutWithHooks(state, "p1", [...VALID_TARGETS]);

    expect(error).toBeNull();
  });
});

describe("executeSimultaneousRedCut", () => {
  it("cuts designated red wires when all designated wires are red", () => {
    const p1Blue = makeTile({ id: "b1", gameValue: 3 });
    const p1Red = makeRedTile({ id: "red-1" });
    const p2Red = makeRedTile({ id: "red-2" });
    const p3Red = makeRedTile({ id: "red-3" });

    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [p1Blue, p1Red] }),
        makePlayer({ id: "p2", hand: [p2Red] }),
        makePlayer({ id: "p3", hand: [p3Red, makeTile({ id: "b3", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const targets = [
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ];

    const action = executeSimultaneousRedCut(state, "p1", targets);

    expect(p1Blue.cut).toBe(false);
    expect(p1Red.cut).toBe(true);
    expect(p2Red.cut).toBe(true);
    expect(p3Red.cut).toBe(true);
    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.cuts).toEqual(targets);
      expect(action.totalCut).toBe(3);
      expect(action.actorId).toBe("p1");
    }
  });

  it("explodes when at least one designated wire is not red", () => {
    const p1Blue = makeTile({ id: "b1", gameValue: 3 });
    const p1Red = makeRedTile({ id: "red-1" });
    const p2Red = makeRedTile({ id: "red-2" });
    const p3Red = makeRedTile({ id: "red-3" });

    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [p1Blue, p1Red] }),
        makePlayer({ id: "p2", hand: [p2Red] }),
        makePlayer({ id: "p3", hand: [p3Red] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(action).toEqual({ type: "gameOver", result: "loss_red_wire" });
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(p1Red.cut).toBe(false);
    expect(p2Red.cut).toBe(false);
    expect(p3Red.cut).toBe(false);
  });

  it("triggers win when all tiles are cut", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [...VALID_TARGETS]);

    expect(state.result).toBe("win");
    expect(state.phase).toBe("finished");
    expect(action.type).toBe("gameOver");
  });

  it("advances turn after a successful simultaneous red cut", () => {
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
        makePlayer({
          id: "p3",
          hand: [makeRedTile({ id: "red-3" }), makeTile({ id: "b3", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    executeSimultaneousRedCut(state, "p1", [...VALID_TARGETS]);

    expect(state.turnNumber).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);
  });
});
