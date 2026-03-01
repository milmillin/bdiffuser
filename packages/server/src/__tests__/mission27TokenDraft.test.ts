import { describe, expect, it } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  applyMission27TokenDraftChoice,
  buildMission27TokenDraftBoard,
  getMission27TokenDraftAvailableValues,
} from "../mission27TokenDraft";

describe("Mission 27 token draft helper", () => {
  it("builds a random draft line with up to one token per player", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-7", gameValue: 7 })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-9", gameValue: 9 })],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [captain, p2, p3],
    });

    const board = buildMission27TokenDraftBoard(state, state.players.length, () => 0);
    expect(board.numericTokens.length + board.yellowTokens).toBe(3);
    expect(board.numericTokens.every((value) => Number.isInteger(value) && value >= 1 && value <= 12)).toBe(true);
  });

  it("consumes a selected draft value and auto-places token on chooser's matching wire", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c4", gameValue: 4 }),
        makeYellowTile({ id: "cy", sortValue: 2.1 }),
      ],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-7", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser, teammate],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [4],
          yellowTokens: 1,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0, 1],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chooserIndex).toBe(0);
    expect(result.updatedChooserToken).toMatchObject({
      value: 4,
      isYellow: false,
      position: 0,
    });
    expect(state.players[0].infoTokens).toContainEqual({
      value: 4,
      isYellow: false,
      position: 0,
    });
    expect(state.campaign?.mission27TokenDraftBoard).toEqual({
      numericTokens: [],
      yellowTokens: 1,
    });
  });

  it("places drafted token beside stand when chooser has no matching uncut wire", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-7", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser, teammate],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [9],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0, 1],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 9);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedChooserToken).toMatchObject({
      value: 9,
      isYellow: false,
      position: -1,
    });
    expect(state.players[0].infoTokens[0]?.position).toBe(-1);
  });

  it("returns available draft values including yellow", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c2", gameValue: 2 })],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [7, 7, 3],
          yellowTokens: 1,
        },
      },
    });

    expect(getMission27TokenDraftAvailableValues(state)).toEqual([0, 3, 7]);
  });

  it("uses explicit tileIndex for multi-match numeric placement", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c4a", gameValue: 4 }),
        makeTile({ id: "c4b", gameValue: 4 }),
        makeTile({ id: "c7", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [4],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 4, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedChooserToken.position).toBe(1);
    expect(state.campaign?.mission27TokenDraftBoard).toEqual({
      numericTokens: [],
      yellowTokens: 0,
    });
  });

  it("uses explicit tileIndex for multi-match yellow placement", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeYellowTile({ id: "y1", sortValue: 1.1 }),
        makeTile({ id: "b5", gameValue: 5 }),
        makeYellowTile({ id: "y2", sortValue: 8.1 }),
      ],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [],
          yellowTokens: 1,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 0, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedChooserToken.isYellow).toBe(true);
    expect(result.updatedChooserToken.position).toBe(2);
    expect(state.campaign?.mission27TokenDraftBoard).toEqual({
      numericTokens: [],
      yellowTokens: 0,
    });
  });

  it("rejects invalid tileIndex on multi-match without consuming draft token", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c4a", gameValue: 4 }),
        makeTile({ id: "c4b", gameValue: 4 }),
      ],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [4],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 4, 5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Invalid mission 27 token placement choice");
    expect(state.campaign?.mission27TokenDraftBoard).toEqual({
      numericTokens: [4],
      yellowTokens: 0,
    });
    expect(state.players[0].infoTokens).toHaveLength(0);
  });

  it("keeps backward-compatible first-match fallback when tileIndex is omitted", () => {
    const chooser = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c4a", gameValue: 4 }),
        makeTile({ id: "c4b", gameValue: 4 }),
      ],
    });
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [chooser],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [4],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        draftOrder: [0],
        completedCount: 0,
      },
    });

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission27TokenDraft") {
      throw new Error("Expected mission27 forced action to be set");
    }

    const result = applyMission27TokenDraftChoice(state, forced, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedChooserToken.position).toBe(0);
  });
});
