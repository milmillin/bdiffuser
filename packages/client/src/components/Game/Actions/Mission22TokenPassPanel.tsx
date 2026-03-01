import {
  INFO_TOKEN_VALUES,
  TOTAL_INFO_TOKENS,
  YELLOW_INFO_TOKENS,
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

  const boardValues = new Set<number>();
  const numericTokenCopiesPerValue =
    (TOTAL_INFO_TOKENS - YELLOW_INFO_TOKENS) / INFO_TOKEN_VALUES.length;
  const board = gameState.campaign?.mission22TokenPassBoard;
  if (board) {
    if (board.yellowTokens > 0) {
      boardValues.add(0);
    }
    for (const value of board.numericTokens) {
      boardValues.add(value);
    }
  } else {
    const usedNumericCounts = new Map<number, number>();
    let usedYellowTokens = 0;

    for (const player of gameState.players) {
      for (const token of player.infoTokens) {
        if (token.isYellow) {
          usedYellowTokens += 1;
          continue;
        }

        if (!Number.isInteger(token.value) || token.value < 1 || token.value > 12) {
          continue;
        }

        usedNumericCounts.set(
          token.value,
          (usedNumericCounts.get(token.value) ?? 0) + 1,
        );
      }
    }

    for (const value of INFO_TOKEN_VALUES) {
      if ((usedNumericCounts.get(value) ?? 0) < numericTokenCopiesPerValue) {
        boardValues.add(value);
      }
    }

    if (usedYellowTokens < YELLOW_INFO_TOKENS) {
      boardValues.add(0);
    }
  }

  const sortedValues = Array.from(boardValues).sort((a, b) => a - b);
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
