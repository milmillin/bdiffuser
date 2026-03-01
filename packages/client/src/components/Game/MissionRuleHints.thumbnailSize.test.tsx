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

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classesForTestId(html: string, testId: string): string[] {
  const pattern = new RegExp(
    `data-testid="${escapeForRegExp(testId)}"[^>]*class="([^"]+)"`,
  );
  const match = html.match(pattern);
  expect(match).not.toBeNull();
  return (match?.[1] ?? "").split(/\s+/).filter(Boolean);
}

describe("MissionRuleHints thumbnail sizing", () => {
  it("renders number and constraint thumbnails at 1.5x widths", () => {
    const state = makeGameState({
      mission: 11,
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
          visible: [{ id: "num-8", value: 8, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
        constraints: {
          global: [
            makeConstraintCard({
              id: "A",
              name: "Even Wires Only",
              description: "You must cut only even wires.",
              active: true,
            }),
          ],
          perPlayer: {},
          deck: [],
        },
      },
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "me")} />,
    );

    const numberClasses = classesForTestId(
      html,
      "mission-hint-thumb-number-visible-num-8",
    );
    expect(numberClasses).toEqual(
      expect.arrayContaining(["w-[7.5rem]", "sm:w-[9rem]", "shrink-0"]),
    );

    const constraintClasses = classesForTestId(
      html,
      "mission-hint-thumb-constraint-global-A",
    );
    expect(constraintClasses).toEqual(
      expect.arrayContaining(["w-[11.25rem]", "sm:w-[13.5rem]", "shrink-0"]),
    );
  });
});
