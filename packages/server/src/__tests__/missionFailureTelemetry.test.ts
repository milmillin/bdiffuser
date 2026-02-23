import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  makeBoardState,
  makeGameState,
  makePlayer,
  makeRedTile,
  makeTile,
} from "@bomb-busters/shared/testing";
import {
  executeDualCut,
  executeDualCutDoubleDetector,
  executeSoloCut,
} from "../gameLogic";
import {
  clearTelemetrySink,
  setTelemetrySink,
  type MissionFailureTelemetryEvent,
} from "../missionHooks";

describe("mission failure telemetry integration", () => {
  let events: MissionFailureTelemetryEvent[];

  beforeEach(() => {
    events = [];
    setTelemetrySink((event) => {
      if (event.type === "mission_failure") events.push(event);
    });
  });

  afterEach(() => {
    clearTelemetrySink();
  });

  it("emits loss_red_wire telemetry for dualCut red wire explosion", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
        makePlayer({
          id: "target",
          hand: [makeRedTile({ id: "r1", sortValue: 3.5 })],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 3 }),
      currentPlayerIndex: 0,
      log: [],
    });

    executeDualCut(state, "actor", "target", 0, 5);

    expect(state.result).toBe("loss_red_wire");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "mission_failure",
      missionId: 1,
      failureReason: "loss_red_wire",
      actorId: "actor",
      targetPlayerId: "target",
    });
  });

  it("emits loss_detonator telemetry for dualCut detonator failure", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
        makePlayer({
          id: "target",
          hand: [makeTile({ id: "t1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 3 }),
      currentPlayerIndex: 0,
      log: [],
    });

    executeDualCut(state, "actor", "target", 0, 5);

    expect(state.result).toBe("loss_detonator");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "mission_failure",
      missionId: 1,
      failureReason: "loss_detonator",
      actorId: "actor",
      targetPlayerId: "target",
      detonatorPosition: 3,
      detonatorMax: 3,
    });
  });

  it("emits loss_red_wire telemetry for double-detector both-red failure", () => {
    const state = makeGameState({
      mission: 1,
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
        makePlayer({
          id: "target",
          hand: [
            makeRedTile({ id: "r1", sortValue: 3.5 }),
            makeRedTile({ id: "r2", sortValue: 4.5 }),
          ],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 3 }),
      currentPlayerIndex: 0,
      log: [],
    });

    executeDualCutDoubleDetector(state, "actor", "target", 0, 1, 5);

    expect(state.result).toBe("loss_red_wire");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "mission_failure",
      missionId: 1,
      failureReason: "loss_red_wire",
      actorId: "actor",
      targetPlayerId: "target",
    });
  });

  it("emits hook-driven loss_red_wire telemetry for mission 11 soloCut", () => {
    const state = makeGameState({
      mission: 11,
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 7, sortValue: 7 })],
        }),
        makePlayer({
          id: "target",
          hand: [makeTile({ id: "t1", color: "blue", gameValue: 1, sortValue: 1 })],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 3 }),
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "blue_as_red:7",
          timestamp: Date.now(),
        },
      ],
    });

    executeSoloCut(state, "actor", 7);

    expect(state.result).toBe("loss_red_wire");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "mission_failure",
      missionId: 11,
      failureReason: "loss_red_wire",
      actorId: "actor",
      targetPlayerId: null,
    });
  });
});
