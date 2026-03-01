import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { MissionRuleHints } from "./MissionRuleHints.js";

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

describe("MissionRuleHints mission 65 personal number cards", () => {
  it("renders each player's personal number cards sorted by value", () => {
    const state = makeGameState({
      mission: 65,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [],
          deck: [],
          discard: [],
          playerHands: {
            me: [
              { id: "m65-me-0-9", value: 9, faceUp: true },
              { id: "m65-me-1-2", value: 2, faceUp: true },
              { id: "m65-me-2-11", value: 11, faceUp: true },
            ],
            p2: [],
          },
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "me")} />,
    );

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
