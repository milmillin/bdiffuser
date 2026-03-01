import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";
import { getMission11BlueAsRedValue } from "./actionRules.js";

type DetectorForcedAction = Extract<
  NonNullable<ClientGameState["pendingForcedAction"]>,
  { kind: "detectorTileChoice" }
>;

export function getDetectorChoiceAvailableMatches(
  forced: DetectorForcedAction,
  hand: ClientGameState["players"][number]["hand"],
): number[] {
  return forced.matchingTileIndices.filter((idx) => {
    const tile = hand[idx];
    return !!tile && !tile.cut && tile.gameValue === forced.guessValue;
  });
}

function isHiddenRedLike(
  tile: ClientGameState["players"][number]["hand"][number],
  mission11BlueAsRedValue: number | null,
) {
  return (
    tile.color === "blue" &&
    mission11BlueAsRedValue != null &&
    typeof tile.gameValue === "number" &&
    tile.gameValue === mission11BlueAsRedValue
  );
}

export function getDetectorChoiceSelectableIndices(
  forced: DetectorForcedAction,
  hand: ClientGameState["players"][number]["hand"],
  mission11BlueAsRedValue: number | null = null,
): number[] {
  const availableMatches = getDetectorChoiceAvailableMatches(forced, hand);
  if (availableMatches.length > 0) return availableMatches;

  if (forced.source === "doubleDetector") {
    const tileIndices = [forced.originalTileIndex1, forced.originalTileIndex2].filter(
      (idx): idx is number => idx != null,
    );
    return tileIndices.filter((idx) => {
      const tile = hand[idx];
      return (
        !!tile &&
        tile.color !== "red" &&
        !isHiddenRedLike(tile, mission11BlueAsRedValue)
      );
    });
  }

  const tileIndices = forced.originalTargetTileIndices ?? [];
  return tileIndices.filter((idx) => {
    const tile = hand[idx];
    return (
      !!tile &&
      tile.color !== "red" &&
      !isHiddenRedLike(tile, mission11BlueAsRedValue) &&
      !tile.cut
    );
  });
}

export function DetectorTileChoicePanel({
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
  if (!forced || forced.kind !== "detectorTileChoice") return null;

  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  const actorName =
    forced.actorId === playerId
      ? "You"
      : (gameState.players.find((p) => p.id === forced.actorId)?.name ?? "Someone");

  const detectorLabel =
    forced.source === "doubleDetector"
      ? "Double Detector"
      : forced.source === "tripleDetector"
      ? "Triple Detector"
      : "Super Detector";

  const availableMatches = getDetectorChoiceAvailableMatches(forced, me.hand);
  const matchCount = availableMatches.length;
  const mission11BlueAsRedValue = getMission11BlueAsRedValue(gameState);
  const selectableIndices = getDetectorChoiceSelectableIndices(
    forced,
    me.hand,
    mission11BlueAsRedValue,
  );
  const autoSelected = selectableIndices.length === 1 ? selectableIndices[0] : null;
  const effectiveSelection = selectedIndex ?? autoSelected;

  // ── 0 matches + double detector: choose info token tile ──
  if (matchCount === 0 && forced.source === "doubleDetector") {
    const canConfirm =
      selectableIndices.length <= 1 ||
      (effectiveSelection != null && selectableIndices.includes(effectiveSelection));

    const selectionHint =
      selectableIndices.length > 1
        ? "Click one of your designated wires on your stand below."
        : selectableIndices.length === 1
          ? `Info token target: wire ${wireLabel(selectableIndices[0])}.`
          : "No selectable non-red wire. Confirm to resolve.";

    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="detector-tile-choice-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Confirm Detector Result
        </div>
        <div className={PANEL_FORCED_TEXT_CLASS}>
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-slate-100">{forced.guessValue}</span>.
            {" "}
            {selectionHint}
            {effectiveSelection != null && (
              <> Selected wire {wireLabel(effectiveSelection)}.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              send({
                type: "detectorTileChoice",
                infoTokenTileIndex: effectiveSelection ?? undefined,
              });
            }}
            data-testid="detector-tile-choice-confirm"
            className={BUTTON_FORCED_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // ── 0 matches + triple/super detector: choose fallback wire ──
  if (matchCount === 0) {
    const canConfirm =
      selectableIndices.length <= 1 ||
      (effectiveSelection != null && selectableIndices.includes(effectiveSelection));

    const selectionHint =
      selectableIndices.length > 1
        ? "Click one of your targeted wires on your stand below."
        : selectableIndices.length === 1
          ? `Fallback wire: ${wireLabel(selectableIndices[0])}.`
          : "No non-red fallback wire available. Confirm to resolve.";

    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="detector-tile-choice-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Confirm Detector Result
        </div>
        <div className={PANEL_FORCED_TEXT_CLASS}>
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-slate-100">{forced.guessValue}</span>.
            {" "}
            {selectionHint}
            {effectiveSelection != null && (
              <> Selected wire {wireLabel(effectiveSelection)}.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              send({
                type: "detectorTileChoice",
                tileIndex: effectiveSelection ?? undefined,
              });
            }}
            data-testid="detector-tile-choice-confirm"
            className={BUTTON_FORCED_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // ── 1 match: auto-selected, just confirm ──
  if (matchCount === 1) {
    const tileIdx = availableMatches[0];
    const tile = me.hand[tileIdx];
    const label = wireLabel(tileIdx);
    const valueDisplay = tile?.gameValue ?? "?";

    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="detector-tile-choice-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Confirm Wire Cut
        </div>
        <div className={PANEL_FORCED_TEXT_CLASS}>
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-slate-100">{forced.guessValue}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="px-4 py-1.5 rounded font-bold bg-blue-500 ring-2 ring-blue-300"
            data-testid={`detector-choice-tile-${tileIdx}`}
          >
            Wire {label} ({String(valueDisplay)})
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              send({ type: "detectorTileChoice", tileIndex: tileIdx });
            }}
            data-testid="detector-tile-choice-confirm"
            className={BUTTON_FORCED_PRIMARY_CLASS}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // ── 2+ matches: choose which tile to cut ──
  const canConfirm =
    effectiveSelection != null &&
    availableMatches.includes(effectiveSelection);

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="detector-tile-choice-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Choose Which Wire to Cut
      </div>
      <div className={PANEL_FORCED_TEXT_CLASS}>
        <p>
          {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
          and guessed{" "}
          <span className="font-bold text-slate-100">{forced.guessValue}</span>.
          {" "}
          Click one of your matching wires on your stand below.
          {effectiveSelection != null && (
            <> Selected wire {wireLabel(effectiveSelection)}.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            if (canConfirm) {
              send({ type: "detectorTileChoice", tileIndex: effectiveSelection ?? undefined });
            }
          }}
          data-testid="detector-tile-choice-confirm"
          className={BUTTON_FORCED_PRIMARY_CLASS}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
