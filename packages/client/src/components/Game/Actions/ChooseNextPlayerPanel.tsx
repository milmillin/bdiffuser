import { useState } from "react";
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playersWithTiles = gameState.players.filter(
    (p) => p.hand.some((t) => !t.cut),
  );
  const restrictedRepeatPlayerId =
    gameState.mission === 10 &&
    gameState.players.length > 2 &&
    gameState.pendingForcedAction?.kind === "chooseNextPlayer"
      ? gameState.pendingForcedAction.lastPlayerId
      : undefined;
  const previousPlayerName = restrictedRepeatPlayerId
    ? gameState.players.find((p) => p.id === restrictedRepeatPlayerId)?.name
    : undefined;
  const hasAlternative =
    restrictedRepeatPlayerId != null &&
    playersWithTiles.some((p) => p.id !== restrictedRepeatPlayerId);
  const eligiblePlayers = hasAlternative
    ? playersWithTiles.filter((p) => p.id !== restrictedRepeatPlayerId)
    : playersWithTiles;

  const canConfirm =
    selectedPlayerId != null &&
    eligiblePlayers.some((p) => p.id === selectedPlayerId);

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
      {previousPlayerName && (
        <p className="text-xs text-gray-500">
          Previous player: <span className="text-gray-300 font-semibold">{previousPlayerName}</span>
        </p>
      )}
      {hasAlternative && (
        <p className="text-xs text-amber-300">
          In mission 10 (3+ players), the same player cannot act twice in a row.
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {eligiblePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayerId(p.id)}
            data-testid={`choose-player-${p.id}`}
            className={`px-4 py-1.5 rounded font-bold text-sm transition-colors ${
              selectedPlayerId === p.id
                ? "bg-blue-500 ring-2 ring-blue-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {p.name}
          </button>
        ))}
        {eligiblePlayers.length === 0 && (
          <span className="text-sm text-gray-500">No eligible players</span>
        )}
      </div>
      {selectedPlayerId != null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPlayerId(null)}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                send({ type: "chooseNextPlayer", targetPlayerId: selectedPlayerId });
              }
            }}
            data-testid="choose-player-confirm"
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
