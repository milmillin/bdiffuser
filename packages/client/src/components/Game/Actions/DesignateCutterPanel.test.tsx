import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { DesignateCutterPanel } from "./DesignateCutterPanel.js";

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

function getButtonTag(html: string, testId: string): string {
  return html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";
}

describe("DesignateCutterPanel", () => {
  it("keeps non-radar targets visible but disabled/read-only", () => {
    const state = makeGameState({
      mission: 18,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          name: "Captain",
          hand: [makeTile({ id: "c1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", gameValue: 6 })],
        }),
      ],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "designateCutter",
        designatorId: "captain",
        value: 6,
        radarResults: {
          captain: false,
          p2: true,
        },
      },
    });

    const html = renderToStaticMarkup(
      <DesignateCutterPanel
        gameState={toClientGameState(state, "captain")}
        send={vi.fn()}
        playerId="captain"
      />,
    );

    const captainButton = getButtonTag(html, "designate-player-captain");
    const p2Button = getButtonTag(html, "designate-player-p2");

    expect(captainButton).toContain("disabled");
    expect(p2Button).not.toContain("disabled");
    expect(html).toContain("(read-only)");
    expect(html).toContain("NO radar match are read-only");
  });
});
