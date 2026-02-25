import { describe, it, expect } from "vitest";
import {
  makeTile,
  makePlayer,
  makeGameState,
  makeRedTile,
  makeBoardState,
  makeEquipmentCard,
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

  it("mission 13: with 3 players, rejects actor with no uncut red wire", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({
          id: "p2",
          hand: [makeRedTile({ id: "red-1" }), makeRedTile({ id: "red-2" })],
        }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("uncut red wire");
  });

  it("mission 13: with 4 players, allows actor with no uncut red wire", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "red-1" })] }),
        makePlayer({ id: "p3", hand: [makeRedTile({ id: "red-2" })] }),
        makePlayer({ id: "p4", hand: [makeRedTile({ id: "red-3" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
  });

  it("accepts mission 48 simultaneous yellow target designation", () => {
    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
            makeTile({ id: "b1", gameValue: 3 }),
          ],
        }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" })] }),
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

  it("mission 48: with 3 players, rejects actor with no uncut yellow wire", () => {
    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
            makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" }),
          ],
        }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("uncut yellow wire");
  });

  it("mission 48: with 4 players, allows actor with no uncut yellow wire", () => {
    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })] }),
        makePlayer({ id: "p4", hand: [makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
  });

  it("mission 41: with 2 players, allows actor without uncut yellow wire", () => {
    const state = makeGameState({
      mission: 41,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
  });

  it("mission 41: rejects targeting the actor's own wire", () => {
    const state = makeGameState({
      mission: 41,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_RED_CUT_INVALID_TARGETS");
    expect(error!.message).toContain("teammate's tripwire");
  });

  it("mission 41: rejects when only actor has an uncut tripwire", () => {
    const state = makeGameState({
      mission: 41,
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "b2", gameValue: 4 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("teammate");
  });

  it("mission 41: rejects when no uncut yellow wires remain", () => {
    const state = makeGameState({
      mission: 41,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "b2", gameValue: 4 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 48: rejects when no player has uncut yellow wires", () => {
    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "b2", gameValue: 4 })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "b3", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousRedCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("MISSION_RULE_VIOLATION");
    expect(error!.message).toContain("yellow");
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

  it("mission 48: cuts designated yellow wires when all designated wires are yellow", () => {
    const y1 = makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" });
    const y2 = makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" });
    const y3 = makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" });

    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({ id: "p1", hand: [y1, makeTile({ id: "b1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [y2] }),
        makePlayer({ id: "p3", hand: [y3, makeTile({ id: "b3", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(y1.cut).toBe(true);
    expect(y2.cut).toBe(true);
    expect(y3.cut).toBe(true);
    expect(action.type).toBe("simultaneousRedCutResult");
  });

  it("mission 48: on mismatch, places info tokens on all designated wires and advances detonator by 1", () => {
    const y1 = makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" });
    const b1 = makeTile({ id: "b1", gameValue: 3 });
    const y2 = makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" });
    const y3 = makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" });

    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({
          id: "p1",
          hand: [y1, b1],
        }),
        makePlayer({ id: "p2", hand: [y2] }),
        makePlayer({ id: "p3", hand: [y3] }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.totalCut).toBe(0);
      expect(action.cuts).toEqual([]);
    }

    expect(state.board.detonatorPosition).toBe(1);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
    expect(state.turnNumber).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);

    expect(y1.cut).toBe(false);
    expect(b1.cut).toBe(false);
    expect(y2.cut).toBe(false);
    expect(y3.cut).toBe(false);

    expect(state.players[0].infoTokens).toHaveLength(1);
    expect(state.players[1].infoTokens).toHaveLength(1);
    expect(state.players[2].infoTokens).toHaveLength(1);
    expect(state.players[0].infoTokens[0]?.position).toBe(1);
    expect(state.players[0].infoTokens[0]?.isYellow).toBe(false);
    expect(state.players[1].infoTokens[0]?.position).toBe(0);
    expect(state.players[1].infoTokens[0]?.isYellow).toBe(true);
    expect(state.players[2].infoTokens[0]?.position).toBe(0);
    expect(state.players[2].infoTokens[0]?.isYellow).toBe(true);
  });

  it("mission 48: successful simultaneous yellow cut unlocks yellow equipment", () => {
    const y1 = makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" });
    const y2 = makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" });
    const y3 = makeTile({ id: "y3", color: "yellow", gameValue: "YELLOW" });
    const yellowEquipment = makeEquipmentCard({
      id: "false_bottom",
      unlockValue: "YELLOW",
      unlocked: false,
    });

    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({ id: "p1", hand: [y1] }),
        makePlayer({ id: "p2", hand: [y2] }),
        makePlayer({ id: "p3", hand: [y3] }),
      ],
      board: makeBoardState({ equipment: [yellowEquipment] }),
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(action.type).toBe("gameOver");
    expect(state.board.equipment[0]?.unlocked).toBe(true);
  });

  it("mission 41: on successful tripwire cut, sets one wire cut and moves detonator back by 1", () => {
    const state = makeGameState({
      mission: 41,
      board: makeBoardState({ detonatorPosition: 4, detonatorMax: 12 }),
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "b1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "y2", color: "yellow", gameValue: "YELLOW" }),
          ],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.totalCut).toBe(1);
      expect(action.cuts).toEqual([{ playerId: "p2", tileIndex: 0 }]);
    }
    expect(state.players[1].hand[0].cut).toBe(true);
    expect(state.board.detonatorPosition).toBe(3);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
  });

  it("mission 41: mismatch on non-yellow wire places one token and advances detonator", () => {
    const state = makeGameState({
      mission: 41,
      board: makeBoardState({
        detonatorPosition: 0,
        detonatorMax: 12,
      }),
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "b1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "b2", gameValue: 4 })],
        }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(action.type).toBe("simultaneousRedCutResult");
    if (action.type === "simultaneousRedCutResult") {
      expect(action.totalCut).toBe(0);
      expect(action.cuts).toEqual([]);
    }
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.players[1].infoTokens).toHaveLength(1);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(2);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
  });

  it("mission 41: designated red wire explodes immediately", () => {
    const state = makeGameState({
      mission: 41,
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "b1", gameValue: 3 })],
        }),
        makePlayer({ id: "p2", hand: [makeRedTile({ id: "r2" })] }),
      ],
      currentPlayerIndex: 0,
    });

    const action = executeSimultaneousRedCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);

    expect(action).toEqual({ type: "gameOver", result: "loss_red_wire" });
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(state.turnNumber).toBe(1);
  });
});
