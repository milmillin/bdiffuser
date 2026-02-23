import { useState } from "react";
import {
  EQUIPMENT_DEFS,
  getEquipmentCardText,
  resolveMissionSetup,
  CHARACTER_CARD_TEXT,
  CHARACTER_IMAGES,
  type BoardState,
  type CharacterId,
  type MissionId,
} from "@bomb-busters/shared";

const EQUIPMENT_DEFS_BY_ID = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));

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
  character,
  characterUsed,
}: {
  board: BoardState;
  missionId: MissionId;
  playerCount: number;
  character?: CharacterId | null;
  characterUsed?: boolean;
}) {
  const blueRange = getBlueRangeForMission(missionId, playerCount);

  return (
    <div className="bg-[var(--color-bomb-surface)] rounded-xl px-3 py-2 space-y-2" data-testid="board-area">
      <div className="flex items-start gap-3">
        <DetonatorDial
          position={board.detonatorPosition}
          max={board.detonatorMax}
        />
        <ValidationTrack
          track={board.validationTrack}
          markers={board.markers}
          blueRange={blueRange}
        />
      </div>
      {(board.equipment.length > 0 || character) && (
        <EquipmentRow
          equipment={board.equipment}
          character={character ?? null}
          characterUsed={characterUsed ?? false}
        />
      )}
    </div>
  );
}

