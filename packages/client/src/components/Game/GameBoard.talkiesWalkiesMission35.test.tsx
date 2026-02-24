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

function getWireTileButtonTag(
  html: string,
  playerId: string,
  tileIndex: number,
): string {
  const testId = `wire-tile-${playerId}-${tileIndex}`;
  return html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";
}

describe("GameBoard talkies-walkies mission 35", () => {
  it("renders X-marked target tile as non-selectable during forced choice", () => {
    const state = makeGameState({
      mission: 35,
      phase: "playing",
      players: [
        makePlayer({
          id: "target",
          name: "Target",
          hand: [
            makeTile({
              id: "x-wire",
              color: "blue",
              gameValue: 4,
              sortValue: 4,
              isXMarked: true,
            }),
            makeTile({ id: "normal-wire", color: "blue", gameValue: 9, sortValue: 9 }),
          ],
        }),
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 1, sortValue: 1 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "talkiesWalkiesTileChoice",
        actorId: "actor",
        targetPlayerId: "target",
        actorTileIndex: 0,
        source: "equipment",
      },
    });

    const html = renderBoard(toClientGameState(state, "target"), "target");
    const xTileButton = getWireTileButtonTag(html, "target", 0);
    const normalTileButton = getWireTileButtonTag(html, "target", 1);

    expect(xTileButton).toContain("disabled");
    expect(normalTileButton).not.toContain("disabled");
  });
});
