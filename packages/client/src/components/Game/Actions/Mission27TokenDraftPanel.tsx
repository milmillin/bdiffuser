import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";

function getTokenLabel(value: number): string {
  return value === 0 ? "YELLOW" : String(value);
}

export function Mission27TokenDraftPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission27TokenDraft") return null;
  if (forced.currentChooserId !== playerId) return null;

  const board = gameState.campaign?.mission27TokenDraftBoard;
  const boardValues = new Set<number>();
  if (board) {
    if (board.yellowTokens > 0) boardValues.add(0);
    for (const value of board.numericTokens) boardValues.add(value);
  }

  const sortedValues = Array.from(boardValues).sort((a, b) => a - b);
  if (sortedValues.length === 0) {
    return (
      <div
        className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
        data-testid="mission27-token-draft-panel"
      >
        <div className="text-sm font-bold text-yellow-400">
          Mission 27 — Draft a Token
        </div>
        <p className="text-sm text-gray-400">
          No token is currently available in the draft line.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="mission27-token-draft-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        Mission 27 — Draft a Token
      </div>
      <p className="text-sm text-gray-400">
        Choose one token from the draft line.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {sortedValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => send({ type: "mission27TokenDraftChoice", value })}
            data-testid={`mission27-token-${value}`}
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
