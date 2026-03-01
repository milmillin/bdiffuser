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

function makeBaseClientState(playerId: string): ClientGameState {
  const state = makeGameState({
    mission: 10,
    phase: "playing",
    players: [
      makePlayer({
        id: playerId,
        hand: [makeTile({ id: "me-1", gameValue: 3 })],
      }),
      makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 7 })],
      }),
    ],
    currentPlayerIndex: 0,
  });

  return toClientGameState(state, playerId);
}

describe("GameBoard right bar toggle", () => {
  it("renders right bar toggle with default hide label", () => {
    const html = renderBoard(makeBaseClientState("me"), "me");

    expect(html).toContain("data-testid=\"right-bar-toggle\"");
    expect(html).toContain("aria-label=\"Hide right bar\"");
    expect(html).toContain("title=\"Hide right bar\"");
    expect(html).not.toContain("Show right bar");
  });

  it("renders right panel by default", () => {
    const html = renderBoard(makeBaseClientState("me"), "me");

    expect(html).toContain("data-testid=\"right-panel\"");
  });

  it("renders right panel expand toggle with default expand label", () => {
    const html = renderBoard(makeBaseClientState("me"), "me");

    expect(html).toContain("data-testid=\"right-panel-expand-toggle\"");
    expect(html).toContain("aria-label=\"Expand right panel\"");
    expect(html).toContain("title=\"Expand right panel\"");
  });
});
