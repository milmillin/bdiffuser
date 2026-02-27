import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMissionAudioVolume,
  isMissionAudioMuted,
  playMissionAudio,
  setMissionAudioMuted,
  setMissionAudioVolume,
  stopMissionAudio,
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

describe("mission audio local volume controls", () => {
  beforeAll(() => {
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    FakeAudio.instances = [];
    stopMissionAudio();
    setMissionAudioVolume(1);
    setMissionAudioMuted(false);
  });

  afterEach(() => {
    stopMissionAudio();
    setMissionAudioVolume(1);
    setMissionAudioMuted(false);
  });

  it("defaults to full volume and unmuted output", () => {
    expect(getMissionAudioVolume()).toBe(1);
    expect(isMissionAudioMuted()).toBe(false);
  });

  it("clamps local volume to the 0-1 range", () => {
    setMissionAudioVolume(-0.4);
    expect(getMissionAudioVolume()).toBe(0);

    setMissionAudioVolume(1.6);
    expect(getMissionAudioVolume()).toBe(1);

    setMissionAudioVolume(0.37);
    expect(getMissionAudioVolume()).toBeCloseTo(0.37, 8);
  });

  it("mutes and unmutes loaded mission audio without losing the configured volume", () => {
    setMissionAudioVolume(0.42);
    playMissionAudio("mission_19");

    const audio = FakeAudio.instances[0];
    expect(audio).toBeDefined();
    if (!audio) {
      throw new Error("Expected mission audio instance");
    }
    expect(audio.volume).toBeCloseTo(0.42, 8);

    setMissionAudioMuted(true);
    expect(isMissionAudioMuted()).toBe(true);
    expect(audio.volume).toBe(0);

    setMissionAudioMuted(false);
    expect(isMissionAudioMuted()).toBe(false);
    expect(audio.volume).toBeCloseTo(0.42, 8);
  });

  it("applies local volume/mute settings to newly created audio elements", () => {
    setMissionAudioVolume(0.25);
    setMissionAudioMuted(true);

    playMissionAudio("mission_19");
    const firstAudio = FakeAudio.instances[0];
    expect(firstAudio).toBeDefined();
    if (!firstAudio) {
      throw new Error("Expected first mission audio instance");
    }
    expect(firstAudio.volume).toBe(0);

    stopMissionAudio();

    playMissionAudio("mission_30");
    const secondAudio = FakeAudio.instances[1];
    expect(secondAudio).toBeDefined();
    if (!secondAudio) {
      throw new Error("Expected second mission audio instance");
    }
    expect(secondAudio.volume).toBe(0);
    expect(secondAudio).not.toBe(firstAudio);

    setMissionAudioMuted(false);
    expect(secondAudio.volume).toBeCloseTo(0.25, 8);
  });
});
