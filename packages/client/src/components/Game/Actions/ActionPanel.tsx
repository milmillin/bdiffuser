import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";

export function ActionPanel({
  gameState,
  send,
  playerId,
  selectedTarget,
  selectedGuessTile,
  onClearTarget,
  onCutConfirmed,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  selectedTarget: { playerId: string; tileIndex: number } | null;
  selectedGuessTile: number | null;
  onClearTarget: () => void;
  onCutConfirmed: () => void;
}) {
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  // Check if solo cut is available (all remaining copies in my hand)
  const soloValues = getSoloCutValues(gameState, playerId);

  // Check if reveal reds is available
  const canRevealReds = checkCanRevealReds(gameState, playerId);

  const guessValue = selectedGuessTile != null ? me.hand[selectedGuessTile]?.gameValue : null;

  const handleDualCut = () => {
    if (!selectedTarget || guessValue == null) return;
    send({
      type: "dualCut",
      targetPlayerId: selectedTarget.playerId,
      targetTileIndex: selectedTarget.tileIndex,
      guessValue: guessValue as number | "YELLOW",
    });
    onCutConfirmed();
  };

  return (
    <div className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3" data-testid="action-panel">
      <div className="text-sm font-bold text-yellow-400">Your Turn - Choose an Action</div>

      {/* Dual Cut */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-400 uppercase">Dual Cut</div>
        {!selectedTarget ? (
          <p className="text-sm text-gray-400">
            Click a wire on an opponent's stand to target it
          </p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-300" data-testid="dual-cut-target">
              Targeting {gameState.players.find((p) => p.id === selectedTarget.playerId)?.name}'s wire {wireLabel(selectedTarget.tileIndex)}
            </span>
            <button
              onClick={onClearTarget}
              data-testid="dual-cut-cancel"
              className="text-xs text-red-400 hover:text-red-300"
            >
              Cancel
            </button>
            {guessValue != null ? (
              <button
                onClick={handleDualCut}
                data-testid="dual-cut-submit"
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded font-bold text-sm transition-colors"
              >
                Cut! (Guess: {String(guessValue)})
              </button>
            ) : (
              <span className="text-sm text-gray-400">
                — click one of your wires below to guess its value
              </span>
            )}
          </div>
        )}
      </div>

      {/* Solo Cut */}
      {soloValues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase">Solo Cut</div>
          <div className="flex gap-2">
            {soloValues.map((v) => (
              <button
                key={String(v)}
                onClick={() => send({ type: "soloCut", value: v })}
                data-testid={`solo-cut-${String(v).toLowerCase()}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm transition-colors"
              >
                Solo Cut {String(v)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reveal Reds */}
      {canRevealReds && (
        <div>
          <button
            onClick={() => send({ type: "revealReds" })}
            data-testid="reveal-reds"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm transition-colors"
          >
            Reveal All Red Wires
          </button>
        </div>
      )}
    </div>
  );
}

function getSoloCutValues(
  state: ClientGameState,
  playerId: string,
): (number | "YELLOW")[] {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return [];

  const myUncut = me.hand.filter((t) => !t.cut);
  const values: (number | "YELLOW")[] = [];

  // Group my uncut tiles by game value
  const valueCounts = new Map<string, number>();
  for (const tile of myUncut) {
    if (tile.gameValue == null) continue;
    const key = String(tile.gameValue);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of valueCounts) {
    const value = key === "YELLOW" ? "YELLOW" : Number(key);

    if (typeof value === "number") {
      // Blue wire: check if all remaining copies are in my hand (need 2 or 4)
      // Count how many are cut across all players
      let totalInGame = 0;
      for (const p of state.players) {
        for (const tile of p.hand) {
          if (tile.gameValue === value && !tile.cut) {
            totalInGame++;
          }
        }
      }
      // But we can't see opponents' values, so only check if we have pairs
      if ((count === 2 || count === 4) && count === totalInGame) {
        values.push(value);
      }
    } else {
      // Yellow: all remaining yellow must be in my hand
      // We can check if we have all of them since we can see our own
      // We can't see opponents' values — server will validate
      // Just offer it and let server validate
      if (count >= 1) {
        values.push("YELLOW");
      }
    }
  }

  return values;
}

function checkCanRevealReds(
  state: ClientGameState,
  playerId: string,
): boolean {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return false;

  const uncutTiles = me.hand.filter((t) => !t.cut);
  if (uncutTiles.length === 0) return false;

  return uncutTiles.every((t) => t.color === "red");
}
