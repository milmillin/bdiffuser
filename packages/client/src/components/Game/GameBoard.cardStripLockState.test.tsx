import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState, MissionId } from "@bomb-busters/shared";
import { makeEquipmentCard, makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
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

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

function makeCardStripState(mission: MissionId, isCaptain: boolean): GameState {
  return makeGameState({
    mission,
    phase: "playing",
    players: [
      makePlayer({
        id: "me",
        isCaptain,
        hand: [makeTile({ id: "me-1", gameValue: 4 })],
      }),
      makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 7 })],
      }),
    ],
    currentPlayerIndex: 0,
    board: {
      detonatorPosition: 0,
      detonatorMax: 3,
      validationTrack: {},
      markers: [],
      equipment: [
        makeEquipmentCard({
          id: "rewinder",
          name: "Rewinder",
          unlockValue: 6,
          faceDown: false,
          unlocked: true,
          used: false,
        }),
      ],
    },
  });
}

describe("GameBoard card strip equipment lock state", () => {
  it("mission 28 captain shows unlocked equipment as locked", () => {
    const state = makeCardStripState(28, true);
    const html = renderBoard(toClientGameState(state, "me"), "me");

    expect(html).toContain(">Locked<");
    expect(html).not.toContain(">Available<");
  });

  it("mission 17 captain shows unlocked equipment as locked", () => {
    const state = makeCardStripState(17, true);
    const html = renderBoard(toClientGameState(state, "me"), "me");

    expect(html).toContain(">Locked<");
    expect(html).not.toContain(">Available<");
  });

  it("mission 28 non-captain keeps unlocked equipment available", () => {
    const state = makeCardStripState(28, false);
    const html = renderBoard(toClientGameState(state, "me"), "me");

    expect(html).toContain(">Available<");
  });
});
