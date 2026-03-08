import { playExplosionBoom as synthBoom } from "./explosionSynth.js";
import type { MissionAudioState } from "@bomb-busters/shared";

export { synthBoom as playExplosionBoom };

export interface MissionAudioOutputPreferences {
  volume: number;
  muted: boolean;
}

const MISSION_AUDIO_OUTPUT_STORAGE_KEY = "bomb-busters:mission-audio-output:v1";
const DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES: MissionAudioOutputPreferences = {
  volume: 1,
  muted: false,
};

let currentAudio: HTMLAudioElement | null = null;
let currentAudioFile: string | null = null;
let currentMissionAudioState: MissionAudioState | null = null;
let boundaryAudio: HTMLAudioElement | null = null;
let missionAudioOutputPreferences: MissionAudioOutputPreferences | null = null;
let missionAudioAutoplayBlocked = false;
const missionAudioAutoplayBlockedListeners = new Set<(blocked: boolean) => void>();

function clampMissionAudioVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES.volume;
  return Math.min(1, Math.max(0, volume));
}

function persistMissionAudioOutputPreferences(
  nextPreferences: MissionAudioOutputPreferences,
): void {
  missionAudioOutputPreferences = nextPreferences;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      MISSION_AUDIO_OUTPUT_STORAGE_KEY,
      JSON.stringify(nextPreferences),
    );
  } catch {
    // Ignore localStorage failures and keep the in-memory value.
  }
}

function getMissionAudioOutputPreferencesInternal(): MissionAudioOutputPreferences {
  if (missionAudioOutputPreferences) {
    return missionAudioOutputPreferences;
  }

  if (typeof window === "undefined") {
    missionAudioOutputPreferences = { ...DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES };
    return missionAudioOutputPreferences;
  }

  try {
    const raw = window.localStorage.getItem(MISSION_AUDIO_OUTPUT_STORAGE_KEY);
    if (!raw) {
      missionAudioOutputPreferences = { ...DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES };
      return missionAudioOutputPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<MissionAudioOutputPreferences>;
    missionAudioOutputPreferences = {
      volume: clampMissionAudioVolume(
        typeof parsed.volume === "number"
          ? parsed.volume
          : DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES.volume,
      ),
      muted:
        typeof parsed.muted === "boolean"
          ? parsed.muted
          : DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES.muted,
    };
    return missionAudioOutputPreferences;
  } catch {
    missionAudioOutputPreferences = { ...DEFAULT_MISSION_AUDIO_OUTPUT_PREFERENCES };
    return missionAudioOutputPreferences;
  }
}

function applyMissionAudioOutput(audio: HTMLAudioElement): void {
  const preferences = getMissionAudioOutputPreferencesInternal();
  audio.volume = preferences.muted ? 0 : preferences.volume;
}

function setMissionAudioAutoplayBlocked(nextBlocked: boolean): void {
  if (missionAudioAutoplayBlocked === nextBlocked) return;

  missionAudioAutoplayBlocked = nextBlocked;
  for (const listener of missionAudioAutoplayBlockedListeners) {
    listener(nextBlocked);
  }
}

async function playMissionAudioElement(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play();
    setMissionAudioAutoplayBlocked(false);
    return true;
  } catch {
    setMissionAudioAutoplayBlocked(true);
    return false;
  }
}

function handleMissionAudioBoundaryUpdate(): void {
  if (!boundaryAudio || !currentMissionAudioState) return;

  const startMs = Math.max(0, currentMissionAudioState.segmentStartMs ?? 0);
  const endMs = currentMissionAudioState.segmentEndMs;
  if (endMs == null) return;

  const currentMs = Math.max(0, Math.round(boundaryAudio.currentTime * 1000));
  const endThresholdMs = Math.max(startMs, endMs - 40);

  if (currentMissionAudioState.loopSegment) {
    if (currentMs >= endThresholdMs) {
      maybeSeek(boundaryAudio, startMs);
      if (
        currentMissionAudioState.status === "playing" &&
        boundaryAudio.paused
      ) {
        void playMissionAudioElement(boundaryAudio);
      }
    }
    return;
  }

  if (currentMs > endMs) {
    maybeSeek(boundaryAudio, endMs);
    if (!boundaryAudio.paused) {
      boundaryAudio.pause();
    }
  }
}

function attachMissionAudioBoundaryHandlers(audio: HTMLAudioElement): void {
  if (boundaryAudio === audio) return;

  if (boundaryAudio) {
    boundaryAudio.removeEventListener("timeupdate", handleMissionAudioBoundaryUpdate);
    boundaryAudio.removeEventListener("seeking", handleMissionAudioBoundaryUpdate);
    boundaryAudio.removeEventListener("ended", handleMissionAudioBoundaryUpdate);
  }

  boundaryAudio = audio;
  boundaryAudio.addEventListener("timeupdate", handleMissionAudioBoundaryUpdate);
  boundaryAudio.addEventListener("seeking", handleMissionAudioBoundaryUpdate);
  boundaryAudio.addEventListener("ended", handleMissionAudioBoundaryUpdate);
}

