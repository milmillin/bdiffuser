// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";

const getMissionAudioDurationMsMock = vi.fn(() => undefined);
const getMissionAudioPositionMsMock = vi.fn(() => 0);
const getMissionAudioOutputPreferencesMock = vi.fn(() => ({ volume: 1, muted: false }));
const retryMissionAudioPlaybackMock = vi.fn(async () => true);
const setMissionAudioMutedMock = vi.fn();
const setMissionAudioVolumeMock = vi.fn();
const onMissionAudioEndedMock = vi.fn<(listener: () => void) => () => void>(
  () => () => {},
);
const stopMissionAudioMock = vi.fn();
const syncMissionAudioStateMock = vi.fn();
let autoplayBlocked = false;
const autoplayBlockedListeners = new Set<(blocked: boolean) => void>();

function setAutoplayBlockedForTest(nextBlocked: boolean) {
  autoplayBlocked = nextBlocked;
  for (const listener of autoplayBlockedListeners) {
    listener(nextBlocked);
  }
}

vi.mock("../../audio/audio.js", () => ({
  getMissionAudioOutputPreferences: () => getMissionAudioOutputPreferencesMock(),
  getMissionAudioDurationMs: () => getMissionAudioDurationMsMock(),
  getMissionAudioPositionMs: () => getMissionAudioPositionMsMock(),
  isMissionAudioAutoplayBlocked: () => autoplayBlocked,
  onMissionAudioAutoplayBlockedChange: (listener: (blocked: boolean) => void) => {
    autoplayBlockedListeners.add(listener);
    return () => {
      autoplayBlockedListeners.delete(listener);
    };
  },
  onMissionAudioEnded: (listener: () => void) => onMissionAudioEndedMock(listener),
  retryMissionAudioPlayback: () => retryMissionAudioPlaybackMock(),
  setMissionAudioMuted: (muted: boolean) => setMissionAudioMutedMock(muted),
  setMissionAudioVolume: (volume: number) => setMissionAudioVolumeMock(volume),
  stopMissionAudio: () => stopMissionAudioMock(),
  syncMissionAudioState: (...args: unknown[]) => syncMissionAudioStateMock(...args),
}));

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

describe("MissionAudioPlayer interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoplayBlocked = false;
    autoplayBlockedListeners.clear();
    getMissionAudioOutputPreferencesMock.mockReturnValue({ volume: 1, muted: false });
    retryMissionAudioPlaybackMock.mockImplementation(async () => true);
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

    fireEvent.pointerDown(slider);
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

  it("uses absolute Mission 30 positions when the host seeks inside a locked segment", async () => {
    const send = vi.fn();
    render(
      <MissionAudioPlayer
        gameState={makeStateWithMissionAudio(
          "me",
          {
            audioFile: "mission_30",
            transportLocked: true,
            clipId: "briefing",
            segmentStartMs: 2_630,
            segmentEndMs: 54_320,
            durationMs: 769_080,
          },
          true,
        )}
        send={send}
      />,
    );

    const slider = screen.getByTestId("mission-audio-slider") as HTMLInputElement;
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "10000" } });
    fireEvent.pointerUp(window);

    const seekMessages = getSeekMessages(send);
    expect(seekMessages).toHaveLength(2);
    expect(seekMessages[0]).toEqual(
      expect.objectContaining({
        command: "seek",
        positionMs: 12_630,
      }),
    );
    expect(seekMessages[1]).toEqual(
      expect.objectContaining({
        command: "seek",
        positionMs: 12_630,
      }),
    );
  });

  it("disables shared Mission 30 transport for non-host players", () => {
    const send = vi.fn();
    render(
      <MissionAudioPlayer
        gameState={makeStateWithMissionAudio("me", {
          audioFile: "mission_30",
          transportLocked: true,
          clipId: "briefing",
          segmentStartMs: 2_630,
          segmentEndMs: 54_320,
        })}
        send={send}
      />,
    );

    expect(screen.getByTestId("mission-audio-slider").getAttribute("disabled")).not.toBeNull();
    expect(screen.getByTestId("mission-audio-play").getAttribute("disabled")).not.toBeNull();
    expect(screen.getByTestId("mission-audio-pause").getAttribute("disabled")).not.toBeNull();

    fireEvent.click(screen.getByTestId("mission-audio-play"));
    expect(send).not.toHaveBeenCalled();
  });

  it("shows a local retry button when playback is blocked on this client", async () => {
    retryMissionAudioPlaybackMock.mockImplementation(async () => {
      setAutoplayBlockedForTest(false);
      return true;
    });
    setAutoplayBlockedForTest(true);

    render(
      <MissionAudioPlayer
        gameState={makeStateWithMissionAudio("me", {
          audioFile: "mission_30",
          status: "playing",
          transportLocked: true,
          clipId: "briefing",
          segmentStartMs: 2_630,
          segmentEndMs: 54_320,
        })}
        send={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("mission-audio-retry"));
    expect(retryMissionAudioPlaybackMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByTestId("mission-audio-retry")).toBeNull();
    });
  });
});
