// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionAudioState } from "@bomb-busters/shared";
import {
  getMissionAudioOutputPreferences,
  isMissionAudioAutoplayBlocked,
  onMissionAudioAutoplayBlockedChange,
  playMissionAudio,
  setMissionAudioMuted,
  setMissionAudioVolume,
  stopMissionAudio,
  syncMissionAudioState,
} from "./audio.js";

class FakeAudio {
  static instances: FakeAudio[] = [];
  static rejectPlay = false;

  src: string;
  preload = "";
  currentTime = 0;
  duration = 120;
  paused = true;
  volume = 1;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    if (FakeAudio.rejectPlay) {
      this.paused = true;
      return Promise.reject(new Error("Autoplay blocked"));
    }

    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(): void {}

  removeEventListener(): void {}
}

function makeMissionAudioState(
  overrides: Partial<MissionAudioState> = {},
): MissionAudioState {
  return {
    audioFile: "mission_19",
    status: "paused",
    positionMs: 0,
    syncedAtMs: 0,
    ...overrides,
  };
}

const MISSION_AUDIO_OUTPUT_STORAGE_KEY = "bomb-busters:mission-audio-output:v1";

describe("mission audio local output", () => {
  beforeAll(() => {
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.rejectPlay = false;
    window.localStorage.clear();
    stopMissionAudio();
    setMissionAudioVolume(1);
    setMissionAudioMuted(false);
  });

  afterEach(() => {
    stopMissionAudio();
  });

  it("defaults to full local volume when no saved preference exists", () => {
    syncMissionAudioState(makeMissionAudioState(), 0);
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(1);
  });

  it("applies persisted local volume and mute preferences to mission audio", () => {
    setMissionAudioVolume(0.38);
    setMissionAudioMuted(true);

    syncMissionAudioState(makeMissionAudioState(), 0);
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(0);

    setMissionAudioMuted(false);
    expect(audio.volume).toBeCloseTo(0.38, 8);
  });

  it("persists local output preferences in localStorage", () => {
    setMissionAudioVolume(0.45);
    setMissionAudioMuted(true);

    expect(window.localStorage.getItem(MISSION_AUDIO_OUTPUT_STORAGE_KEY)).toBe(
      JSON.stringify({ volume: 0.45, muted: true }),
    );
    expect(getMissionAudioOutputPreferences()).toEqual({ volume: 0.45, muted: true });
  });

  it("clamps out-of-range local volume values", () => {
    setMissionAudioVolume(-2);
    playMissionAudio("mission_19");
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(0);

    setMissionAudioVolume(99);
    expect(audio.volume).toBe(1);
  });

  it("tracks autoplay blocking and clears it after playback succeeds", async () => {
    const autoplayUpdates: boolean[] = [];
    const unsubscribe = onMissionAudioAutoplayBlockedChange((blocked) => {
      autoplayUpdates.push(blocked);
    });

    FakeAudio.rejectPlay = true;
    syncMissionAudioState(
      makeMissionAudioState({
        status: "playing",
      }),
      0,
    );
    await Promise.resolve();

    expect(isMissionAudioAutoplayBlocked()).toBe(true);
    expect(autoplayUpdates).toContain(true);

    FakeAudio.rejectPlay = false;
    playMissionAudio("mission_19");
    await Promise.resolve();

    expect(isMissionAudioAutoplayBlocked()).toBe(false);
    expect(autoplayUpdates).toContain(false);

    unsubscribe();
  });
});
