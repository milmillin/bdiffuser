import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

const DIRECTION_LABELS: Record<"north" | "south" | "east" | "west", string> = {
  north: "Move North",
  south: "Move South",
  east: "Move East",
  west: "Move West",
};

const ACTIVATION_LABELS: Record<
  "front_key" | "front_skull" | "back_alarm" | "back_detonator",
  string
> = {
  front_key: "Activate Key",
  front_skull: "Activate Skull",
  back_alarm: "Activate Alarm",
  back_detonator: "Activate Detonator",
};

export function Mission66BunkerChoicePanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission66BunkerChoice") return null;
  if (forced.actorId !== playerId) return null;

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission66-bunker-choice-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>Mission 66 — Resolve Bunker Step</div>
      <p className={PANEL_FORCED_TEXT_CLASS}>
        Your successful cut of value {forced.cutValue} triggers a bunker choice.
      </p>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Remaining bunker steps from this cut: {forced.remainingSteps}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {forced.options.map((option, index) => (
          option.kind === "move" ? (
            <button
              key={`mission66-move-${option.direction}-${index}`}
              type="button"
              onClick={() =>
                send({
                  type: "mission66BunkerChoice",
                  choice: { kind: "move", direction: option.direction },
                })}
              className={BUTTON_FORCED_PRIMARY_CLASS}
              data-testid={`mission66-bunker-choice-move-${option.direction}`}
            >
              {DIRECTION_LABELS[option.direction]}
            </button>
          ) : (
            <button
              key={`mission66-activate-${option.target}-${index}`}
              type="button"
              onClick={() =>
                send({
                  type: "mission66BunkerChoice",
                  choice: { kind: "activate", target: option.target },
                })}
              className={BUTTON_FORCED_PRIMARY_CLASS}
              data-testid={`mission66-bunker-choice-activate-${option.target}`}
            >
              {ACTIVATION_LABELS[option.target]}
            </button>
          )
        ))}
      </div>
    </div>
  );
}
