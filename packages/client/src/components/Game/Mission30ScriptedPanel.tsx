import { useEffect, useMemo, useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { MISSION_30_AUDIO_CLIPS } from "@bomb-busters/shared";
import { getServerSyncedNowMs } from "../../time/serverClock.js";
import {
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
} from "./Actions/panelStyles.js";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getMission30RuleSummary(gameState: ClientGameState): string {
  const mission30 = gameState.campaign?.mission30;
  if (!mission30) return "";

  switch (mission30.phase) {
    case "briefing_locked":
      return "Listen to the briefing. No one may act until the cue ends.";
    case "prologue_free_play":
      return "Standard play is open until the first target round begins.";
    case "round_a1":
    case "round_a2":
    case "round_b1":
    case "round_b2":
    case "round_c1":
    case "round_c2":
      return typeof mission30.currentTargetValue === "number"
        ? `Cut at least 2 wires of value ${mission30.currentTargetValue}.`
        : "Draw the current target number and cut at least 2 of that value.";
    case "mime_intro":
      return "Mime only. Speaking mistakes advance the detonator.";
    case "triple_lock_intro":
    case "triple_lock":
      return "Only the 3 visible values may be cut, and all four copies of each must be completed.";
    case "yellow_sweep":
      return "The active player must cut every remaining yellow wire in one action.";
    case "final_cleanup":
      return "Forget the number cards and cut every remaining non-red wire.";
    case "completed":
      return "Mission complete.";
    case "failed":
      return "Mission failed.";
    default:
      return "";
  }
}

export function Mission30ScriptedPanel({
  gameState,
  send,
  serverClockOffsetMs = 0,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  serverClockOffsetMs?: number;
}) {
  const mission30 = gameState.mission === 30 ? gameState.campaign?.mission30 : null;
  const [nowMs, setNowMs] = useState(() =>
    getServerSyncedNowMs(serverClockOffsetMs),
  );

  useEffect(() => {
    if (!mission30 || gameState.phase === "finished") return;
    setNowMs(getServerSyncedNowMs(serverClockOffsetMs));
    const intervalId = window.setInterval(() => {
      setNowMs(getServerSyncedNowMs(serverClockOffsetMs));
    }, 250);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    gameState.phase,
    mission30?.cueEndsAtMs,
    mission30?.hardDeadlineMs,
    mission30?.visibleDeadlineMs,
    serverClockOffsetMs,
  ]);

  const me = useMemo(
    () => gameState.players.find((player) => player.id === gameState.playerId),
    [gameState.playerId, gameState.players],
  );

  if (!mission30) return null;

  const currentClip =
    MISSION_30_AUDIO_CLIPS[
      mission30.currentClipId as keyof typeof MISSION_30_AUDIO_CLIPS
    ];
  const currentSubtitle =
    currentClip && "subtitle" in currentClip ? currentClip.subtitle : undefined;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const visibleRemainingMs =
    mission30.visibleDeadlineMs == null
      ? null
      : Math.max(0, mission30.visibleDeadlineMs - nowMs);
  const resolving =
    mission30.visibleDeadlineMs != null &&
    visibleRemainingMs === 0 &&
    mission30.hardDeadlineMs != null &&
    nowMs < mission30.hardDeadlineMs;
  const timerText =
    visibleRemainingMs == null ? null : formatCountdown(visibleRemainingMs);
  const displayedValues =
    mission30.visibleTargetValues?.length
      ? mission30.visibleTargetValues
      : typeof mission30.currentTargetValue === "number"
        ? [mission30.currentTargetValue]
        : [];
  const ruleSummary = getMission30RuleSummary(gameState);
  const canTriggerMistake =
    gameState.phase === "playing" &&
    gameState.result == null &&
    !gameState.isSpectator &&
    !!me &&
    !me.isBot &&
    mission30.mimeMode &&
    gameState.board.detonatorPosition < gameState.board.detonatorMax;
  const canPass =
    gameState.phase === "playing" &&
    gameState.result == null &&
    !gameState.isSpectator &&
    !!me &&
    !me.isBot &&
    mission30.phase === "triple_lock" &&
    mission30.mode === "action" &&
    currentPlayer?.id === me.id;
  const canCutRemainingYellows =
    gameState.phase === "playing" &&
    gameState.result == null &&
    !gameState.isSpectator &&
    !!me &&
    !me.isBot &&
    mission30.phase === "yellow_sweep" &&
    mission30.mode === "action" &&
    currentPlayer?.id === me.id;

  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-950/20 px-3 py-3 text-sm text-amber-50"
      data-testid="mission30-scripted-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">
            Mission 30
          </div>
          <div className="mt-1 text-base font-semibold text-amber-100">
            {ruleSummary}
          </div>
          {currentSubtitle && (
            <p className="mt-2 max-w-3xl text-sm leading-5 text-amber-100/85">
              {currentSubtitle}
            </p>
          )}
        </div>
        {timerText && (
          <div className="rounded-md border border-amber-400/40 bg-black/20 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
              Timer
            </div>
            <div
              className="font-mono text-lg font-semibold text-amber-50"
              data-testid="mission30-visible-timer"
            >
              {timerText}
            </div>
            {resolving && (
              <div
                className="text-[11px] uppercase tracking-[0.16em] text-amber-300"
                data-testid="mission30-resolving"
              >
                Resolving...
              </div>
            )}
          </div>
        )}
      </div>

      {(mission30.mimeMode ||
        mission30.yellowCountsRevealed ||
        (mission30.phase === "triple_lock" && mission30.mode === "action")) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {mission30.mimeMode && (
            <span className="rounded-full border border-rose-400/60 bg-rose-950/40 px-2 py-1 text-rose-100">
              Mime Only
            </span>
          )}
          {mission30.phase === "triple_lock" && mission30.mode === "action" && (
            <span className="rounded-full border border-sky-400/60 bg-sky-950/35 px-2 py-1 text-sky-100">
              Only These Values May Be Cut
            </span>
          )}
          {mission30.yellowCountsRevealed && (
            <span className="rounded-full border border-yellow-400/60 bg-yellow-950/30 px-2 py-1 text-yellow-100">
              Yellow Counts Revealed
            </span>
          )}
        </div>
      )}

      {displayedValues.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
            Active Values
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {displayedValues.map((value) => (
              <span
                key={`${mission30.phase}-${value}`}
                className="rounded-md border border-amber-300/40 bg-black/20 px-3 py-2 font-mono text-base font-semibold text-amber-50"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {mission30.yellowCountsRevealed &&
        mission30.publicYellowCountsByPlayerId &&
        Object.keys(mission30.publicYellowCountsByPlayerId).length > 0 && (
          <div className="mt-3 rounded-md border border-yellow-500/30 bg-black/15 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-300/85">
              Remaining Yellow Wires
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-yellow-50/90">
              {gameState.players.map((player) => (
                <span key={player.id}>
                  <span className="font-semibold">{player.name}</span>:{" "}
                  {mission30.publicYellowCountsByPlayerId?.[player.id] ?? 0}
                </span>
              ))}
            </div>
          </div>
        )}

      {mission30.lastYesNoReveal && (
        <div className="mt-3 rounded-md border border-sky-500/35 bg-sky-950/20 px-3 py-2 text-sm text-sky-100">
          {gameState.players.find(
            (player) => player.id === mission30.lastYesNoReveal?.actorId,
          )?.name ?? "Active player"}{" "}
          revealed value {mission30.lastYesNoReveal.value}:{" "}
          <span className="font-semibold">
            {mission30.lastYesNoReveal.hasValue ? "YES" : "NO"}
          </span>
          .
        </div>
      )}

      {(canTriggerMistake || canPass || canCutRemainingYellows) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canTriggerMistake && (
            <button
              type="button"
              onClick={() => send({ type: "mission30ManualDetonatorAdvance" })}
              className={BUTTON_PRIMARY_CLASS}
              data-testid="mission30-manual-advance-button"
            >
              Mistake (+1)
            </button>
          )}
          {canPass && (
            <button
              type="button"
              onClick={() => send({ type: "mission30ManualSkipTurn" })}
              className={BUTTON_SECONDARY_CLASS}
              data-testid="mission30-manual-skip-button"
            >
              Pass
            </button>
          )}
          {canCutRemainingYellows && (
            <button
              type="button"
              onClick={() => send({ type: "mission30CutRemainingYellows" })}
              className={BUTTON_PRIMARY_CLASS}
              data-testid="mission30-yellow-sweep-button"
            >
              Cut Remaining Yellows
            </button>
          )}
        </div>
      )}
    </div>
  );
}
