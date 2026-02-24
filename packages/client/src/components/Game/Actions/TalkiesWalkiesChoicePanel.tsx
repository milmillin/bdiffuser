import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";

export function TalkiesWalkiesChoicePanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "talkiesWalkiesTileChoice") return null;

  const me = gameState.players.find((player) => player.id === playerId);
  if (!me) return null;

  const actorName =
    forced.actorId === playerId
      ? "You"
      : (gameState.players.find((player) => player.id === forced.actorId)?.name ?? "Someone");

  const selectableIndices = me.hand
    .map((tile, idx) => ({ tile, idx }))
    .filter(({ tile }) => !tile.cut && !(gameState.mission === 20 && tile.isXMarked))
    .map(({ idx }) => idx);

  const autoSelected = selectableIndices.length === 1 ? selectableIndices[0] : null;
  const effectiveSelection = selectedIndex ?? autoSelected;

  const canConfirm =
    effectiveSelection != null && selectableIndices.includes(effectiveSelection);

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="talkies-walkies-choice-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        Choose Your Wire to Swap
      </div>
      <div className="text-sm text-gray-300">
        <p>
          {actorName} used <span className="text-indigo-400">Talkies-Walkies</span>{" "}
          and selected wire <span className="font-bold text-white">{wireLabel(forced.actorTileIndex)}</span>.
          Choose one of your uncut wires.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {selectableIndices.map((tileIdx) => {
          const tile = me.hand[tileIdx];
          const label = wireLabel(tileIdx);
          const valueDisplay = tile?.gameValue ?? "?";
          return (
            <button
              key={tileIdx}
              type="button"
              onClick={() => setSelectedIndex(tileIdx)}
              data-testid={`talkies-choice-tile-${tileIdx}`}
              className={`px-4 py-1.5 rounded font-bold text-sm transition-colors ${
                effectiveSelection === tileIdx
                  ? "bg-indigo-500 ring-2 ring-indigo-300"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              Wire {label} ({String(valueDisplay)})
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            if (canConfirm) {
              send({ type: "talkiesWalkiesChoice", tileIndex: effectiveSelection });
            }
          }}
          data-testid="talkies-choice-confirm"
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
