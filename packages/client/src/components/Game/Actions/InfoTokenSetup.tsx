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
      <div className="bg-[var(--color-bomb-surface)] rounded-lg p-2 space-y-1 text-xs">
        <div className="pb-1.5 border-b border-gray-700">
          <span className="font-bold uppercase tracking-wide text-gray-400">Info Token Setup</span>
        </div>
        <p className="text-gray-400">
          Mission rule: you do not place an info token.
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
    <div className="bg-[var(--color-bomb-surface)] rounded-lg p-2 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 pb-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 -mx-2 -mt-2 px-2 pt-2 rounded-t-lg border-b-2 border-yellow-500">
        <span className="bg-yellow-500 text-black font-black uppercase text-[10px] px-1.5 py-0.5 rounded-full">
          Your Turn
        </span>
        <span className="text-xs font-bold text-yellow-400">Place Info Token</span>
      </div>
      {selectedTileIndex == null ? (
        <p className="text-gray-400">
          {useFalseTokenMode
            ? "Select an allowed wire tile on your stand to place a false info token."
            : "Select a blue wire tile on your stand to place an info token."}
        </p>
      ) : (
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
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold text-xs transition-colors"
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
