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

function renderBoard(state: ClientGameState, playerId: string): string {
  return renderToStaticMarkup(
    <GameBoard gameState={state} send={vi.fn()} playerId={playerId} chatMessages={[]} />,
  );
}

describe("GameBoard simultaneous 3-wire mission action", () => {
  it("shows the mission 13 special-action launcher on the active player's turn", () => {
    const state = makeGameState({
      mission: 13,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "m2", color: "red", gameValue: "RED", sortValue: 6.5 }),
          ],
        }),
        makePlayer({
          id: "p2",
          name: "Teammate",
          hand: [makeTile({ id: "p2-1", color: "red", gameValue: "RED", sortValue: 7.5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 13 Special Action");
    expect(html).toContain("Cut the 3 red wires at the same time.");
  });

  it("shows the mission 48 special-action launcher even when the actor has no yellow wire", () => {
    const state = makeGameState({
      mission: 48,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "yellow", gameValue: "YELLOW", sortValue: 3.1 })],
        }),
        makePlayer({
          id: "p4",
          name: "P4",
          hand: [makeTile({ id: "p4-1", color: "yellow", gameValue: "YELLOW", sortValue: 4.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 48 Special Action");
    expect(html).toContain("Cut the 3 yellow wires at the same time.");
  });

  it("hides the mission 13 launcher with 3 players when actor has no uncut red wire", () => {
    const state = makeGameState({
      mission: 13,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "red", gameValue: "RED", sortValue: 6.5 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "red", gameValue: "RED", sortValue: 7.5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the mission 48 launcher with 3 players when actor has no uncut yellow wire", () => {
    const state = makeGameState({
      mission: 48,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "yellow", gameValue: "YELLOW", sortValue: 3.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the launcher in mission 48 when Reveal Reds is forced", () => {
    const state = makeGameState({
      mission: 48,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", color: "red", gameValue: "RED", sortValue: 7.5 })],
        }),
        makePlayer({
          id: "p2",
          name: "Teammate",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 8.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });
});
