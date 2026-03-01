import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeSpecialMarker,
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

function renderHints(state: GameState, playerId = "me"): string {
  return renderToStaticMarkup(
    <MissionRuleHints gameState={toClientGameState(state, playerId)} />,
  );
}

function makeBasePlayers() {
  return [
    makePlayer({
      id: "me",
      hand: [makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 })],
    }),
    makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 6, sortValue: 6 })],
    }),
  ];
}

function makeMission36State(pointer: number | null): GameState {
  return makeGameState({
    mission: 36,
    phase: "playing",
    players: makeBasePlayers(),
    currentPlayerIndex: 0,
    campaign: makeCampaignState({
      numberCards: makeNumberCardState({
        visible: [
          makeNumberCard({ id: "num-2", value: 2, faceUp: true }),
          makeNumberCard({ id: "num-5", value: 5, faceUp: true }),
          makeNumberCard({ id: "num-7", value: 7, faceUp: true }),
          makeNumberCard({ id: "num-9", value: 9, faceUp: true }),
          makeNumberCard({ id: "num-11", value: 11, faceUp: true }),
        ],
        deck: [makeNumberCard({ id: "deck-3", value: 3, faceUp: false })],
        discard: [makeNumberCard({ id: "discard-1", value: 1, faceUp: true })],
        playerHands: {},
      }),
      specialMarkers:
        pointer == null
          ? []
          : [makeSpecialMarker({ kind: "sequence_pointer", value: pointer })],
    }),
  });
}

describe("MissionRuleHints mission 36 sequence cutter placement", () => {
  it("renders cutter to the left when active edge is left and hides number deck", () => {
    const html = renderHints(makeMission36State(0));

    const leftCutter = "data-testid=\"mission-hint-thumb-sequence-cutter-left\"";
    const firstNumber = "data-testid=\"mission-hint-thumb-number-visible-num-2\"";
    expect(html).toContain(leftCutter);
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-sequence-cutter-right\"");
    expect(html.indexOf(leftCutter)).toBeLessThan(html.indexOf(firstNumber));
    expect(html).toContain("rotate(-90deg)");
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-number-deck\"");
  });

  it("renders cutter to the right with opposite rotation when active edge is right", () => {
    const html = renderHints(makeMission36State(4));

    const rightCutter = "data-testid=\"mission-hint-thumb-sequence-cutter-right\"";
    const lastNumber = "data-testid=\"mission-hint-thumb-number-visible-num-11\"";
    expect(html).toContain(rightCutter);
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-sequence-cutter-left\"");
    expect(html.indexOf(rightCutter)).toBeGreaterThan(html.indexOf(lastNumber));
    expect(html).toContain("rotate(90deg)");
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-number-deck\"");
  });

  it("hides cutter before captain chooses side and still hides number deck", () => {
    const html = renderHints(makeMission36State(null));

    expect(html).not.toContain("data-testid=\"mission-hint-thumb-sequence-cutter-left\"");
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-sequence-cutter-right\"");
    expect(html).not.toContain("data-testid=\"mission-hint-thumb-number-deck\"");
  });

  it("keeps mission 9 sequence cutter and number deck rendering unchanged", () => {
    const state = makeGameState({
      mission: 9,
      phase: "playing",
      players: makeBasePlayers(),
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "m9-2", value: 2, faceUp: true }),
            makeNumberCard({ id: "m9-5", value: 5, faceUp: true }),
            makeNumberCard({ id: "m9-7", value: 7, faceUp: true }),
          ],
          deck: [makeNumberCard({ id: "m9-deck", value: 8, faceUp: false })],
          discard: [],
          playerHands: {},
        }),
        specialMarkers: [makeSpecialMarker({ kind: "sequence_pointer", value: 0 })],
      }),
    });

    const html = renderHints(state);
    expect(html).toContain("cutter_a.png");
    expect(html).toContain("data-testid=\"mission-hint-thumb-number-deck\"");
  });
});
