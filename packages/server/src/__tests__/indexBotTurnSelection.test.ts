import { describe, expect, it } from "vitest";
import { logText } from "@bomb-busters/shared";
import { getBotDoubleDetectorNoMatchInfoTokenIndex } from "../gameLogic";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";

describe("getBotDoubleDetectorNoMatchInfoTokenIndex", () => {
  it("treats mission-11 hidden red-like tiles as red-like for bot DD fallback", () => {
    const targetPlayer = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 7, sortValue: 7 }),
        makeTile({ id: "t2", color: "blue", gameValue: 3, sortValue: 3 }),
      ],
    });

    const state = makeGameState({
      mission: 11,
      players: [targetPlayer],
      phase: "playing",
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1,
        },
      ],
    });

    expect(getBotDoubleDetectorNoMatchInfoTokenIndex(state, targetPlayer, 0, 1)).toBe(1);
  });

  it("keeps non-red preference for non-mission-11 games", () => {
    const targetPlayer = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeTile({ id: "t1", color: "red", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 9, sortValue: 9 }),
      ],
    });

    const state = makeGameState({
      mission: 5,
      players: [targetPlayer],
      phase: "playing",
    });

    expect(getBotDoubleDetectorNoMatchInfoTokenIndex(state, targetPlayer, 0, 1)).toBe(1);
  });
});
