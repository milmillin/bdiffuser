import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

function playerHasOnlyRedWires(
  player: ClientGameState["players"][number],
): boolean {
  const uncutTiles = player.hand.filter((tile) => !tile.cut);
  return uncutTiles.length > 0 && uncutTiles.every((tile) => tile.color === "red");
}

export function Mission45VolunteerPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission45VolunteerWindow") return null;

  const me = gameState.players.find((player) => player.id === playerId);
  if (!me) return null;

  const hasUncutWires = me.hand.some((tile) => !tile.cut);
  if (!hasUncutWires && !me.isCaptain) return null;

  const currentValue = gameState.campaign?.mission45Turn?.currentValue;
  const canRevealRedsInstead = playerHasOnlyRedWires(me);

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission45-volunteer-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 45 - Volunteer Window
      </div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        {typeof currentValue === "number"
          ? <>Captain revealed Number card <span className="font-black">{currentValue}</span>.</>
          : "No incomplete Number card remains. Only red-wire reveals can respond to Snip!."}
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        {canRevealRedsInstead
          ? "You only have red wires left, so Snip! takes the Reveal Reds branch."
          : "The first player to say Snip! becomes the cutter for this Number card."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {hasUncutWires && (
          <button
            type="button"
            onClick={() => send({ type: "mission45Snip" })}
            className={BUTTON_FORCED_PRIMARY_CLASS}
            data-testid="mission45-snip-button"
          >
            {canRevealRedsInstead ? "Snip! Reveal Reds" : "Snip!"}
          </button>
        )}
        {me.isCaptain && typeof currentValue === "number" && (
          <button
            type="button"
            onClick={() => send({ type: "mission45StartCaptainFallback" })}
            className={BUTTON_SECONDARY_CLASS}
            data-testid="mission45-captain-fallback-button"
          >
            No volunteer - captain chooses
          </button>
        )}
      </div>
    </div>
  );
}
