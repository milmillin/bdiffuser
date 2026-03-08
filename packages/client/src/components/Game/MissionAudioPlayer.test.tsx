import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";
import { setMissionAudioMuted, setMissionAudioVolume, stopMissionAudio } from "../../audio/audio.js";
import { MissionAudioPlayer } from "./MissionAudioPlayer.js";

function toClientGameState(
  state: GameState,
  playerId: string,
  isHost = false,
): ClientGameState {
  return {
    ...state,
    playerId,
    isHost,
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

function makeStateWithMissionAudio(
  playerId = "me",
  missionAudioOverrides: Partial<NonNullable<GameState["missionAudio"]>> = {},
  isHost = false,
): ClientGameState {
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
      ...missionAudioOverrides,
    },
  });

  return toClientGameState(gameState, playerId, isHost);
}

function renderMissionAudioPlayer(gameState: ClientGameState): string {
  return renderToStaticMarkup(
    <MissionAudioPlayer gameState={gameState} send={vi.fn()} />,
  );
}

describe("MissionAudioPlayer", () => {
  beforeEach(() => {
    stopMissionAudio();
    setMissionAudioVolume(1);
    setMissionAudioMuted(false);
  });

  afterEach(() => {
    stopMissionAudio();
    setMissionAudioVolume(1);
    setMissionAudioMuted(false);
  });

  it("renders transport, timeline, and local volume controls", () => {
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
    const html = renderMissionAudioPlayer(makeStateWithMissionAudio());
    expect(html).toContain(">Unmute<");
  });

  it("renders current local volume value", () => {
    setMissionAudioVolume(0.45);
    const html = renderMissionAudioPlayer(makeStateWithMissionAudio());
    expect(html).toContain("value=\"45\"");
  });

  it("renders nothing when mission audio is absent", () => {
    const state = toClientGameState(
      makeGameState({
        mission: 1,
        phase: "playing",
        players: [makePlayer({ id: "me" }), makePlayer({ id: "p2" })],
      }),
      "me",
      false,
    );

    const html = renderMissionAudioPlayer(state);
    expect(html).toBe("");
  });

  it("renders host-controlled shared transport messaging for non-host Mission 30 players", () => {
    const html = renderMissionAudioPlayer(
      makeStateWithMissionAudio("me", {
        audioFile: "mission_30",
        transportLocked: true,
        clipId: "briefing",
        segmentStartMs: 2_630,
        segmentEndMs: 54_320,
      }),
    );

    expect(html).toContain("data-testid=\"mission-audio-slider\"");
    expect(html).toContain("data-testid=\"mission-audio-play\"");
    expect(html).toContain("data-testid=\"mission-audio-pause\"");
    expect(html).toContain("data-testid=\"mission-audio-transport-note\"");
    expect(html).toContain("Only the host can play, pause, or seek.");
    expect(html).toContain("disabled");
    expect(html).toContain("data-testid=\"mission-audio-volume-slider\"");
  });

  it("renders active shared transport messaging for the Mission 30 host", () => {
    const html = renderMissionAudioPlayer(
      makeStateWithMissionAudio(
        "me",
        {
          audioFile: "mission_30",
          transportLocked: true,
          clipId: "briefing",
          segmentStartMs: 2_630,
          segmentEndMs: 54_320,
        },
        true,
      ),
    );

    expect(html).toContain("data-testid=\"mission-audio-transport-note\"");
    expect(html).toContain("Host transport changes affect everyone.");
    expect(html).not.toContain("Only the host can play, pause, or seek.");
    expect(html).toContain("data-testid=\"mission-audio-volume-slider\"");
  });
});
