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
    expect(html).toContain("Mission setup rule: you do not place an info token.");
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
});
