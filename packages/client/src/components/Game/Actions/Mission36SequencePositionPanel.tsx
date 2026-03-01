import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission36SequencePositionPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission36SequencePosition") return null;
  if (forced.captainId !== playerId) return null;

  const visibleCards = gameState.campaign?.numberCards?.visible ?? [];
  const leftValue = visibleCards[0]?.value;
  const rightValue = visibleCards[visibleCards.length - 1]?.value;
  const reasonText =
    forced.reason === "initial"
      ? "Choose the starting edge before the first cut."
      : "Choose the next active edge after completing the previous value.";

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission36-sequence-position-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>Mission 36 - Choose Active Edge</div>
      <p className={PANEL_FORCED_TEXT_CLASS}>{reasonText}</p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Left: {typeof leftValue === "number" ? leftValue : "?"} | Right:{" "}
        {typeof rightValue === "number" ? rightValue : "?"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send({ type: "mission36SequencePosition", side: "left" })}
          className={BUTTON_FORCED_PRIMARY_CLASS}
          data-testid="mission36-sequence-position-left"
        >
          Active Left
        </button>
        <button
          type="button"
          onClick={() => send({ type: "mission36SequencePosition", side: "right" })}
          className={BUTTON_FORCED_PRIMARY_CLASS}
          data-testid="mission36-sequence-position-right"
        >
          Active Right
        </button>
      </div>
    </div>
  );
}
