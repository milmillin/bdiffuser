import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  Mission27TokenDraftPanel,
  getMission27DraftMatchingIndices,
} from "./Mission27TokenDraftPanel.js";

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

function makeForcedState(): ClientGameState {
  const state = makeGameState({
    mission: 27,
    phase: "playing",
    players: [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "c6a", gameValue: 6 }),
          makeTile({ id: "c2", gameValue: 2 }),
          makeTile({ id: "c6b", gameValue: 6 }),
        ],
      }),
      makePlayer({
        id: "p2",
        name: "Bob",
        hand: [makeTile({ id: "b1", gameValue: 1 })],
      }),
    ],
    campaign: {
      mission27TokenDraftBoard: {
        numericTokens: [6],
        yellowTokens: 1,
      },
    },
    pendingForcedAction: {
      kind: "mission27TokenDraft",
      currentChooserIndex: 0,
      currentChooserId: "captain",
      draftOrder: [0, 1],
      completedCount: 0,
    },
  });
  return toClientGameState(state, "captain");
}

function renderPanel(
  gameState: ClientGameState,
  selectedValue: number | null,
  selectedTileIndex: number | null,
): string {
  return renderToStaticMarkup(
    <Mission27TokenDraftPanel
      gameState={gameState}
      send={vi.fn()}
      playerId="captain"
      selectedValue={selectedValue}
      selectedTileIndex={selectedTileIndex}
      onSelectedValueChange={vi.fn()}
      onSelectedTileIndexChange={vi.fn()}
    />,
  );
}

function getConfirmButtonTag(html: string): string {
  return html.match(/<button[^>]*data-testid="mission27-token-placement-confirm"[^>]*>/)?.[0] ?? "";
}

describe("Mission27TokenDraftPanel", () => {
  it("returns matching indices for numeric and yellow token values", () => {
    const hand = [
      makeTile({ id: "b6a", gameValue: 6 }),
      makeYellowTile({ id: "y1", sortValue: 1.1 }),
      makeTile({ id: "b6b", gameValue: 6 }),
      makeYellowTile({ id: "y2", sortValue: 4.1 }),
    ];

    expect(getMission27DraftMatchingIndices(hand, 6)).toEqual([0, 2]);
    expect(getMission27DraftMatchingIndices(hand, 0)).toEqual([1, 3]);
  });

  it("shows token buttons when no multi-match token is selected", () => {
    const html = renderPanel(makeForcedState(), null, null);

    expect(html).toContain("data-testid=\"mission27-token-6\"");
    expect(html).toContain("data-testid=\"mission27-token-0\"");
    expect(html).not.toContain("data-testid=\"mission27-token-placement-confirm\"");
  });

  it("disables confirm while waiting for stand selection in multi-match flow", () => {
    const html = renderPanel(makeForcedState(), 6, null);
    const confirmButton = getConfirmButtonTag(html);

    expect(confirmButton).toMatch(/\sdisabled(?:=|>| )/);
  });

  it("enables confirm after selecting a valid matching wire", () => {
    const html = renderPanel(makeForcedState(), 6, 2);
    const confirmButton = getConfirmButtonTag(html);

    expect(confirmButton).not.toMatch(/\sdisabled(?:=|>| )/);
  });
});