function ensureMissionAudio(audioFile: string): HTMLAudioElement {
  if (!currentAudio || currentAudioFile !== audioFile) {
    if (currentAudio) {
      currentAudio.pause();
    }
    currentAudio = new Audio(`/audio/${audioFile}.mp3`);
    currentAudio.preload = "auto";
    currentAudioFile = audioFile;
    applyMissionAudioOutput(currentAudio);
  }
  attachMissionAudioBoundaryHandlers(currentAudio);
  return currentAudio;
}

function maybeSeek(audio: HTMLAudioElement, positionMs: number): void {
  const targetSeconds = Math.max(0, positionMs) / 1000;
  if (!audio.ended && Math.abs(audio.currentTime - targetSeconds) < 0.25) return;

  try {
    audio.currentTime = targetSeconds;
  } catch {
    // Ignore seek failures before metadata is loaded.
  }
}

/** Apply synchronized mission-audio state from the server. */
export function syncMissionAudioState(
  missionAudio: MissionAudioState,
  resolvedPositionMs: number,
): void {
  const audio = ensureMissionAudio(missionAudio.audioFile);
  currentMissionAudioState = missionAudio;
  audio.loop = false;
  applyMissionAudioOutput(audio);
  maybeSeek(audio, resolvedPositionMs);
  handleMissionAudioBoundaryUpdate();

  if (missionAudio.status === "playing") {
    void playMissionAudioElement(audio);
  } else if (!audio.paused) {
    audio.pause();
    setMissionAudioAutoplayBlocked(false);
  } else {
    setMissionAudioAutoplayBlocked(false);
  }
}

/** Play a mission audio file from /audio/{audioFile}.mp3. */
export function playMissionAudio(audioFile: string): void {
  const audio = ensureMissionAudio(audioFile);
  applyMissionAudioOutput(audio);
  void playMissionAudioElement(audio);
}

/** Stop any currently playing mission audio. */
export function stopMissionAudio(): void {
  if (currentAudio) {
    if (boundaryAudio === currentAudio) {
      boundaryAudio.removeEventListener("timeupdate", handleMissionAudioBoundaryUpdate);
      boundaryAudio.removeEventListener("seeking", handleMissionAudioBoundaryUpdate);
      boundaryAudio.removeEventListener("ended", handleMissionAudioBoundaryUpdate);
      boundaryAudio = null;
    }
    currentAudio.pause();
    try {
      currentAudio.currentTime = 0;
    } catch {
      // Ignore reset failures if metadata is not ready.
    }
    currentAudio = null;
    currentAudioFile = null;
  }
  currentMissionAudioState = null;
  setMissionAudioAutoplayBlocked(false);
}

/** Check whether mission audio is currently playing. */
export function isMissionAudioPlaying(): boolean {
  return currentAudio != null && !currentAudio.paused;
}

/** Current playback position in milliseconds for the loaded mission audio. */
export function getMissionAudioPositionMs(): number {
  if (!currentAudio) return 0;
  return Math.max(0, Math.round(currentAudio.currentTime * 1000));
}

/** Loaded audio duration in milliseconds, if known. */
export function getMissionAudioDurationMs(): number | undefined {
  if (!currentAudio || !Number.isFinite(currentAudio.duration) || currentAudio.duration <= 0) {
    return undefined;
  }
  return Math.round(currentAudio.duration * 1000);
}

export function getMissionAudioOutputPreferences(): MissionAudioOutputPreferences {
  const preferences = getMissionAudioOutputPreferencesInternal();
  return { ...preferences };
}

export function setMissionAudioVolume(volume: number): MissionAudioOutputPreferences {
  const nextPreferences = {
    ...getMissionAudioOutputPreferencesInternal(),
    volume: clampMissionAudioVolume(volume),
  };
  persistMissionAudioOutputPreferences(nextPreferences);
  if (currentAudio) {
    applyMissionAudioOutput(currentAudio);
  }
  return { ...nextPreferences };
}

export function setMissionAudioMuted(muted: boolean): MissionAudioOutputPreferences {
  const nextPreferences = {
    ...getMissionAudioOutputPreferencesInternal(),
    muted,
  };
  persistMissionAudioOutputPreferences(nextPreferences);
  if (currentAudio) {
    applyMissionAudioOutput(currentAudio);
  }
  return { ...nextPreferences };
}

export function isMissionAudioAutoplayBlocked(): boolean {
  return missionAudioAutoplayBlocked;
}

export function onMissionAudioAutoplayBlockedChange(
  listener: (blocked: boolean) => void,
): () => void {
  missionAudioAutoplayBlockedListeners.add(listener);
  return () => {
    missionAudioAutoplayBlockedListeners.delete(listener);
  };
}

export async function retryMissionAudioPlayback(): Promise<boolean> {
  if (!currentAudio) return false;
  return playMissionAudioElement(currentAudio);
}

/** Subscribe to mission-audio playback end events. */
export function onMissionAudioEnded(listener: () => void): () => void {
  if (!currentAudio) return () => {};

  const audio = currentAudio;
  const handler = () => listener();
  audio.addEventListener("ended", handler);
  return () => {
    audio.removeEventListener("ended", handler);
  };
}
