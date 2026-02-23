import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeRedTile,
} from "@bomb-busters/shared/testing";
import { executeDualCutDoubleDetector } from "../gameLogic";

describe("executeDualCutDoubleDetector actorTileIndex", () => {
  it("consumes Double Detector outside mission 58", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      characterUsed: false,
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      mission: 1,
    });

    executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);
    expect(state.players[0].characterUsed).toBe(true);
  });

  it("does not consume Double Detector in mission 58", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      characterUsed: false,
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      mission: 58,
    });

    executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);
    expect(state.players[0].characterUsed).toBe(false);
  });

  it("selects the correct blue tile when actorTileIndex is provided (both match)", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
        makeTile({ id: "b2", color: "blue", gameValue: 5 }),
        makeTile({ id: "b3", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=2 should cut actor's third tile (b3), not the first (b1)
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 2);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("both_match");
    // The specified tile (index 2, b3) should be cut
    expect(actor.hand[2].cut).toBe(true);
    // The first two blue tiles should NOT be cut
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[1].cut).toBe(false);
  });

  it("selects the correct blue tile when actorTileIndex is provided (one match)", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 3 }),
        makeTile({ id: "b2", color: "blue", gameValue: 3 }),
        makeTile({ id: "b3", color: "blue", gameValue: 3 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 3 }),
        makeTile({ id: "t2", color: "blue", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=1 should cut actor's second tile (b2)
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 3, 1);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("one_match");
    // The specified tile (index 1, b2) should be cut
    expect(actor.hand[1].cut).toBe(true);
    // The other blue tiles should NOT be cut
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[2].cut).toBe(false);
  });

  it("falls back to first match when actorTileIndex is undefined", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
        makeTile({ id: "b2", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("both_match");
    // Falls back to first match (b1)
    expect(actor.hand[0].cut).toBe(true);
    expect(actor.hand[1].cut).toBe(false);
  });

  it("falls back gracefully when actorTileIndex points to an already-cut tile", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
        makeTile({ id: "b2", color: "blue", gameValue: 5, cut: true }),
        makeTile({ id: "b3", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=1 points to a cut tile — should fall back to first uncut match
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 1);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("both_match");
    // Falls back to first uncut match (b1)
    expect(actor.hand[0].cut).toBe(true);
    expect(actor.hand[1].cut).toBe(true); // was already cut
    expect(actor.hand[2].cut).toBe(false);
  });

  it("falls back gracefully when actorTileIndex points to a non-matching value", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 7 }),
        makeTile({ id: "b2", color: "blue", gameValue: 5 }),
        makeTile({ id: "b3", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    // actorTileIndex=0 points to value 7, not 5 — should fall back
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 0);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("both_match");
    // Falls back to first uncut match with value 5 (b2)
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[1].cut).toBe(true);
    expect(actor.hand[2].cut).toBe(false);
  });

  it("explodes when both designated wires are red", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeRedTile({ id: "r1" }),
        makeRedTile({ id: "r2" }),
        makeTile({ id: "t3", color: "blue", gameValue: 3 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("none_match");
    expect(action.explosion).toBe(true);
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
  });

  it("places info token when both designated wires are non-red and neither matches", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 3 }),
        makeTile({ id: "t2", color: "blue", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("none_match");
    expect(action.explosion).toBeUndefined();
    expect(action.detonatorAdvanced).toBe(true);
    expect(action.infoTokenPlacedIndex).toBe(0); // first wire
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    // No explosion — game continues
    expect(state.phase).not.toBe("finished");
  });
});
