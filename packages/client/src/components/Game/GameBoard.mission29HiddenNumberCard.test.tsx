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

function makeMission29ForcedState(playerId: string): ClientGameState {
  const state = makeGameState({
    mission: 29,
    phase: "playing",
    players: [
      makePlayer({
        id: "actor",
        name: "Actor",
        isCaptain: true,
        hand: [makeTile({ id: "a1", gameValue: 4 })],
      }),
      makePlayer({
        id: "chooser",
        name: "Chooser",
        hand: [makeTile({ id: "c1", gameValue: 7 })],
      }),
    ],
    campaign: {
      numberCards: {
        visible: [],
        deck: [],
        discard: [],
        playerHands: {
          actor: [{ id: "m29-actor-1", value: 3, faceUp: false }],
          chooser: [
            { id: "m29-chooser-1", value: 5, faceUp: false },
            { id: "m29-chooser-2", value: 9, faceUp: false },
          ],
        },
      },
      mission29Turn: {
        actorId: "actor",
        chooserId: "chooser",
      },
    },
    currentPlayerIndex: 0,
    pendingForcedAction: {
      kind: "mission29HiddenNumberCard",
      actorId: "actor",
      chooserId: "chooser",
    },
  });

  return toClientGameState(state, playerId);
}

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard mission 29 hidden Number card forced action", () => {
  it("shows mission 29 hidden-card controls for the chooser", () => {
    const state = makeMission29ForcedState("chooser");
    const html = renderBoard(state, "chooser");

    expect(html).toContain("data-testid=\"mission29-hidden-number-card-panel\"");
    expect(html).toContain("data-testid=\"mission29-hidden-card-0\"");
    expect(html).toContain("data-testid=\"mission29-hidden-card-1\"");
    expect(html).not.toContain("data-testid=\"forced-action-fallback-captain\"");
  });

  it("shows waiting copy for non-choosers", () => {
    const state = makeMission29ForcedState("actor");
    const html = renderBoard(state, "actor");

    expect(html).toContain("to choose a hidden Number card");
    expect(html).not.toContain("data-testid=\"waiting-forced-action\"");
  });
});
