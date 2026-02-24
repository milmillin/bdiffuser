import { useState, useEffect, useCallback } from "react";
import { MISSION_SCHEMAS } from "@bomb-busters/shared";
import type { MissionId } from "@bomb-busters/shared";
import {
  playMissionAudio,
  stopMissionAudio,
  isMissionAudioPlaying,
} from "../../audio/audio.js";

export function MissionAudioPlayer({ missionId }: { missionId: MissionId }) {
  const schema = MISSION_SCHEMAS[missionId];
  const audioRule = schema.hookRules?.find((r) => r.kind === "audio_prompt");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      stopMissionAudio();
    };
  }, []);

  // Sync state if audio ends naturally
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (!isMissionAudioPlaying()) setPlaying(false);
    }, 500);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = useCallback(() => {
    if (!audioRule || audioRule.kind !== "audio_prompt") return;
    if (playing) {
      stopMissionAudio();
      setPlaying(false);
    } else {
      playMissionAudio(audioRule.audioFile);
      setPlaying(true);
    }
  }, [audioRule, playing]);

  if (!audioRule || audioRule.kind !== "audio_prompt") return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
        playing
          ? "border-amber-500/60 bg-amber-950/40 text-amber-200 hover:bg-amber-950/60"
          : "border-gray-600 bg-[var(--color-bomb-surface)] text-gray-300 hover:bg-gray-700"
      }`}
    >
      <span className="text-base">{playing ? "\u23F8" : "\u25B6"}</span>
      <span>Mission Audio</span>
    </button>
  );
}
