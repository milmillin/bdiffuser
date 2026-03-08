import {
  getAvailableInfoTokenChoiceValues,
  type ClientGameState,
  type ClientMessage,
} from "@bomb-busters/shared";
import {
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

function getTokenLabel(value: number): string {
  return value === 0 ? "YELLOW" : String(value);
}

export function Mission22TokenPassPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission22TokenPass") return null;
  if (forced.currentChooserId !== playerId) return null;
  const totalSteps = Math.max(1, forced.passingOrder.length);
  const currentStep = Math.max(1, Math.min(totalSteps, forced.completedCount + 1));

  const recipientIndex = (forced.currentChooserIndex + 1) % gameState.players.length;
  const recipient = gameState.players[recipientIndex];
  const recipientName =
    recipient?.id === playerId ? "yourself" : (recipient?.name ?? "the next player");

  const board = gameState.campaign?.mission22TokenPassBoard;
  const sortedValues = board
    ? [...new Set([
      ...board.numericTokens,
      ...(board.yellowTokens > 0 ? [0] : []),
    ])].sort((a, b) => a - b)
    : getAvailableInfoTokenChoiceValues(gameState.players);
  if (sortedValues.length === 0) {
    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="mission22-token-pass-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Mission 22 — Pass a Token
        </div>
        <p className={PANEL_FORCED_SUBTEXT_CLASS}>
          Step {currentStep}/{totalSteps}
        </p>
        <p className={PANEL_FORCED_TEXT_CLASS}>
          No token is currently available to pass.
        </p>
      </div>
    );
  }

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission22-token-pass-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 22 — Pass a Token
      </div>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Step {currentStep}/{totalSteps}
      </p>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        Choose a token value to pass to{" "}
        <span className="text-red-100 font-semibold">{recipientName}</span>.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {sortedValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => send({ type: "mission22TokenPassChoice", value })}
            data-testid={`mission22-token-${value}`}
            className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
              value === 0
                ? "bg-yellow-600 hover:bg-yellow-500 text-black"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {getTokenLabel(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
