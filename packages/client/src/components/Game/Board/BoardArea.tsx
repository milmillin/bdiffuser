import {
  EQUIPMENT_DEFS,
  resolveMissionSetup,
  type BoardState,
  type MissionId,
} from "@bomb-busters/shared";

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
      {board.equipment.length > 0 && (
        <EquipmentRow equipment={board.equipment} />
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
}: {
  equipment: BoardState["equipment"];
}) {
  const defsById = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));

  const getStatus = (eq: BoardState["equipment"][number]) => {
    if (eq.used) return { label: "Used", className: "bg-black/70 text-gray-200" };
    if (eq.unlocked) {
      return { label: "Available", className: "bg-green-700/80 text-white" };
    }
    return { label: `Lock ${eq.unlockValue}x2`, className: "bg-black/70 text-yellow-200" };
  };

  return (
    <div>
      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Equipment</div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {equipment.map((eq) => {
          const imageName =
            (typeof eq.image === "string" && eq.image) ||
            defsById.get(eq.id)?.image ||
            "equipment_back.png";

          return (
            <div
              key={eq.id}
              className={`relative flex-shrink-0 w-28 sm:w-32 rounded-lg overflow-hidden border shadow-md ${
                eq.used
                  ? "border-gray-700 opacity-60"
                  : eq.unlocked
                    ? "border-green-500"
                    : "border-gray-700"
              }`}
            >
              <img
                src={`/images/${imageName}`}
                alt={eq.name}
                className={`block w-full aspect-[264/378] object-cover ${eq.used ? "grayscale" : ""}`}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith("/images/equipment_back.png")) {
                    target.src = "/images/equipment_back.png";
                  }
                }}
              />
              <div className={`absolute left-1 top-1 px-1 py-0.5 rounded text-[10px] font-bold ${getStatus(eq).className}`}>
                {getStatus(eq).label}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1">
                <div className="text-[10px] font-bold text-white truncate">{eq.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
