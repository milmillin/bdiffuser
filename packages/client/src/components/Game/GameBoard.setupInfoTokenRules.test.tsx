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
});
