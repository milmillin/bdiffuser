import { useState } from "react";
import type { ClientMessage, ClientPlayer } from "@bomb-busters/shared";

export function InfoTokenSetup({
  player,
  send,
  alreadyPlaced,
}: {
  player: ClientPlayer;
  send: (msg: ClientMessage) => void;
  alreadyPlaced: boolean;
}) {
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  if (alreadyPlaced) {
    return (
      <div className="text-center py-4" data-testid="info-token-placed">
        <div className="text-green-400 text-lg font-bold">Info token placed!</div>
        <p className="text-gray-400 text-sm mt-1">Waiting for other players...</p>
      </div>
    );
  }

  // Get all blue tiles with their indices
  const blueTiles: { value: number; flatIndex: number }[] = [];
  for (let i = 0; i < player.hand.length; i++) {
    const tile = player.hand[i];
    if (tile.color === "blue" && tile.gameValue !== "RED" && tile.gameValue !== "YELLOW") {
      blueTiles.push({ value: tile.gameValue as number, flatIndex: i });
    }
  }

  const handlePlace = () => {
    if (selectedTile == null) return;
    const tileInfo = blueTiles.find((t) => t.flatIndex === selectedTile);
    if (!tileInfo) return;
    send({
      type: "placeInfoToken",
      value: tileInfo.value,
      tileIndex: selectedTile,
    });
  };

  return (
    <div className="space-y-4" data-testid="info-token-setup">
      <div className="flex gap-2 flex-wrap justify-center">
        {blueTiles.map((bt) => (
          <button
            key={bt.flatIndex}
            onClick={() => setSelectedTile(bt.flatIndex)}
            data-testid={`info-tile-${bt.flatIndex}`}
            className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-all ${
              selectedTile === bt.flatIndex
                ? "border-yellow-400 bg-blue-800 scale-110"
                : "border-blue-600 bg-blue-950 hover:border-blue-400"
            }`}
          >
            {bt.value}
          </button>
        ))}
      </div>

      {selectedTile != null && (
        <button
          onClick={handlePlace}
          data-testid="place-info-token"
          className="mx-auto block px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-colors"
        >
          Place Info Token ({blueTiles.find((t) => t.flatIndex === selectedTile)?.value})
        </button>
      )}
    </div>
  );
}
