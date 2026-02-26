import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeRedTile, makeTile } from "@bomb-busters/shared/testing";
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

describe("GameBoard simultaneous 4-wire mission action", () => {
  it("shows mission 23 four-cut launcher when number card is visible", () => {
    const state = makeGameState({
      mission: 23,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 4 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "n1", value: 4, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-four-cut-launch\"");
    expect(html).toContain("Mission 23 Special Action");
    expect(html).toContain("Select 4 Wires");
    expect(html).toContain("Number card");
    expect(html).toContain(">4<");
  });

  it("shows mission 39 four-cut launcher when number card is visible", () => {
    const state = makeGameState({
      mission: 39,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 9 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 9 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [{ id: "n1", value: 9, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"mission-four-cut-launch\"");
    expect(html).toContain("Mission 39 Special Action");
    expect(html).toContain(">9<");
  });

  it("hides four-cut launcher after mission23/39 special action is already done", () => {
    const state = makeGameState({
      mission: 23,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 4 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        mission23SpecialActionDone: true,
        numberCards: {
          visible: [{ id: "n1", value: 4, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).not.toContain("data-testid=\"mission-four-cut-launch\"");
  });
});

describe("GameBoard text polish", () => {
  it("shows mission61 waiting copy with resolved captain name", () => {
    const state = makeGameState({
      mission: 61,
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
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "mission61ConstraintRotate",
        captainId: "captain",
        direction: "clockwise",
      },
    });

    const html = renderBoard(toClientGameState(state, "p2"), "p2");
    expect(html).toContain("Waiting for");
    expect(html).toContain(">Captain</span>");
    expect(html).not.toContain("the Captain");
  });

  it("uses clearer surrender vote button label", () => {
    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Me",
          hand: [makeTile({ id: "m1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          name: "P2",
          hand: [makeTile({ id: "p2-1", gameValue: 6 })],
        }),
      ],
      currentPlayerIndex: 0,
      surrenderVote: {
        yesVoterIds: ["me"],
      },
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("Surrender 1/2");
    expect(html).not.toContain("GG 1/2");
  });

  it("updates reveal-reds hint wording to clarify selection does not affect outcome", () => {
    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" }), makeRedTile({ id: "r2" })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 6 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    const html = renderBoard(toClientGameState(state, "me"), "me");
    expect(html).toContain("data-testid=\"reveal-reds-click-hint\"");
    expect(html).toContain("selection does not change the result");
  });
});
