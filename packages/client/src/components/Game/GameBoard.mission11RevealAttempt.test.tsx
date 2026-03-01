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

describe("GameBoard mission 11 number card", () => {
  it("renders a visible number card when campaign.numberCards is present", () => {
    const state = makeGameState({
      mission: 11,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "m11-blue-as-red-7", value: 7, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("number_7.png");
  });
});

describe("GameBoard mission 11 reveal attempt", () => {
  it("shows an explicit reveal attempt action on the active player's turn", () => {
    const state = makeGameState({
      mission: 11,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "m2", color: "blue", gameValue: 7, sortValue: 7 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission11-reveal-attempt\"");
    expect(html).toContain("Attempt Reveal Reds");
  });

  it("does not show the reveal attempt action outside mission 11", () => {
    const state = makeGameState({
      mission: 3,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "m2", color: "blue", gameValue: 7, sortValue: 7 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission11-reveal-attempt\"");
  });
});

describe("GameBoard mission 26 number cards", () => {
  it("renders visible number cards sorted by value", () => {
    const state = makeGameState({
      mission: 26,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "m26-nine", value: 9, faceUp: true },
            { id: "m26-two", value: 2, faceUp: true },
            { id: "m26-eleven", value: 11, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");

    const index2 = html.indexOf("number_2.png");
    const index9 = html.indexOf("number_9.png");
    const index11 = html.indexOf("number_11.png");

    expect(index2).toBeGreaterThan(-1);
    expect(index9).toBeGreaterThan(-1);
    expect(index11).toBeGreaterThan(-1);
    expect(index2).toBeLessThan(index9);
    expect(index9).toBeLessThan(index11);
  });
});

describe("GameBoard mission 47 number cards", () => {
  it("renders visible number cards sorted by value", () => {
    const state = makeGameState({
      mission: 47,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "m47-nine", value: 9, faceUp: true },
            { id: "m47-two", value: 2, faceUp: true },
            { id: "m47-eleven", value: 11, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");

    const index2 = html.indexOf("number_2.png");
    const index9 = html.indexOf("number_9.png");
    const index11 = html.indexOf("number_11.png");

    expect(index2).toBeGreaterThan(-1);
    expect(index9).toBeGreaterThan(-1);
    expect(index11).toBeGreaterThan(-1);
    expect(index2).toBeLessThan(index9);
    expect(index9).toBeLessThan(index11);
  });
});
