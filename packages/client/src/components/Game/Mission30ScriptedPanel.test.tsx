import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState, Mission30State } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";
import { Mission30ScriptedPanel } from "./Mission30ScriptedPanel.js";

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

function makeMission30ClientState(
  mission30: Mission30State,
  currentPlayerIndex = 0,
): ClientGameState {
  const state = makeGameState({
    mission: 30,
    phase: "playing",
    currentPlayerIndex,
    players: [
      makePlayer({ id: "me", name: "Me" }),
      makePlayer({ id: "p2", name: "P2" }),
    ],
    campaign: {
      mission30,
    },
  });

  return toClientGameState(state, "me");
}

function renderMission30Panel(gameState: ClientGameState): string {
  return renderToStaticMarkup(
    <Mission30ScriptedPanel gameState={gameState} send={vi.fn()} />,
  );
}

describe("Mission30ScriptedPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders triple-lock rule state, timer, and pass affordance", () => {
    const html = renderMission30Panel(
      makeMission30ClientState({
        phase: "triple_lock",
        mode: "action",
        currentClipId: "tripleLockBed",
        visibleDeadlineMs: 30_000,
        hardDeadlineMs: 38_000,
        visibleTargetValues: [2, 5, 9],
        mimeMode: true,
        yellowCountsRevealed: true,
        publicYellowCountsByPlayerId: { me: 1, p2: 2 },
      }),
    );

    expect(html).toContain("data-testid=\"mission30-scripted-panel\"");
    expect(html).toContain("Only the 3 visible values may be cut");
    expect(html).toContain("data-testid=\"mission30-visible-timer\">0:20<");
    expect(html).toContain(">Mime Only<");
    expect(html).toContain(">Yellow Counts Revealed<");
    expect(html).toContain("data-testid=\"mission30-manual-skip-button\"");
    expect(html).toContain(">2<");
    expect(html).toContain(">5<");
    expect(html).toContain(">9<");
  });

  it("renders resolving copy when the visible timer has expired inside grace", () => {
    vi.setSystemTime(11_500);

    const html = renderMission30Panel(
      makeMission30ClientState({
        phase: "round_b2",
        mode: "action",
        currentClipId: "roundBBed",
        currentTargetValue: 7,
        visibleDeadlineMs: 11_000,
        hardDeadlineMs: 14_000,
        mimeMode: false,
        yellowCountsRevealed: false,
      }),
    );

    expect(html).toContain("data-testid=\"mission30-visible-timer\">0:00<");
    expect(html).toContain("data-testid=\"mission30-resolving\"");
  });

  it("renders the forced yellow-sweep action button on the active player's turn", () => {
    const html = renderMission30Panel(
      makeMission30ClientState({
        phase: "yellow_sweep",
        mode: "action",
        currentClipId: "yellowSweepInstruction",
        mimeMode: true,
        yellowCountsRevealed: true,
      }),
    );

    expect(html).toContain("Cut Remaining Yellows");
    expect(html).toContain("data-testid=\"mission30-yellow-sweep-button\"");
  });
});
