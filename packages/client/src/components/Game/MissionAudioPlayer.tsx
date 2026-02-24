import {
  type ChangeEvent,
  type MouseEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ClientGameState,
  ClientMessage,
  MissionAudioState,
} from "@bomb-busters/shared";
import {
  getMissionAudioDurationMs,
  getMissionAudioPositionMs,
  onMissionAudioEnded,
  stopMissionAudio,
  syncMissionAudioState,
} from "../../audio/audio.js";

function resolveMissionAudioPositionMs(
  missionAudio: MissionAudioState,
  nowMs: number,
): number {
  const elapsedMs =
    missionAudio.status === "playing"
      ? Math.max(0, nowMs - missionAudio.syncedAtMs)
      : 0;
  const rawPosition = missionAudio.positionMs + elapsedMs;
  const clampedMin = Math.max(0, rawPosition);
  if (missionAudio.durationMs == null) return clampedMin;
  return Math.min(clampedMin, missionAudio.durationMs);
}

function formatAudioTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MissionAudioPlayer({
  gameState,
  send,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
}) {
  const missionAudio = gameState.missionAudio;
  const [tickNowMs, setTickNowMs] = useState(() => Date.now());
  const [sliderDragMs, setSliderDragMs] = useState<number | null>(null);
  const [localDurationMs, setLocalDurationMs] = useState<number | undefined>(
    undefined,
  );
  const lastSeekSentAtRef = useRef(0);

  useEffect(() => {
    if (!missionAudio) {
      stopMissionAudio();
      setSliderDragMs(null);
      setLocalDurationMs(undefined);
    }
  }, [missionAudio]);

  useEffect(() => {
    if (!missionAudio) return;
    const intervalId = window.setInterval(() => {
      setTickNowMs(Date.now());
    }, 200);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [missionAudio?.status, missionAudio?.syncedAtMs]);

  const canonicalPositionMs = useMemo(() => {
    if (!missionAudio) return 0;
    return resolveMissionAudioPositionMs(missionAudio, tickNowMs);
  }, [missionAudio, tickNowMs]);

  useEffect(() => {
    if (!missionAudio) return;
    syncMissionAudioState(missionAudio, canonicalPositionMs);
    const durationMs = getMissionAudioDurationMs();
    if (durationMs != null) {
      setLocalDurationMs(durationMs);
    }
  }, [
    missionAudio?.audioFile,
    missionAudio?.status,
    missionAudio?.positionMs,
    missionAudio?.syncedAtMs,
    missionAudio?.durationMs,
    canonicalPositionMs,
  ]);

  useEffect(() => {
    if (!missionAudio) return;
    return onMissionAudioEnded(() => {
      const durationMs =
        getMissionAudioDurationMs() ??
        missionAudio.durationMs ??
        getMissionAudioPositionMs();

      send({
        type: "missionAudioControl",
        command: "pause",
        positionMs: durationMs,
        ...(durationMs != null ? { durationMs } : {}),
      });
    });
  }, [missionAudio?.audioFile, missionAudio?.durationMs, send]);

  const sendAudioControl = useCallback(
    (
      command: "play" | "pause" | "seek",
      positionMs: number | undefined,
      forceDurationMs?: number,
    ) => {
      const durationMs =
        forceDurationMs ??
        getMissionAudioDurationMs() ??
        missionAudio?.durationMs;

      if (command === "seek") {
        if (positionMs == null) return;
        send({
          type: "missionAudioControl",
          command,
          positionMs,
          ...(durationMs != null ? { durationMs } : {}),
        });
        return;
      }

      send({
        type: "missionAudioControl",
        command,
        ...(positionMs != null ? { positionMs } : {}),
        ...(durationMs != null ? { durationMs } : {}),
      });
    },
    [missionAudio?.durationMs, send],
  );

  const isPlaying = missionAudio?.status === "playing";
  const effectiveDurationMs =
    missionAudio?.durationMs ?? localDurationMs ?? Math.max(canonicalPositionMs, 1);
  const sliderMaxMs = Math.max(effectiveDurationMs, 1);
  const displayPositionMs = Math.min(
    sliderDragMs ?? canonicalPositionMs,
    sliderMaxMs,
  );

  const handlePlay = useCallback(() => {
    if (!missionAudio) return;
    sendAudioControl("play", displayPositionMs);
  }, [displayPositionMs, missionAudio, sendAudioControl]);

  const handlePause = useCallback(() => {
    if (!missionAudio) return;
    const currentPositionMs = Math.max(
      displayPositionMs,
      getMissionAudioPositionMs(),
    );
    sendAudioControl("pause", currentPositionMs);
  }, [displayPositionMs, missionAudio, sendAudioControl]);

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const nextMs = Number(event.target.value);
      if (!Number.isFinite(nextMs)) return;
      const clampedMs = Math.min(Math.max(0, Math.round(nextMs)), sliderMaxMs);
      setSliderDragMs(clampedMs);

      const nowMs = Date.now();
      if (nowMs - lastSeekSentAtRef.current >= 80) {
        sendAudioControl("seek", clampedMs);
        lastSeekSentAtRef.current = nowMs;
      }
    },
    [missionAudio, sendAudioControl, sliderMaxMs],
  );

  const handleSliderCommit = useCallback(
    (event: MouseEvent<HTMLInputElement> | TouchEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const target = event.currentTarget;
      const nextMs = Number(target.value);
      if (!Number.isFinite(nextMs)) return;
      const clampedMs = Math.min(Math.max(0, Math.round(nextMs)), sliderMaxMs);
      sendAudioControl("seek", clampedMs);
      setSliderDragMs(null);
      lastSeekSentAtRef.current = Date.now();
    },
    [missionAudio, sendAudioControl, sliderMaxMs],
  );

  if (!missionAudio) return null;

  return (
    <div
      className="rounded-lg border border-gray-600 bg-[var(--color-bomb-surface)] px-3 py-2"
      data-testid="mission-audio-controller"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-300">
        <span className="font-semibold text-gray-200">Mission Audio</span>
        <span className="font-mono text-gray-400">
          {formatAudioTime(displayPositionMs)} / {formatAudioTime(sliderMaxMs)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={sliderMaxMs}
        value={displayPositionMs}
        onChange={handleSliderChange}
        onMouseUp={handleSliderCommit}
        onTouchEnd={handleSliderCommit}
        className="h-2 w-full cursor-pointer accent-amber-400"
        data-testid="mission-audio-slider"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={isPlaying}
          className="rounded-md border border-emerald-500/60 bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-200 transition-colors enabled:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="mission-audio-play"
        >
          Play
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isPlaying}
          className="rounded-md border border-amber-500/60 bg-amber-950/35 px-2 py-1 text-xs font-semibold text-amber-200 transition-colors enabled:hover:bg-amber-950/55 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="mission-audio-pause"
        >
          Pause
        </button>
      </div>
    </div>
  );
}
