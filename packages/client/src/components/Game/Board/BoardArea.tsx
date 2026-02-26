import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  resolveMissionSetup,
  type BoardState,
  type MissionId,
} from "@bomb-busters/shared";

const SCROLL_TOLERANCE_PX = 1;

export interface HorizontalScrollState {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  shouldResetScroll: boolean;
}

export function deriveHorizontalScrollState({
  scrollLeft,
  clientWidth,
  scrollWidth,
  tolerancePx = SCROLL_TOLERANCE_PX,
}: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  tolerancePx?: number;
}): HorizontalScrollState {
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
  if (maxScrollLeft <= tolerancePx) {
    return {
      hasOverflow: false,
      canScrollLeft: false,
      canScrollRight: false,
      shouldResetScroll: scrollLeft > tolerancePx,
    };
  }
  return {
    hasOverflow: true,
    canScrollLeft: scrollLeft > tolerancePx,
    canScrollRight: scrollLeft < maxScrollLeft - tolerancePx,
    shouldResetScroll: false,
  };
}

export function ScrollableRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const state = deriveHorizontalScrollState({
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    });
    if (state.shouldResetScroll && el.scrollLeft !== 0) {
      el.scrollLeft = 0;
    }
    setHasOverflow(state.hasOverflow);
    setCanScrollLeft(state.canScrollLeft);
    setCanScrollRight(state.canScrollRight);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }
    const mo = new MutationObserver(() => {
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild);
      }
      updateScrollState();
    });
    mo.observe(el, { childList: true });
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [children, updateScrollState]);

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
        className={`${hasOverflow ? "overflow-x-auto" : "overflow-x-hidden"} overscroll-x-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2`}
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

function getMissionSetupInfo(
  missionId: MissionId,
  playerCount: number,
): { blueRange: { minValue: number; maxValue: number }; redCount: number; yellowCount: number } {
  try {
    const { setup } = resolveMissionSetup(missionId, playerCount);
    return {
      blueRange: setup.blue,
      redCount: wirePoolCount(setup.red),
      yellowCount: wirePoolCount(setup.yellow),
    };
  } catch {
    return { blueRange: { minValue: 1, maxValue: 12 }, redCount: 0, yellowCount: 0 };
  }
}

function wirePoolCount(spec: { kind: string; count?: number; keep?: number; values?: readonly number[] }): number {
  switch (spec.kind) {
    case "none": return 0;
    case "exact": return spec.count ?? 0;
    case "exact_same_value": return spec.count ?? 0;
    case "out_of": return spec.keep ?? 0;
    case "fixed": return spec.values?.length ?? 0;
    default: return 0;
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
  const { blueRange, redCount, yellowCount } = getMissionSetupInfo(missionId, playerCount);
  const redRevealed = board.markers.filter((m) => m.color === "red" && m.confirmed).length;
  const yellowRevealed = board.markers.filter((m) => m.color === "yellow" && m.confirmed).length;

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-[var(--color-bomb-surface)] border-b border-gray-700 flex-shrink-0" data-testid="board-area">
      <ValidationTrack
        track={board.validationTrack}
        markers={board.markers}
        blueRange={blueRange}
      />
      {(redCount > 0 || yellowCount > 0) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {redCount > 0 && (
            <div className="flex items-center gap-1" data-testid="red-wire-count">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-red-400">{redRevealed}/{redCount}</span>
            </div>
          )}
          {yellowCount > 0 && (
            <div className="flex items-center gap-1" data-testid="yellow-wire-count">
              <div className="w-3 h-3 rounded-[1px] bg-yellow-500" />
              <span className="text-[10px] font-bold text-yellow-400">{yellowRevealed}/{yellowCount}</span>
            </div>
          )}
        </div>
      )}
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

export function DetonatorDial({
  position,
  max,
}: {
  position: number;
  max: number;
}) {
  const TOTAL = 6;
  const isDead = position >= max;
  // Marker starts `max` squares from the right (e.g. max=2 → index 4)
  const startIndex = TOTAL - max;

  return (
    <div className="flex items-center gap-2 flex-shrink-0" data-testid="detonator-dial">
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
              className={`relative w-6 h-6 rounded-sm border-2 flex items-center justify-center text-xs font-black transition-all duration-300 ${
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
              {inactive && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-0.5 right-0.5 top-1/2 h-px -translate-y-1/2 rotate-45 bg-gray-500/70" />
                  <div className="absolute left-0.5 right-0.5 top-1/2 h-px -translate-y-1/2 -rotate-45 bg-gray-500/70" />
                </div>
              )}
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
  const renderValueItem = (value: number) => {
    const isUnused =
      value < blueRange.minValue || value > blueRange.maxValue;
    const cutCount = track[value] ?? 0;
    const validated = cutCount >= 4;
    const compactState =
      cutCount <= 0 ? "empty" : validated ? "full" : "half";
    const isMarkerUnused =
      value < blueRange.minValue || value >= blueRange.maxValue;
    const yellowMarker = isMarkerUnused
      ? undefined
      : markers.find((m) => m.value === value && m.color === "yellow");
    const redMarker = isMarkerUnused
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
          <div className="hidden lg:flex gap-0.5">
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
          <div
            className={`lg:hidden relative w-4 h-4 rounded-[1px] overflow-hidden ${
              isUnused ? "bg-gray-900/70" : "bg-[var(--color-bomb-dark)]"
            }`}
          >
            {!isUnused && compactState !== "empty" && (
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                  compactState === "full"
                    ? "w-full bg-green-500"
                    : "w-1/2 bg-blue-500"
                }`}
              />
            )}
          </div>
        </div>
        {/* Yellow then Red markers between columns */}
        {value <= 11 && (
          <div className={`flex items-center gap-0.5 px-0.5 pb-0.5 ${isMarkerUnused ? "opacity-40" : ""}`}>
            <MarkerIndicator marker={yellowMarker} shape="square" />
            <MarkerIndicator marker={redMarker} shape="circle" />
          </div>
        )}
      </div>
    );
  };

  const allValues = Array.from({ length: 12 }, (_, i) => i + 1);
  const row1 = Array.from({ length: 6 }, (_, i) => i + 1);
  const row2 = Array.from({ length: 6 }, (_, i) => i + 7);

  return (
    <div className="flex-1 min-w-0">
      <div className="hidden md:flex items-end gap-px justify-center">
        {allValues.map(renderValueItem)}
      </div>
      <div className="flex md:hidden flex-col items-center gap-0.5">
        <div className="flex items-end gap-px sm:gap-0.5 justify-center">
          {row1.map(renderValueItem)}
        </div>
        <div className="flex items-end gap-px sm:gap-0.5 justify-center">
          {row2.map(renderValueItem)}
        </div>
      </div>
    </div>
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
