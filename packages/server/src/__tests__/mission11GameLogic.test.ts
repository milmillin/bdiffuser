import { describe, it, expect } from "vitest";
import { logText } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut, executeDualCutDoubleDetector, executeSoloCut, resolveDetectorTileChoice } from "../gameLogic";
import { dispatchHooks } from "../missionHooks";

describe("mission 11 setup hook", () => {
  it("creates a numberCards campaign object with a visible card", () => {
    const state = makeGameState({ mission: 11 });
    dispatchHooks(11, { point: "setup", state });

    expect(state.campaign).toBeDefined();
    expect(state.campaign!.numberCards).toBeDefined();
    expect(state.campaign!.numberCards!.visible).toHaveLength(1);

    const card = state.campaign!.numberCards!.visible[0];
    expect(card.faceUp).toBe(true);
    expect(card.value).toBeGreaterThanOrEqual(1);
    expect(card.value).toBeLessThanOrEqual(12);
    expect(card.id).toBe(`m11-blue-as-red-${card.value}`);
  });
});

describe("mission 11 game logic", () => {
  it("explodes when a dual cut successfully cuts the hidden red-like blue value", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 7 })],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const action = executeDualCut(state, "actor", "target", 0, 7);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;

    expect(action.explosion).toBe(true);
    expect(action.success).toBe(false);
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(actor.hand[0].cut).toBe(false);
    expect(target.hand[0].cut).toBe(true);
  });

  it("does not explode when a dual cut targets a non-hidden value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 5 }),
        makeTile({ id: "a2", color: "blue", gameValue: 9 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5 })],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);
    expect(action.type).toBe("dualCutResult");
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
  });

  it("cuts a fallback actor wire when a wrong value is announced", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 5 }),
        makeTile({ id: "a2", color: "blue", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const beforeDetonator = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "target", 0, 9);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(action.detonatorAdvanced).toBe(true);
    expect(state.board.detonatorPosition).toBe(beforeDetonator + 1);
    expect(target.hand[0].cut).toBe(false);
    expect(actor.hand[0].cut).toBe(true);
    expect(actor.hand[1].cut).toBe(false);
  });

  it("fails when target matches the announced value but actor lacks that value in hand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 7 })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const beforeDetonator = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "target", 0, 7);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(action.detonatorAdvanced).toBe(true);
    expect(state.board.detonatorPosition).toBe(beforeDetonator + 1);
    expect(target.hand[0].cut).toBe(false);
    expect(actor.hand[0].cut).toBe(true);
  });

  it("explodes when a dual cut targets a hidden red-like wire with a wrong guess", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);
    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;

    expect(action.explosion).toBe(true);
    expect(action.success).toBe(false);
    expect(action.revealedColor).toBe("red");
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(target.hand[0].cut).toBe(true);
  });

  it("explodes when a dual cut targets hidden red-like value even if actor lacks it", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });
    const beforeDetonator = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "target", 0, 7);

    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(action.explosion).toBe(true);
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(target.hand[0].cut).toBe(true);
    expect(actor.hand[0].cut).toBe(false);
    expect(state.board.detonatorPosition).toBe(beforeDetonator);
  });

  it("explodes when a solo cut cuts the hidden red-like value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 7 }),
        makeTile({ id: "a2", color: "blue", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const action = executeSoloCut(state, "actor", 7);
    expect(action).toEqual({ type: "gameOver", result: "loss_red_wire" });
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(actor.hand.filter((t) => t.cut)).toHaveLength(1);
  });

  describe("double detector", () => {
    const blueAsRedLog = {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: logText("blue_as_red:7"),
      timestamp: 1000,
    };

    it("explodes when both tiles match the hidden red-like value (after choice)", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", color: "blue", gameValue: 7 })],
      });
      const target = makePlayer({
        id: "target",
        name: "Target",
        hand: [
          makeTile({ id: "t1", color: "blue", gameValue: 7 }),
          makeTile({ id: "t2", color: "blue", gameValue: 7 }),
        ],
      });
      const state = makeGameState({
        mission: 11,
        players: [actor, target],
        currentPlayerIndex: 0,
        log: [blueAsRedLog],
      });

      const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 7);
      expect(action.type).toBe("dualCutDoubleDetectorResult");
      if (action.type !== "dualCutDoubleDetectorResult") return;
      expect(action.outcome).toBe("pending");
      // Forced action is set; explosion happens on resolution
      expect(state.pendingForcedAction).toBeDefined();
      expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

      const resolveAction = resolveDetectorTileChoice(state, 0);
      expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
      if (resolveAction.type === "dualCutDoubleDetectorResult") {
        expect(resolveAction.explosion).toBe(true);
      }
      expect(state.result).toBe("loss_red_wire");
      expect(state.phase).toBe("finished");
    });

    it("explodes when one tile matches the hidden red-like value", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", color: "blue", gameValue: 7 })],
      });
      const target = makePlayer({
        id: "target",
        name: "Target",
        hand: [
          makeTile({ id: "t1", color: "blue", gameValue: 7 }),
          makeTile({ id: "t2", color: "blue", gameValue: 5 }),
        ],
      });
      const state = makeGameState({
        mission: 11,
        players: [actor, target],
        currentPlayerIndex: 0,
        log: [blueAsRedLog],
      });

      const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 7);
      expect(action.type).toBe("dualCutDoubleDetectorResult");
      if (action.type !== "dualCutDoubleDetectorResult") return;
      expect(action.outcome).toBe("pending");
      expect(state.pendingForcedAction).toBeDefined();

      // Resolve: auto-selects the single match (tile 0)
      const resolveAction = resolveDetectorTileChoice(state);
      expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
      if (resolveAction.type === "dualCutDoubleDetectorResult") {
        expect(resolveAction.explosion).toBe(true);
        expect(resolveAction.outcome).toBe("match");
      }
      expect(state.result).toBe("loss_red_wire");
      expect(state.phase).toBe("finished");
    });

    it("explodes when no tiles match but both are hidden red-like values", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
      });
      const target = makePlayer({
        id: "target",
        name: "Target",
        hand: [
          makeTile({ id: "t1", color: "blue", gameValue: 7 }),
          makeTile({ id: "t2", color: "blue", gameValue: 7 }),
        ],
      });
      const state = makeGameState({
        mission: 11,
        players: [actor, target],
        currentPlayerIndex: 0,
        log: [blueAsRedLog],
      });

      const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);
      expect(action.type).toBe("dualCutDoubleDetectorResult");
      if (action.type !== "dualCutDoubleDetectorResult") return;
      expect(action.outcome).toBe("pending");
      expect(state.pendingForcedAction).toBeDefined();

      // Resolve: target confirms (0-match double detector)
      const resolveAction = resolveDetectorTileChoice(state);
      expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
      if (resolveAction.type === "dualCutDoubleDetectorResult") {
        expect(resolveAction.explosion).toBe(true);
        expect(resolveAction.outcome).toBe("no_match");
      }
      expect(state.result).toBe("loss_red_wire");
      expect(state.phase).toBe("finished");
    });

    it("does not explode when tiles are safe blue values", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [
          makeTile({ id: "a1", color: "blue", gameValue: 5 }),
          makeTile({ id: "a2", color: "blue", gameValue: 9 }),
        ],
      });
      const target = makePlayer({
        id: "target",
        name: "Target",
        hand: [
          makeTile({ id: "t1", color: "blue", gameValue: 5 }),
          makeTile({ id: "t2", color: "blue", gameValue: 3 }),
        ],
      });
      const state = makeGameState({
        mission: 11,
        players: [actor, target],
        currentPlayerIndex: 0,
        log: [blueAsRedLog],
      });

      const action = executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);
      expect(action.type).toBe("dualCutDoubleDetectorResult");
      if (action.type !== "dualCutDoubleDetectorResult") return;
      expect(action.outcome).toBe("pending");
      expect(state.pendingForcedAction).toBeDefined();

      // Resolve: auto-selects the single match (tile 0)
      const resolveAction = resolveDetectorTileChoice(state);
      expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
      if (resolveAction.type === "dualCutDoubleDetectorResult") {
        expect(resolveAction.explosion).toBeUndefined();
        expect(resolveAction.outcome).toBe("match");
      }
      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("grants one reserve oxygen to every player when mission 54 places a validation token", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "p1-5a", gameValue: 5 }),
          makeTile({ id: "p1-5b", gameValue: 5 }),
          makeTile({ id: "p1-5c", gameValue: 5 }),
          makeTile({ id: "p1-5d", gameValue: 5 }),
        ],
      });
      const teammate = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-6", gameValue: 6 })],
      });
      const state = makeGameState({
        mission: 54,
        players: [actor, teammate],
        currentPlayerIndex: 0,
      });

      dispatchHooks(54, { point: "setup", state });
      const action = executeSoloCut(state, "p1", 5);
      expect(action.type).toBe("soloCutResult");
      if (action.type !== "soloCutResult") return;

      expect(state.board.validationTrack[5]).toBe(4);
      expect(state.campaign?.oxygen?.pool).toBe(7);
      expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(8);
      expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(10);
    });

    it("grants one reserve oxygen to every player when mission 63 places a validation token", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "captain-5a", gameValue: 5 }),
          makeTile({ id: "captain-5b", gameValue: 5 }),
          makeTile({ id: "captain-5c", gameValue: 5 }),
          makeTile({ id: "captain-5d", gameValue: 5 }),
        ],
      });
      const teammate = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-6", gameValue: 6 })],
      });
      const state = makeGameState({
        mission: 63,
        players: [captain, teammate],
        currentPlayerIndex: 0,
      });

      dispatchHooks(63, { point: "setup", state });
      const action = executeSoloCut(state, "captain", 5);
      expect(action.type).toBe("soloCutResult");
      if (action.type !== "soloCutResult") return;

      expect(state.board.validationTrack[5]).toBe(4);
      expect(state.campaign?.oxygen?.pool).toBe(3);
      expect(state.campaign?.oxygen?.playerOxygen.captain).toBe(0);
      expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(11);
    });
  });
});
