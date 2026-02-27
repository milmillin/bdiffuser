import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";
import { setMissionAudioMuted } from "../../audio/audio.js";
import { MissionAudioPlayer } from "./MissionAudioPlayer.js";

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

function makeStateWithMissionAudio(playerId = "me"): ClientGameState {
  const gameState = makeGameState({
    mission: 19,
    phase: "playing",
    players: [
      makePlayer({ id: playerId, name: "Me" }),
      makePlayer({ id: "p2", name: "P2" }),
    ],
    missionAudio: {
      audioFile: "mission_19",
      status: "paused",
      positionMs: 0,
      syncedAtMs: 0,
      durationMs: 120_000,
    },
  });

  return toClientGameState(gameState, playerId);
}

function renderMissionAudioPlayer(gameState: ClientGameState): string {
  return renderToStaticMarkup(
    <MissionAudioPlayer gameState={gameState} send={vi.fn()} />,
  );
}

describe("MissionAudioPlayer", () => {
  it("renders transport, timeline, and local volume controls", () => {
    setMissionAudioMuted(false);
    const html = renderMissionAudioPlayer(makeStateWithMissionAudio());

    expect(html).toContain("data-testid=\"mission-audio-controller\"");
    expect(html).toContain("data-testid=\"mission-audio-slider\"");
    expect(html).toContain("data-testid=\"mission-audio-play\"");
    expect(html).toContain("data-testid=\"mission-audio-pause\"");
    expect(html).toContain("data-testid=\"mission-audio-volume-slider\"");
    expect(html).toContain("data-testid=\"mission-audio-mute\"");
    expect(html).toContain(">Mute<");
  });

  it("renders unmute label when local mission audio is muted", () => {
    setMissionAudioMuted(true);
    try {
      const html = renderMissionAudioPlayer(makeStateWithMissionAudio());
      expect(html).toContain(">Unmute<");
    } finally {
      setMissionAudioMuted(false);
    }
  });

  it("renders nothing when mission audio is absent", () => {
    const state = toClientGameState(
      makeGameState({
        mission: 1,
        phase: "playing",
        players: [makePlayer({ id: "me" }), makePlayer({ id: "p2" })],
      }),
      "me",
    );

    const html = renderMissionAudioPlayer(state);
    expect(html).toBe("");
  });
});
