import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";

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

  const recipientIndex = (forced.currentChooserIndex + 1) % gameState.players.length;
  const recipient = gameState.players[recipientIndex];
  const recipientName =
    recipient?.id === playerId ? "yourself" : (recipient?.name ?? "the next player");

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="mission22-token-pass-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        Mission 22 — Pass a Token
      </div>
      <p className="text-sm text-gray-400">
        Choose a token value to pass to <span className="text-gray-200 font-semibold">{recipientName}</span>.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: 13 }, (_, value) => (
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
