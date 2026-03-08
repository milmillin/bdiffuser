import { describe, expect, it } from "vitest";
import {
  makeBoardState,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { dispatchHooks } from "../missionHooks";
import { executeDualCut, executeSoloCut } from "../gameLogic";

// Side-effect import registers built-in handlers.
import "../missionHooks";

describe("mission 53 Nano tracker", () => {
  it("setup initializes Nano before 1 on a 12-step track", () => {
    const state = makeGameState({
      mission: 53,
      log: [],
    });

    dispatchHooks(53, { point: "setup", state });

    expect(state.campaign?.nanoTracker).toEqual({ position: 0, max: 12 });
  });

  it("successful cuts move Nano forward, but cutting the current Nano number moves it back", () => {
    const state = makeGameState({
      mission: 53,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          name: "p1",
          hand: [
            makeTile({ id: "p1-1", color: "blue", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "p1-2", color: "blue", gameValue: 1, sortValue: 1 }),
          ],
        }),
        makePlayer({ id: "p2", name: "p2", hand: [] }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 4 }),
    });

    dispatchHooks(53, { point: "setup", state });

    executeSoloCut(state, "p1", 4);
    expect(state.campaign?.nanoTracker?.position).toBe(1);
    expect(state.board.detonatorPosition).toBe(0);

    state.currentPlayerIndex = 0;
    state.campaign!.nanoTracker!.position = 1;
    executeSoloCut(state, "p1", 1);

    expect(state.campaign?.nanoTracker?.position).toBe(0);
    expect(state.board.detonatorPosition).toBe(0);
  });

  it("dual-cut failure on a red wire applies Nano +2 instead of exploding immediately", () => {
    const state = makeGameState({
      mission: 53,
      log: [],
      players: [
        makePlayer({
          id: "actor",
          name: "actor",
          hand: [makeTile({ id: "actor-1", color: "blue", gameValue: 4, sortValue: 4 })],
        }),
        makePlayer({
          id: "target",
          name: "target",
          hand: [makeTile({ id: "target-1", color: "red", gameValue: 5, sortValue: 5.5 })],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 4 }),
    });

    dispatchHooks(53, { point: "setup", state });

    executeDualCut(state, "actor", "target", 0, 4);

    expect(state.campaign?.nanoTracker?.position).toBe(2);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.players[1]?.hand[0]?.cut).toBe(true);
  });

  it("Mission 53 only ends when a failed cut pushes Nano to 12", () => {
    const state = makeGameState({
      mission: 53,
      log: [],
      players: [
        makePlayer({
          id: "actor",
          name: "actor",
          hand: [makeTile({ id: "actor-1", color: "blue", gameValue: 4, sortValue: 4 })],
        }),
        makePlayer({
          id: "target",
          name: "target",
          hand: [makeTile({ id: "target-1", color: "red", gameValue: 5, sortValue: 5.5 })],
        }),
      ],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 4 }),
    });

    dispatchHooks(53, { point: "setup", state });
    state.campaign!.nanoTracker!.position = 10;

    const action = executeDualCut(state, "actor", "target", 0, 4);

    expect(state.campaign?.nanoTracker?.position).toBe(12);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
    expect(action).toEqual({ type: "gameOver", result: "loss_detonator" });
  });
});
