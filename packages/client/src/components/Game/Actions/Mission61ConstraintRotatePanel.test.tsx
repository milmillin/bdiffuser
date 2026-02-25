import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { Mission61ConstraintRotatePanel } from "./Mission61ConstraintRotatePanel.js";

function toClientState(state: Parameters<typeof makeGameState>[0], playerId: string): ClientGameState {
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

describe("Mission61ConstraintRotatePanel", () => {
  it("renders captain controls for clockwise/counter-clockwise rotation", () => {
    const state = toClientState(
      {
        mission: 61,
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
          kind: "mission61ConstraintRotate",
          captainId: "captain",
          direction: "clockwise",
        },
      },
      "captain",
    );

    const html = renderToStaticMarkup(
      <Mission61ConstraintRotatePanel
        gameState={state}
        send={() => {}}
        playerId="captain"
      />,
    );

    expect(html).toContain("data-testid=\"mission61-constraint-rotate-panel\"");
    expect(html).toContain("data-testid=\"mission61-constraint-rotate-clockwise\"");
    expect(html).toContain("data-testid=\"mission61-constraint-rotate-counter-clockwise\"");
  });

  it("does not render for non-captains", () => {
    const state = toClientState(
      {
        mission: 61,
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
          kind: "mission61ConstraintRotate",
          captainId: "captain",
          direction: "counter_clockwise",
        },
      },
      "p2",
    );

    const html = renderToStaticMarkup(
      <Mission61ConstraintRotatePanel
        gameState={state}
        send={() => {}}
        playerId="p2"
      />,
    );

    expect(html).toBe("");
  });
});
