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

function makeMission27ForcedState(playerId: string): ClientGameState {
  const state = makeGameState({
    mission: 27,
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
        hand: [makeTile({ id: "b1", gameValue: 6 })],
      }),
    ],
    campaign: {
      mission27TokenDraftBoard: {
        numericTokens: [6],
        yellowTokens: 1,
      },
    },
    currentPlayerIndex: 0,
    pendingForcedAction: {
      kind: "mission27TokenDraft",
      currentChooserIndex: 0,
      currentChooserId: "captain",
      draftOrder: [0, 1],
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

describe("GameBoard mission 27 token draft forced action", () => {
  it("shows mission 27 token draft controls for the current chooser", () => {
    const state = makeMission27ForcedState("captain");
    const html = renderBoard(state, "captain");

    expect(html).toContain("data-testid=\"mission27-token-draft-panel\"");
    expect(html).toContain("data-testid=\"mission27-token-0\"");
    expect(html).toContain("data-testid=\"mission27-token-6\"");
    expect(html).toContain("Step 1/2");
    expect(html).not.toContain("data-testid=\"forced-action-fallback-captain\"");
  });

  it("shows waiting copy for teammates and avoids unknown-action fallback", () => {
    const state = makeMission27ForcedState("p2");
    const html = renderBoard(state, "p2");

    expect(html).toContain("to draft a token value");
    expect(html).not.toContain("data-testid=\"waiting-forced-action\"");
  });

  it("renders duplicate draft cards as separate selectable tokens", () => {
    const state = makeMission27ForcedState("captain");
    if (state.campaign?.mission27TokenDraftBoard) {
      state.campaign.mission27TokenDraftBoard.numericTokens = [6, 6];
      state.campaign.mission27TokenDraftBoard.yellowTokens = 1;
    }

    const html = renderBoard(state, "captain");
    const sixButtons = html.match(/data-testid="mission27-token-6"/g) ?? [];
    const yellowButtons = html.match(/data-testid="mission27-token-0"/g) ?? [];

    expect(sixButtons).toHaveLength(2);
    expect(yellowButtons).toHaveLength(1);
  });
});
