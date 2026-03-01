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

describe("GameBoard forced attention states", () => {
  it("highlights the forced actor stand in red when forced actor differs from current player", () => {
    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          name: "Captain",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "Bob",
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "captain",
        lastPlayerId: "p2",
      },
    });

    const html = renderBoard(toClientGameState(state, "p2"), "p2");

    expect(html).toContain("data-testid=\"player-stand-captain\"");
    expect(html).toContain(">FORCED<");
    expect(html).toContain("to choose the next player");
  });

  it("shows forced-action status copy when Reveal Reds is mandatory", () => {
    const state = makeGameState({
      mission: 1,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Agent",
          hand: [makeTile({ id: "r1", color: "red", gameValue: "RED" })],
        }),
        makePlayer({
          id: "p2",
          name: "Buddy",
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");

    expect(html).toContain("Forced Action");
    expect(html).toContain("Reveal Reds is required now.");
    expect(html).not.toContain("Choose an action");
  });
});
