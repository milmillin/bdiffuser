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

function redactOpponentTiles(state: ClientGameState, playerId: string): ClientGameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? player
        : {
            ...player,
            hand: player.hand.map((tile) => ({
              ...tile,
              color: undefined,
              gameValue: undefined,
              sortValue: undefined,
              image: undefined,
            })),
          },
    ),
  };
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

  it("shows the mission 48 special-action launcher with 4 players even when Reveal Reds is available", () => {
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
  });

  it("shows the mission 41 special-action launcher on the active player's turn", () => {
    const state = makeGameState({
      mission: 41,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", gameValue: 2, color: "blue", sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "blue", gameValue: 5, sortValue: 5.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 41 Special Action");
    expect(html).toContain("Cut 1 tripwire.");
    expect(html).toContain("Select 1 Wire");
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

  it("shows the mission 41 launcher when actor has no uncut yellow wire", () => {
    const state = makeGameState({
      mission: 41,
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
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 3.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the mission 41 launcher when only actor has an uncut tripwire", () => {
    const state = makeGameState({
      mission: 41,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the mission 41 launcher when actor has only their own tripwire even if a teammate tripwire exists", () => {
    const state = makeGameState({
      mission: 41,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [
            makeTile({ id: "m1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 }),
          ],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 4.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the mission 41 launcher when actor is forced to skip despite teammate tripwires", () => {
    const state = makeGameState({
      mission: 41,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [
            makeTile({ id: "m1", color: "yellow", gameValue: "YELLOW", sortValue: 2.1 }),
            makeTile({ id: "m2", color: "red", gameValue: "RED", sortValue: 3.5 }),
          ],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: "YELLOW", sortValue: 3.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-special-three-cut-launch\"");
  });

  it("hides the mission 41 launcher when no uncut tripwire exists", () => {
    const state = makeGameState({
      mission: 41,
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
          hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4.1 })],
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

  it("shows the mission 13 launcher when opponent colors are hidden in a 4-player game", () => {
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
          hand: [makeTile({ id: "p2-1", color: "yellow", gameValue: 8, sortValue: 8.1 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "blue", gameValue: 6, sortValue: 6.1 })],
        }),
        makePlayer({
          id: "p4",
          name: "P4",
          hand: [makeTile({ id: "p4-1", color: "red", gameValue: "RED", sortValue: 9.5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(
      redactOpponentTiles(toClientGameState(state, "me"), "me"),
      "me",
    );
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 13 Special Action");
  });

  it("shows the mission 48 launcher when opponent colors are hidden in a 4-player game", () => {
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
          hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4.1 })],
        }),
        makePlayer({
          id: "p3",
          name: "P3",
          hand: [makeTile({ id: "p3-1", color: "blue", gameValue: 5, sortValue: 5.1 })],
        }),
        makePlayer({
          id: "p4",
          name: "P4",
          hand: [makeTile({ id: "p4-1", color: "red", gameValue: "RED", sortValue: 10.5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(
      redactOpponentTiles(toClientGameState(state, "me"), "me"),
      "me",
    );
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 48 Special Action");
  });

  it("shows the mission 41 launcher when opponent colors are hidden", () => {
    const state = makeGameState({
      mission: 41,
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
          hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4.1 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(
      redactOpponentTiles(toClientGameState(state, "me"), "me"),
      "me",
    );
    expect(html).toContain("data-testid=\"mission-special-three-cut-launch\"");
    expect(html).toContain("Mission 41 Special Action");
  });
});
