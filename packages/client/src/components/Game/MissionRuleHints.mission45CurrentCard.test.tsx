import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
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

describe("MissionRuleHints mission 45 current Number card", () => {
  it("highlights the current Number card by card id", () => {
    const state = makeGameState({
      mission: 45,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 7 })],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "num-2", value: 2, faceUp: true }),
            makeNumberCard({ id: "num-7", value: 7, faceUp: true }),
            makeNumberCard({ id: "num-10", value: 10, faceUp: true }),
          ],
        }),
        mission45Turn: {
          stage: "awaiting_volunteer",
          captainId: "captain",
          currentCardId: "num-7",
          currentValue: 7,
        },
      }),
    });

    const html = renderToStaticMarkup(
      <MissionRuleHints gameState={toClientGameState(state, "captain")} />,
    );

    expect(html).toMatch(
      /data-testid="mission-hint-thumb-number-visible-num-7".*?border-red-400.*?>Current</s,
    );
    const firstCardBlock = html.match(
      /data-testid="mission-hint-thumb-number-visible-num-2"[\s\S]*?<\/button><\/div>/,
    )?.[0];
    expect(firstCardBlock).toBeDefined();
    expect(firstCardBlock).not.toContain("Current");
  });
});
