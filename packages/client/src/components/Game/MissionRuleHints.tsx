import type { ClientGameState } from "@bomb-busters/shared";

type EquipmentSecondaryLock = {
  secondaryLockValue?: number;
  secondaryLockCutsRequired?: number;
};

function getSecondaryLock(
  equipment: ClientGameState["board"]["equipment"][number],
): { value: number; required: number } | null {
  const maybeLock = equipment as EquipmentSecondaryLock;
  if (typeof maybeLock.secondaryLockValue !== "number") return null;
  return {
    value: maybeLock.secondaryLockValue,
    required:
      typeof maybeLock.secondaryLockCutsRequired === "number"
        ? maybeLock.secondaryLockCutsRequired
        : 2,
  };
}

function countCutValue(state: ClientGameState, value: number): number {
  let count = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut && tile.gameValue === value) count++;
    }
  }
  return count;
}

function SequencePriorityHint({ gameState }: { gameState: ClientGameState }) {
  const visible = gameState.campaign?.numberCards?.visible ?? [];
  if (visible.length < 3) return null;
  const pointer =
    gameState.campaign?.specialMarkers?.find((m) => m.kind === "sequence_pointer")
      ?.value ?? 0;

  return (
    <div className="rounded-xl bg-[var(--color-bomb-surface)] border border-gray-700 p-3 space-y-2">
      <div className="text-xs font-bold uppercase text-gray-300">
        Sequence Priority
      </div>
      <div className="flex gap-2">
        {visible.slice(0, 3).map((card, idx) => {
          const isActive = idx === pointer;
          const isUnlocked = idx < pointer;
          return (
            <div
              key={card.id}
              className={`flex-1 rounded-md px-2 py-1.5 border text-center ${
                isActive
                  ? "border-emerald-400 bg-emerald-900/40"
                  : isUnlocked
                    ? "border-gray-600 bg-gray-800/60"
                    : "border-amber-500/70 bg-amber-950/30"
              }`}
            >
              <div className="text-lg font-black text-white">{card.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-300">
                {isActive ? "Active" : isUnlocked ? "Unlocked" : "Locked"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">
        Cut 2 wires of the active value to unlock the next card.
      </p>
    </div>
  );
}

function EquipmentSecondaryLocksHint({
  gameState,
}: {
  gameState: ClientGameState;
}) {
  const locked = gameState.board.equipment.flatMap((equipment) => {
    const lock = getSecondaryLock(equipment);
    if (!lock) return [];
    return [{ equipment, ...lock }];
  });

  if (locked.length === 0) return null;

  return (
    <div className="rounded-xl bg-[var(--color-bomb-surface)] border border-gray-700 p-3 space-y-2">
      <div className="text-xs font-bold uppercase text-gray-300">
        Equipment Number Locks
      </div>
      <div className="space-y-1.5">
        {locked.map(({ equipment, required, value }) => {
          const progress = countCutValue(gameState, value);
          const done = progress >= required;
          return (
            <div
              key={equipment.id}
              className="flex items-center justify-between rounded-md bg-black/30 px-2 py-1"
            >
              <span className="text-xs text-gray-200 truncate mr-2">{equipment.name}</span>
              <span
                className={`text-xs font-bold ${done ? "text-emerald-300" : "text-amber-300"}`}
              >
                {value}: {Math.min(progress, required)}/{required}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissionRuleHints({ gameState }: { gameState: ClientGameState }) {
  const showSequence = gameState.mission === 9;
  const showEquipmentLocks = gameState.mission === 12;

  if (!showSequence && !showEquipmentLocks) return null;

  return (
    <div className="space-y-2">
      {showSequence && <SequencePriorityHint gameState={gameState} />}
      {showEquipmentLocks && <EquipmentSecondaryLocksHint gameState={gameState} />}
    </div>
  );
}
