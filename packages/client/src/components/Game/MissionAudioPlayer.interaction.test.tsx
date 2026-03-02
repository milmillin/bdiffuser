// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";

const getMissionAudioDurationMsMock = vi.fn(() => undefined);
const getMissionAudioPositionMsMock = vi.fn(() => 0);
const onMissionAudioEndedMock = vi.fn<(listener: () => void) => () => void>(
  () => () => {},
);
const stopMissionAudioMock = vi.fn();
const syncMissionAudioStateMock = vi.fn();

vi.mock("../../audio/audio.js", () => ({
  getMissionAudioDurationMs: () => getMissionAudioDurationMsMock(),
  getMissionAudioPositionMs: () => getMissionAudioPositionMsMock(),
  onMissionAudioEnded: (listener: () => void) => onMissionAudioEndedMock(listener),
  stopMissionAudio: () => stopMissionAudioMock(),
  syncMissionAudioState: (...args: unknown[]) => syncMissionAudioStateMock(...args),
}));

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

function makeStateWithMissionAudio(
  playerId = "me",
  missionAudioOverrides: Partial<NonNullable<GameState["missionAudio"]>> = {},
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

  return toClientGameState(gameState, playerId);
}

describe("MissionAudioPlayer interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  function getSeekMessages(send: ReturnType<typeof vi.fn>) {
    return send.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter(
        (msg) =>
          msg.type === "missionAudioControl" && msg.command === "seek",
      );
  }

  it("commits seek and clears drag state when pointer release happens outside slider", async () => {
    const send = vi.fn();
    render(<MissionAudioPlayer gameState={makeStateWithMissionAudio()} send={send} />);

    const slider = screen.getByTestId("mission-audio-slider") as HTMLInputElement;
    expect(slider.value).toBe("0");

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "60000" } });
    expect(slider.value).toBe("60000");

    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(slider.value).toBe("0");
    });

    const seekMessages = getSeekMessages(send);
    expect(seekMessages).toHaveLength(2);
    expect(seekMessages[1]).toEqual(
      expect.objectContaining({
        type: "missionAudioControl",
        command: "seek",
        positionMs: 60_000,
      }),
    );
  });

  it("commits seek on blur and clears drag state", async () => {
    const send = vi.fn();
    render(<MissionAudioPlayer gameState={makeStateWithMissionAudio()} send={send} />);

    const slider = screen.getByTestId("mission-audio-slider") as HTMLInputElement;

    fireEvent.change(slider, { target: { value: "45000" } });
    expect(slider.value).toBe("45000");

    fireEvent.blur(slider);

    await waitFor(() => {
      expect(slider.value).toBe("0");
    });

    const seekMessages = getSeekMessages(send);
    expect(seekMessages).toHaveLength(2);
    expect(seekMessages[1]).toEqual(
      expect.objectContaining({
        type: "missionAudioControl",
        command: "seek",
        positionMs: 45_000,
      }),
    );
  });

  it("does not double-commit seek when pointerup and mouseup both fire", async () => {
    const send = vi.fn();
    render(<MissionAudioPlayer gameState={makeStateWithMissionAudio()} send={send} />);

    const slider = screen.getByTestId("mission-audio-slider") as HTMLInputElement;

    fireEvent.pointerDown(slider);
    fireEvent.mouseDown(slider);
    fireEvent.change(slider, { target: { value: "30000" } });
    expect(slider.value).toBe("30000");

    fireEvent.pointerUp(window);
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(slider.value).toBe("0");
    });

    const seekMessages = getSeekMessages(send);
    expect(seekMessages).toHaveLength(2);
    expect(seekMessages[1]).toEqual(
      expect.objectContaining({
        type: "missionAudioControl",
        command: "seek",
        positionMs: 30_000,
      }),
    );
  });
});
