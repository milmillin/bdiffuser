import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_FORCED_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_FORCED_CLASS,
  PANEL_FORCED_SUBTEXT_CLASS,
  PANEL_FORCED_TEXT_CLASS,
  PANEL_FORCED_TITLE_CLASS,
} from "./panelStyles.js";

function getTokenLabel(value: number): string {
  return value === 0 ? "YELLOW" : String(value);
}

export function getMission27DraftMatchingIndices(
  hand: ClientGameState["players"][number]["hand"],
  value: number,
): number[] {
  const isYellow = value === 0;
  return hand
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => {
      if (tile.cut) return false;
      if (isYellow) return tile.color === "yellow";
      return typeof tile.gameValue === "number" && tile.gameValue === value;
    })
    .map(({ index }) => index);
}

export function Mission27TokenDraftPanel({
  gameState,
  send,
  playerId,
  selectedValue,
  selectedTileIndex,
  onSelectedValueChange,
  onSelectedTileIndexChange,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  selectedValue: number | null;
  selectedTileIndex: number | null;
  onSelectedValueChange: (value: number | null) => void;
  onSelectedTileIndexChange: (value: number | null) => void;
}) {
  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "mission27TokenDraft") return null;
  if (forced.currentChooserId !== playerId) return null;
  const me = gameState.players.find((player) => player.id === playerId);
  if (!me) return null;
  const totalSteps = Math.max(1, forced.draftOrder.length);
  const currentStep = Math.max(1, Math.min(totalSteps, forced.completedCount + 1));

  const board = gameState.campaign?.mission27TokenDraftBoard;
  const boardValues: number[] = [];
  if (board) {
    for (let i = 0; i < board.yellowTokens; i++) {
      boardValues.push(0);
    }
    boardValues.push(...board.numericTokens);
  }

  const sortedValues = boardValues.sort((a, b) => a - b);
  const hasSelectedValue =
    selectedValue != null && sortedValues.includes(selectedValue);
  const selectedMatches = hasSelectedValue
    ? getMission27DraftMatchingIndices(me.hand, selectedValue)
    : [];
  const requiresPlacementChoice = selectedMatches.length >= 2;
  const canConfirmPlacement =
    requiresPlacementChoice &&
    selectedTileIndex != null &&
    selectedMatches.includes(selectedTileIndex);

  if (sortedValues.length === 0) {
    return (
      <div
        className={PANEL_FORCED_CLASS}
        data-testid="mission27-token-draft-panel"
      >
        <div className={PANEL_FORCED_TITLE_CLASS}>
          Mission 27 — Draft a Token
        </div>
        <p className={PANEL_FORCED_SUBTEXT_CLASS}>
          Step {currentStep}/{totalSteps}
        </p>
        <p className={PANEL_FORCED_TEXT_CLASS}>
          No token is currently available in the draft line.
        </p>
      </div>
    );
  }

  return (
    <div
      className={PANEL_FORCED_CLASS}
      data-testid="mission27-token-draft-panel"
    >
      <div className={PANEL_FORCED_TITLE_CLASS}>
        Mission 27 — Draft a Token
      </div>
      <p className={PANEL_FORCED_SUBTEXT_CLASS}>
        Step {currentStep}/{totalSteps}
      </p>
      {!requiresPlacementChoice && (
        <>
          <p className={PANEL_FORCED_TEXT_CLASS}>
            Choose one token from the draft line.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {sortedValues.map((value, index) => (
              <button
                key={`${value}-${index}`}
                type="button"
                onClick={() => {
                  const matches = getMission27DraftMatchingIndices(me.hand, value);
                  if (matches.length >= 2) {
                    onSelectedValueChange(value);
                    onSelectedTileIndexChange(null);
                    return;
                  }
                  send({ type: "mission27TokenDraftChoice", value });
                }}
                data-testid={`mission27-token-${value}`}
                className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                  value === 0
                    ? "bg-yellow-600 hover:bg-yellow-500 text-black"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {getTokenLabel(value)}
              </button>
            ))}
          </div>
        </>
      )}
      {requiresPlacementChoice && hasSelectedValue && (
        <>
          <p className={PANEL_FORCED_TEXT_CLASS}>
            You selected token{" "}
            <span className="font-bold text-red-100">{getTokenLabel(selectedValue)}</span>. Click one
            matching wire on your stand below, then confirm.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canConfirmPlacement}
              onClick={() => {
                if (!canConfirmPlacement) return;
                send({
                  type: "mission27TokenDraftChoice",
                  value: selectedValue,
                  tileIndex: selectedTileIndex,
                });
              }}
              data-testid="mission27-token-placement-confirm"
              className={BUTTON_FORCED_PRIMARY_CLASS}
            >
              Confirm Placement
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectedValueChange(null);
                onSelectedTileIndexChange(null);
              }}
              data-testid="mission27-token-placement-back"
              className={BUTTON_SECONDARY_CLASS}
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
