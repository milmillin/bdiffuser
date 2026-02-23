import type { BoardState } from "@bomb-busters/shared";

export function BoardArea({ board }: { board: BoardState }) {
  return (
    <div className="bg-[var(--color-bomb-surface)] rounded-xl px-3 py-2 flex items-center gap-3">
      <DetonatorDial
        position={board.detonatorPosition}
        max={board.detonatorMax}
      />
      <ValidationTrack
        track={board.validationTrack}
        markers={board.markers}
      />
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
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
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
      <div className={`text-[10px] font-bold ${isDead ? "text-red-400" : isDanger ? "text-red-400" : "text-gray-500"}`}>
        {position}/{max} wrong
      </div>
    </div>
  );
}

function ValidationTrack({
  track,
  markers,
}: {
  track: Record<number, number>;
  markers: { value: number; color: string }[];
}) {
  return (
    <div className="flex-1">
      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Validation Track</div>
      <div className="flex gap-1">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => {
          const cutCount = track[value] ?? 0;
          const validated = cutCount >= 4;
          const marker = markers.find((m) => m.value === value);

          return (
            <div
              key={value}
              className="flex-1 flex flex-col items-center gap-0.5 relative"
            >
              <span className={`text-[10px] font-bold ${validated ? "text-green-400" : "text-gray-400"}`}>
                {value}
              </span>
              <div className="w-full h-5 bg-[var(--color-bomb-dark)] rounded-sm overflow-hidden relative">
                {cutCount > 0 && (
                  <div
                    className={`absolute bottom-0 left-0 w-full transition-all duration-300 ${
                      validated ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ height: `${(cutCount / 4) * 100}%` }}
                  />
                )}
              </div>
              {marker && (
                <div
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
                    marker.color === "red" ? "bg-red-500" : "bg-yellow-500"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EquipmentRow({
  equipment,
}: {
  equipment: BoardState["equipment"];
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Equipment</div>
      <div className="flex gap-2 overflow-x-auto">
        {equipment.map((eq) => (
          <div
            key={eq.id}
            className={`flex-shrink-0 w-24 rounded-lg p-2 text-xs ${
              eq.used
                ? "bg-gray-800 text-gray-600 opacity-50"
                : eq.unlocked
                  ? "bg-green-900/50 border border-green-600 text-green-300"
                  : "bg-gray-800 border border-gray-700 text-gray-500"
            }`}
          >
            <div className="font-bold truncate">{eq.name}</div>
            <div className="text-[10px] mt-1">
              {eq.used
                ? "Used"
                : eq.unlocked
                  ? "Available"
                  : `Unlock: cut 2x "${eq.unlockValue}"`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
