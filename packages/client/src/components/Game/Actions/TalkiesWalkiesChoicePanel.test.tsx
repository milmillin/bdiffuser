import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { TalkiesWalkiesChoicePanel } from "./TalkiesWalkiesChoicePanel.js";

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

function renderPanel(
  gameState: ClientGameState,
  playerId: string,
  selectedIndex: number | null,
): string {
  return renderToStaticMarkup(
    <TalkiesWalkiesChoicePanel
      gameState={gameState}
      send={vi.fn()}
      playerId={playerId}
      selectedIndex={selectedIndex}
    />,
  );
}

function getConfirmButtonTag(html: string): string {
  return html.match(/<button[^>]*data-testid="talkies-choice-confirm"[^>]*>/)?.[0] ?? "";
}

describe("TalkiesWalkiesChoicePanel mission-35 X-wire restriction", () => {
  it("disables confirm when selecting an X-marked tile in mission 35", () => {
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

    const clientState = toClientGameState(state, "target");
    const html = renderPanel(clientState, "target", 0);
    const confirmButton = getConfirmButtonTag(html);

    expect(confirmButton).toMatch(/\sdisabled(?:=|>| )/);
  });

  it("keeps confirm enabled for a non-X tile in mission 35", () => {
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

    const clientState = toClientGameState(state, "target");
    const html = renderPanel(clientState, "target", 1);
    const confirmButton = getConfirmButtonTag(html);

    expect(confirmButton).not.toMatch(/\sdisabled(?:=|>| )/);
  });
});
