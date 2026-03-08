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

function getTokenLabel(value: number): string {
  return value === 0 ? "YELLOW" : String(value);
}

export function Mission45PenaltyTokenPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission45PenaltyTokenChoice") return null;
  if (forced.playerId !== playerId) return null;

  const availableValues = getAvailableInfoTokenChoiceValues(gameState.players);
  if (availableValues.length === 0) {
    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="mission45-penalty-token-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Mission 45 - Penalty Token
        </div>
        <p className={PANEL_FORCED_TEXT_CLASS}>
          No stand-side info token remains to place.
        </p>
      </div>
    );
  }

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission45-penalty-token-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 45 - Penalty Token
      </div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        Choose one info token to place beside your stand.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        This resolves the Mission 45 wrong-target penalty and ends the turn.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {availableValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => send({ type: "mission45PenaltyTokenChoice", value })}
            className={BUTTON_FORCED_PRIMARY_CLASS}
            data-testid={`mission45-penalty-token-${value}`}
          >
            {getTokenLabel(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
