import type { ClientMessage, ClientPlayer } from "@bomb-busters/shared";

function getFalseTokenValueOptions(
  tile: ClientPlayer["hand"][number] | undefined,
): number[] {
  const values: number[] = [];
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
  send: (msg: ClientMessage) => void;
  onPlaced: () => void;
  onSelectedTokenValueChange: (value: number) => void;
}) {
  const selectedTile =
    selectedTileIndex == null ? undefined : player.hand[selectedTileIndex];
  const falseTokenOptions = useFalseTokenMode
    ? getFalseTokenValueOptions(selectedTile)
    : [];
  const effectiveFalseTokenValue =
    selectedTokenValue != null && falseTokenOptions.includes(selectedTokenValue)
      ? selectedTokenValue
      : (falseTokenOptions[0] ?? null);

  if (!requiresToken) {
    return (
      <div className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs">
        <div className="font-bold text-blue-300 uppercase tracking-wide">
          Info Token Setup
        </div>
        <div className="text-gray-400">
          Mission rule: you do not place an info token.
        </div>
      </div>
    );
  }

  const handlePlace = () => {
    if (selectedTileIndex == null || !selectedTile || selectedTile.cut) return;
    let value: number | null = null;
    if (useFalseTokenMode) {
      value = effectiveFalseTokenValue;
    } else if (
      selectedTile.color === "blue" &&
      typeof selectedTile.gameValue === "number"
    ) {
      value = selectedTile.gameValue;
    }
    if (value == null) return;
    send({
      type: "placeInfoToken",
      value,
      tileIndex: selectedTileIndex,
    });
    onPlaced();
  };

  return (
    <div className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs space-y-2">
      <div className="font-bold text-blue-300 uppercase tracking-wide">
        Place Info Token{totalTokens > 1 ? ` (${player.infoTokens.length + 1}/${totalTokens})` : ""}
      </div>
      <div className="text-gray-400">
        {useFalseTokenMode
          ? "Select an allowed wire tile on your stand to place a false info token."
          : "Select a blue wire tile on your stand to place an info token."}
      </div>
      {selectedTileIndex != null && (
        <div className="flex items-center gap-2">
          {useFalseTokenMode && (
            <>
              <span className="text-gray-400">False value:</span>
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
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
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
