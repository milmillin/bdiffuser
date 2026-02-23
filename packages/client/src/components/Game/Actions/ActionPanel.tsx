import { useState } from "react";
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

  const [selectedSoloValue, setSelectedSoloValue] = useState<number | "YELLOW" | null>(null);

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
          <div className="flex items-center gap-2 flex-wrap">
            {soloValues.map((v) => (
              <button
                key={String(v)}
                onClick={() => setSelectedSoloValue(selectedSoloValue === v ? null : v)}
                data-testid={`solo-cut-${String(v).toLowerCase()}`}
                className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                  selectedSoloValue === v
                    ? "bg-yellow-500 text-black"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {String(v)}
              </button>
            ))}
            {selectedSoloValue != null && (
              <button
                onClick={() => {
                  send({ type: "soloCut", value: selectedSoloValue });
                  setSelectedSoloValue(null);
                }}
                data-testid="solo-cut-submit"
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded font-bold text-sm transition-colors"
              >
                Solo Cut! ({String(selectedSoloValue)})
              </button>
            )}
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
    if (tile.gameValue == null || tile.gameValue === "RED") continue;
    const key = String(tile.gameValue);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  for (const [key, myCount] of valueCounts) {
    const value = key === "YELLOW" ? "YELLOW" : Number(key);

    if (typeof value === "number") {
      // Blue wire: 4 copies total in the game.
      // Remaining = 4 - already cut (from validation track).
      // Solo cut requires all remaining copies to be in my hand.
      const alreadyCut = state.board.validationTrack[value] ?? 0;
      const remaining = 4 - alreadyCut;
      if (myCount >= remaining && remaining > 0) {
        values.push(value);
      }
    } else {
      // Yellow: count total uncut yellow across all players.
      // We can see our own + cut tiles on opponents.
      // Any opponent uncut tile is hidden, so if opponents have any
      // uncut tiles that could be yellow, we can't be sure.
      // Only offer if no opponents have any uncut tiles at all,
      // or let server validate. For safety, check if opponents
      // have any uncut tiles with unknown values.
      const opponentsHaveUncut = state.players.some(
        (p) => p.id !== playerId && p.hand.some((t) => !t.cut && t.gameValue == null),
      );
      if (!opponentsHaveUncut && myCount >= 1) {
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
