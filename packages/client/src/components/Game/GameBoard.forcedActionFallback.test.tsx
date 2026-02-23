import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { GameBoard } from "./GameBoard.js";

function makeClientStateWithUnknownForcedAction(): ClientGameState {
  const state = makeGameState({
    mission: 10,
    phase: "playing",
    players: [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        hand: [makeTile({ id: "c1", color: "blue", gameValue: 2 })],
      }),
      makePlayer({
        id: "p2",
        name: "Bob",
        hand: [makeTile({ id: "b1", color: "blue", gameValue: 5 })],
      }),
    ],
    currentPlayerIndex: 0,
  });

  const clientState = {
    ...state,
    playerId: "captain",
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;

  (
    clientState as unknown as {
      pendingForcedAction?: { kind: string; captainId: string };
    }
  ).pendingForcedAction = {
    kind: "future_forced_action",
    captainId: "captain",
  };

  return clientState;
}

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard
      gameState={state}
      send={vi.fn()}
      playerId={playerId}
      chatMessages={[]}
    />,
  );
}

describe("GameBoard forced-action fallback", () => {
  it("shows captain fallback panel with reload control for unknown forced actions", () => {
    const state = makeClientStateWithUnknownForcedAction();
    const html = renderBoard(state, "captain");

    expect(html).toContain("data-testid=\"forced-action-fallback-captain\"");
    expect(html).toContain("Reload Client");
  });

  it("shows waiting banner for non-captains on unknown forced actions", () => {
    const state = makeClientStateWithUnknownForcedAction();
    const html = renderBoard(state, "p2");

    expect(html).toContain("data-testid=\"waiting-forced-action\"");
    expect(html).toContain("for <span class=\"text-yellow-400 font-bold\">Captain</span>");
  });
});
