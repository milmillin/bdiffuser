import type { ClientMessage, ClientPlayer } from "@bomb-busters/shared";

export function InfoTokenSetup({
  player,
  selectedTileIndex,
  requiresToken,
  send,
  onPlaced,
}: {
  player: ClientPlayer;
  selectedTileIndex: number | null;
  requiresToken: boolean;
  send: (msg: ClientMessage) => void;
  onPlaced: () => void;
}) {
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
    if (selectedTileIndex == null) return;
    const tile = player.hand[selectedTileIndex];
    if (!tile || tile.color !== "blue" || tile.gameValue === "RED" || tile.gameValue === "YELLOW") return;
    send({
      type: "placeInfoToken",
      value: tile.gameValue as number,
      tileIndex: selectedTileIndex,
    });
    onPlaced();
  };

  return (
    <div className="text-center space-y-3 py-2">
      {selectedTileIndex == null ? (
        <p className="text-gray-400">Select a blue wire tile on your stand to place an info token.</p>
      ) : (
        <button
          onClick={handlePlace}
          className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-colors"
        >
          Place Info Token ({player.hand[selectedTileIndex]?.gameValue})
        </button>
      )}
    </div>
  );
}
