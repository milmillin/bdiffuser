import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { getConstraintCardDef } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

const MISSION34_CONSTRAINT_IDS = ["A", "B", "C", "D", "E"] as const;

export function Mission34GuessPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const me = gameState.players.find((player) => player.id === playerId);
  if (!me || me.character === "double_detector") return null;

  const targetPlayers = gameState.players.filter((player) => player.id !== playerId);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(targetPlayers[0]?.id ?? "");
  const [selectedConstraintId, setSelectedConstraintId] =
    useState<(typeof MISSION34_CONSTRAINT_IDS)[number]>("A");

  const resolvedTargetId = targetPlayers.some((player) => player.id === selectedTargetId)
    ? selectedTargetId
    : (targetPlayers[0]?.id ?? "");

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission34-guess-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>Mission 34 — Guess the Weakest Link</div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        You may spend this turn naming the weakest link and their hidden constraint.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Wrong guess: detonator +1. Correct guess: all hidden character cards are revealed and hidden constraints are discarded.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {targetPlayers.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setSelectedTargetId(player.id)}
            className={`${BUTTON_FORCED_PRIMARY_CLASS} ${resolvedTargetId === player.id ? "ring-2 ring-red-300" : ""}`}
            data-testid={`mission34-target-${player.id}`}
          >
            {player.name}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {MISSION34_CONSTRAINT_IDS.map((constraintId) => {
          const constraint = getConstraintCardDef(constraintId);
          return (
            <button
              key={constraintId}
              type="button"
              onClick={() => setSelectedConstraintId(constraintId)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                selectedConstraintId === constraintId
                  ? "border-red-300 bg-red-900/35 text-red-50"
                  : "border-slate-700 bg-slate-900/35 text-slate-100 hover:border-slate-500"
              }`}
              data-testid={`mission34-constraint-${constraintId}`}
            >
              <div className="font-semibold">
                {constraint?.name ?? `Constraint ${constraintId}`}
              </div>
              <div className="text-xs opacity-90">
                {constraint?.description ?? "Hidden mission constraint"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!resolvedTargetId}
          onClick={() => send({
            type: "mission34GuessWeakestLink",
            targetPlayerId: resolvedTargetId,
            constraintId: selectedConstraintId,
          })}
          className={BUTTON_FORCED_PRIMARY_CLASS}
          data-testid="mission34-submit-guess"
        >
          Submit Guess
        </button>
      </div>
    </div>
  );
}
