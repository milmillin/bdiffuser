import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { GameRulesPopup } from "./GameRulesPopup.js";

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

describe("GameRulesPopup safe area layout", () => {
  it("keeps top padding inside safe area", () => {
    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "me-1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 7 })],
        }),
      ],
      currentPlayerIndex: 0,
    });
    const clientState = toClientGameState(state, "me");

    const html = renderToStaticMarkup(
      <GameRulesPopup isOpen={true} onClose={() => {}} gameState={clientState} />,
    );

    expect(html).toContain("data-testid=\"rules-popup\"");
    expect(html).toContain("pt-[max(env(safe-area-inset-top),0.75rem)]");
  });
});
