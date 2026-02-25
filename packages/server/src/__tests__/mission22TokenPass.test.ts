import { describe, expect, it } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  applyMission22TokenPassChoice,
  getMission22TokenPassBoardState,
} from "../mission22TokenPass";

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
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [4],
          yellowTokens: 0,
        },
      },
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
    expect(chooser.infoTokens).toEqual([
      { value: 4, position: -1, isYellow: false },
      { value: 0, position: 2, isYellow: true },
    ]);
    expect(recipient.infoTokens).toHaveLength(1);
    expect(recipient.infoTokens[0]).toMatchObject({
      value: 4,
      isYellow: false,
      position: -2,
    });
    expect(state.campaign?.mission22TokenPassBoard?.numericTokens).not.toContain(4);
    expect(state.campaign?.mission22TokenPassBoard?.yellowTokens).toBe(0);
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
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [3],
          yellowTokens: 0,
        },
      },
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
    const result = applyMission22TokenPassChoice(state, forced, 13);

    expect(result).toEqual({ ok: false, message: "Token value is not available on the board" });
    expect(chooser.infoTokens).toHaveLength(1);
    expect(recipient.infoTokens).toHaveLength(1);
    expect(state.campaign?.mission22TokenPassBoard).toEqual({
      numericTokens: [3],
      yellowTokens: 0,
    });
  });

  it("derives mission 22 board state from token pool when board state is missing", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
      infoTokens: [{ value: 4, position: -1, isYellow: false }],
    });
    const recipient = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b3", gameValue: 3 })],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, recipient],
      campaign: {},
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
    expect(result).toMatchObject({
      ok: true,
      recipientIndex: 1,
      updatedRecipientToken: { value: 4, isYellow: false, position: -2 },
    });
    expect(state.campaign?.mission22TokenPassBoard).toEqual({
      numericTokens: expect.arrayContaining([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12]),
      yellowTokens: 2,
    });
    expect(state.campaign?.mission22TokenPassBoard?.numericTokens).not.toContain(4);

    const retry = applyMission22TokenPassChoice(state, forced, 1);
    expect(retry).toMatchObject({
      ok: true,
      recipientIndex: 1,
      updatedRecipientToken: { value: 1, isYellow: false, position: -2 },
    });
    expect(
      state.campaign?.mission22TokenPassBoard?.numericTokens.filter((value) => value === 1),
    ).toHaveLength(1);
    expect(state.campaign?.mission22TokenPassBoard?.yellowTokens).toBe(2);
  });

  it("prevents a passed token from being reused when it cannot be placed", () => {
    const chooser = makePlayer({
      id: "p1",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
      infoTokens: [{ value: 4, position: -1, isYellow: false }],
    });
    const recipient = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b3", gameValue: 3 })],
      infoTokens: [{ value: 5, position: -1, isYellow: false }],
    });
    const receiver = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "c8", gameValue: 8 })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, recipient, receiver],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [4],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "p1",
        passingOrder: [0, 1, 2],
        completedCount: 0,
      },
    });

    const firstForced = state.pendingForcedAction;
    if (!firstForced || firstForced.kind !== "mission22TokenPass") {
      throw new Error("Expected mission22 forced action to be set");
    }
    const firstResult = applyMission22TokenPassChoice(state, firstForced, 4);
    expect(firstResult).toEqual({
      ok: true,
      recipientIndex: 1,
      updatedRecipientToken: {
        value: 4,
        isYellow: false,
        position: -2,
      },
    });
    expect(recipient.infoTokens).toHaveLength(2);
    expect(recipient.infoTokens[1]).toMatchObject({
      value: 4,
      isYellow: false,
      position: -2,
    });
    expect(state.campaign?.mission22TokenPassBoard?.numericTokens).not.toContain(4);
    expect(state.campaign?.mission22TokenPassBoard?.yellowTokens).toBe(0);

    const secondForced = {
      ...firstForced,
      currentChooserIndex: 1,
      currentChooserId: "p2",
      completedCount: 1,
    };
    const secondResult = applyMission22TokenPassChoice(state, secondForced, 4);

    expect(secondResult).toEqual({
      ok: false,
      message: "Token value is not available on the board",
    });
    expect(state.campaign?.mission22TokenPassBoard?.numericTokens).not.toContain(4);
    expect(state.campaign?.mission22TokenPassBoard?.yellowTokens).toBe(0);
  });

  it("derives one remaining numeric copy from setup declarations when board state is absent", () => {
    const chooser = makePlayer({
      id: "p1",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
      infoTokens: [{ value: 4, position: -1, isYellow: false }],
    });
    const partner = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-3", gameValue: 3 })],
    });
    const receiver = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-8", gameValue: 8 })],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, partner, receiver],
      campaign: {},
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "p1",
        passingOrder: [0, 1, 2],
        completedCount: 0,
      },
    });

    const firstForced = state.pendingForcedAction;
    if (!firstForced || firstForced.kind !== "mission22TokenPass") {
      throw new Error("Expected mission22 forced action to be set");
    }
    const firstResult = applyMission22TokenPassChoice(state, firstForced, 4);
    expect(firstResult).toEqual({
      ok: true,
      recipientIndex: 1,
      updatedRecipientToken: {
        value: 4,
        isYellow: false,
        position: -2,
      },
    });
    expect(partner.infoTokens).toHaveLength(1);
    expect(partner.infoTokens[0]).toMatchObject({
      value: 4,
      isYellow: false,
      position: -2,
    });
    expect(state.campaign?.mission22TokenPassBoard?.numericTokens.includes(4)).toBe(false);

    const secondForced = {
      ...firstForced,
      currentChooserIndex: 1,
      currentChooserId: "p2",
      completedCount: 1,
    };
    const secondResult = applyMission22TokenPassChoice(state, secondForced, 4);
    expect(secondResult).toEqual({
      ok: false,
      message: "Token value is not available on the board",
    });
  });

  it("refreshes cached mission22 token pool state when cached values are stale", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", gameValue: 1 })],
      infoTokens: [
        { value: 4, position: -1, isYellow: false },
        { value: 4, position: -1, isYellow: false },
      ],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p1", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [captain, partner],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [4, 5],
          yellowTokens: 2,
        },
      },
      turnNumber: 1,
    });
    const board = getMission22TokenPassBoardState(state);

    expect(board.numericTokens).not.toContain(4);
    expect(board).not.toBeNull();
    expect(board.yellowTokens).toBe(2);
  });

  it("refreshes cached mission22 token pool state when missing values and no forced pass is active", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", gameValue: 1 })],
      infoTokens: [{ value: 4, position: -1, isYellow: false }],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p1", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [chooser, partner],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [],
          yellowTokens: 0,
        },
      },
    });

    const board = getMission22TokenPassBoardState(state);

    expect(
      board.numericTokens.filter((value) => value === 4),
    ).toHaveLength(1);
    expect(board.yellowTokens).toBe(2);
  });

});
