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

function makeMission46ForcedState(): ClientGameState {
  const state = makeGameState({
    mission: 46,
    phase: "playing",
    players: [
      makePlayer({
        id: "me",
        name: "Agent",
        hand: [makeTile({ id: "m1", gameValue: 7 }), makeTile({ id: "m2", gameValue: 7 })],
      }),
      makePlayer({
        id: "p2",
        name: "Teammate",
        hand: [makeTile({ id: "p2-1", gameValue: 4 }), makeTile({ id: "p2-2", gameValue: 7 })],
      }),
    ],
    currentPlayerIndex: 0,
    pendingForcedAction: { kind: "mission46SevensCut", playerId: "me" },
  });

  return toClientGameState(state, "me");
}

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard mission 46 forced sevens cut", () => {
  it("shows the dedicated mission 46 forced-action panel for the acting player", () => {
    const state = makeMission46ForcedState();
    const html = renderBoard(state, "me");

    expect(html).toContain("data-testid=\"mission46-sevens-cut-panel\"");
    expect(html).toContain("0/4 wires selected");
    expect(html).not.toContain("data-testid=\"forced-action-fallback-captain\"");
  });

  it("shows a waiting message for non-acting players without unknown-action fallback", () => {
    const state = makeMission46ForcedState();
    const html = renderBoard(state, "p2");

    expect(html).toContain("resolve Mission 46");
    expect(html).not.toContain("data-testid=\"waiting-forced-action\"");
  });
});
