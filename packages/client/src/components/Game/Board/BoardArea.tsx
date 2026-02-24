import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  resolveMissionSetup,
  type BoardState,
  type MissionId,
} from "@bomb-busters/shared";

export function ScrollableRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 120, behavior: "smooth" });
  };

  return (
    <div className="relative flex-1 min-w-0">
      {canScrollLeft && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--color-bomb-surface)] via-[var(--color-bomb-surface)]/60 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs shadow-lg shadow-black/50"
          >
            ‹
          </button>
        </>
      )}
      <div
        ref={ref}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex justify-center"
      >
        {children}
      </div>
      {canScrollRight && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-bomb-surface)] via-[var(--color-bomb-surface)]/60 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs shadow-lg shadow-black/50"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

function getBlueRangeForMission(
  missionId: MissionId,
  playerCount: number,
): { minValue: number; maxValue: number } {
  try {
    return resolveMissionSetup(missionId, playerCount).setup.blue;
  } catch {
    // Fallback keeps the track fully enabled if setup resolution fails.
    return { minValue: 1, maxValue: 12 };
  }
}

export function BoardArea({
  board,
  missionId,
  playerCount,
}: {
  board: BoardState;
  missionId: MissionId;
  playerCount: number;
}) {
  const blueRange = getBlueRangeForMission(missionId, playerCount);

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-[var(--color-bomb-surface)] border-b border-gray-700 flex-shrink-0" data-testid="board-area">
      <ValidationTrack
        track={board.validationTrack}
        markers={board.markers}
        blueRange={blueRange}
      />
      <DetonatorDial
        position={board.detonatorPosition}
        max={board.detonatorMax}
      />
    </div>
  );
}

const SQUARE_COLORS = [
  { bg: "bg-green-700", border: "border-green-500", filled: "bg-green-500" },
  { bg: "bg-lime-800", border: "border-lime-500", filled: "bg-lime-500" },
  { bg: "bg-yellow-800", border: "border-yellow-500", filled: "bg-yellow-500" },
  { bg: "bg-orange-800", border: "border-orange-500", filled: "bg-orange-500" },
  { bg: "bg-red-800", border: "border-red-500", filled: "bg-red-500" },
  { bg: "bg-red-950", border: "border-red-700", filled: "bg-red-600" },
] as const;

function DetonatorDial({
  position,
  max,
}: {
  position: number;
  max: number;
}) {
  const TOTAL = 6;
  const isDead = position >= max;
  // Marker starts `max + 1` squares from the right (e.g. max=2 → index 3)
  const startIndex = TOTAL - max - 1;

  return (
    <div className="flex items-center gap-2 flex-shrink-0" data-testid="detonator-dial">
      <div className="text-xs font-bold uppercase text-gray-400">Detonator</div>
      <div className="flex gap-0.5">
        {Array.from({ length: TOTAL }, (_, i) => {
          const colors = SQUARE_COLORS[i];
          const isSkull = i === TOTAL - 1;
          const inactive = i < startIndex;
          const trackPos = i - startIndex; // position relative to start
          const filled = !inactive && trackPos < position;
          const isMarker = !inactive && trackPos === position && !isDead;

          return (
            <div
              key={i}
              className={`w-6 h-6 rounded-sm border-2 flex items-center justify-center text-xs font-black transition-all duration-300 ${
                inactive
                  ? `bg-gray-900 ${colors.border} opacity-20`
                  : filled
                    ? `${colors.filled} ${colors.border} text-white`
                    : isMarker
                      ? `${colors.bg} ${colors.border} text-white ring-2 ring-white/60`
                      : `${colors.bg} ${colors.border} opacity-40`
              } ${isDead && isSkull ? "animate-pulse" : ""}`}
            >
              {isSkull ? "\u{1F480}" : filled ? "\u2716" : ""}
            </div>
          );
        })}
      </div>
      <div className={`text-[10px] font-bold ${isDead ? "text-red-400" : position >= max - 1 ? "text-orange-400" : "text-gray-500"}`} data-testid="detonator-position">
        {position}/{max}
      </div>
    </div>
  );
}

function ValidationTrack({
  track,
  markers,
  blueRange,
}: {
  track: Record<number, number>;
  markers: { value: number; color: string; confirmed?: boolean }[];
  blueRange: { minValue: number; maxValue: number };
}) {
  return (
    <ScrollableRow>
      <div className="flex items-end gap-0.5 mx-auto w-fit">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => {
          const isUnused =
            value < blueRange.minValue || value > blueRange.maxValue;
          const cutCount = track[value] ?? 0;
          const validated = cutCount >= 4;
          const yellowMarker = isUnused
            ? undefined
            : markers.find((m) => m.value === value && m.color === "yellow");
          const redMarker = isUnused
            ? undefined
            : markers.find((m) => m.value === value && m.color === "red");

          return (
            <div key={value} className="flex items-end gap-0.5">
              {/* Blue value column */}
              <div
                data-testid={`validation-slot-${value}`}
                className={`flex flex-col items-center gap-0.5 ${isUnused ? "opacity-40" : ""}`}
              >
                <span
                  className={`text-[10px] font-bold ${
                    isUnused
                      ? "text-gray-600"
                      : validated
                        ? "text-green-400"
                        : "text-gray-400"
                  }`}
                >
                  {value}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div
                      key={j}
                      className={`w-4 h-4 rounded-[1px] transition-all duration-300 ${
                        !isUnused && j < cutCount
                          ? validated ? "bg-green-500" : "bg-blue-500"
                          : isUnused
                            ? "bg-gray-900/70"
                            : "bg-[var(--color-bomb-dark)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {/* Yellow then Red markers between columns */}
              {value <= 11 && (
                <div className={`flex items-center gap-0.5 px-0.5 pb-0.5 ${isUnused ? "opacity-40" : ""}`}>
                  <MarkerIndicator marker={yellowMarker} shape="square" />
                  <MarkerIndicator marker={redMarker} shape="circle" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollableRow>
  );
}

function MarkerIndicator({
  marker,
  shape,
}: {
  marker: { color: string; confirmed?: boolean } | undefined;
  shape: "square" | "circle";
}) {
  if (!marker) {
    // Blank — this color doesn't exist in the deck for this value
    return (
      <div
        className={`w-3 h-3 ${shape === "circle" ? "rounded-full" : "rounded-[1px]"} border border-gray-600`}
      />
    );
  }

  const colorClass = marker.color === "red" ? "border-red-500" : "border-yellow-500";
  const confirmedBg = marker.color === "red" ? "bg-red-500" : "bg-yellow-500";

  if (marker.confirmed) {
    // Confirmed — filled
    return (
      <div
        className={`w-3 h-3 ${shape === "circle" ? "rounded-full" : "rounded-[1px]"} ${confirmedBg} transition-all duration-300`}
      />
    );
  }

  // In play but not yet confirmed — question mark
  return (
    <div
      className={`w-3 h-3 ${shape === "circle" ? "rounded-full" : "rounded-[1px]"} border ${colorClass} flex items-center justify-center`}
    >
      <span className={`text-[7px] font-bold ${marker.color === "red" ? "text-red-400" : "text-yellow-400"}`}>?</span>
    </div>
  );
}
