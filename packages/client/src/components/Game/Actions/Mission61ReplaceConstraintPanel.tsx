import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission61ReplaceConstraintPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  if (gameState.phase !== "playing") return null;

  const slot = gameState.campaign?.mission61Ring?.slots.find(
    (entry) => entry.kind === "player" && entry.playerId === playerId,
  );
  if (!slot) return null;

  return (
    <div className={PANEL_CLASS} data-testid="mission61-replace-constraint-panel">
      <div className={PANEL_TITLE_CLASS}>Mission 61 — Replace Your Constraint</div>
      <p className={PANEL_TEXT_CLASS}>
        Your current seat card is <span className="font-semibold text-white">{slot.card.name || `Constraint ${slot.card.id}`}</span>.
      </p>
      <p className={PANEL_SUBTEXT_CLASS}>
        You may replace it at any time during play. This advances the detonator by 1 and draws a random constraint from F to L.
      </p>
      <button
        type="button"
        onClick={() => send({ type: "mission61ReplaceOwnConstraint" })}
        className={BUTTON_PRIMARY_CLASS}
        data-testid="mission61-replace-constraint-button"
      >
        Replace My Constraint (+1 detonator)
      </button>
    </div>
  );
}
