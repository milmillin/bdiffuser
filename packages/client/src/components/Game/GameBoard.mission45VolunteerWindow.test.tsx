import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeRedTile,
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

function makeVolunteerWindowState(): GameState {
  return makeGameState({
    mission: 45,
    phase: "playing",
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        hand: [makeTile({ id: "captain-3", gameValue: 3 })],
      }),
      makePlayer({
        id: "p2",
        name: "Player 2",
        hand: [makeTile({ id: "p2-6", gameValue: 6 })],
      }),
      makePlayer({
        id: "p3",
        name: "Player 3",
        hand: [makeTile({ id: "p3-4", gameValue: 4 })],
      }),
    ],
    campaign: makeCampaignState({
      numberCards: makeNumberCardState({
        visible: [makeNumberCard({ id: "m45-visible-6", value: 6, faceUp: true })],
      }),
      mission45Turn: {
        stage: "awaiting_volunteer",
        captainId: "captain",
        currentCardId: "m45-visible-6",
        currentValue: 6,
      },
    }),
    pendingForcedAction: {
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    },
  });
}

describe("GameBoard mission 45 forced-action UI", () => {
  it("shows the volunteer panel and shared Snip! banner", () => {
    const html = renderBoard(makeVolunteerWindowState(), "p2");

    expect(html).toContain("data-testid=\"mission45-volunteer-panel\"");
    expect(html).toContain("data-testid=\"mission45-snip-button\"");
    expect(html).toContain("Number 6 is live. Say Snip! to volunteer.");
    expect(html).not.toContain("data-testid=\"waiting-forced-action\"");
  });

  it("labels Snip! as Reveal Reds for red-only players", () => {
    const state = makeVolunteerWindowState();
    state.players[2] = makePlayer({
      id: "p3",
      name: "Player 3",
      hand: [makeRedTile({ id: "p3-red-1" }), makeRedTile({ id: "p3-red-2" })],
    });

    const html = renderBoard(state, "p3");

    expect(html).toContain("Snip! Reveal Reds");
  });

  it("shows the captain fallback panel only to the captain", () => {
    const state = makeVolunteerWindowState();
    state.campaign = makeCampaignState({
      ...state.campaign,
      mission45Turn: {
        stage: "awaiting_captain_choice",
        captainId: "captain",
        currentCardId: "m45-visible-6",
        currentValue: 6,
      },
    });
    state.pendingForcedAction = {
      kind: "mission45CaptainChoice",
      captainId: "captain",
    };

    const captainHtml = renderBoard(state, "captain");
    expect(captainHtml).toContain("data-testid=\"mission45-captain-choice-panel\"");

    const teammateHtml = renderBoard(state, "p2");
    expect(teammateHtml).not.toContain("data-testid=\"mission45-captain-choice-panel\"");
    expect(teammateHtml).toContain("to choose who must cut Number 6");
  });

  it("shows the penalty token panel only to the penalized player", () => {
    const state = makeVolunteerWindowState();
    state.campaign = makeCampaignState({
      ...state.campaign,
      mission45Turn: {
        stage: "awaiting_penalty_token",
        captainId: "captain",
        currentCardId: "m45-visible-6",
        currentValue: 6,
        penaltyPlayerId: "p3",
      },
    });
    state.pendingForcedAction = {
      kind: "mission45PenaltyTokenChoice",
      playerId: "p3",
    };

    const penalizedHtml = renderBoard(state, "p3");
    expect(penalizedHtml).toContain("data-testid=\"mission45-penalty-token-panel\"");
    expect(penalizedHtml).toContain("data-testid=\"mission45-penalty-token-12\"");

    const teammateHtml = renderBoard(state, "p2");
    expect(teammateHtml).not.toContain("data-testid=\"mission45-penalty-token-panel\"");
    expect(teammateHtml).toContain("to choose a Mission 45 penalty token");
  });
});
