import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission29HiddenNumberCardPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission29HiddenNumberCard") return null;
  if (forced.chooserId !== playerId) return null;

  const actor = gameState.players.find((player) => player.id === forced.actorId);
  const chooserCards = gameState.campaign?.numberCards?.playerHands?.[playerId] ?? [];

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission29-hidden-number-card-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 29 — Hidden Number Card
      </div>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Choose one card for{" "}
        <span className="font-semibold text-red-100">
          {actor?.id === playerId ? "your turn" : (actor?.name ?? "the active player")}
        </span>.
      </p>
      {chooserCards.length === 0 ? (
        <p className={PANEL_FORCED_TEXT_CLASS}>
          You have no Number cards left to play.
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {chooserCards.map((card, index) => (
            <button
              key={`${card.id}-${index}`}
              type="button"
              onClick={() => send({ type: "mission29HiddenNumberCardChoice", cardIndex: index })}
              data-testid={`mission29-hidden-card-${index}`}
              className="px-3 py-1.5 rounded font-bold text-sm transition-colors bg-blue-600 hover:bg-blue-500 text-white"
            >
              Card {index + 1} ({card.value})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
