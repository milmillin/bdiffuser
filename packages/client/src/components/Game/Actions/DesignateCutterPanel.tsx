import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_OPTION_CLASS,
  BUTTON_OPTION_SELECTED_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
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
  if (!forced || forced.kind !== "designateCutter") return null;

  const playersWithTiles = gameState.players.filter(
    (p) => p.hand.some((t) => !t.cut),
  );

  const canConfirm =
    selectedPlayerId != null &&
    playersWithTiles.some((p) => p.id === selectedPlayerId);

  return (
    <div
      className={PANEL_CLASS}
      data-testid="designate-cutter-panel"
    >
      <div className={PANEL_TITLE_CLASS}>
        Designate Who Cuts
      </div>
      <div className={`${PANEL_TEXT_CLASS} space-y-1`}>
        <p>
          Number card drawn:{" "}
          <span className="font-bold text-slate-100 text-base">{forced.value}</span>
        </p>
        <p className={PANEL_SUBTEXT_CLASS}>
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
      </div>
      <p className={PANEL_TEXT_CLASS}>
        Choose which player must cut a wire (including yourself).
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {playersWithTiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayerId(p.id)}
            data-testid={`designate-player-${p.id}`}
            className={`${
              forced.radarResults[p.id]
                ? selectedPlayerId === p.id
                  ? "bg-emerald-600 ring-2 ring-sky-300 px-4 py-1.5 rounded text-xs font-bold transition-colors"
                  : "bg-emerald-700 hover:bg-emerald-600 px-4 py-1.5 rounded text-xs font-bold transition-colors"
                : selectedPlayerId === p.id
                  ? BUTTON_OPTION_SELECTED_CLASS
                  : BUTTON_OPTION_CLASS
            }`}
          >
            {p.id === playerId ? "Myself" : p.name}
            {forced.radarResults[p.id] && (
              <span className="ml-1 text-xs opacity-75">(has {forced.value})</span>
            )}
          </button>
        ))}
        {playersWithTiles.length === 0 && (
          <span className={PANEL_SUBTEXT_CLASS}>No eligible players</span>
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
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
