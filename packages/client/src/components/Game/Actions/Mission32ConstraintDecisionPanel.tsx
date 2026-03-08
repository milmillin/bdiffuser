import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission32ConstraintDecisionPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission32ConstraintDecision") return null;
  if (forced.captainId !== playerId) return null;

  const actor = gameState.players.find((player) => player.id === forced.actorId);
  const keepSelected = forced.decision === "keep";
  const replaceSelected = forced.decision === "replace";

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission32-constraint-decision-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>Mission 32 — Visible Constraint</div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        Choose whether to keep or replace the visible constraint for{" "}
        <span className="font-bold">{actor?.name ?? "the active player"}</span>.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Current decision: {keepSelected ? "keep the current constraint" : "replace the constraint"}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send({ type: "mission32ConstraintDecision", decision: "keep" })}
          className={`${BUTTON_FORCED_PRIMARY_CLASS} ${keepSelected ? "ring-2 ring-red-300" : ""}`}
          data-testid="mission32-constraint-keep"
        >
          Keep Constraint
        </button>
        <button
          type="button"
          onClick={() => send({ type: "mission32ConstraintDecision", decision: "replace" })}
          className={`${BUTTON_FORCED_PRIMARY_CLASS} ${replaceSelected ? "ring-2 ring-red-300" : ""}`}
          data-testid="mission32-constraint-replace"
        >
          Replace Constraint
        </button>
      </div>
    </div>
  );
}
