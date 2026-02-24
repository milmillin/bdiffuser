import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeRedTile,
} from "@bomb-busters/shared/testing";
import { executeDualCutDoubleDetector, resolveDetectorTileChoice } from "../gameLogic";
import { dispatchHooks } from "../missionHooks";

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

  it("sets pendingForcedAction when both match and actorTileIndex is provided", () => {
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

    // actorTileIndex=2 is preserved in the forced action
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 2);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    // No tiles cut yet — pending choice
    expect(target.hand[0].cut).toBe(false);
    expect(target.hand[1].cut).toBe(false);
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

    // Resolve: target chooses tile 0
    const resolveAction = resolveDetectorTileChoice(state, 0);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    expect(target.hand[0].cut).toBe(true);
    // The specified actor tile (index 2, b3) should be cut
    expect(actor.hand[2].cut).toBe(true);
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
    expect(action.outcome).toBe("pending");
    // No tiles cut yet — pending confirmation
    expect(target.hand[0].cut).toBe(false);
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

    // Resolve: auto-selects the single match (tile 0)
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("match");
    }
    // The specified tile (index 1, b2) should be cut
    expect(actor.hand[1].cut).toBe(true);
    // The other blue tiles should NOT be cut
    expect(actor.hand[0].cut).toBe(false);
    expect(actor.hand[2].cut).toBe(false);
  });

  it("sets pendingForcedAction when both match and actorTileIndex is undefined", () => {
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
    expect(action.outcome).toBe("pending");
    // No tiles cut yet
    expect(target.hand[0].cut).toBe(false);
    expect(target.hand[1].cut).toBe(false);
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

    // Resolve: target chooses tile 1
    const resolveAction = resolveDetectorTileChoice(state, 1);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    expect(target.hand[1].cut).toBe(true);
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

    // actorTileIndex=1 points to a cut tile — should fall back on resolution
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 1);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve
    resolveDetectorTileChoice(state, 0);
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

    // actorTileIndex=0 points to value 7, not 5 — should fall back on resolution
    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5, 0);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve
    resolveDetectorTileChoice(state, 0);
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
    expect(action.outcome).toBe("pending");
    // No immediate explosion — pending confirmation
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

    // Resolve: target confirms (no tile choice for 0-match)
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.explosion).toBe(true);
    }
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
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve: target confirms (no tile choice for 0-match)
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.explosion).toBeUndefined();
      expect(resolveAction.detonatorAdvanced).toBe(true);
      expect(resolveAction.infoTokenPlacedIndex).toBe(0); // first wire
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    // No explosion — game continues
    expect(state.phase).not.toBe("finished");
  });

  it("mission 58: does not place info token when neither designated wire matches", () => {
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
      mission: 58,
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve: target confirms
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.detonatorAdvanced).toBe(true);
      expect(resolveAction.infoTokenPlacedIndex).toBeUndefined();
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(target.infoTokens).toHaveLength(0);
    expect(state.phase).not.toBe("finished");
  });

  it("mission 50: no-markers mode does not place info token when neither designated wire matches", () => {
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
      mission: 50,
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    dispatchHooks(50, { point: "setup", state });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve: target confirms
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.detonatorAdvanced).toBe(true);
      expect(resolveAction.infoTokenPlacedIndex).toBeUndefined();
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(target.infoTokens).toHaveLength(0);
    expect(state.phase).not.toBe("finished");
  });

  it("mission 17: failed Double Detector targeting captain places false token with announced value", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [
        makeTile({ id: "b1", color: "blue", gameValue: 5 }),
      ],
    });
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 3 }),
        makeTile({ id: "c2", color: "blue", gameValue: 7 }),
      ],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 17,
      players: [actor, captain],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCutDoubleDetector(state, "actor", "captain", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve: target confirms
    resolveDetectorTileChoice(state);
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(captain.infoTokens).toHaveLength(1);
    expect(captain.infoTokens[0]).toMatchObject({
      value: 5,
      position: 0,
      isYellow: false,
    });
  });

  it("revalidates matches when targeted wires change before resolution", () => {
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
        makeTile({ id: "t1", color: "blue", gameValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 5 }),
      ],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

    // Change the wires so that none of the originally matched indices still match the guess.
    target.hand[0].gameValue = 3;
    target.hand[1].gameValue = 4;

    const resolveAction = resolveDetectorTileChoice(state, 0);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
  });

  it("mission 52: failed Double Detector places announced-value false token", () => {
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
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 52,
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(action.type).toBe("dualCutDoubleDetectorResult");
    if (action.type !== "dualCutDoubleDetectorResult") return;
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();

    // Resolve: target confirms
    resolveDetectorTileChoice(state);
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(target.infoTokens).toHaveLength(1);
    expect(target.infoTokens[0]).toMatchObject({
      value: 5,
      position: 0,
      isYellow: false,
    });
  });

  it("treats non-blue numeric legacy tiles as non-matches", () => {
    const actor = makePlayer({
      id: "actor",
      character: "double_detector",
      hand: [makeTile({ id: "b1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "legacy-red", color: "red", gameValue: 5 }),
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
    expect(action.outcome).toBe("pending");
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction?.kind).toBe("detectorTileChoice");
    if (state.pendingForcedAction?.kind === "detectorTileChoice") {
      expect(state.pendingForcedAction.matchingTileIndices).toEqual([]);
    }

    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
      expect(resolveAction.detonatorAdvanced).toBe(true);
      expect(resolveAction.infoTokenPlacedIndex).toBe(1);
    }
    expect(target.hand[0].cut).toBe(false);
    expect(target.hand[1].cut).toBe(false);
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
  });
});
