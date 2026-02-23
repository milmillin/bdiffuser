import { describe, it, expect } from "vitest";
import {
  makeTile,
  makePlayer,
  makeGameState,
  makeBoardState,
  makeEquipmentCard,
  makeNumberCard,
  makeNumberCardState,
} from "@bomb-busters/shared/testing";
import {
  validateSimultaneousFourCutLegality,
  validateSimultaneousFourCutWithHooks,
} from "../validation";
import { executeSimultaneousFourCut } from "../gameLogic";
import { dispatchHooks } from "../missionHooks";

// Re-import to ensure hook handlers are registered
import "../missionHooks";

// ── Validation Tests ────────────────────────────────────────

describe("validateSimultaneousFourCutLegality", () => {
  it("rejects wrong mission", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_FOUR_CUT_WRONG_MISSION");
  });

  it("accepts mission 23", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 3 },
    ]);
    expect(error).toBeNull();
  });

  it("accepts mission 39", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 3 },
    ]);
    expect(error).toBeNull();
  });

  it("rejects when not actor's turn", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p2", [
      { playerId: "p1", tileIndex: 0 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects wrong target count (not 4)", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS");
  });

  it("rejects when already done", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        mission23SpecialActionDone: true,
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 3 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_FOUR_CUT_ALREADY_DONE");
  });

  it("rejects invalid target player", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 5 })] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p999", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("TARGET_PLAYER_NOT_FOUND");
  });

  it("rejects duplicate targets", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 0 }, // duplicate
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS");
  });

  it("rejects already-cut tile", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5, cut: true }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
          makeTile({ id: "t6", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });
    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 3 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("TILE_ALREADY_CUT");
  });
});

describe("validateSimultaneousFourCutWithHooks", () => {
  it("rejects when a forced action is pending", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 5 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "p1",
      },
    });
    const error = validateSimultaneousFourCutWithHooks(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
      { playerId: "p2", tileIndex: 3 },
    ]);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("FORCED_ACTION_PENDING");
  });
});

// ── Execution Tests ─────────────────────────────────────────

describe("executeSimultaneousFourCut", () => {
  it("success: cuts all 4 matching tiles and unlocks equipment", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });
    const eq2 = makeEquipmentCard({ id: "eq2", faceDown: true, unlocked: false });
    const t2 = makeTile({ id: "t2", gameValue: 5 });
    const t3 = makeTile({ id: "t3", gameValue: 5 });
    const t4 = makeTile({ id: "t4", gameValue: 5 });
    const t5 = makeTile({ id: "t5", gameValue: 5 });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [t2, t3] }),
        makePlayer({ id: "p3", hand: [t4, t5] }),
      ],
      currentPlayerIndex: 0,
      board: makeBoardState({ equipment: [eq1, eq2] }),
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);

    // All tiles cut
    expect(t2.cut).toBe(true);
    expect(t3.cut).toBe(true);
    expect(t4.cut).toBe(true);
    expect(t5.cut).toBe(true);

    // Equipment unlocked
    expect(eq1.faceDown).toBe(false);
    expect(eq1.unlocked).toBe(true);
    expect(eq2.faceDown).toBe(false);
    expect(eq2.unlocked).toBe(true);

    // Special action marked done
    expect(state.campaign?.mission23SpecialActionDone).toBe(true);

    // Action shape
    expect(action.type).toBe("simultaneousFourCutResult");
    if (action.type === "simultaneousFourCutResult") {
      expect(action.success).toBe(true);
      expect(action.targetValue).toBe(5);
      expect(action.cuts).toHaveLength(4);
    }
  });

  it("failure: mismatch causes explosion", () => {
    const t2 = makeTile({ id: "t2", gameValue: 5 });
    const t3 = makeTile({ id: "t3", gameValue: 7 }); // mismatch!
    const t4 = makeTile({ id: "t4", gameValue: 5 });
    const t5 = makeTile({ id: "t5", gameValue: 5 });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [t2, t3] }),
        makePlayer({ id: "p3", hand: [t4, t5] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);

    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(action.type).toBe("gameOver");
    if (action.type === "gameOver") {
      expect(action.result).toBe("loss_red_wire");
    }
  });

  it("success triggers win check when all tiles are cut", () => {
    const t2 = makeTile({ id: "t2", gameValue: 5 });
    const t3 = makeTile({ id: "t3", gameValue: 5 });
    const t4 = makeTile({ id: "t4", gameValue: 5 });
    const t5 = makeTile({ id: "t5", gameValue: 5 });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 3, cut: true })] }),
        makePlayer({ id: "p2", hand: [t2, t3] }),
        makePlayer({ id: "p3", hand: [t4, t5] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);

    expect(state.result).toBe("win");
    expect(state.phase).toBe("finished");
    expect(action.type).toBe("gameOver");
  });

  it("success advances turn when game is not over", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "t1", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "t2", gameValue: 5 }),
          makeTile({ id: "t3", gameValue: 5 }),
          makeTile({ id: "t6", gameValue: 8 }),
        ] }),
        makePlayer({ id: "p3", hand: [
          makeTile({ id: "t4", gameValue: 5 }),
          makeTile({ id: "t5", gameValue: 5 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ value: 5, faceUp: true })],
        }),
      },
    });

    executeSimultaneousFourCut(state, "p1", [
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);

    expect(state.turnNumber).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);
  });
});

