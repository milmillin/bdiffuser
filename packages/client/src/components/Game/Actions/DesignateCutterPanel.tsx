import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function DesignateCutterPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const forced = gameState.pendingForcedAction;
  if (
    !forced
    || (forced.kind !== "designateCutter" && forced.kind !== "mission51DesignateCutter")
  ) {
    return null;
  }

  const playersWithTiles = gameState.players.filter(
    (p) => p.hand.some((t) => !t.cut),
  );
  const selectablePlayerIds = new Set(playersWithTiles.map((player) => player.id));

  const canConfirm =
    selectedPlayerId != null &&
    selectablePlayerIds.has(selectedPlayerId);
  const showRadarResults = forced.kind === "designateCutter";
  const title =
    forced.kind === "designateCutter"
      ? "Designate Who Cuts"
      : "Mission 51 - Sir/Ma'am";
  const instructionText =
    forced.kind === "designateCutter"
      ? "Choose which player must cut a wire (including yourself). Players with NO radar match are read-only."
      : "Choose which player must cut this Number value. Mission 51 allows any player with uncut wires, including yourself.";

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="designate-cutter-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        {title}
      </div>
      <div className={`${PANEL_FORCED_TEXT_CLASS} space-y-1`}>
        <p>
          Number card drawn:{" "}
          <span className="font-bold text-red-100 text-base">{forced.value}</span>
        </p>
        {showRadarResults && (
          <>
            <p className={PANEL_FORCED_SUBTEXT_CLASS}>
              General Radar results for value {forced.value}:
            </p>
            <div className="flex flex-wrap gap-2">
              {gameState.players.map((p) => {
                const hasWire = forced.radarResults[p.id];
                return (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-0.5 rounded ${
                      hasWire
                        ? "bg-emerald-900/40 text-emerald-200"
                        : "bg-rose-900/40 text-rose-200"
                    }`}
                  >
                    {p.id === playerId ? "You" : p.name}:{" "}
                    {hasWire ? "YES" : "NO"}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        {instructionText}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {playersWithTiles.map((p) => {
          const hasRadarMatch =
            forced.kind === "designateCutter"
              ? forced.radarResults[p.id] === true
              : true;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!hasRadarMatch}
              onClick={() => {
                if (!hasRadarMatch) return;
                setSelectedPlayerId(p.id);
              }}
              data-testid={`designate-player-${p.id}`}
              className={`${
                hasRadarMatch
                  ? selectedPlayerId === p.id
                    ? "bg-emerald-600 ring-2 ring-sky-300 px-4 py-1.5 rounded text-xs font-bold transition-colors"
                    : "bg-emerald-700 hover:bg-emerald-600 px-4 py-1.5 rounded text-xs font-bold transition-colors"
                  : "bg-gray-800/80 text-gray-400 border border-gray-600 px-4 py-1.5 rounded text-xs font-bold cursor-not-allowed"
              }`}
            >
              {p.id === playerId ? "Myself" : p.name}
              {showRadarResults && hasRadarMatch ? (
                <span className="ml-1 text-xs opacity-75">(has {forced.value})</span>
              ) : showRadarResults ? (
                <span className="ml-1 text-xs opacity-75">(read-only)</span>
              ) : null}
            </button>
          );
        })}
        {playersWithTiles.length === 0 && (
          <span className={PANEL_FORCED_SUBTEXT_CLASS}>No eligible players</span>
        )}
      </div>
      {selectedPlayerId != null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPlayerId(null)}
            className={BUTTON_SECONDARY_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                send({ type: "designateCutter", targetPlayerId: selectedPlayerId });
              }
            }}
            data-testid="designate-cutter-confirm"
            className={BUTTON_FORCED_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
