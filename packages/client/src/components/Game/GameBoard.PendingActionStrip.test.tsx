import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { PendingActionStrip } from "./GameBoard.js";

function makeDualCutDraftState(): ClientGameState {
  const state = makeGameState({
    mission: 10,
    phase: "playing",
    players: [
      makePlayer({
        id: "me",
        name: "Agent",
        hand: [
          makeTile({ id: "m1", gameValue: 3, color: "blue" }),
          makeTile({ id: "m2", gameValue: 8, color: "blue" }),
        ],
      }),
      makePlayer({
        id: "p2",
        name: "Buddy",
        hand: [makeTile({ id: "p2-1", gameValue: 5, color: "blue" })],
      }),
    ],
    currentPlayerIndex: 0,
  });

  return {
    ...state,
    playerId: "me",
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

describe("GameBoard PendingActionStrip", () => {
  it("shows active custom dual-cut guess value before targeting", () => {
    const state = makeDualCutDraftState();

    const html = renderToStaticMarkup(
      <PendingActionStrip
        players={state.players}
        actorId="me"
        mission={state.mission}
        pendingAction={null}
        selectedGuessTile={0}
        selectedGuessValue={3}
        activeDualCutGuessValue={8}
        canConfirmSoloFromDraft={false}
        mission9SelectedGuessBlocked={false}
        mission11RevealAttemptAvailable={false}
        canConfirm={false}
        onMission11RevealAttempt={() => {
          throw new Error("unexpected reveal-reds action");
        }}
        onConfirmSoloFromDraft={() => {
          throw new Error("unexpected solo cut action");
        }}
        onDualCutGuessValueChange={() => {
          throw new Error("unexpected dual-cut guess update");
        }}
        mission59RotateNano={false}
        onMission59RotateNanoChange={() => {
          throw new Error("unexpected nano rotation toggle");
        }}
        onConfirm={() => {
          throw new Error("unexpected confirm");
        }}
        onCancel={() => {
          throw new Error("unexpected cancel");
        }}
      />,
    );

    expect(html).toContain("value 8");
    expect(html).toContain("data-testid=\"dual-cut-guess-select\"");
    expect(html).toContain("Dual Cut announced value");
  });
});
