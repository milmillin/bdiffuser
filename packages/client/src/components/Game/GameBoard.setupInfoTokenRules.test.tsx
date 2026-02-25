import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { GameBoard } from "./GameBoard.js";

function toClientGameState(state: GameState, playerId: string): ClientGameState {
  return {
    ...state,
    playerId,
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard setup info token mission rules", () => {
  it("shows captain skip message for mission 27 in 2-player setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 27,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Mission rule: you do not place an info token.");
    expect(html).not.toContain("Select a blue wire tile on your stand to place an info token.");
  });

  it("shows captain skip message for mission 40 in 2-player setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 40,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Mission rule: you do not place an info token.");
    expect(html).not.toContain("Select a blue wire tile on your stand to place an info token.");
  });

  it("hides setup prompt for mission 43 partner in 2-player captain-only random setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 43,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 1,
      campaign: {
        randomSetupCaptainOnly: true,
      } as unknown as Record<string, unknown>,
    });

    const html = renderBoard(toClientGameState(state, "partner"), "partner");
    expect(html).toContain("Mission rule: you do not place an info token.");
    expect(html).not.toContain("Select a blue wire tile on your stand to place an info token.");
  });

  it("still shows captain setup prompt for mission 43 in 2-player captain-only random setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 43,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
      campaign: {
        randomSetupCaptainOnly: true,
      } as unknown as Record<string, unknown>,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Place Info Token");
    expect(html).toContain("Select a blue wire tile on your stand to place an info token.");
    expect(html).not.toContain("Mission rule: you do not place an info token.");
  });

  it("still shows placement prompt for missions without setup overrides", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 1,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Select a blue wire tile on your stand to place an info token.");
  });

  it("shows false-token prompt for mission 52 setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 52,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Select an allowed wire tile on your stand to place a false info token.");
  });

  it("shows mission 50 setup prompt for non-front tokens", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 50,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain(
      "Select a blue wire tile on your stand, then place the token beside your stand.",
    );
  });

  it("uses campaign false token mode for false setup UI without mission 52", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 1,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
      campaign: {
        falseTokenMode: true,
      },
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Select an allowed wire tile on your stand to place a false info token.");

    const redButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-1\""),
    );
    const redButton = html.slice(redButtonStart, redButtonStart + 140);
    expect(redButton).not.toContain("disabled");

    const blueButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-0\""),
    );
    const blueButton = html.slice(blueButtonStart, blueButtonStart + 140);
    expect(blueButton).not.toContain("disabled");
  });

  it("shows false-token prompt for mission 17 captain setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 17,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Select an allowed wire tile on your stand to place a false info token.");
  });

  it("disables red wire targets for mission 17 captain setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 17,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    const redButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-1\""),
    );
    const redButton = html.slice(redButtonStart, redButtonStart + 140);
    expect(redButton).toContain("disabled");

    const blueButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-0\""),
    );
    const blueButton = html.slice(blueButtonStart, blueButtonStart + 140);
    expect(blueButton).not.toContain("disabled");
  });

  it("allows red wire targets for mission 52 setup", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 52,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    const redButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-1\""),
    );
    const redButton = html.slice(redButtonStart, redButtonStart + 140);
    expect(redButton).not.toContain("disabled");

    const blueButtonStart = html.lastIndexOf(
      "<button",
      html.indexOf("data-testid=\"wire-tile-captain-0\""),
    );
    const blueButton = html.slice(blueButtonStart, blueButtonStart + 140);
    expect(blueButton).not.toContain("disabled");
  });

  it("shows absent-value setup prompt for mission 22", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c3", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("Choose a value that is not in your hand, then place it beside your stand.");
    expect(html).toContain("<option value=\"0\"");
    expect(html).toContain("Place (0)");
  });

  it("filters mission 22 absent-value options by hand contents", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "yellow", gameValue: "YELLOW", sortValue: 1.1 }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("<option value=\"2\"");
    expect(html).toContain("<option value=\"12\"");
    expect(html).not.toContain("<option value=\"4\"");
    expect(html).not.toContain("<option value=\"0\"");
  });

  it("filters mission 22 absent-value options to mission board availability", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner],
      currentPlayerIndex: 0,
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [2, 3],
          yellowTokens: 0,
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("<option value=\"2\"");
    expect(html).toContain("<option value=\"3\"");
    expect(html).not.toContain("<option value=\"4\"");
    expect(html).not.toContain("<option value=\"5\"");
    expect(html).not.toContain("<option value=\"0\"");
  });

  it("counts consumed mission-22 tokens as unavailable when setup board state is absent", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", gameValue: 7, sortValue: 7 })],
      infoTokens: [
        { value: 3, position: -2, isYellow: false },
        { value: 3, position: -2, isYellow: false },
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [makeTile({ id: "t1", gameValue: 8, sortValue: 8 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner, teammate],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).not.toContain("<option value=\"3\"");
    expect(html).toContain("<option value=\"2\"");
    expect(html).toContain("<option value=\"5\"");
  });

  it("keeps a mission 22 absent value available when one copy remains and board state is absent", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 6, sortValue: 6 })],
      infoTokens: [{ value: 7, position: -1, isYellow: false }],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 2, sortValue: 2 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner, teammate],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).toContain("<option value=\"7\"");
  });

  it("filters mission 22 absent-value options to exclude values already declared by player", () => {
    const captain = makePlayer({
      id: "captain",
      name: "Captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 4.5 }),
      ],
      infoTokens: [{ value: 3, position: -1, isYellow: false }],
    });
    const partner = makePlayer({
      id: "partner",
      name: "Partner",
      hand: [makeTile({ id: "p1", color: "blue", gameValue: 6, sortValue: 6 })],
    });

    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [captain, partner],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [2, 5],
          yellowTokens: 1,
        },
      },
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "captain"), "captain");
    expect(html).not.toContain("<option value=\"3\"");
    expect(html).toContain("<option value=\"2\"");
    expect(html).toContain("<option value=\"5\"");
  });
});
