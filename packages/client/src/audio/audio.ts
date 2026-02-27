import { playExplosionBoom as synthBoom } from "./explosionSynth.js";
import type { MissionAudioState } from "@bomb-busters/shared";

export { synthBoom as playExplosionBoom };

let currentAudio: HTMLAudioElement | null = null;
let currentAudioFile: string | null = null;
let missionAudioVolume = 1;
let missionAudioMuted = false;

function getEffectiveMissionAudioVolume(): number {
  return missionAudioMuted ? 0 : missionAudioVolume;
}

function applyMissionAudioOutput(): void {
  if (!currentAudio) return;
  currentAudio.volume = getEffectiveMissionAudioVolume();
}

function ensureMissionAudio(audioFile: string): HTMLAudioElement {
  if (!currentAudio || currentAudioFile !== audioFile) {
    if (currentAudio) {
      currentAudio.pause();
    }
    currentAudio = new Audio(`/audio/${audioFile}.mp3`);
    currentAudio.preload = "auto";
    currentAudioFile = audioFile;
  }
  applyMissionAudioOutput();
  return currentAudio;
}

function maybeSeek(audio: HTMLAudioElement, positionMs: number): void {
  const targetSeconds = Math.max(0, positionMs) / 1000;
  if (Math.abs(audio.currentTime - targetSeconds) < 0.25) return;

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
  maybeSeek(audio, resolvedPositionMs);

  if (missionAudio.status === "playing") {
    if (audio.paused) {
      audio.play().catch(() => {
        // Autoplay may be blocked until user interaction.
      });
    }
  } else if (!audio.paused) {
    audio.pause();
  }
}

/** Play a mission audio file from /audio/{audioFile}.mp3. */
export function playMissionAudio(audioFile: string): void {
  const audio = ensureMissionAudio(audioFile);
  audio.play().catch(() => {
    // Autoplay may be blocked; user interaction required first.
  });
}

/** Stop any currently playing mission audio. */
export function stopMissionAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    try {
      currentAudio.currentTime = 0;
    } catch {
      // Ignore reset failures if metadata is not ready.
    }
    currentAudio = null;
    currentAudioFile = null;
  }
}

/** Current local mission-audio volume level (0-1). */
export function getMissionAudioVolume(): number {
  return missionAudioVolume;
}

/** Update local mission-audio volume level (0-1). */
export function setMissionAudioVolume(volume: number): void {
  if (!Number.isFinite(volume)) return;
  missionAudioVolume = Math.min(1, Math.max(0, volume));
  applyMissionAudioOutput();
}

/** Whether local mission-audio output is muted. */
export function isMissionAudioMuted(): boolean {
  return missionAudioMuted;
}

/** Toggle local mission-audio mute state. */
export function setMissionAudioMuted(muted: boolean): void {
  missionAudioMuted = muted;
  applyMissionAudioOutput();
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
