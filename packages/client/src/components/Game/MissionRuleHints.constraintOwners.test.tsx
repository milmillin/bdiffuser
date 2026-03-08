import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeConstraintCard,
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

describe("MissionRuleHints constraint ownership labels", () => {
  it("shows player names under constraint cards for mission 31", () => {
    const state = makeGameState({
      mission: 31,
      phase: "playing",
      players: [
        makePlayer({
          id: "p1",
          name: "Alice",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "Bob",
          hand: [makeTile({ id: "m2", color: "blue", gameValue: 4, sortValue: 4 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [],
          deck: [],
          discard: [],
          playerHands: {},
        },
        constraints: {
          global: [],
          deck: [],
          perPlayer: {
            p1: [makeConstraintCard({ id: "A", name: "Even Wires", description: "desc", active: true })],
            p2: [makeConstraintCard({ id: "B", name: "Odd Wires", description: "desc", active: true })],
          },
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "p1")} />,
    );

    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
    expect(html).toContain("mission-hint-thumb-constraint-player-A-p1");
    expect(html).toContain("mission-hint-thumb-constraint-player-B-p2");
  });

  it("does not show per-player owner labels on non-mission 31 views", () => {
    const state = makeGameState({
      mission: 34,
      phase: "playing",
      players: [
        makePlayer({
          id: "p1",
          name: "Alice",
          hand: [makeTile({ id: "m1", color: "blue", gameValue: 2, sortValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "Bob",
          hand: [makeTile({ id: "m2", color: "blue", gameValue: 4, sortValue: 4 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [],
          deck: [],
          discard: [],
          playerHands: {},
        },
        constraints: {
          global: [],
          deck: [],
          perPlayer: {
            p1: [makeConstraintCard({ id: "A", name: "Even Wires", description: "desc", active: true })],
            p2: [makeConstraintCard({ id: "B", name: "Odd Wires", description: "desc", active: true })],
          },
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "p1")} />,
    );

    expect(html).not.toContain("Alice");
    expect(html).not.toContain("Bob");
  });
});
