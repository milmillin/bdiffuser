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

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

describe("MissionRuleHints mission 47/57 paired number and constraint rows", () => {
  it("mission 57 shows inactive constraints paired with sorted number cards", () => {
    const state = makeGameState({
      mission: 57,
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
          visible: [
            { id: "m57-nine", value: 9, faceUp: true },
            { id: "m57-two", value: 2, faceUp: true },
            { id: "m57-eleven", value: 11, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        constraints: {
          global: [
            makeConstraintCard({ id: "A", name: "Constraint A", active: false }),
            makeConstraintCard({ id: "B", name: "Constraint B", active: false }),
            makeConstraintCard({ id: "C", name: "Constraint C", active: false }),
          ],
          perPlayer: {},
          deck: [],
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "me")} />,
    );

    expect(html).toContain("data-testid=\"mission-hint-paired-number-constraint-row\"");
    expect(countMatches(html, /data-testid="mission-hint-paired-column-\d+"/g)).toBe(3);

    const index2 = html.indexOf("number_2.png");
    const index9 = html.indexOf("number_9.png");
    const index11 = html.indexOf("number_11.png");
    expect(index2).toBeGreaterThan(-1);
    expect(index9).toBeGreaterThan(-1);
    expect(index11).toBeGreaterThan(-1);
    expect(index2).toBeLessThan(index9);
    expect(index9).toBeLessThan(index11);

    const indexB = html.indexOf("constraint_b.png");
    const indexA = html.indexOf("constraint_a.png");
    const indexC = html.indexOf("constraint_c.png");
    expect(indexB).toBeGreaterThan(-1);
    expect(indexA).toBeGreaterThan(-1);
    expect(indexC).toBeGreaterThan(-1);
    expect(indexB).toBeLessThan(indexA);
    expect(indexA).toBeLessThan(indexC);
  });

  it("mission 47 shows constraints on a second paired row when constraints exist", () => {
    const state = makeGameState({
      mission: 47,
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
          visible: [
            { id: "m47-nine", value: 9, faceUp: true },
            { id: "m47-two", value: 2, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        constraints: {
          global: [
            makeConstraintCard({ id: "A", name: "Constraint A", active: false }),
            makeConstraintCard({ id: "B", name: "Constraint B", active: false }),
          ],
          perPlayer: {},
          deck: [],
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "me")} />,
    );

    expect(html).toContain("data-testid=\"mission-hint-paired-number-constraint-row\"");
    expect(countMatches(html, /data-testid="mission-hint-paired-column-\d+"/g)).toBe(2);

    const index2 = html.indexOf("number_2.png");
    const index9 = html.indexOf("number_9.png");
    expect(index2).toBeGreaterThan(-1);
    expect(index9).toBeGreaterThan(-1);
    expect(index2).toBeLessThan(index9);

    const indexB = html.indexOf("constraint_b.png");
    const indexA = html.indexOf("constraint_a.png");
    expect(indexB).toBeGreaterThan(-1);
    expect(indexA).toBeGreaterThan(-1);
    expect(indexB).toBeLessThan(indexA);
  });

  it("mission 47 does not fabricate a constraints row when no constraints exist", () => {
    const state = makeGameState({
      mission: 47,
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
          visible: [
            { id: "m47-nine", value: 9, faceUp: true },
            { id: "m47-two", value: 2, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "me")} />,
    );

    expect(html).not.toContain("data-testid=\"mission-hint-paired-number-constraint-row\"");
    expect(html).not.toContain("constraint_a.png");
    expect(html).not.toContain("constraint_b.png");

    const index2 = html.indexOf("number_2.png");
    const index9 = html.indexOf("number_9.png");
    expect(index2).toBeGreaterThan(-1);
    expect(index9).toBeGreaterThan(-1);
    expect(index2).toBeLessThan(index9);
  });
});
