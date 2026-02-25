import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  wireLabel,
  hasXMarkedWireTalkiesRestriction,
} from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

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
  const hasXWireEquipmentRestriction = hasXMarkedWireTalkiesRestriction(gameState.mission);

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
      className={PANEL_CLASS}
      data-testid="talkies-walkies-choice-panel"
    >
      <div className={PANEL_TITLE_CLASS}>
        Choose Your Wire to Swap
      </div>
      <div className={PANEL_TEXT_CLASS}>
        <p>
          {actorName} used <span className="text-indigo-400">Talkies-Walkies</span>{" "}
          and selected wire <span className="font-bold text-slate-100">{wireLabel(forced.actorTileIndex)}</span>.
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
          className={BUTTON_PRIMARY_CLASS}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
