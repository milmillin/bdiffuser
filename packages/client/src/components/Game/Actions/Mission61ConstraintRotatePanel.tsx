import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

export function Mission61ConstraintRotatePanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission61ConstraintRotate") return null;
  if (forced.captainId !== playerId) return null;

  const clockwiseSelected = forced.direction === "clockwise";
  const counterClockwiseSelected = forced.direction === "counter_clockwise";
  const skipSelected = forced.direction === "skip";

  const decisionText = skipSelected
    ? "no rotation this round"
    : clockwiseSelected
      ? "clockwise"
      : "counter-clockwise";

  return (
    <div
      className={PANEL_CLASS}
      data-testid="mission61-constraint-rotate-panel"
    >
      <div className={PANEL_TITLE_CLASS}>Mission 61 — Rotate Constraints</div>
      <p className={PANEL_TEXT_CLASS}>Choose how to rotate the global constraints.</p>
      <p className={PANEL_SUBTEXT_CLASS}>
        Current decision: {decisionText}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send({ type: "mission61ConstraintRotate", direction: "clockwise" })}
          className={`${BUTTON_PRIMARY_CLASS} ${
            clockwiseSelected ? "ring-2 ring-emerald-300" : ""
          }`}
          data-testid="mission61-constraint-rotate-clockwise"
        >
          Rotate Clockwise
        </button>
        <button
          type="button"
          onClick={() =>
            send({ type: "mission61ConstraintRotate", direction: "counter_clockwise" })
          }
          className={`${BUTTON_PRIMARY_CLASS} ${
            counterClockwiseSelected ? "ring-2 ring-emerald-300" : ""
          }`}
          data-testid="mission61-constraint-rotate-counter-clockwise"
        >
          Rotate Counter-Clockwise
        </button>
        <button
          type="button"
          onClick={() => send({ type: "mission61ConstraintRotate", direction: "skip" })}
          className={`${BUTTON_PRIMARY_CLASS} ${
            skipSelected ? "ring-2 ring-emerald-300" : ""
          }`}
          data-testid="mission61-constraint-rotate-skip"
        >
          Do Not Rotate This Round
        </button>
      </div>
    </div>
  );
}
