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

describe("GameBoard mission 11 reveal attempt", () => {
  it("shows an explicit reveal attempt action on the active player's turn", () => {
    const state = makeGameState({
      mission: 11,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "m2", color: "blue", gameValue: 7, sortValue: 7 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission11-reveal-attempt\"");
    expect(html).toContain("Attempt Reveal Reds");
  });

  it("does not show the reveal attempt action outside mission 11", () => {
    const state = makeGameState({
      mission: 3,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "m2", color: "blue", gameValue: 7, sortValue: 7 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission11-reveal-attempt\"");
  });
});
