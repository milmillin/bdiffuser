import { describe, it, expect } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import {
  makeTile,
  makePlayer,
  makeGameState,
  makeBoardState,
  makeEquipmentCard,
  makeYellowTile,
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

  it("accepts mission 46 when pending sevens action belongs to the actor", () => {
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({ id: "p1", hand: [
          makeTile({ id: "p1-1", gameValue: 7 }),
          makeTile({ id: "p1-2", gameValue: 7 }),
        ] }),
        makePlayer({ id: "p2", hand: [
          makeTile({ id: "p2-1", gameValue: 7 }),
          makeTile({ id: "p2-2", gameValue: 7 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        mission46PendingSevensPlayerId: "p1",
      },
    });

    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
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

  it("rejects mission 46 simultaneous cut when pending player is missing", () => {
    const actor = makePlayer({ id: "p1", hand: [makeTile({ id: "a1", gameValue: 7 })] });
    const teammates = [
      makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 7 })] }),
      makePlayer({ id: "p3", hand: [makeTile({ id: "t3", gameValue: 7 })] }),
      makePlayer({ id: "p4", hand: [makeTile({ id: "t4", gameValue: 7 })] }),
    ];

    const state = makeGameState({
      mission: 46,
      players: [actor, ...teammates],
      currentPlayerIndex: 0,
    });

    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.message).toBe(
      "Mission 46: when only 7-value wires remain, you must cut all 4 sevens simultaneously",
    );
  });

  it("rejects mission 46 simultaneous cut when actor is not designated", () => {
    const actor = makePlayer({ id: "p1", hand: [makeTile({ id: "a1", gameValue: 7 })] });
    const teammates = [
      makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 7 })] }),
      makePlayer({ id: "p3", hand: [makeTile({ id: "t3", gameValue: 7 })] }),
      makePlayer({ id: "p4", hand: [makeTile({ id: "t4", gameValue: 7 })] }),
    ];

    const state = makeGameState({
      mission: 46,
      players: [actor, ...teammates],
      currentPlayerIndex: 0,
      campaign: { mission46PendingSevensPlayerId: "p2" },
    });

    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);

    expect(error).not.toBeNull();
    expect(error!.message).toBe(
      "Mission 46: only the player with only 7s remaining may trigger the special cut",
    );
  });

  it("allows mission 46 simultaneous cut for the designated player", () => {
    const actor = makePlayer({ id: "p1", hand: [makeTile({ id: "a1", gameValue: 7 })] });
    const teammates = [
      makePlayer({ id: "p2", hand: [makeTile({ id: "t2", gameValue: 7 })] }),
      makePlayer({ id: "p3", hand: [makeTile({ id: "t3", gameValue: 7 })] }),
      makePlayer({ id: "p4", hand: [makeTile({ id: "t4", gameValue: 7 })] }),
    ];

    const state = makeGameState({
      mission: 46,
      players: [actor, ...teammates],
      currentPlayerIndex: 0,
      campaign: { mission46PendingSevensPlayerId: "p1" },
      pendingForcedAction: { kind: "mission46SevensCut", playerId: "p1" },
    });

    const error = validateSimultaneousFourCutLegality(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);

    expect(error).toBeNull();
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

  it("mission 39 success: deals remaining Number cards starting from captain", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-1", gameValue: 3 }),
            makeTile({ id: "p1-2", gameValue: 5 }),
          ],
          isCaptain: false,
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-1", gameValue: 5 }),
            makeTile({ id: "p2-2", gameValue: 5 }),
          ],
          isCaptain: true,
        }),
        makePlayer({
          id: "p3",
          hand: [
            makeTile({ id: "p3-1", gameValue: 5 }),
            makeTile({ id: "p3-2", gameValue: 7 }),
          ],
          isCaptain: false,
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "visible-5", value: 5, faceUp: true })],
          deck: [
            makeNumberCard({ id: "d1", value: 1, faceUp: true }),
            makeNumberCard({ id: "d2", value: 2, faceUp: true }),
            makeNumberCard({ id: "d3", value: 3, faceUp: true }),
            makeNumberCard({ id: "d4", value: 4, faceUp: true }),
            makeNumberCard({ id: "d5", value: 5, faceUp: true }),
          ],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p3", tileIndex: 0 },
    ]);

    expect(action.type).toBe("simultaneousFourCutResult");
    expect(state.campaign?.numberCards?.deck).toHaveLength(0);

    const playerHands = state.campaign?.numberCards?.playerHands ?? {};
    expect(playerHands.p1?.map((card) => card.value)).toEqual([3]);
    expect(playerHands.p2?.map((card) => card.value)).toEqual([1, 4]);
    expect(playerHands.p3?.map((card) => card.value)).toEqual([2, 5]);

    const allDealt = [...(playerHands.p1 ?? []), ...(playerHands.p2 ?? []), ...(playerHands.p3 ?? [])];
    expect(allDealt).toHaveLength(5);
    expect(allDealt.every((card) => card.faceUp === false)).toBe(true);
    expect(state.campaign?.numberCards?.visible[0]?.value).toBe(5);

    // Mission 39 post-success tokens:
    // - p1 gets value 3 and still has an uncut 3, so receives one off-stand token.
    // - p2 and p3 do not receive tokens because none of their dealt values remain in-hand.
    expect(state.players[0].infoTokens).toEqual([
      { value: 3, position: -1, isYellow: false },
    ]);
    expect(state.players[1].infoTokens).toEqual([]);
    expect(state.players[2].infoTokens).toEqual([]);
  });

  it("mission 39: grants dealt-value token when value is in hand even if only cut on that stand", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-5", gameValue: 5 }),
            makeTile({ id: "p1-3", gameValue: 3 }),
          ],
          isCaptain: false,
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-5", gameValue: 5 }),
            makeTile({ id: "p2-3-cut", gameValue: 3, cut: true }),
            makeTile({ id: "p2-8", gameValue: 8 }),
          ],
          isCaptain: true,
        }),
        makePlayer({
          id: "p3",
          hand: [
            makeTile({ id: "p3-5a", gameValue: 5 }),
            makeTile({ id: "p3-5b", gameValue: 5 }),
            makeTile({ id: "p3-9", gameValue: 9 }),
          ],
          isCaptain: false,
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "visible-5", value: 5, faceUp: true })],
          deck: [
            makeNumberCard({ id: "d1", value: 3, faceUp: true }),
            makeNumberCard({ id: "d2", value: 1, faceUp: true }),
            makeNumberCard({ id: "d3", value: 2, faceUp: true }),
          ],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);

    expect(action.type).toBe("simultaneousFourCutResult");
    expect(state.players[1].infoTokens).toEqual([
      { value: 3, position: -1, isYellow: false },
    ]);
  });

  it("mission 39: grants at most one post-success token per player", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-5a", gameValue: 5 }),
            makeTile({ id: "p1-5b", gameValue: 5 }),
          ],
          isCaptain: true,
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-5a", gameValue: 5 }),
            makeTile({ id: "p2-5b", gameValue: 5 }),
            makeTile({ id: "p2-3", gameValue: 3 }),
            makeTile({ id: "p2-4", gameValue: 4 }),
          ],
          isCaptain: false,
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "visible-5", value: 5, faceUp: true })],
          deck: [
            makeNumberCard({ id: "d1", value: 1, faceUp: true }),
            makeNumberCard({ id: "d2", value: 3, faceUp: true }),
            makeNumberCard({ id: "d3", value: 2, faceUp: true }),
            makeNumberCard({ id: "d4", value: 4, faceUp: true }),
          ],
        }),
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
    ]);

    expect(action.type).toBe("simultaneousFourCutResult");
    expect(state.players[1].infoTokens).toHaveLength(1);
    expect([3, 4]).toContain(state.players[1].infoTokens[0]?.value);
    expect(state.players[1].infoTokens[0]).toMatchObject({
      position: -1,
      isYellow: false,
    });
  });

  it("mission 46 success: cuts sevens without mission-23 equipment unlock side effects", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });
    const eq2 = makeEquipmentCard({ id: "eq2", faceDown: true, unlocked: false });
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({ id: "p1", hand: [makeYellowTile({ id: "p1-1", sortValue: 5.1 })] }),
        makePlayer({ id: "p2", hand: [
          makeYellowTile({ id: "p2-1", sortValue: 6.1 }),
          makeYellowTile({ id: "p2-2", sortValue: 7.1 }),
          makeYellowTile({ id: "p2-3", sortValue: 8.1 }),
          makeTile({ id: "p2-4", gameValue: 4 }),
        ] }),
      ],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ equipment: [eq1, eq2] }),
      campaign: {
        mission46PendingSevensPlayerId: "p1",
      },
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p2", tileIndex: 2 },
    ]);

    expect(action.type).toBe("simultaneousFourCutResult");
    expect(eq1.faceDown).toBe(true);
    expect(eq1.unlocked).toBe(false);
    expect(eq2.faceDown).toBe(true);
    expect(eq2.unlocked).toBe(false);
    expect(state.campaign?.mission23SpecialActionDone).not.toBe(true);
  });

  it("mission 46 success ignores stale Number card and uses mission-fixed 7 target", () => {
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({ id: "p1", hand: [
          makeTile({ id: "p1-cut-3", gameValue: 3, cut: true }),
          makeYellowTile({ id: "p1-1", sortValue: 5.1 }),
          makeYellowTile({ id: "p1-2", sortValue: 6.1 }),
        ] }),
        makePlayer({ id: "p2", hand: [
          makeYellowTile({ id: "p2-1", sortValue: 7.1 }),
          makeYellowTile({ id: "p2-2", sortValue: 8.1 }),
        ] }),
        makePlayer({ id: "p3", hand: [
          makeTile({ id: "p3-nope", gameValue: 3 }),
        ] }),
      ],
      board: makeBoardState({}),
      campaign: {
        mission46PendingSevensPlayerId: "p1",
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "stale", value: 3, faceUp: true })],
        }),
      },
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    const action = executeSimultaneousFourCut(state, "p1", [
      { playerId: "p1", tileIndex: 1 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p2", tileIndex: 1 },
      { playerId: "p1", tileIndex: 2 },
    ]);

    expect(action.type).toBe("simultaneousFourCutResult");
    if (action.type === "simultaneousFourCutResult") {
      expect(action.targetValue).toBe(7);
    }

    expect(state.board.validationTrack[3]).not.toBe(1);
    expect(state.board.validationTrack[7]).toBe(0);
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
      (e) => e.action === "hookSetup" && renderLogDetail(e.detail).startsWith("m23:number_card:init:"),
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
      (e) => e.action === "hookEffect" && renderLogDetail(e.detail).startsWith("m23:equipment_discard:"),
    );
    expect(discardLog).toBeDefined();
  });

  it("endTurn: discards equipment when a non-zero index Captain is about to play", () => {
    const eq1 = makeEquipmentCard({ id: "eq1", faceDown: true, unlocked: false });
    const eq2 = makeEquipmentCard({ id: "eq2", faceDown: true, unlocked: false });

    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2", isCaptain: true }),
      ],
      currentPlayerIndex: 1,
      turnNumber: 4,
      board: makeBoardState({ equipment: [eq1, eq2] }),
      log: [],
    });

    dispatchHooks(23, { point: "endTurn", state, previousPlayerId: "p1" });

    expect(state.board.equipment).toHaveLength(1);
    const discardLog = state.log.find(
      (e) => e.action === "hookEffect" && renderLogDetail(e.detail).startsWith("m23:equipment_discard:"),
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
