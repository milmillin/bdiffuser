import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";

export function TalkiesWalkiesChoicePanel({
  gameState,
  send,
  playerId,
  selectedIndex,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  selectedIndex: number | null;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "talkiesWalkiesTileChoice") return null;

  const me = gameState.players.find((player) => player.id === playerId);
  if (!me) return null;

  const actorName =
    forced.actorId === playerId
      ? "You"
      : (gameState.players.find((player) => player.id === forced.actorId)?.name ?? "Someone");
  const hasXWireEquipmentRestriction = gameState.mission === 20 || gameState.mission === 35;

  const selectableIndices = me.hand
    .map((tile, idx) => ({ tile, idx }))
    .filter(({ tile }) => !tile.cut && !(hasXWireEquipmentRestriction && tile.isXMarked))
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
          Click one of your uncut wires on your stand below.
        </p>
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
