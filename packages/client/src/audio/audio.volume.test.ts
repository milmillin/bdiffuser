import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionAudioState } from "@bomb-busters/shared";
import {
  playMissionAudio,
  stopMissionAudio,
  syncMissionAudioState,
} from "./audio.js";

class FakeAudio {
  static instances: FakeAudio[] = [];

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

describe("mission audio shared volume output", () => {
  beforeAll(() => {
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    FakeAudio.instances = [];
    stopMissionAudio();
  });

  afterEach(() => {
    stopMissionAudio();
  });

  it("defaults to full volume when shared volume fields are absent", () => {
    syncMissionAudioState(makeMissionAudioState(), 0);
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(1);
  });

  it("applies shared room volume from mission audio state", () => {
    syncMissionAudioState(
      makeMissionAudioState({
        volume: 0.38,
      }),
      0,
    );
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBeCloseTo(0.38, 8);
  });

  it("applies shared mute over shared volume", () => {
    syncMissionAudioState(
      makeMissionAudioState({
        volume: 0.52,
        muted: true,
      }),
      0,
    );
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(0);

    syncMissionAudioState(
      makeMissionAudioState({
        volume: 0.52,
        muted: false,
      }),
      0,
    );
    expect(audio.volume).toBeCloseTo(0.52, 8);
  });

  it("clamps out-of-range shared volume values", () => {
    syncMissionAudioState(
      makeMissionAudioState({
        volume: -2,
      }),
      0,
    );
    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBe(0);

    syncMissionAudioState(
      makeMissionAudioState({
        volume: 99,
      }),
      0,
    );
    expect(audio.volume).toBe(1);

    playMissionAudio("mission_19");
    expect(audio.volume).toBe(1);
  });
});
