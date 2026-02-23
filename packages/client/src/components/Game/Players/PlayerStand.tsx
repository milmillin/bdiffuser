import type { ClientPlayer, InfoToken, VisibleTile } from "@bomb-busters/shared";
import { CHARACTER_IMAGES, WIRE_BACK_IMAGE, wireLabel } from "@bomb-busters/shared";

export function PlayerStand({
  player,
  isOpponent,
  isCurrentTurn,
  onTileClick,
  selectedTileIndex,
  selectedTileIndices,
  tileSelectableFilter,
  onCharacterClick,
}: {
  player: ClientPlayer;
  isOpponent: boolean;
  isCurrentTurn: boolean;
  onTileClick?: (flatIndex: number) => void;
  selectedTileIndex?: number;
  /** Multi-select support (e.g. Double Detector mode) */
  selectedTileIndices?: number[];
  tileSelectableFilter?: (tile: VisibleTile) => boolean;
  onCharacterClick?: () => void;
}) {
  return (
    <div
      data-testid={`player-stand-${player.id}`}
      className={`rounded-xl p-3 ${
        isCurrentTurn
          ? "bg-yellow-900/20 border-2 border-yellow-600"
          : "bg-[var(--color-bomb-surface)]"
      }`}
    >
      {/* Player header */}
      <div className="flex items-center gap-2 mb-2">
        {player.character && CHARACTER_IMAGES[player.character] && (
          <button
            type="button"
            onClick={onCharacterClick}
            className="rounded hover:ring-2 hover:ring-yellow-400 transition-all cursor-pointer flex-shrink-0"
            data-testid={`character-thumb-${player.id}`}
          >
            <img
              src={`/images/${CHARACTER_IMAGES[player.character]}`}
              alt={player.character}
              className="w-8 h-8 rounded object-cover"
            />
          </button>
        )}
        <span className="font-bold text-sm">
          {player.name}
          {player.isBot && (
            <span className="ml-1 text-purple-400 text-xs">(AI)</span>
          )}
          {player.isCaptain && (
            <span className="ml-1 text-yellow-500 text-xs">(Captain)</span>
          )}
        </span>
        <span className="text-xs text-gray-500">
          {player.remainingTiles} tiles left
        </span>
        {player.character && (
          <span
            data-testid={`character-skill-status-${player.id}`}
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
              player.characterUsed
                ? "bg-rose-900/70 text-rose-200"
                : "bg-emerald-900/70 text-emerald-200"
            }`}
          >
            Skill {player.characterUsed ? "Used" : "Ready"}
          </span>
        )}
        {isCurrentTurn && (
          <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded text-black font-bold ml-auto">
            ACTIVE
          </span>
        )}
        {!player.connected && (
          <span className="text-xs text-red-400 ml-auto">Offline</span>
        )}
      </div>

      {/* Scrollable wire grid: info tokens, wires, labels */}
      {(() => {
        const colWidth = isOpponent ? "1.5rem" : "2rem";
        return (
          <div className="overflow-x-auto">
          <div className={`inline-grid gap-x-1 ${isOpponent ? "mx-auto" : ""}`}
            style={{ gridTemplateColumns: `repeat(${player.hand.length}, ${colWidth})`, gridTemplateRows: "auto auto auto" }}
          >
            {/* Row 1: info tokens */}
            {player.hand.map((_, idx) => {
              const infoTokens = player.infoTokens.filter(
                (t) => t.position === idx || t.positionB === idx,
              );
              return (
                <div key={`info-${idx}`} className="flex items-end justify-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {infoTokens.map((token, tokenIndex) => (
                      <InfoTokenView
                        key={`${idx}-${tokenIndex}-${token.position}-${token.positionB ?? "x"}-${token.relation ?? token.value}`}
                        token={token}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Row 2: wire tiles */}
            {player.hand.map((tile, idx) => (
              <WireTileView
                key={tile.id}
                tile={tile}
                isOpponent={isOpponent}
                isSmall={isOpponent}
                isSelectable={tileSelectableFilter ? tileSelectableFilter(tile) : !!onTileClick && !tile.cut}
                isSelected={selectedTileIndex === idx || (selectedTileIndices?.includes(idx) ?? false)}
                testId={`wire-tile-${player.id}-${idx}`}
                onClick={() => onTileClick?.(idx)}
              />
            ))}
            {/* Row 3: wire labels */}
            {player.hand.map((_, idx) => (
              <div key={`label-${idx}`} className="text-center text-[10px] text-gray-500 font-mono leading-tight">
                {wireLabel(idx)}
              </div>
            ))}
          </div>
          </div>
        );
      })()}
    </div>
  );
}

function getInfoTokenImage(token: InfoToken): string {
  if (token.isYellow) return "info_yellow.png";
  if (token.value >= 1 && token.value <= 12) return `info_${token.value}.png`;
  return "info_no.png";
}

function InfoTokenView({ token }: { token: InfoToken }) {
  if (token.relation === "eq" || token.relation === "neq") {
    return (
      <div
        className={`px-1 py-0.5 rounded text-[9px] font-black leading-none ${
          token.relation === "eq"
            ? "bg-blue-700 text-white"
            : "bg-orange-700 text-white"
        }`}
      >
        {token.relation === "eq" ? "=" : "!="}
      </div>
    );
  }

  return (
    <img
      src={`/images/${getInfoTokenImage(token)}`}
      alt={`Info: ${token.value}`}
      className="w-full h-auto block"
    />
  );
}

function WireTileView({
  tile,
  isOpponent,
  isSmall,
  isSelectable,
  isSelected,
  testId,
  onClick,
}: {
  tile: VisibleTile;
  isOpponent: boolean;
  isSmall: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  testId: string;
  onClick: () => void;
}) {
  const showFront = tile.color != null;
  const isCut = tile.cut;

  return (
    <div>
      <button
        onClick={onClick}
        disabled={!isSelectable || isCut}
        data-testid={testId}
        className={`w-full rounded-md overflow-hidden transition-all ${
          isSelected ? "ring-2 ring-white scale-105" : ""
        } ${
          isSelectable && !isCut
            ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white"
            : isCut
              ? "opacity-60"
              : "cursor-default"
        }`}
      >
        {showFront ? (
          <div className="relative">
            {tile.image ? (
              <img
                src={`/images/${tile.image}`}
                alt={`${tile.color} wire ${tile.gameValue}`}
                className="w-full h-auto block rounded-sm"
              />
            ) : (
              <div className={`${isSmall ? "h-16" : "h-20"} bg-gray-800 flex items-center justify-center`}>
                <span className={`font-bold ${isSmall ? "text-xs" : "text-sm"}`}>
                  {tile.gameValue === "RED"
                    ? "R"
                    : tile.gameValue === "YELLOW"
                      ? "Y"
                      : tile.gameValue}
                </span>
              </div>
            )}
            {isCut && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-green-400 text-lg">✓</span>
              </div>
            )}
          </div>
        ) : (
          <img
            src={`/images/${WIRE_BACK_IMAGE}`}
            alt="Wire back"
            className="w-full h-auto block rounded-sm"
          />
        )}
      </button>
    </div>
  );
}