function DetonatorDial({
  position,
  max,
}: {
  position: number;
  max: number;
}) {
  const isDead = position >= max;
  const isDanger = position >= max - 1;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]" data-testid="detonator-dial">
      <div className={`text-xs font-bold uppercase ${isDanger ? "text-red-400" : "text-gray-400"}`}>
        Detonator
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < position;
          const isLast = i === max - 1;
          return (
            <div
              key={i}
              className={`w-5 h-7 rounded-sm border-2 flex items-center justify-center text-xs font-black transition-all duration-300 ${
                filled
                  ? isLast
                    ? "bg-red-600 border-red-400 text-white animate-pulse"
                    : "bg-red-700 border-red-500 text-red-200"
                  : isLast
                    ? "bg-gray-900 border-red-800 text-red-900"
                    : "bg-gray-900 border-gray-700 text-gray-700"
              }`}
            >
              {isLast ? "\u2620" : filled ? "\u2716" : ""}
            </div>
          );
        })}
      </div>
      <div className={`text-[10px] font-bold ${isDead ? "text-red-400" : isDanger ? "text-red-400" : "text-gray-500"}`} data-testid="detonator-position">
        {position}/{max} wrong
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
    <div className="flex-1">
      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Validation Track</div>
      <div className="flex items-end gap-0.5">
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
                      className={`w-3.5 h-4 rounded-[1px] transition-all duration-300 ${
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
        className={`w-3 h-3 ${shape === "circle" ? "rounded-full" : "rounded-[1px]"} border border-gray-800`}
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

function EquipmentRow({
  equipment,
  character,
  characterUsed,
}: {
  equipment: BoardState["equipment"];
  character: CharacterId | null;
  characterUsed: boolean;
}) {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const toggleCard = (key: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getStatus = (eq: BoardState["equipment"][number]) => {
    if (eq.used) return { label: "Used", className: "bg-black/70 text-gray-200" };
    if (eq.unlocked && eq.secondaryLockValue !== undefined) {
      return {
        label: `2nd Lock ${eq.secondaryLockValue}x${eq.secondaryLockCutsRequired ?? 2}`,
        className: "bg-black/70 text-amber-200",
      };
    }
    if (eq.unlocked) {
      return { label: "Available", className: "bg-green-700/80 text-white" };
    }
    return { label: `Lock ${eq.unlockValue}x2`, className: "bg-black/70 text-yellow-200" };
  };

  const charText = character ? CHARACTER_CARD_TEXT[character] : null;
  const charImage = character ? CHARACTER_IMAGES[character] : null;
  const showPersonalImage = character ? !flippedCards.has(`personal-${character}`) : false;

  return (
    <div>
      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Equipment</div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {/* Personal equipment card */}
        {character && charText && (
          <button
            type="button"
            onClick={() => toggleCard(`personal-${character}`)}
            className={`relative flex-shrink-0 w-64 rounded-lg border shadow-md h-72 text-left overflow-hidden ${
              characterUsed
                ? "border-gray-700 opacity-60 bg-gray-900"
                : "border-violet-500 bg-violet-950/80"
            }`}
          >
            {/* Status badge */}
            <div
              className={`absolute left-1 top-1 z-10 px-1 py-0.5 rounded text-[10px] font-bold ${
                characterUsed
                  ? "bg-rose-700/80 text-white"
                  : "bg-emerald-700/80 text-white"
              }`}
            >
              {characterUsed ? "Skill Used" : "Skill Ready"}
            </div>

            {/* Personal label */}
            <div className="absolute right-1 top-1 z-10 px-1 py-0.5 rounded bg-violet-700/80 text-[10px] font-bold text-violet-100">
              Personal
            </div>

            {showPersonalImage && charImage ? (
              <div className="flex flex-col h-full w-full bg-slate-900">
                <div className="flex-1 min-h-0">
                  <img
                    src={`/images/${charImage}`}
                    alt={charText.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-shrink-0 px-2.5 py-1.5 bg-black/80">
                  <div className="text-sm font-bold text-white leading-tight">
                    {charText.name}
                  </div>
                  <div className="text-[10px] text-violet-200">
                    {charText.abilityName}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto px-2.5 py-2.5 pt-7 space-y-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wide text-violet-300">
                    Personal Equipment
                  </div>
                  <div className="text-sm font-bold text-white leading-tight">
                    {charText.abilityName}
                  </div>
                  <div className="text-[10px] text-violet-300/80">
                    {charText.name}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                    Timing
                  </div>
                  <p className="text-[11px] leading-snug text-gray-100">
                    {charText.timing}
                  </p>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
                    Effect
                  </div>
                  <p className="text-[11px] leading-snug text-gray-100">
                    {charText.effect}
                  </p>
                </div>

                {charText.reminders.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
                      Reminder
                    </div>
                    <ul className="space-y-1">
                      {charText.reminders.map((reminder) => (
                        <li
                          key={reminder}
                          className="text-[11px] leading-snug text-gray-300"
                        >
                          - {reminder}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </button>
        )}

        {/* Regular equipment cards */}
        {equipment.map((eq) => {
          const def = EQUIPMENT_DEFS_BY_ID.get(eq.id);
          const rulesText = getEquipmentCardText(eq.id, def);
          const status = getStatus(eq);
          const showImage = !flippedCards.has(eq.id);

          return (
            <button
              type="button"
              key={eq.id}
              onClick={() => toggleCard(eq.id)}
              className={`relative flex-shrink-0 w-64 rounded-lg border shadow-md h-72 text-left overflow-hidden ${
                eq.used
                  ? "border-gray-700 opacity-60 bg-gray-900"
                  : eq.unlocked
                    ? "border-green-500 bg-slate-900"
                    : "border-gray-700 bg-slate-950"
              }`}
            >
              <div className={`absolute left-1 top-1 z-10 px-1 py-0.5 rounded text-[10px] font-bold ${status.className}`}>
                {status.label}
              </div>

              {showImage ? (
                <div className="flex flex-col h-full w-full bg-slate-900">
                  <div className="flex-1 min-h-0">
                    <img
                      src={`/images/${eq.image}`}
                      alt={eq.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-shrink-0 px-2.5 py-1.5 bg-black/80">
                    <div className="text-sm font-bold text-white leading-tight">
                      {eq.name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto px-2.5 py-2.5 pt-7 space-y-2">
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      Equipment {eq.unlockValue}
                    </div>
                    <div className="text-sm font-bold text-white leading-tight">
                      {eq.name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Unlocks after 2 cuts of value {eq.unlockValue}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                      Timing
                    </div>
                    <p className="text-[11px] leading-snug text-gray-100">
                      {rulesText.timing}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
                      Effect
                    </div>
                    <p className="text-[11px] leading-snug text-gray-100">
                      {rulesText.effect}
                    </p>
                  </div>

                  {rulesText.reminders.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
                        Reminder
                      </div>
                      <ul className="space-y-1">
                        {rulesText.reminders.map((reminder) => (
                          <li
                            key={reminder}
                            className="text-[11px] leading-snug text-gray-300"
                          >
                            - {reminder}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
