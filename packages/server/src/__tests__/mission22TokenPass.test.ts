import { describe, expect, it } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { applyMission22TokenPassChoice } from "../mission22TokenPass";

describe("Mission 22 token pass helper", () => {
  it("consumes one available stand token and transfers it to the recipient", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
      infoTokens: [
        { value: 4, position: -1, isYellow: false },
        { value: 0, position: 2, isYellow: true },
      ],
    });
    const recipient = makePlayer({
      id: "p2",
      hand: [
        makeYellowTile({ id: "bY", sortValue: 2.1 }),
        makeTile({ id: "b3", gameValue: 3, sortValue: 3 }),
      ],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, recipient],
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission22TokenPass") {
      throw new Error("Expected mission22 forced action to be set");
    }
    const result = applyMission22TokenPassChoice(state, forced, 4);

    expect(result.ok).toBe(true);
    expect(chooser.infoTokens).toEqual([{ value: 0, position: 2, isYellow: true }]);
    expect(recipient.infoTokens).toHaveLength(1);
    expect(recipient.infoTokens[0]).toMatchObject({
      value: 4,
      isYellow: false,
      position: -1,
    });
  });

  it("rejects passing a token value not present on the board", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
      infoTokens: [{ value: 4, position: -1, isYellow: false }],
    });
    const recipient = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b3", gameValue: 3 })],
      infoTokens: [{ value: 3, position: 0, isYellow: false }],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, recipient],
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission22TokenPass") {
      throw new Error("Expected mission22 forced action to be set");
    }
    const result = applyMission22TokenPassChoice(state, forced, 12);

    expect(result).toEqual({ ok: false, message: "Token value is not available on the board" });
    expect(chooser.infoTokens).toHaveLength(1);
    expect(recipient.infoTokens).toHaveLength(1);
  });
});
