import {
  type ChangeEvent,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
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
import { getServerSyncedNowMs } from "../../time/serverClock.js";

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

function resolveMissionAudioVolume(missionAudio: MissionAudioState): number {
  if (typeof missionAudio.volume !== "number" || !Number.isFinite(missionAudio.volume)) {
    return 1;
  }
  return Math.min(1, Math.max(0, missionAudio.volume));
}

function resolveMissionAudioMuted(missionAudio: MissionAudioState): boolean {
  return missionAudio.muted === true;
}

export function MissionAudioPlayer({
  gameState,
  send,
  serverClockOffsetMs = 0,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  serverClockOffsetMs?: number;
}) {
  const missionAudio = gameState.missionAudio;
  const [tickNowMs, setTickNowMs] = useState(() =>
    getServerSyncedNowMs(serverClockOffsetMs),
  );
  const [sliderDragMs, setSliderDragMs] = useState<number | null>(null);
  const [localDurationMs, setLocalDurationMs] = useState<number | undefined>(
    undefined,
  );
  const [volumePercent, setVolumePercent] = useState(() =>
    missionAudio ? Math.round(resolveMissionAudioVolume(missionAudio) * 100) : 100,
  );
  const [muted, setMuted] = useState(() =>
    missionAudio ? resolveMissionAudioMuted(missionAudio) : false,
  );
  const lastSeekSentAtRef = useRef(0);
  const lastVolumeSentAtRef = useRef(0);
  const sliderInputRef = useRef<HTMLInputElement | null>(null);
  const sliderDragActiveRef = useRef(false);
  const statusAtDragStartRef = useRef<"playing" | "paused" | null>(null);

  const clearSliderDragState = useCallback(() => {
    sliderDragActiveRef.current = false;
    statusAtDragStartRef.current = null;
    setSliderDragMs(null);
  }, []);

  useEffect(() => {
    if (!missionAudio) {
      stopMissionAudio();
      clearSliderDragState();
      setLocalDurationMs(undefined);
    }
  }, [clearSliderDragState, missionAudio]);

  useEffect(() => {
    if (!missionAudio) {
      setVolumePercent(100);
      setMuted(false);
      return;
    }
    setVolumePercent(Math.round(resolveMissionAudioVolume(missionAudio) * 100));
    setMuted(resolveMissionAudioMuted(missionAudio));
  }, [missionAudio?.audioFile, missionAudio?.volume, missionAudio?.muted]);

  useEffect(() => {
    if (!missionAudio) return;
    setTickNowMs(getServerSyncedNowMs(serverClockOffsetMs));
    const intervalId = window.setInterval(() => {
      setTickNowMs(getServerSyncedNowMs(serverClockOffsetMs));
    }, 200);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [missionAudio?.status, missionAudio?.syncedAtMs, serverClockOffsetMs]);

  const canonicalPositionMs = useMemo(() => {
    if (!missionAudio) return 0;
    return resolveMissionAudioPositionMs(missionAudio, tickNowMs);
  }, [missionAudio, tickNowMs]);

  useEffect(() => {
    if (!missionAudio) return;
    if (sliderDragActiveRef.current) return;
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
      if (sliderDragActiveRef.current) return;
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
      command: "play" | "pause" | "seek" | "setVolume",
      positionMs: number | undefined,
      forceDurationMs?: number,
      volume?: number,
      mutedValue?: boolean,
    ) => {
      if (command === "setVolume") {
        if (volume == null || !Number.isFinite(volume)) return;
        send({
          type: "missionAudioControl",
          command,
          volume: Math.min(1, Math.max(0, volume)),
          ...(typeof mutedValue === "boolean" ? { muted: mutedValue } : {}),
        });
        return;
      }

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

  const parseClampedSliderMs = useCallback(
    (rawValue: string | number): number | null => {
      const nextMs = Number(rawValue);
      if (!Number.isFinite(nextMs)) return null;
      return Math.min(Math.max(0, Math.round(nextMs)), sliderMaxMs);
    },
    [sliderMaxMs],
  );

  const commitSliderSeek = useCallback(
    (rawValue: string | number) => {
      if (!missionAudio) {
        clearSliderDragState();
        return;
      }
      const clampedMs = parseClampedSliderMs(rawValue);
      if (clampedMs == null) {
        clearSliderDragState();
        return;
      }
      syncMissionAudioState(
        {
          ...missionAudio,
          positionMs: clampedMs,
          syncedAtMs: getServerSyncedNowMs(serverClockOffsetMs),
        },
        clampedMs,
      );
      if (statusAtDragStartRef.current === "playing") {
        sendAudioControl("play", clampedMs);
      } else {
        sendAudioControl("seek", clampedMs);
      }
      clearSliderDragState();
      lastSeekSentAtRef.current = Date.now();
    },
    [
      clearSliderDragState,
      missionAudio,
      parseClampedSliderMs,
      sendAudioControl,
      serverClockOffsetMs,
    ],
  );

  useEffect(() => {
    const handleGlobalSliderRelease = () => {
      if (!sliderDragActiveRef.current) return;
      const sliderValue = sliderInputRef.current?.value;
      if (sliderValue == null) {
        clearSliderDragState();
        return;
      }
      commitSliderSeek(sliderValue);
    };

    const supportsPointerEvents = "PointerEvent" in window;
    if (supportsPointerEvents) {
      window.addEventListener("pointerup", handleGlobalSliderRelease);
      window.addEventListener("pointercancel", handleGlobalSliderRelease);
    } else {
      window.addEventListener("mouseup", handleGlobalSliderRelease);
      window.addEventListener("touchend", handleGlobalSliderRelease);
      window.addEventListener("touchcancel", handleGlobalSliderRelease);
    }

    return () => {
      if (supportsPointerEvents) {
        window.removeEventListener("pointerup", handleGlobalSliderRelease);
        window.removeEventListener("pointercancel", handleGlobalSliderRelease);
      } else {
        window.removeEventListener("mouseup", handleGlobalSliderRelease);
        window.removeEventListener("touchend", handleGlobalSliderRelease);
        window.removeEventListener("touchcancel", handleGlobalSliderRelease);
      }
    };
  }, [clearSliderDragState, commitSliderSeek]);

  const handlePlay = useCallback(() => {
    if (!missionAudio) return;
    const nowMs = getServerSyncedNowMs(serverClockOffsetMs);
    // Prime local playback in direct response to user input to avoid
    // autoplay-policy failures after a page refresh.
    syncMissionAudioState(
      {
        ...missionAudio,
        status: "playing",
        positionMs: displayPositionMs,
        syncedAtMs: nowMs,
      },
      displayPositionMs,
    );
    sendAudioControl("play", displayPositionMs);
  }, [displayPositionMs, missionAudio, sendAudioControl, serverClockOffsetMs]);

  const handlePause = useCallback(() => {
    if (!missionAudio) return;
    const currentPositionMs = Math.max(
      displayPositionMs,
      getMissionAudioPositionMs(),
    );
    syncMissionAudioState(
      {
        ...missionAudio,
        status: "paused",
        positionMs: currentPositionMs,
        syncedAtMs: getServerSyncedNowMs(serverClockOffsetMs),
      },
      currentPositionMs,
    );
    sendAudioControl("pause", currentPositionMs);
  }, [displayPositionMs, missionAudio, sendAudioControl, serverClockOffsetMs]);

  const handleSliderDragStart = useCallback(
    (
      _event:
        | MouseEvent<HTMLInputElement>
        | TouchEvent<HTMLInputElement>
        | PointerEvent<HTMLInputElement>,
    ) => {
      sliderDragActiveRef.current = true;
      statusAtDragStartRef.current = missionAudio?.status ?? null;
    },
    [missionAudio?.status],
  );

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const clampedMs = parseClampedSliderMs(event.target.value);
      if (clampedMs == null) return;
      if (sliderDragActiveRef.current) {
        setSliderDragMs(clampedMs);
      }

      const nowMs = Date.now();
      if (nowMs - lastSeekSentAtRef.current >= 80) {
        sendAudioControl("seek", clampedMs);
        lastSeekSentAtRef.current = nowMs;
      }
    },
    [missionAudio, parseClampedSliderMs, sendAudioControl],
  );

  const handleSliderBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commitSliderSeek(event.currentTarget.value);
    },
    [commitSliderSeek],
  );

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const nextPercent = Number(event.target.value);
      if (!Number.isFinite(nextPercent)) return;
      const clampedPercent = Math.min(100, Math.max(0, Math.round(nextPercent)));
      const nextMuted = muted && clampedPercent > 0 ? false : muted;
      setVolumePercent(clampedPercent);
      if (muted && clampedPercent > 0) {
        setMuted(false);
      }

      const nowMs = Date.now();
      if (nowMs - lastVolumeSentAtRef.current >= 80) {
        sendAudioControl(
          "setVolume",
          undefined,
          undefined,
          clampedPercent / 100,
          nextMuted,
        );
        lastVolumeSentAtRef.current = nowMs;
      }
    },
    [missionAudio, muted, sendAudioControl],
  );

  const handleVolumeCommit = useCallback(
    (event: MouseEvent<HTMLInputElement> | TouchEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const nextPercent = Number(event.currentTarget.value);
      if (!Number.isFinite(nextPercent)) return;
      const clampedPercent = Math.min(100, Math.max(0, Math.round(nextPercent)));
      const nextMuted = muted && clampedPercent > 0 ? false : muted;
      setVolumePercent(clampedPercent);
      if (muted && clampedPercent > 0) {
        setMuted(false);
      }
      sendAudioControl(
        "setVolume",
        undefined,
        undefined,
        clampedPercent / 100,
        nextMuted,
      );
      lastVolumeSentAtRef.current = Date.now();
    },
    [missionAudio, muted, sendAudioControl],
  );

  const handleVolumeBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!missionAudio) return;
      const nextPercent = Number(event.currentTarget.value);
      if (!Number.isFinite(nextPercent)) return;
      const clampedPercent = Math.min(100, Math.max(0, Math.round(nextPercent)));
      const nextMuted = muted && clampedPercent > 0 ? false : muted;
      setVolumePercent(clampedPercent);
      if (muted && clampedPercent > 0) {
        setMuted(false);
      }
      sendAudioControl(
        "setVolume",
        undefined,
        undefined,
        clampedPercent / 100,
        nextMuted,
      );
      lastVolumeSentAtRef.current = Date.now();
    },
    [missionAudio, muted, sendAudioControl],
  );

  const handleMuteToggle = useCallback(() => {
    if (!missionAudio) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    sendAudioControl(
      "setVolume",
      undefined,
      undefined,
      volumePercent / 100,
      nextMuted,
    );
    lastVolumeSentAtRef.current = Date.now();
  }, [missionAudio, muted, sendAudioControl, volumePercent]);

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
        ref={sliderInputRef}
        type="range"
        min={0}
        max={sliderMaxMs}
        value={displayPositionMs}
        onPointerDown={handleSliderDragStart}
        onMouseDown={handleSliderDragStart}
        onTouchStart={handleSliderDragStart}
        onChange={handleSliderChange}
        onBlur={handleSliderBlur}
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

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          Volume
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volumePercent}
          onChange={handleVolumeChange}
          onMouseUp={handleVolumeCommit}
          onTouchEnd={handleVolumeCommit}
          onBlur={handleVolumeBlur}
          className="h-2 w-full cursor-pointer accent-sky-400"
          data-testid="mission-audio-volume-slider"
        />
        <button
          type="button"
          onClick={handleMuteToggle}
          className="rounded-md border border-slate-500/60 bg-slate-900/40 px-2 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-900/60"
          data-testid="mission-audio-mute"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
    </div>
  );
}
