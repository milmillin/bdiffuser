import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { Mission22TokenPassPanel } from "./Mission22TokenPassPanel.js";

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

function renderPanel(gameState: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <Mission22TokenPassPanel
      gameState={gameState}
      send={vi.fn()}
      playerId={playerId}
    />,
  );
}

describe("Mission22TokenPassPanel", () => {
  it("renders chooser controls with yellow and numeric token options", () => {
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          name: "Captain",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 2 })],
          infoTokens: [{ value: 3, position: -1, isYellow: false }],
        }),
        makePlayer({
          id: "p2",
          name: "Bob",
          hand: [makeTile({ id: "b1", gameValue: 6 })],
          infoTokens: [{ value: 12, position: 0, isYellow: false }],
        }),
      ],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [3],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });
    const clientState = toClientGameState(state, "captain");

    const html = renderPanel(clientState, "captain");

    expect(html).toContain("data-testid=\"mission22-token-pass-panel\"");
    expect(html).toContain("data-testid=\"mission22-token-3\"");
    expect(html).not.toContain("data-testid=\"mission22-token-12\"");
    expect(html).not.toContain("data-testid=\"mission22-token-1\"");
    expect(html).toContain("Bob");
  });

  it("does not render for non-chooser players", () => {
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "b1", gameValue: 6 })],
        }),
      ],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [3],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });
    const clientState = toClientGameState(state, "p2");

    const html = renderPanel(clientState, "p2");
    expect(html).toBe("");
  });
});
