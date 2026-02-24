import { playExplosionBoom as synthBoom } from "./explosionSynth.js";

export { synthBoom as playExplosionBoom };

let currentAudio: HTMLAudioElement | null = null;

/** Play a mission audio file from /audio/{audioFile}.mp3. */
export function playMissionAudio(audioFile: string): void {
  stopMissionAudio();
  const audio = new Audio(`/audio/${audioFile}.mp3`);
  audio.addEventListener("ended", () => {
    if (currentAudio === audio) currentAudio = null;
  });
  audio.play().catch(() => {
    // Autoplay may be blocked; user interaction required first
    currentAudio = null;
  });
  currentAudio = audio;
}

/** Stop any currently playing mission audio. */
export function stopMissionAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/** Check whether mission audio is currently playing. */
export function isMissionAudioPlaying(): boolean {
  return currentAudio != null && !currentAudio.paused;
}
