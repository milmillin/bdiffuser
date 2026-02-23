import type { ClientMessage, ClientPlayer } from "@bomb-busters/shared";

export function InfoTokenSetup({
  player,
  selectedTileIndex,
  send,
  onPlaced,
}: {
  player: ClientPlayer;
  selectedTileIndex: number | null;
  send: (msg: ClientMessage) => void;
  onPlaced: () => void;
}) {
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
