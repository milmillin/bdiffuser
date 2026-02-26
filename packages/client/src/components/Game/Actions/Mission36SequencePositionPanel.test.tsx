import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { Mission36SequencePositionPanel } from "./Mission36SequencePositionPanel.js";

function toClientState(
  state: Parameters<typeof makeGameState>[0],
  playerId: string,
): ClientGameState {
  const gameState = makeGameState(state);
  return {
    ...gameState,
    playerId,
    players: gameState.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

describe("Mission36SequencePositionPanel", () => {
  it("renders captain controls for choosing active side", () => {
    const state = toClientState(
      {
        mission: 36,
        phase: "playing",
        players: [
          makePlayer({
            id: "captain",
            isCaptain: true,
            hand: [makeTile({ id: "c1", gameValue: 2 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 5 })],
          }),
        ],
        campaign: makeCampaignState({
          numberCards: makeNumberCardState({
            visible: [
              makeNumberCard({ id: "n1", value: 2, faceUp: true }),
              makeNumberCard({ id: "n2", value: 7, faceUp: true }),
              makeNumberCard({ id: "n3", value: 10, faceUp: true }),
            ],
          }),
        }),
        pendingForcedAction: {
          kind: "mission36SequencePosition",
          captainId: "captain",
          reason: "initial",
        },
      },
      "captain",
    );

    const html = renderToStaticMarkup(
      <Mission36SequencePositionPanel
        gameState={state}
        send={() => {}}
        playerId="captain"
      />,
    );

    expect(html).toContain("data-testid=\"mission36-sequence-position-panel\"");
    expect(html).toContain("data-testid=\"mission36-sequence-position-left\"");
    expect(html).toContain("data-testid=\"mission36-sequence-position-right\"");
  });

  it("does not render for non-captains", () => {
    const state = toClientState(
      {
        mission: 36,
        phase: "playing",
        players: [
          makePlayer({
            id: "captain",
            isCaptain: true,
            hand: [makeTile({ id: "c1", gameValue: 2 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 5 })],
          }),
        ],
        pendingForcedAction: {
          kind: "mission36SequencePosition",
          captainId: "captain",
          reason: "advance",
        },
      },
      "p2",
    );

    const html = renderToStaticMarkup(
      <Mission36SequencePositionPanel
        gameState={state}
        send={() => {}}
        playerId="p2"
      />,
    );

    expect(html).toBe("");
  });
});
