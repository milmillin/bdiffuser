import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";

export function ChooseNextPlayerPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const playersWithTiles = gameState.players.filter(
    (p) => p.hand.some((t) => !t.cut),
  );
  const restrictedRepeatPlayerId =
    gameState.mission === 10 &&
    gameState.players.length > 2 &&
    gameState.pendingForcedAction?.kind === "chooseNextPlayer"
      ? gameState.pendingForcedAction.lastPlayerId
      : undefined;
  const hasAlternative =
    restrictedRepeatPlayerId != null &&
    playersWithTiles.some((p) => p.id !== restrictedRepeatPlayerId);
  const eligiblePlayers = hasAlternative
    ? playersWithTiles.filter((p) => p.id !== restrictedRepeatPlayerId)
    : playersWithTiles;

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="choose-next-player-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        Captain — Choose Who Acts Next
      </div>
      <p className="text-sm text-gray-400">
        Select which player takes the next turn.
      </p>
      {hasAlternative && (
        <p className="text-xs text-amber-300">
          In mission 10 (3+ players), the same player cannot act twice in a row.
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {eligiblePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => send({ type: "chooseNextPlayer", targetPlayerId: p.id })}
            data-testid={`choose-player-${p.id}`}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm transition-colors"
          >
            {p.name}
          </button>
        ))}
        {eligiblePlayers.length === 0 && (
          <span className="text-sm text-gray-500">No eligible players</span>
        )}
      </div>
    </div>
  );
}
