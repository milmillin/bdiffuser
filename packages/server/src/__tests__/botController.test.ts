import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logText } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeSpecialMarker,
  makeTile,
  makeRedTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { botPlaceInfoToken, getBotAction } from "../botController";
import { callLLM } from "../llmClient";

vi.mock("../llmClient", () => ({
  callLLM: vi.fn(),
}));

const mockedCallLLM = vi.mocked(callLLM);

describe("botPlaceInfoToken", () => {
  it("mission 52: places legal false setup tokens up to required count", () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeTile({ id: "b-4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeRedTile({ id: "r-1" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t-8", color: "blue", gameValue: 8, sortValue: 8 })],
    });
    const state = makeGameState({
      mission: 52,
      phase: "setup_info_tokens",
      players: [bot, teammate],
    });

    botPlaceInfoToken(state, "bot");
    botPlaceInfoToken(state, "bot");
    botPlaceInfoToken(state, "bot");

    expect(bot.infoTokens).toHaveLength(2);
    expect(new Set(bot.infoTokens.map((token) => token.position)).size).toBe(2);
    for (const token of bot.infoTokens) {
      expect(token.position).toBeGreaterThanOrEqual(0);
      expect(token.position).toBeLessThan(bot.hand.length);
      const tile = bot.hand[token.position];
      expect(tile.color).not.toBe("yellow");
      if (tile.color === "blue" && typeof tile.gameValue === "number") {
        expect(token.value).not.toBe(tile.gameValue);
      }
    }
  });

  it("mission 17 captain: places legal false setup tokens up to required count", () => {
    const captainBot = makePlayer({
      id: "captain-bot",
      isBot: true,
      isCaptain: true,
      hand: [
        makeTile({ id: "b-4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "b-7", color: "blue", gameValue: 7, sortValue: 7 }),
        makeRedTile({ id: "r-1" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t-8", color: "blue", gameValue: 8, sortValue: 8 })],
    });
    const state = makeGameState({
      mission: 17,
      phase: "setup_info_tokens",
      players: [captainBot, teammate],
    });

    botPlaceInfoToken(state, "captain-bot");
    botPlaceInfoToken(state, "captain-bot");
    botPlaceInfoToken(state, "captain-bot");

    expect(captainBot.infoTokens).toHaveLength(2);
    expect(new Set(captainBot.infoTokens.map((token) => token.position)).size).toBe(2);
    for (const token of captainBot.infoTokens) {
      expect(token.position).toBeGreaterThanOrEqual(0);
      expect(token.position).toBeLessThan(captainBot.hand.length);
      const tile = captainBot.hand[token.position];
      expect(tile.color).not.toBe("red");
      if (tile.color === "blue" && typeof tile.gameValue === "number") {
        expect(token.value).not.toBe(tile.gameValue);
      }
    }
  });

  it("campaign false info flag: captain places false tokens on non-17 missions", () => {
    const captainBot = makePlayer({
      id: "campaign-captain-bot",
      isCaptain: true,
      hand: [
        makeTile({ id: "b-4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "b-7", color: "blue", gameValue: 7, sortValue: 7 }),
        makeRedTile({ id: "r-1" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t-8", color: "blue", gameValue: 8, sortValue: 8 })],
    });
    const state = makeGameState({
      mission: 1,
      campaign: { falseInfoTokenMode: true },
      phase: "setup_info_tokens",
      players: [captainBot, teammate],
    });

    botPlaceInfoToken(state, "campaign-captain-bot");
    botPlaceInfoToken(state, "campaign-captain-bot");
    botPlaceInfoToken(state, "campaign-captain-bot");

    expect(captainBot.infoTokens).toHaveLength(2);
    expect(new Set(captainBot.infoTokens.map((token) => token.position)).size).toBe(2);
    for (const token of captainBot.infoTokens) {
      expect(token.position).toBeGreaterThanOrEqual(0);
      expect(token.position).toBeLessThan(captainBot.hand.length);
      const tile = captainBot.hand[token.position];
      expect(tile.color).not.toBe("red");
      if (tile.color === "blue" && typeof tile.gameValue === "number") {
        expect(token.value).not.toBe(tile.gameValue);
      }
    }
  });

  it.each([21, 33] as const)("mission %i: places parity setup token", (mission) => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [makeTile({ id: "b-7", color: "blue", gameValue: 7, sortValue: 7 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t-8", color: "blue", gameValue: 8, sortValue: 8 })],
    });
    const state = makeGameState({
      mission,
      phase: "setup_info_tokens",
      players: [bot, teammate],
    });

    botPlaceInfoToken(state, "bot");

    expect(bot.infoTokens).toEqual([
      { value: 0, parity: "odd", position: 0, isYellow: false },
    ]);
  });
});

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
          detail: logText("blue_as_red:7"),
          timestamp: Date.now(),
        },
      ],
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action).toEqual({ action: "revealReds" });
  });

  it("mission 48: fallback selects simultaneous yellow cut when yellows are the only legal cuts", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeYellowTile({ id: "bot-y1" }),
        makeRedTile({ id: "bot-r1", cut: true }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeYellowTile({ id: "t-y1" }),
        makeYellowTile({ id: "t-y2" }),
        makeRedTile({ id: "t-r1", cut: true }),
      ],
    });

    const state = makeGameState({
      mission: 48,
      phase: "playing",
      players: [bot, teammate],
      currentPlayerIndex: 0,
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action.action).toBe("simultaneousRedCut");
    if (result.action.action === "simultaneousRedCut") {
      expect(result.action.targets).toEqual([
        { playerId: "bot", tileIndex: 0 },
        { playerId: "teammate", tileIndex: 0 },
        { playerId: "teammate", tileIndex: 1 },
      ]);
    }
  });

  it("mission 41: fallback selects exactly one teammate tripwire for special action", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      hand: [
        makeYellowTile({ id: "bot-y1" }),
        makeTile({ id: "bot-b1", color: "blue", gameValue: 5, sortValue: 5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      isBot: true,
      hand: [
        makeYellowTile({ id: "teammate-y1" }),
        makeYellowTile({ id: "teammate-y2" }),
      ],
    });

    const state = makeGameState({
      mission: 41,
      phase: "playing",
      players: [bot, teammate],
      currentPlayerIndex: 0,
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action.action).toBe("simultaneousRedCut");
    if (result.action.action === "simultaneousRedCut") {
      expect(result.action.targets).toEqual([{ playerId: "teammate", tileIndex: 0 }]);
    }
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

  it("returns mission61ConstraintRotate forced action for captain bot without calling LLM", async () => {
    const bot = makePlayer({
      id: "bot",
      isBot: true,
      isCaptain: true,
      hand: [makeTile({ id: "b1", color: "blue", gameValue: 4, sortValue: 4, cut: false })],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 6, sortValue: 6, cut: false })],
    });

    const state = makeGameState({
      mission: 61,
      phase: "playing",
      players: [bot, teammate],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "mission61ConstraintRotate",
        captainId: "bot",
        direction: "counter_clockwise",
        previousPlayerId: "p2",
      },
    });

    const result = await getBotAction(state, "bot", "", "");
    expect(result.action).toEqual({
      action: "mission61ConstraintRotate",
      direction: "counter_clockwise",
    });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });
});
