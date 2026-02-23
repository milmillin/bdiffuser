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

function CampaignObjectsHint({
  gameState,
  hideSequencePointer,
  hideNumberCards,
}: {
  gameState: ClientGameState;
  hideSequencePointer: boolean;
  hideNumberCards: boolean;
}) {
  const campaign = gameState.campaign;
  if (!campaign) return null;

  const visibleCards = campaign.numberCards?.visible ?? [];
  const deckCount = campaign.numberCards?.deck.length ?? 0;
  const discardCount = campaign.numberCards?.discard.length ?? 0;

  const globalConstraints =
    campaign.constraints?.global.filter((constraint) => constraint.active) ?? [];
  const perPlayerConstraints: { playerName: string; labels: string[] }[] = [];
  for (const [playerId, cards] of Object.entries(campaign.constraints?.perPlayer ?? {})) {
    const activeCards = cards.filter((constraint) => constraint.active);
    if (activeCards.length === 0) continue;
    const playerName =
      gameState.players.find((player) => player.id === playerId)?.name ??
      playerId;
    perPlayerConstraints.push({
      playerName,
      labels: activeCards.map((constraint) => constraint.name || constraint.id),
    });
  }

  const activeChallenges = campaign.challenges?.active ?? [];
  const completedChallenges = campaign.challenges?.completed ?? [];
  const challengeDeckCount = campaign.challenges?.deck.length ?? 0;

  const oxygen = campaign.oxygen;
  const oxygenByPlayer = oxygen
    ? gameState.players
      .map((player) => ({
        name: player.name,
        amount: oxygen.playerOxygen[player.id] ?? 0,
      }))
      .filter((entry) => entry.amount > 0)
    : [];

  const specialMarkers = (campaign.specialMarkers ?? []).filter((marker) =>
    hideSequencePointer ? marker.kind !== "sequence_pointer" : true,
  );

  const hasNumberCardContent =
    !hideNumberCards &&
    (visibleCards.length > 0 || deckCount > 0 || discardCount > 0);

  const hasAnyContent =
    hasNumberCardContent ||
    globalConstraints.length > 0 ||
    perPlayerConstraints.length > 0 ||
    activeChallenges.length > 0 ||
    completedChallenges.length > 0 ||
    challengeDeckCount > 0 ||
    oxygen != null ||
    campaign.nanoTracker != null ||
    campaign.bunkerTracker != null ||
    specialMarkers.length > 0;

  if (!hasAnyContent) return null;

  return (
    <div className="rounded-xl bg-[var(--color-bomb-surface)] border border-gray-700 p-3 space-y-2">
      <div className="text-xs font-bold uppercase text-gray-300">
        Campaign Objects
      </div>

      {hasNumberCardContent && (
        <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1">
          <div className="text-[10px] uppercase text-gray-400">Number Cards</div>
          {visibleCards.length > 0 && (
            <div className="text-xs text-gray-200">
              Visible: {visibleCards.map((card) => card.value).join(" - ")}
            </div>
          )}
          {(deckCount > 0 || discardCount > 0) && (
            <div className="text-xs text-gray-300">
              Deck {deckCount} | Discard {discardCount}
            </div>
          )}
        </div>
      )}

      {(globalConstraints.length > 0 || perPlayerConstraints.length > 0) && (
        <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1">
          <div className="text-[10px] uppercase text-gray-400">Constraints</div>
          {globalConstraints.length > 0 && (
            <div className="text-xs text-gray-200">
              Global: {globalConstraints.map((constraint) => constraint.name || constraint.id).join(", ")}
            </div>
          )}
          {perPlayerConstraints.map((entry) => (
            <div key={entry.playerName} className="text-xs text-gray-300">
              {entry.playerName}: {entry.labels.join(", ")}
            </div>
          ))}
        </div>
      )}

      {(activeChallenges.length > 0 || completedChallenges.length > 0 || challengeDeckCount > 0) && (
        <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1">
          <div className="text-[10px] uppercase text-gray-400">Challenges</div>
          {activeChallenges.length > 0 && (
            <div className="text-xs text-gray-200">
              Active: {activeChallenges.map((challenge) => challenge.name || challenge.id).join(", ")}
            </div>
          )}
          {completedChallenges.length > 0 && (
            <div className="text-xs text-gray-300">
              Completed: {completedChallenges.map((challenge) => challenge.name || challenge.id).join(", ")}
            </div>
          )}
          {challengeDeckCount > 0 && (
            <div className="text-xs text-gray-400">Deck remaining: {challengeDeckCount}</div>
          )}
        </div>
      )}

      {oxygen && (
        <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1">
          <div className="text-[10px] uppercase text-gray-400">Oxygen</div>
          <div className="text-xs text-gray-200">Pool: {oxygen.pool}</div>
          {oxygenByPlayer.length > 0 && (
            <div className="text-xs text-gray-300">
              {oxygenByPlayer.map((entry) => `${entry.name}: ${entry.amount}`).join(" | ")}
            </div>
          )}
        </div>
      )}

      {(campaign.nanoTracker || campaign.bunkerTracker) && (
        <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1">
          <div className="text-[10px] uppercase text-gray-400">Trackers</div>
          {campaign.nanoTracker && (
            <div className="text-xs text-gray-200">
              Nano: {campaign.nanoTracker.position}/{campaign.nanoTracker.max}
            </div>
          )}
          {campaign.bunkerTracker && (
            <div className="text-xs text-gray-300">
              Bunker: {campaign.bunkerTracker.position}/{campaign.bunkerTracker.max}
            </div>
          )}
        </div>
      )}

      {specialMarkers.length > 0 && (
        <div className="rounded-md bg-black/30 px-2 py-1.5">
          <div className="text-[10px] uppercase text-gray-400 mb-1">Special Markers</div>
          <div className="text-xs text-gray-200">
            {specialMarkers
              .map((marker) => {
                const label =
                  marker.kind === "action_pointer"
                    ? "Action Pointer"
                    : marker.kind === "sequence_pointer"
                      ? "Sequence Pointer"
                      : "X Marker";
                return `${label}: ${marker.value}`;
              })
              .join(" | ")}
          </div>
        </div>
      )}
    </div>
  );
}

export function MissionRuleHints({ gameState }: { gameState: ClientGameState }) {
  const showSequence = gameState.mission === 9;
  const showEquipmentLocks = gameState.mission === 12;
  const showCampaignObjects = gameState.campaign != null;

  if (!showSequence && !showEquipmentLocks && !showCampaignObjects) return null;

  return (
    <div className="space-y-2">
      {showSequence && <SequencePriorityHint gameState={gameState} />}
      {showEquipmentLocks && <EquipmentSecondaryLocksHint gameState={gameState} />}
      {showCampaignObjects && (
        <CampaignObjectsHint
          gameState={gameState}
          hideSequencePointer={showSequence}
          hideNumberCards={showSequence}
        />
      )}
    </div>
  );
}
