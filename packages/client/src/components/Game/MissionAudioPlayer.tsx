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
  getMissionAudioOutputPreferences,
  getMissionAudioDurationMs,
  getMissionAudioPositionMs,
  isMissionAudioAutoplayBlocked,
  onMissionAudioAutoplayBlockedChange,
  onMissionAudioEnded,
  retryMissionAudioPlayback,
  setMissionAudioMuted,
  setMissionAudioVolume,
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
  const segmentStartMs = Math.max(0, missionAudio.segmentStartMs ?? 0);
  const segmentEndMs = missionAudio.segmentEndMs;
  if (segmentEndMs != null) {
    if (missionAudio.loopSegment) {
      const lengthMs = Math.max(1, segmentEndMs - segmentStartMs);
      const normalized = Math.max(segmentStartMs, rawPosition);
      return segmentStartMs + ((normalized - segmentStartMs) % lengthMs);
    }
    return Math.max(segmentStartMs, Math.min(Math.max(0, rawPosition), segmentEndMs));
  }

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
  const [volumePercent, setVolumePercent] = useState(() => {
    const preferences = getMissionAudioOutputPreferences();
    return Math.round(preferences.volume * 100);
  });
  const [muted, setMuted] = useState(() => getMissionAudioOutputPreferences().muted);
  const [autoplayBlocked, setAutoplayBlocked] = useState(() =>
    isMissionAudioAutoplayBlocked(),
  );
  const lastSeekSentAtRef = useRef(0);
  const sliderInputRef = useRef<HTMLInputElement | null>(null);
  const sliderDragActiveRef = useRef(false);
  const statusAtDragStartRef = useRef<"playing" | "paused" | null>(null);
  const seekCommitTimeRef = useRef(0);

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
    return onMissionAudioAutoplayBlockedChange((blocked) => {
      setAutoplayBlocked(blocked);
    });
  }, []);

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
    if (Date.now() - seekCommitTimeRef.current < 500) return;
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
    if (missionAudio.transportLocked && (!gameState.isHost || gameState.isSpectator)) {
      return () => {};
    }
    return onMissionAudioEnded(() => {
      if (sliderDragActiveRef.current) return;
      if (Date.now() - seekCommitTimeRef.current < 500) return;
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
  }, [
    gameState.isHost,
    gameState.isSpectator,
    missionAudio?.audioFile,
    missionAudio?.durationMs,
    missionAudio?.transportLocked,
    send,
  ]);

  const sendAudioControl = useCallback(
    (command: "play" | "pause" | "seek", positionMs: number | undefined, forceDurationMs?: number) => {
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
  const transportLocked = missionAudio?.transportLocked === true;
  const canControlSharedTransport =
    !transportLocked || (gameState.isHost && !gameState.isSpectator);
  const segmentStartMs = Math.max(0, missionAudio?.segmentStartMs ?? 0);
  const absoluteDurationMs =
    missionAudio?.durationMs ?? localDurationMs ?? Math.max(canonicalPositionMs, 1);
  const absoluteDisplayPositionMs = Math.min(
    sliderDragMs ?? canonicalPositionMs,
    Math.max(absoluteDurationMs, 1),
  );
  const lockedDurationMs = missionAudio?.segmentEndMs != null
    ? Math.max(1, missionAudio.segmentEndMs - segmentStartMs)
    : Math.max(absoluteDurationMs, 1);
  const sliderMaxMs = transportLocked ? lockedDurationMs : Math.max(absoluteDurationMs, 1);
  const displayPositionMs = transportLocked
    ? Math.min(Math.max(0, absoluteDisplayPositionMs - segmentStartMs), sliderMaxMs)
    : absoluteDisplayPositionMs;

  const parseClampedSliderMs = useCallback(
    (rawValue: string | number): number | null => {
      const nextMs = Number(rawValue);
      if (!Number.isFinite(nextMs)) return null;
      return Math.min(Math.max(0, Math.round(nextMs)), sliderMaxMs);
    },
    [sliderMaxMs],
  );

  const toAbsoluteSliderPositionMs = useCallback(
    (sliderPositionMs: number): number => {
      if (!transportLocked) return sliderPositionMs;
      return Math.min(segmentStartMs + sliderPositionMs, segmentStartMs + sliderMaxMs);
    },
    [segmentStartMs, sliderMaxMs, transportLocked],
  );

  const commitSliderSeek = useCallback(
    (rawValue: string | number) => {
      if (!missionAudio) {
        clearSliderDragState();
        return;
      }
      if (!canControlSharedTransport) {
        clearSliderDragState();
        return;
      }
      const clampedMs = parseClampedSliderMs(rawValue);
      if (clampedMs == null) {
        clearSliderDragState();
        return;
      }
      const absolutePositionMs = toAbsoluteSliderPositionMs(clampedMs);
      syncMissionAudioState(
        {
          ...missionAudio,
          positionMs: absolutePositionMs,
          syncedAtMs: getServerSyncedNowMs(serverClockOffsetMs),
        },
        absolutePositionMs,
      );
      if (statusAtDragStartRef.current === "playing") {
        sendAudioControl("play", absolutePositionMs);
      } else {
        sendAudioControl("seek", absolutePositionMs);
      }
      seekCommitTimeRef.current = Date.now();
      clearSliderDragState();
      lastSeekSentAtRef.current = Date.now();
    },
    [
      clearSliderDragState,
      canControlSharedTransport,
      missionAudio,
      parseClampedSliderMs,
      sendAudioControl,
      serverClockOffsetMs,
      toAbsoluteSliderPositionMs,
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
    if (!missionAudio || !canControlSharedTransport) return;
    const nowMs = getServerSyncedNowMs(serverClockOffsetMs);
    // Prime local playback in direct response to user input to avoid
    // autoplay-policy failures after a page refresh.
    syncMissionAudioState(
      {
        ...missionAudio,
        status: "playing",
        positionMs: absoluteDisplayPositionMs,
        syncedAtMs: nowMs,
      },
      absoluteDisplayPositionMs,
    );
    sendAudioControl("play", absoluteDisplayPositionMs);
  }, [
    absoluteDisplayPositionMs,
    canControlSharedTransport,
    missionAudio,
    sendAudioControl,
    serverClockOffsetMs,
  ]);

  const handlePause = useCallback(() => {
    if (!missionAudio || !canControlSharedTransport) return;
    const currentPositionMs = Math.max(
      absoluteDisplayPositionMs,
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
  }, [
    absoluteDisplayPositionMs,
    canControlSharedTransport,
    missionAudio,
    sendAudioControl,
    serverClockOffsetMs,
  ]);

  const handleSliderDragStart = useCallback(
    (
      _event:
        | MouseEvent<HTMLInputElement>
        | TouchEvent<HTMLInputElement>
        | PointerEvent<HTMLInputElement>,
    ) => {
      if (!canControlSharedTransport) return;
      sliderDragActiveRef.current = true;
      statusAtDragStartRef.current = missionAudio?.status ?? null;
    },
    [canControlSharedTransport, missionAudio?.status],
  );

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!missionAudio || !canControlSharedTransport) return;
      const clampedMs = parseClampedSliderMs(event.target.value);
      if (clampedMs == null) return;
      const absolutePositionMs = toAbsoluteSliderPositionMs(clampedMs);
      if (sliderDragActiveRef.current) {
        setSliderDragMs(absolutePositionMs);
      }

      const nowMs = Date.now();
      if (nowMs - lastSeekSentAtRef.current >= 80) {
        sendAudioControl("seek", absolutePositionMs);
        lastSeekSentAtRef.current = nowMs;
      }
    },
    [
      canControlSharedTransport,
      missionAudio,
      parseClampedSliderMs,
      sendAudioControl,
      toAbsoluteSliderPositionMs,
    ],
  );

  const handleSliderBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!canControlSharedTransport) return;
      commitSliderSeek(event.currentTarget.value);
    },
    [canControlSharedTransport, commitSliderSeek],
  );

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextPercent = Number(event.target.value);
      if (!Number.isFinite(nextPercent)) return;
      const clampedPercent = Math.min(100, Math.max(0, Math.round(nextPercent)));
      setVolumePercent(clampedPercent);
      setMissionAudioVolume(clampedPercent / 100);
      if (muted && clampedPercent > 0) {
        setMuted(false);
        setMissionAudioMuted(false);
      }
    },
    [muted],
  );

  const handleMuteToggle = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setMissionAudioMuted(nextMuted);
  }, [muted]);

  const handleRetryAudio = useCallback(() => {
    void retryMissionAudioPlayback();
  }, []);

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
        disabled={!canControlSharedTransport}
        className={`h-2 w-full accent-amber-400 ${
          canControlSharedTransport ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
        data-testid="mission-audio-slider"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={isPlaying || !canControlSharedTransport}
          className="rounded-md border border-emerald-500/60 bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-200 transition-colors enabled:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="mission-audio-play"
        >
          Play
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isPlaying || !canControlSharedTransport}
          className="rounded-md border border-amber-500/60 bg-amber-950/35 px-2 py-1 text-xs font-semibold text-amber-200 transition-colors enabled:hover:bg-amber-950/55 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="mission-audio-pause"
        >
          Pause
        </button>
      </div>

      {transportLocked && (
        <div
          className="mt-2 rounded-md border border-amber-500/40 bg-amber-950/20 px-2 py-2 text-xs text-amber-100/90"
          data-testid="mission-audio-transport-note"
        >
          {canControlSharedTransport
            ? "Mission 30 playback is shared. Host transport changes affect everyone."
            : "Mission 30 playback is shared. Only the host can play, pause, or seek."}
        </div>
      )}

      {autoplayBlocked && missionAudio.status === "playing" && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-rose-500/40 bg-rose-950/20 px-2 py-2 text-xs text-rose-100/90">
          <span>Audio playback was blocked by the browser on this device.</span>
          <button
            type="button"
            onClick={handleRetryAudio}
            className="rounded-md border border-rose-400/60 bg-rose-900/30 px-2 py-1 font-semibold text-rose-100 transition-colors hover:bg-rose-900/50"
            data-testid="mission-audio-retry"
          >
            Resume Audio
          </button>
        </div>
      )}

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
