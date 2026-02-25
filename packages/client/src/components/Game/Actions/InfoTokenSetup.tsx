import type { ClientMessage, ClientPlayer } from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
} from "./panelStyles.js";

function getFalseTokenValueOptions(
  tile: ClientPlayer["hand"][number] | undefined,
  allowMissingValue = false,
): number[] {
  const values: number[] = [];
  if (allowMissingValue) {
    values.push(0);
  }
  for (let value = 1; value <= 12; value++) {
    if (
      tile?.color === "blue" &&
      typeof tile.gameValue === "number" &&
      tile.gameValue === value
    ) {
      continue;
    }
    values.push(value);
  }
  return values;
}

export function InfoTokenSetup({
  player,
  selectedTileIndex,
  selectedTokenValue,
  requiresToken,
  totalTokens,
  useFalseTokenMode,
  requiresTileTarget,
  send,
  onPlaced,
  onSelectedTokenValueChange,
}: {
  player: ClientPlayer;
  selectedTileIndex: number | null;
  selectedTokenValue: number | null;
  requiresToken: boolean;
  totalTokens: number;
  useFalseTokenMode: boolean;
  requiresTileTarget: boolean;
  send: (msg: ClientMessage) => void;
  onPlaced: () => void;
  onSelectedTokenValueChange: (value: number) => void;
}) {
  const selectedTile =
    selectedTileIndex == null ? undefined : player.hand[selectedTileIndex];
  const falseTokenOptions = useFalseTokenMode
    ? getFalseTokenValueOptions(selectedTile, !requiresTileTarget)
    : [];
  const effectiveFalseTokenValue =
    selectedTokenValue != null && falseTokenOptions.includes(selectedTokenValue)
      ? selectedTokenValue
      : (falseTokenOptions[0] ?? null);

  if (!requiresToken) {
    return (
      <div className={`${PANEL_CLASS} border-l-2 border-l-yellow-500/40`}>
        <div className="font-bold uppercase tracking-wide text-yellow-200">
          Info Token Setup
        </div>
        <div className={PANEL_SUBTEXT_CLASS}>
          Mission rule: you do not place an info token.
        </div>
      </div>
    );
  }

  const handlePlace = () => {
    if (
      requiresTileTarget &&
      (selectedTileIndex == null || !selectedTile || selectedTile.cut)
    ) return;
    let value: number | null = null;
    if (useFalseTokenMode) {
      value = effectiveFalseTokenValue;
    } else if (
      selectedTile != null &&
      selectedTile.color === "blue" &&
      typeof selectedTile.gameValue === "number"
    ) {
      value = selectedTile.gameValue;
    }
    if (value == null) return;
    send({
      type: "placeInfoToken",
      value,
      tileIndex: requiresTileTarget ? (selectedTileIndex as number) : -1,
    });
    onPlaced();
  };

  return (
    <div className={`${PANEL_CLASS} border-l-2 border-l-yellow-500/40`}>
      <div className="font-bold uppercase tracking-wide text-yellow-200">
        Place Info Token{totalTokens > 1 ? ` (${player.infoTokens.length + 1}/${totalTokens})` : ""}
      </div>
      <div className={PANEL_TEXT_CLASS}>
        {useFalseTokenMode
          ? requiresTileTarget
            ? "Select an allowed wire tile on your stand to place a false info token."
            : "Choose a value that is not in your hand, then place it beside your stand."
          : "Select a blue wire tile on your stand to place an info token."}
      </div>
      {(requiresTileTarget ? selectedTileIndex != null : true) && (
        <div className="flex items-center gap-2">
          {useFalseTokenMode && (
            <>
              <span className={PANEL_SUBTEXT_CLASS}>False value:</span>
              <select
                value={effectiveFalseTokenValue ?? ""}
                onChange={(event) =>
                  onSelectedTokenValueChange(Number.parseInt(event.target.value, 10))
                }
                className="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-white"
              >
                {falseTokenOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            onClick={handlePlace}
            className={BUTTON_PRIMARY_CLASS}
          >
            {useFalseTokenMode
              ? `Place (${effectiveFalseTokenValue ?? "?"})`
              : `Place (${selectedTile?.gameValue ?? "?"})`}
          </button>
        </div>
      )}
    </div>
  );
}
