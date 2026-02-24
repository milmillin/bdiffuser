import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_OPTION_CLASS,
  BUTTON_OPTION_SELECTED_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

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
      className={PANEL_CLASS}
      data-testid="choose-next-player-panel"
    >
      <div className={PANEL_TITLE_CLASS}>
        Captain — Choose Who Acts Next
      </div>
      <p className={PANEL_TEXT_CLASS}>
        Select which player takes the next turn.
      </p>
      {previousPlayerName && (
        <p className={PANEL_SUBTEXT_CLASS}>
          Previous player: <span className="text-slate-200 font-semibold">{previousPlayerName}</span>
        </p>
      )}
      {hasAlternative && (
        <p className={PANEL_TEXT_CLASS}>
          In mission 10 (3+ players), the same player cannot act twice in a row.
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {eligiblePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayerId(p.id)}
            data-testid={`choose-player-${p.id}`}
            className={`${
              selectedPlayerId === p.id
                ? BUTTON_OPTION_SELECTED_CLASS
                : BUTTON_OPTION_CLASS
            }`}
          >
            {p.name}
          </button>
        ))}
        {eligiblePlayers.length === 0 && (
          <span className={PANEL_SUBTEXT_CLASS}>No eligible players</span>
        )}
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
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                send({ type: "chooseNextPlayer", targetPlayerId: selectedPlayerId });
              }
            }}
            data-testid="choose-player-confirm"
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
