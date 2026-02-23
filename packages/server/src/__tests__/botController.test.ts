import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeSpecialMarker,
  makeTile,
} from "@bomb-busters/shared/testing";
import { getBotAction } from "../botController";
import { callLLM } from "../llmClient";

vi.mock("../llmClient", () => ({
  callLLM: vi.fn(),
}));

const mockedCallLLM = vi.mocked(callLLM);

describe("getBotAction fallback", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockedCallLLM.mockReset();
    mockedCallLLM.mockRejectedValue(new Error("llm unavailable"));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("uses hook-aware fallback and avoids mission-9 locked sequence values", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeTile({ id: "b2", color: "blue", gameValue: 2, sortValue: 2, cut: false }),
        makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5, cut: false }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t5", color: "blue", gameValue: 5, sortValue: 5, cut: false })],
    });

    const state = makeGameState({
      mission: 9,
      phase: "playing",
      players: [bot, teammate],
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "m9-left", value: 5, faceUp: true }),
            makeNumberCard({ id: "m9-middle", value: 2, faceUp: true }),
            makeNumberCard({ id: "m9-right", value: 9, faceUp: true }),
          ],
          deck: [],
          discard: [],
          playerHands: {},
        }),
        specialMarkers: [makeSpecialMarker({ kind: "sequence_pointer", value: 0 })],
      }),
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action.action).toBe("dualCut");
    if (result.action.action === "dualCut") {
      expect(result.action.guessValue).toBe(5);
      expect(result.action.targetPlayerId).toBe("teammate");
    }
  });

  it("uses revealReds fallback when mission-11 hidden-red rule makes it legal", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeTile({ id: "b7-a", color: "blue", gameValue: 7, sortValue: 7, cut: false }),
        makeTile({ id: "b7-b", color: "blue", gameValue: 7, sortValue: 7, cut: false }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3, cut: false })],
    });

    const state = makeGameState({
      mission: 11,
      phase: "playing",
      players: [bot, teammate],
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

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action).toEqual({ action: "revealReds" });
  });

  it("returns chooseNextPlayer forced action for mission-10 captain bot without calling LLM", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      isCaptain: true,
      hand: [makeTile({ id: "b1", color: "blue", gameValue: 4, sortValue: 4, cut: false })],
    });
    const previous = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 6, sortValue: 6, cut: false })],
    });
    const alternative = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 8, sortValue: 8, cut: false })],
    });

    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [bot, previous, alternative],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "bot",
        lastPlayerId: "p1",
      },
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action).toEqual({
      action: "chooseNextPlayer",
      targetPlayerId: "p2",
    });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it("falls back to previous player in forced chooseNext when no alternative is active", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      isCaptain: true,
      hand: [makeTile({ id: "b1", color: "blue", gameValue: 4, sortValue: 4, cut: true })],
    });
    const onlyTarget = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 6, sortValue: 6, cut: false })],
    });
    const exhausted = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 8, sortValue: 8, cut: true })],
    });

    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [bot, onlyTarget, exhausted],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "bot",
        lastPlayerId: "p1",
      },
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action).toEqual({
      action: "chooseNextPlayer",
      targetPlayerId: "p1",
    });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });
});
