import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";

const mockUseIsIosStandalonePwa = vi.fn(() => false);

vi.mock("../../hooks/useStandaloneMode.js", () => ({
  useIsIosStandalonePwa: () => mockUseIsIosStandalonePwa(),
}));

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

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard scroll mode", () => {
  it("uses fixed scroll mode when iOS standalone mode is off", () => {
    mockUseIsIosStandalonePwa.mockReturnValue(false);

    const html = renderBoard(makeBaseClientState("me"), "me");

    expect(html).toContain("data-scroll-mode=\"fixed\"");
  });

  it("uses page scroll mode when iOS standalone mode is on", () => {
    mockUseIsIosStandalonePwa.mockReturnValue(true);

    const html = renderBoard(makeBaseClientState("me"), "me");

    expect(html).toContain("data-scroll-mode=\"page\"");
  });
});
