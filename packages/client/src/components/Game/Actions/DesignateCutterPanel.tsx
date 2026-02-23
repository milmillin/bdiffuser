import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";

export function DesignateCutterPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "designateCutter") return null;

  const playersWithTiles = gameState.players.filter(
    (p) => p.hand.some((t) => !t.cut),
  );

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="designate-cutter-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        Designate Who Cuts
      </div>
      <div className="text-sm text-gray-300 space-y-1">
        <p>
          Number card drawn:{" "}
          <span className="font-bold text-white text-base">{forced.value}</span>
        </p>
        <p className="text-xs text-gray-400">
          General Radar results for value {forced.value}:
        </p>
        <div className="flex flex-wrap gap-2">
          {gameState.players.map((p) => {
            const hasWire = forced.radarResults[p.id];
            return (
              <span
                key={p.id}
                className={`text-xs px-2 py-0.5 rounded ${
                  hasWire
                    ? "bg-green-800/50 text-green-300"
                    : "bg-red-900/50 text-red-300"
                }`}
              >
                {p.id === playerId ? "You" : p.name}:{" "}
                {hasWire ? "YES" : "NO"}
              </span>
            );
          })}
        </div>
      </div>
      <p className="text-sm text-gray-400">
        Choose which player must cut a wire (including yourself).
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {playersWithTiles.map((p) => (
          <button
            key={p.id}
            onClick={() => send({ type: "designateCutter", targetPlayerId: p.id })}
            data-testid={`designate-player-${p.id}`}
            className={`px-4 py-1.5 rounded font-bold text-sm transition-colors ${
              forced.radarResults[p.id]
                ? "bg-green-700 hover:bg-green-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {p.id === playerId ? "Myself" : p.name}
            {forced.radarResults[p.id] && (
              <span className="ml-1 text-xs opacity-75">(has {forced.value})</span>
            )}
          </button>
        ))}
        {playersWithTiles.length === 0 && (
          <span className="text-sm text-gray-500">No eligible players</span>
        )}
      </div>
    </div>
  );
}
