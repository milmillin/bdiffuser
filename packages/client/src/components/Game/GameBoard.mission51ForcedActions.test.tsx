import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
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

function renderBoard(state: GameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard
      gameState={toClientGameState(state, playerId)}
      send={vi.fn()}
      playerId={playerId}
      chatMessages={[]}
    />,
  );
}

describe("GameBoard mission 51 forced-action UI", () => {
  it("shows the Mission 51 Sir/Ma'am designation panel to the active Sir/Ma'am", () => {
    const state = makeGameState({
      mission: 51,
      phase: "playing",
      currentPlayerIndex: 0,
      players: [
        makePlayer({
          id: "sir",
          name: "Sir",
          isCaptain: true,
          hand: [makeTile({ id: "sir-6", gameValue: 6 })],
        }),
        makePlayer({
          id: "p2",
          name: "Player 2",
          hand: [makeTile({ id: "p2-4", gameValue: 4 })],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "m51-visible-6", value: 6, faceUp: true })],
        }),
      }),
      pendingForcedAction: {
        kind: "mission51DesignateCutter",
        sirId: "sir",
        value: 6,
      },
    });

    const html = renderBoard(state, "sir");

    expect(html).toContain("data-testid=\"designate-cutter-panel\"");
    expect(html).toContain("Mission 51 - Sir/Ma");
    expect(html).toContain("Choose which player must cut this Number value");
    expect(html).toContain("data-testid=\"designate-player-sir\"");
    expect(html).toContain("data-testid=\"designate-player-p2\"");
  });

  it("shows the Mission 51 penalty-token panel only to the penalized player", () => {
    const state = makeGameState({
      mission: 51,
      phase: "playing",
      currentPlayerIndex: 0,
      players: [
        makePlayer({
          id: "sir",
          name: "Sir",
          isCaptain: true,
          hand: [makeTile({ id: "sir-6", gameValue: 6 })],
        }),
        makePlayer({
          id: "p2",
          name: "Player 2",
          hand: [makeTile({ id: "p2-4", gameValue: 4 })],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "m51-visible-6", value: 6, faceUp: true })],
        }),
      }),
      pendingForcedAction: {
        kind: "mission51PenaltyTokenChoice",
        targetPlayerId: "p2",
        sirId: "sir",
        value: 6,
      },
    });

    const penalizedHtml = renderBoard(state, "p2");
    expect(penalizedHtml).toContain("data-testid=\"mission51-penalty-token-panel\"");
    expect(penalizedHtml).toContain("data-testid=\"mission51-penalty-token-12\"");

    const teammateHtml = renderBoard(state, "sir");
    expect(teammateHtml).not.toContain("data-testid=\"mission51-penalty-token-panel\"");
    expect(teammateHtml).toContain("to choose a Mission 51 penalty token");
  });
});
