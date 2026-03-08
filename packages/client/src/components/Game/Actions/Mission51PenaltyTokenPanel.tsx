import {
  getAvailableInfoTokenChoiceValues,
  type ClientGameState,
  type ClientMessage,
} from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission51PenaltyTokenPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission51PenaltyTokenChoice") return null;
  if (forced.targetPlayerId !== playerId) return null;

  const availableValues = getAvailableInfoTokenChoiceValues(gameState.players).filter(
    (value) => value >= 1 && value <= 12,
  );

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission51-penalty-token-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 51 - Penalty Token
      </div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        You were designated for Number {forced.value} but do not have it.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Choose one numeric info token to place beside your stand, then the detonator advances.
      </p>
      {availableValues.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {availableValues.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => send({ type: "mission51PenaltyTokenChoice", value })}
              className={BUTTON_FORCED_PRIMARY_CLASS}
              data-testid={`mission51-penalty-token-${value}`}
            >
              {value}
            </button>
          ))}
        </div>
      ) : (
        <p className={PANEL_FORCED_SUBTEXT_CLASS}>
          No numeric stand-side info token remains.
        </p>
      )}
    </div>
  );
}
