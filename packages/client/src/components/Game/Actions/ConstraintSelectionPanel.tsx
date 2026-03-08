import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { getConstraintCardDef, getConstraintCardImage } from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_TITLE_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_SUBTEXT_CLASS,
} from "./panelStyles.js";

export function ConstraintSelectionPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selection = gameState.campaign?.constraintSelection;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const availableIds = selection?.availableCardIds ?? [];

  // Show already-selected constraints for other players
  const alreadySelected = gameState.players
    .filter((p) => {
      const cards = gameState.campaign?.constraints?.perPlayer[p.id];
      return cards && cards.length > 0;
    })
    .map((p) => ({
      name: p.name,
      card: gameState.campaign!.constraints!.perPlayer[p.id][0],
    }));

  const selectedDef = selectedId ? getConstraintCardDef(selectedId) : null;

  return (
    <div className={PANEL_CLASS} data-testid="constraint-selection-panel">
      <div className={PANEL_TITLE_CLASS}>Select Your Constraint Card</div>

      {isMyTurn ? (
        <p className={PANEL_TEXT_CLASS}>
          Choose a constraint card that will apply to you for this mission.
        </p>
      ) : (
        <p className={PANEL_TEXT_CLASS}>
          Waiting for <span className="font-semibold text-white">{currentPlayer?.name}</span> to
          select a constraint card...
        </p>
      )}

      {alreadySelected.length > 0 && (
        <div className={PANEL_SUBTEXT_CLASS}>
          Already selected:{" "}
          {alreadySelected
            .map((s) => `${s.name} → ${s.card.name}`)
            .join(", ")}
        </div>
      )}

      {isMyTurn && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
            {availableIds.map((id) => {
              const def = getConstraintCardDef(id);
              const image = getConstraintCardImage(id);
              const isSelected = selectedId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : id)}
                  className={`relative rounded-lg border-2 overflow-hidden transition-all duration-150 ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-400/50 scale-105"
                      : "border-slate-600 hover:border-slate-400"
                  }`}
                  data-testid={`constraint-card-${id}`}
                >
                  <div className="aspect-[739/1040] bg-slate-900">
                    <img
                      src={`/images/${image}`}
                      alt={def?.name ?? id}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="bg-slate-800/90 px-1 py-0.5 text-center">
                    <div className="text-[10px] font-bold text-slate-100 truncate">
                      {def?.name ?? id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDef && (
            <div className="rounded border border-amber-500/40 bg-amber-950/20 px-2 py-1.5 text-xs text-amber-100">
              <span className="font-bold text-amber-200">{selectedDef.name}:</span>{" "}
              {selectedDef.description}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                send({ type: "selectConstraintCard", constraintId: selectedId });
                setSelectedId(null);
              }
            }}
            className={BUTTON_PRIMARY_CLASS}
            data-testid="confirm-constraint-selection"
          >
            Confirm Selection
          </button>
        </>
      )}
    </div>
  );
}
