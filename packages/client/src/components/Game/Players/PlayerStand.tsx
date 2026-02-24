import type { ReactNode } from "react";
import type { ClientPlayer, InfoToken, VisibleTile } from "@bomb-busters/shared";
import { CHARACTER_IMAGES, WIRE_BACK_IMAGE, wireLabel } from "@bomb-busters/shared";
import { ScrollableRow } from "../Board/BoardArea";

export function PlayerStand({
  player,
  isOpponent,
  isCurrentTurn,
  turnOrder,
  onTileClick,
  selectedTileIndex,
  selectedTileIndices,
  tileSelectableFilter,
  onCharacterClick,
  statusContent,
}: {
  player: ClientPlayer;
  isOpponent: boolean;
  isCurrentTurn: boolean;
  turnOrder: number;
  onTileClick?: (flatIndex: number) => void;
  selectedTileIndex?: number;
  /** Multi-select support (e.g. Double Detector mode) */
  selectedTileIndices?: number[];
  tileSelectableFilter?: (tile: VisibleTile, index: number) => boolean;
  onCharacterClick?: () => void;
  statusContent?: ReactNode;
}) {
  const standSegments = getStandSegments(player);
  const tokenRowHeightPx = getTokenRowHeight(player);

  return (
    <div
      data-testid={`player-stand-${player.id}`}
      className={`rounded-lg p-2 min-w-0 border ${
        isCurrentTurn
          ? "bg-yellow-900/20 border-yellow-600"
          : "bg-[var(--color-bomb-surface)] border-gray-700"
      }`}
    >
      {/* Unified status bar */}
      {statusContent != null && (
        <div
          className={`text-xs mb-1.5 pb-1 border-b -mx-2 -mt-2 px-2 pt-1 rounded-t-lg h-8 flex items-center ${isCurrentTurn ? "border-yellow-600/60 bg-yellow-500/25" : "border-gray-700"}`}
          data-testid="unified-status-bar"
        >
          {statusContent}
        </div>
      )}
      {/* Player header */}
      <div className="flex items-center gap-1.5 mb-1">
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
              className="w-6 h-6 rounded object-cover"
            />
          </button>
        )}
        <span className="text-[10px] text-gray-400 font-mono">#{turnOrder}</span>
        <span className="font-bold text-sm">
          {player.name}
          {player.isBot && (
            <span className="ml-1 text-purple-400 text-xs">(AI)</span>
          )}
          {player.isCaptain && (
            <span className="ml-1 text-yellow-500 text-xs">(Captain)</span>
          )}
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
            Skill {player.characterUsed ? "Used" : "Available"}
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
        const colWidth = "1.5rem";
        return (
          <ScrollableRow>
            <div className="flex items-start mx-auto min-w-0">
              {standSegments.map((segment, segmentIndex) => (
                <div
                  key={`stand-segment-${segment.standIndex}`}
                  data-testid={`player-stand-segment-${player.id}-${segment.standIndex}`}
                  className={`min-w-0 ${segmentIndex > 0 ? "ml-2 pl-2 border-l border-gray-700/70" : ""}`}
                >
                  <div
                    className="grid gap-x-1 min-w-0"
                    style={{
                      gridTemplateColumns: `repeat(${segment.indices.length}, ${colWidth})`,
                      gridTemplateRows: "auto auto auto",
                    }}
                  >
                    {/* Row 1: info tokens */}
                    {segment.indices.map((flatIndex) => {
                      const infoTokens = player.infoTokens.filter(
                        (token) => token.position === flatIndex || token.positionB === flatIndex,
                      );
                      return (
                        <div
                          key={`info-${flatIndex}`}
                          className="flex items-end justify-center"
                          style={tokenRowHeightPx > 0 ? { height: `${tokenRowHeightPx}px` } : undefined}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {infoTokens.map((token, tokenIndex) => (
                              <InfoTokenView
                                key={`${flatIndex}-${tokenIndex}-${token.position}-${token.positionB ?? "x"}-${token.relation ?? token.countHint ?? token.parity ?? token.value}`}
                                token={token}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* Row 2: wire tiles */}
                    {segment.indices.map((flatIndex) => (
                      <WireTileView
                        key={player.hand[flatIndex].id}
                        tile={player.hand[flatIndex]}
                        isOpponent={isOpponent}
                        isSmall={true}
                        isSelectable={
                          tileSelectableFilter
                            ? tileSelectableFilter(player.hand[flatIndex], flatIndex)
                            : !!onTileClick && !player.hand[flatIndex].cut
                        }
                        isSelected={selectedTileIndex === flatIndex || (selectedTileIndices?.includes(flatIndex) ?? false)}
                        isFilterActive={!!tileSelectableFilter}
                        testId={`wire-tile-${player.id}-${flatIndex}`}
                        onClick={() => onTileClick?.(flatIndex)}
                      />
                    ))}
                    {/* Row 3: wire labels */}
                    {segment.indices.map((flatIndex) => (
                      <div key={`label-${flatIndex}`} className="text-center text-[10px] text-gray-500 font-mono leading-tight">
                        {wireLabel(flatIndex)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollableRow>
        );
      })()}
    </div>
  );
}

function getStandSegments(
  player: ClientPlayer,
): Array<{ standIndex: number; indices: number[] }> {
  const standSizes = getValidatedStandSizes(player);
  const segments: Array<{ standIndex: number; indices: number[] }> = [];
  let cursor = 0;

  for (let standIndex = 0; standIndex < standSizes.length; standIndex += 1) {
    const size = standSizes[standIndex]!;
    const end = Math.min(cursor + size, player.hand.length);
    const indices: number[] = [];
    for (let idx = cursor; idx < end; idx += 1) {
      indices.push(idx);
    }
    if (indices.length > 0) {
      segments.push({ standIndex, indices });
    }
    cursor = end;
  }

  if (segments.length === 0 && player.hand.length > 0) {
    return [{ standIndex: 0, indices: player.hand.map((_, idx) => idx) }];
  }

  return segments;
}

function getValidatedStandSizes(player: ClientPlayer): number[] {
  const maybeStandSizes = (player as ClientPlayer & { standSizes?: number[] }).standSizes;
  if (!Array.isArray(maybeStandSizes) || maybeStandSizes.length === 0) {
    return [player.hand.length];
  }
  if (!maybeStandSizes.every((size) => Number.isInteger(size) && size >= 0)) {
    return [player.hand.length];
  }
  const total = maybeStandSizes.reduce((sum, size) => sum + size, 0);
  if (total !== player.hand.length) {
    return [player.hand.length];
  }
  return maybeStandSizes;
}

function getTokenRowHeight(player: ClientPlayer): number {
  let maxTokenStack = 0;
  for (let tileIndex = 0; tileIndex < player.hand.length; tileIndex += 1) {
    let count = 0;
    for (const token of player.infoTokens) {
      if (token.position === tileIndex || token.positionB === tileIndex) {
        count += 1;
      }
    }
    if (count > maxTokenStack) {
      maxTokenStack = count;
    }
  }

  if (maxTokenStack <= 0) return 0;

  // Token visuals are rendered at 1.5rem to match tile column width.
  const tokenHeightPx = 24;
  const tokenGapPx = 2;
  return (maxTokenStack * tokenHeightPx) + ((maxTokenStack - 1) * tokenGapPx);
}

function getInfoTokenImage(token: InfoToken): string {
  if (token.countHint != null) return `info_x${token.countHint}.png`;
  if (token.isYellow) return "info_yellow.png";
  if (token.parity === "even") return "info_even.png";
  if (token.parity === "odd") return "info_odd.png";
  if (token.value >= 1 && token.value <= 12) return `info_${token.value}.png`;
  return "info_no.png";
}

function InfoTokenView({ token }: { token: InfoToken }) {
  if (token.relation === "eq" || token.relation === "neq") {
    return (
      <div
        className={`w-6 h-6 rounded text-[9px] font-black leading-none flex items-center justify-center ${
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
      alt={`Info: ${token.isYellow ? "YELLOW" : token.countHint != null ? `x${token.countHint}` : token.parity ?? token.value}`}
      className="w-6 h-6 object-contain block"
    />
  );
}

function WireTileView({
  tile,
  isOpponent,
  isSmall,
  isSelectable,
  isSelected,
  isFilterActive,
  testId,
  onClick,
}: {
  tile: VisibleTile;
  isOpponent: boolean;
  isSmall: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  isFilterActive: boolean;
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
              : isFilterActive
                ? "cursor-default opacity-40"
                : "cursor-default"
        }`}
      >
        {showFront ? (
          <div className="relative">
            {tile.image ? (
              <img
                src={`/images/${tile.image}`}
                alt={`${tile.color} wire ${tile.gameValue}`}
                width={158}
                height={504}
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
            width={158}
            height={504}
            className="w-full h-auto block rounded-sm"
          />
        )}
      </button>
    </div>
  );
}
