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
  useFalseTokenMode,
  send,
  onPlaced,
  onSelectedTokenValueChange,
}: {
  player: ClientPlayer;
  selectedTileIndex: number | null;
  selectedTokenValue: number | null;
  requiresToken: boolean;
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
      <div className="text-center space-y-2 py-2">
        <p className="text-gray-300">
          Mission setup rule: you do not place an info token.
        </p>
        <p className="text-xs text-gray-500">
          Waiting for the next player who still needs token placement.
        </p>
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
    <div className="text-center space-y-3 py-2">
      {selectedTileIndex == null ? (
        <p className="text-gray-400">
          {useFalseTokenMode
            ? "Select an allowed wire tile on your stand to place a false info token."
            : "Select a blue wire tile on your stand to place an info token."}
        </p>
      ) : (
        <div className="space-y-3">
          {useFalseTokenMode && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Choose a false value (must not match the selected blue wire).
              </p>
              <select
                value={effectiveFalseTokenValue ?? ""}
                onChange={(event) =>
                  onSelectedTokenValueChange(Number.parseInt(event.target.value, 10))
                }
                className="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white"
              >
                {falseTokenOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handlePlace}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-colors"
          >
            {useFalseTokenMode
              ? `Place False Info Token (${effectiveFalseTokenValue ?? "?"})`
              : `Place Info Token (${selectedTile?.gameValue ?? "?"})`}
          </button>
        </div>
      )}
    </div>
  );
}