// ── Hook Tests ──────────────────────────────────────────────

describe("simultaneous_four_cut hook", () => {
  it("setup: places a Number card face-up", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
      ],
      log: [],
    });

    dispatchHooks(23, { point: "setup", state });

    expect(state.campaign?.numberCards?.visible).toHaveLength(1);
    const card = state.campaign!.numberCards!.visible[0];
    expect(card.faceUp).toBe(true);
    expect(card.value).toBeGreaterThanOrEqual(1);
    expect(card.value).toBeLessThanOrEqual(12);

    const setupLog = state.log.find(
      (e) => e.action === "hookSetup" && e.detail.startsWith("m23:number_card:init:"),
    );
    expect(setupLog).toBeDefined();
  });

  it("endTurn: discards equipment when Captain's turn starts (round > 1)", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });
    const eq2 = makeEquipmentCard({ id: "eq2", faceDown: true, unlocked: false });
    const eq3 = makeEquipmentCard({ id: "eq3", faceDown: true, unlocked: false });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
      currentPlayerIndex: 0, // Captain is about to play
      turnNumber: 4, // Round > 1
      board: makeBoardState({ equipment: [eq1, eq2, eq3] }),
      log: [],
    });

    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p2" });

    expect(state.board.equipment).toHaveLength(2);
    const discardLog = state.log.find(
      (e) => e.action === "hookEffect" && e.detail.startsWith("m23:equipment_discard:"),
    );
    expect(discardLog).toBeDefined();
  });

  it("endTurn: does NOT discard when it is the first turn", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1, // First turn
      board: makeBoardState({ equipment: [eq1] }),
      log: [],
    });

    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p2" });

    expect(state.board.equipment).toHaveLength(1);
  });

  it("endTurn: does NOT discard when non-Captain player is active", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
      currentPlayerIndex: 1, // Not Captain
      turnNumber: 4,
      board: makeBoardState({ equipment: [eq1] }),
      log: [],
    });

    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p1" });

    expect(state.board.equipment).toHaveLength(1);
  });

  it("endTurn: skips discard when special action is already done", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 4,
      board: makeBoardState({ equipment: [eq1] }),
      campaign: { mission23SpecialActionDone: true },
      log: [],
    });

    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p2" });

    expect(state.board.equipment).toHaveLength(1);
  });

  it("endTurn: no error when equipment pile is empty", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 4,
      board: makeBoardState({ equipment: [] }),
      log: [],
    });

    // Should not throw
    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p2" });
    expect(state.board.equipment).toHaveLength(0);
  });
});
