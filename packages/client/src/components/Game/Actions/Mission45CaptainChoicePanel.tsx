import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  BUTTON_OPTION_CLASS,
  BUTTON_OPTION_SELECTED_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission45CaptainChoicePanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission45CaptainChoice") return null;
  if (forced.captainId !== playerId) return null;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const currentValue = gameState.campaign?.mission45Turn?.currentValue;
  const eligiblePlayers = gameState.players.filter((player) =>
    player.hand.some((tile) => !tile.cut),
  );
  const canConfirm =
    selectedPlayerId != null &&
    eligiblePlayers.some((player) => player.id === selectedPlayerId);

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission45-captain-choice-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 45 - Captain Chooses
      </div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        {typeof currentValue === "number"
          ? <>Nobody took Number card <span className="font-black">{currentValue}</span>. Choose who must cut it.</>
          : "Choose who must act next for Mission 45."}
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        If you choose a player who does not hold the Number card value, the detonator advances and they must place a stand-side info token.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {eligiblePlayers.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setSelectedPlayerId(player.id)}
            data-testid={`mission45-captain-target-${player.id}`}
            className={
              selectedPlayerId === player.id
                ? BUTTON_OPTION_SELECTED_CLASS
                : BUTTON_OPTION_CLASS
            }
          >
            {player.name}
          </button>
        ))}
      </div>
      {selectedPlayerId != null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPlayerId(null)}
            className={BUTTON_SECONDARY_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canConfirm) return;
              send({
                type: "mission45ChooseCaptainTarget",
                targetPlayerId: selectedPlayerId,
              });
            }}
            disabled={!canConfirm}
            data-testid="mission45-captain-confirm"
            className={BUTTON_FORCED_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
