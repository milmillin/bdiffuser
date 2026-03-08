import { useMemo, useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission65CardHandoffPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission65CardHandoff") return null;
  if (forced.actorId !== playerId) return null;

  const actorCards = gameState.campaign?.numberCards?.playerHands?.[playerId] ?? [];
  const recipients = useMemo(
    () =>
      gameState.players.filter(
        (player) => player.id !== playerId && player.remainingTiles > 0,
      ),
    [gameState.players, playerId],
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(actorCards[0]?.id ?? null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    recipients[0]?.id ?? null,
  );

  const canConfirm =
    selectedCardId != null &&
    selectedRecipientId != null &&
    actorCards.some((card) => card.id === selectedCardId) &&
    recipients.some((player) => player.id === selectedRecipientId);

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission65-card-handoff-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>Mission 65 — Hand Off a Number Card</div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        Choose one of your Number cards and give it to a teammate with wires left.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Facedown completed cards can still be handed off.
      </p>

      <div className="space-y-1.5">
        <div className={PANEL_FORCED_SUBTEXT_CLASS}>Your Number cards</div>
        <div className="flex flex-wrap gap-2">
          {actorCards.map((card) => {
            const selected = selectedCardId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
                className={`${BUTTON_FORCED_PRIMARY_CLASS} ${
                  selected ? "ring-2 ring-red-300" : ""
                }`}
                data-testid={`mission65-card-${card.id}`}
              >
                {card.value}
                {card.faceUp ? "" : " (facedown)"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className={PANEL_FORCED_SUBTEXT_CLASS}>Recipient</div>
        <div className="flex flex-wrap gap-2">
          {recipients.map((player) => {
            const selected = selectedRecipientId === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedRecipientId(player.id)}
                className={`${BUTTON_FORCED_PRIMARY_CLASS} ${
                  selected ? "ring-2 ring-red-300" : ""
                }`}
                data-testid={`mission65-recipient-${player.id}`}
              >
                {player.name}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => {
          if (!selectedCardId || !selectedRecipientId) return;
          send({
            type: "mission65CardHandoff",
            cardId: selectedCardId,
            recipientPlayerId: selectedRecipientId,
          });
        }}
        className={BUTTON_FORCED_PRIMARY_CLASS}
        data-testid="mission65-card-handoff-confirm"
      >
        Give Card
      </button>
    </div>
  );
}
