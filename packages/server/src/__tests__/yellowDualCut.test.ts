import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeYellowTile,
  makeTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut } from "../gameLogic";

describe("executeDualCut actorTileIndex (yellow wire fix)", () => {
  it("places a yellow info token when a yellow guess targets a non-yellow wire", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeYellowTile({ id: "y1" })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 4 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, "YELLOW");

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(action.detonatorAdvanced).toBe(true);
    expect(state.board.detonatorPosition).toBe(1);
    expect(target.hand[0].cut).toBe(false);
    expect(target.infoTokens).toHaveLength(1);
    expect(target.infoTokens[0]).toMatchObject({
      value: 4,
      position: 0,
      isYellow: true,
    });
  });

  it("selects the correct yellow tile when actorTileIndex is provided", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "y1" }),
        makeYellowTile({ id: "y2" }),
        makeYellowTile({ id: "y3" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "ty1" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=2 should cut actor's third tile (y3), not the first (y1)
    const action = executeDualCut(state, "actor", "target", 0, "YELLOW", 2);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(true);
    expect(target.hand[0].cut).toBe(true);
    // The specified tile (index 2, y3) should be cut
    expect(actor.hand[2].cut).toBe(true);
    // The first yellow tile should NOT be cut
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[1].cut).toBe(false);
  });

  it("falls back to first match when actorTileIndex is undefined", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "y1" }),
        makeYellowTile({ id: "y2" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "ty1" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, "YELLOW");

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(true);
    // Falls back to first match (y1)
    expect(actor.hand[0].cut).toBe(true);
    expect(actor.hand[1].cut).toBe(false);
  });

  it("falls back gracefully when actorTileIndex points to an already-cut tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "y1" }),
        makeYellowTile({ id: "y2", cut: true }),
        makeYellowTile({ id: "y3" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "ty1" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=1 points to a cut tile — should fall back to first uncut match
    const action = executeDualCut(state, "actor", "target", 0, "YELLOW", 1);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(true);
    // Falls back to first uncut yellow (y1)
    expect(actor.hand[0].cut).toBe(true);
    expect(actor.hand[1].cut).toBe(true); // was already cut
    expect(actor.hand[2].cut).toBe(false);
  });

  it("falls back gracefully when actorTileIndex points to a non-matching value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 3 }),
        makeYellowTile({ id: "y1" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "ty1" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=0 points to a blue tile, not yellow — should fall back
    const action = executeDualCut(state, "actor", "target", 0, "YELLOW", 0);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(true);
    // Falls back to first uncut yellow (y1 at index 1)
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[1].cut).toBe(true);
  });

  it("mission 35: ignores X-marked actorTileIndex while yellow wires remain", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "x5", color: "blue", gameValue: 5, isXMarked: true }),
        makeTile({ id: "b5", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t5", color: "blue", gameValue: 5 })],
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

    const action = executeDualCut(state, "actor", "target", 0, 5, 0);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(true);
    expect(target.hand[0].cut).toBe(true);
    // X-marked wire must stay uncut until all yellow wires are cut.
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[1].cut).toBe(true);
  });
});
