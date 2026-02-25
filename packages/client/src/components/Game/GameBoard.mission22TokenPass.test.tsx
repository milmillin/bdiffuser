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

  function makeMission22ForcedState(playerId: string): ClientGameState {
  const state = makeGameState({
    mission: 22,
    phase: "playing",
    players: [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        hand: [makeTile({ id: "c1", gameValue: 2 })],
        infoTokens: [{ value: 0, position: -1, isYellow: true }],
      }),
      makePlayer({
        id: "p2",
        name: "Bob",
        hand: [makeTile({ id: "b1", gameValue: 6 })],
      }),
    ],
    currentPlayerIndex: 0,
    pendingForcedAction: {
      kind: "mission22TokenPass",
      currentChooserIndex: 0,
      currentChooserId: "captain",
      passingOrder: [0, 1],
      completedCount: 0,
    },
  });

  return toClientGameState(state, playerId);
}

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard mission 22 token pass forced action", () => {
  it("shows mission 22 token pass controls for the current chooser", () => {
    const state = makeMission22ForcedState("captain");
    const html = renderBoard(state, "captain");

    expect(html).toContain("data-testid=\"mission22-token-pass-panel\"");
    expect(html).toContain("data-testid=\"mission22-token-0\"");
    expect(html).not.toContain("data-testid=\"forced-action-fallback-captain\"");
  });

  it("shows waiting copy for teammates and avoids unknown-action fallback", () => {
    const state = makeMission22ForcedState("p2");
    const html = renderBoard(state, "p2");

    expect(html).toContain("to choose a token value to pass");
    expect(html).not.toContain("data-testid=\"waiting-forced-action\"");
  });
});
