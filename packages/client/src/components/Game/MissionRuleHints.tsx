import { useState } from "react";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  getNumberCardImage,
  getConstraintCardImage,
  getChallengeCardImage,
  NUMBER_CARD_BACK,
  CUTTER_CARD_IMAGES,
  MISSION_SCHEMAS,
} from "@bomb-busters/shared";
import { CardPreviewModal, type CardPreviewCard } from "./CardPreviewModal.js";

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

function TrackerBar({ label, position, max }: { label: string; position: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (position / max) * 100) : 0;
  const barColor = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-300 font-semibold w-12">{label}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-200 tabular-nums">
        {position}/{max}
      </span>
    </div>
  );
}

function CampaignCardThumbnail({
  image,
  borderColor,
  landscape,
  dimmed,
  overlayLabel,
  onClick,
}: {
  image: string;
  borderColor: string;
  landscape?: boolean;
  dimmed?: boolean;
  overlayLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-md border-2 ${borderColor} ${landscape ? "w-14" : "w-10"} shrink-0`}
      style={{ aspectRatio: landscape ? "1037/736" : "739/1040" }}
    >
      <img
        src={`/images/${image}`}
        alt=""
        className="h-full w-full object-cover"
      />
      {dimmed && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          {overlayLabel && (
            <span className="text-[9px] font-bold text-white uppercase">{overlayLabel}</span>
          )}
        </div>
      )}
    </button>
  );
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
  const [previewCard, setPreviewCard] = useState<CardPreviewCard | null>(null);

  const campaign = gameState.campaign;
  if (!campaign) return null;

  const sequenceRule = MISSION_SCHEMAS[gameState.mission]?.hookRules?.find(
    (r) => r.kind === "sequence_priority",
  );
  const cutterImage =
    sequenceRule?.kind === "sequence_priority"
      ? CUTTER_CARD_IMAGES[sequenceRule.variant]
      : undefined;

  const visibleCards = campaign.numberCards?.visible ?? [];
  const deckCount = campaign.numberCards?.deck.length ?? 0;
  const discardCount = campaign.numberCards?.discard.length ?? 0;

  const globalConstraints =
    campaign.constraints?.global.filter((constraint) => constraint.active) ?? [];
  const perPlayerConstraints: { playerName: string; cards: typeof globalConstraints }[] = [];
  for (const [playerId, cards] of Object.entries(campaign.constraints?.perPlayer ?? {})) {
    const activeCards = cards.filter((constraint) => constraint.active);
    if (activeCards.length === 0) continue;
    const playerName =
      gameState.players.find((player) => player.id === playerId)?.name ??
      playerId;
    perPlayerConstraints.push({
      playerName,
      cards: activeCards,
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
    cutterImage != null ||
    (!hideNumberCards &&
      (visibleCards.length > 0 || deckCount > 0 || discardCount > 0));

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
    <>
      <div className="rounded-xl bg-[var(--color-bomb-surface)] border border-gray-700 p-3 space-y-2">
        <div className="text-xs font-bold uppercase text-gray-300">
          Campaign Objects
        </div>

        {hasNumberCardContent && (
          <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1.5">
            <div className="text-[10px] uppercase text-gray-400">Number Cards</div>
            {cutterImage && (
              <div className="flex items-center gap-1.5">
                <CampaignCardThumbnail
                  image={cutterImage}
                  borderColor="border-emerald-400"
                  onClick={() =>
                    setPreviewCard({
                      name: `Sequence Priority (${sequenceRule?.variant === "face_a" ? "2 cuts" : "4 cuts"})`,
                      previewImage: cutterImage,
                    })
                  }
                />
              </div>
            )}
            {visibleCards.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {visibleCards.map((card) => {
                  const image = card.faceUp
                    ? getNumberCardImage(card.value)
                    : NUMBER_CARD_BACK;
                  return (
                    <CampaignCardThumbnail
                      key={card.id}
                      image={image}
                      borderColor={card.faceUp ? "border-blue-400" : "border-gray-600"}
                      dimmed={!card.faceUp}
                      onClick={() =>
                        setPreviewCard({
                          name: card.faceUp ? `Number ${card.value}` : "Number Card (face down)",
                          previewImage: image,
                          detailSubtitle: card.faceUp
                            ? `Value: ${card.value}`
                            : "This card is face down.",
                        })
                      }
                    />
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3">
              {deckCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="relative w-6 h-7">
                    <div className="absolute inset-0 rounded border border-gray-600 bg-gray-800" />
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-7 rounded border border-gray-600 bg-gray-700" />
                  </div>
                  <span className="text-[11px] text-gray-400 font-semibold">{deckCount}</span>
                </div>
              )}
              {discardCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-6 h-7 rounded border border-gray-700 bg-gray-900/50 opacity-50" />
                  <span className="text-[11px] text-gray-500 font-semibold">{discardCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(globalConstraints.length > 0 || perPlayerConstraints.length > 0) && (
          <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1.5">
            <div className="text-[10px] uppercase text-gray-400">Constraints</div>
            {globalConstraints.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 uppercase">Global</div>
                <div className="flex flex-wrap gap-1.5">
                  {globalConstraints.map((constraint) => {
                    const image = getConstraintCardImage(constraint.id);
                    return (
                      <CampaignCardThumbnail
                        key={constraint.id}
                        image={image}
                        borderColor="border-red-500/60"
                        onClick={() =>
                          setPreviewCard({
                            name: `Constraint ${constraint.id}`,
                            previewImage: image,
                            detailSubtitle: constraint.name || constraint.id,
                            detailEffect: constraint.description,
                          })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {perPlayerConstraints.map((entry) => (
              <div key={entry.playerName} className="space-y-1">
                <div className="text-[10px] text-gray-500">{entry.playerName}</div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.cards.map((constraint) => {
                    const image = getConstraintCardImage(constraint.id);
                    return (
                      <CampaignCardThumbnail
                        key={constraint.id}
                        image={image}
                        borderColor="border-amber-500/60"
                        onClick={() =>
                          setPreviewCard({
                            name: `Constraint ${constraint.id}`,
                            previewImage: image,
                            detailSubtitle: constraint.name || constraint.id,
                            detailEffect: constraint.description,
                          })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeChallenges.length > 0 || completedChallenges.length > 0 || challengeDeckCount > 0) && (
          <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1.5">
            <div className="text-[10px] uppercase text-gray-400">Challenges</div>
            {activeChallenges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeChallenges.map((challenge) => {
                  const image = getChallengeCardImage(challenge.id);
                  return (
                    <CampaignCardThumbnail
                      key={challenge.id}
                      image={image}
                      borderColor="border-amber-400/60"
                      landscape
                      onClick={() =>
                        setPreviewCard({
                          name: `Challenge #${challenge.id}`,
                          previewImage: image,
                          previewAspectRatio: "1037/736",
                          detailSubtitle: challenge.name,
                          detailEffect: challenge.description,
                        })
                      }
                    />
                  );
                })}
              </div>
            )}
            {completedChallenges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {completedChallenges.map((challenge) => {
                  const image = getChallengeCardImage(challenge.id);
                  return (
                    <CampaignCardThumbnail
                      key={challenge.id}
                      image={image}
                      borderColor="border-emerald-500/50"
                      landscape
                      dimmed
                      overlayLabel="Done"
                      onClick={() =>
                        setPreviewCard({
                          name: `Challenge #${challenge.id} (Completed)`,
                          previewImage: image,
                          previewAspectRatio: "1037/736",
                          detailSubtitle: challenge.name,
                          detailEffect: challenge.description,
                        })
                      }
                    />
                  );
                })}
              </div>
            )}
            {challengeDeckCount > 0 && (
              <div className="text-xs text-gray-400">Deck: {challengeDeckCount} remaining</div>
            )}
          </div>
        )}

        {oxygen && (
          <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1.5">
            <div className="text-[10px] uppercase text-gray-400">Oxygen</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-300 font-semibold">Pool</span>
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-sky-500"
                  style={{ width: `${Math.min(100, (oxygen.pool / Math.max(oxygen.pool, 10)) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-sky-200 tabular-nums">{oxygen.pool}</span>
            </div>
            {oxygenByPlayer.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {oxygenByPlayer.map((entry) => (
                  <span key={entry.name} className="inline-flex items-center gap-1 rounded bg-sky-900/40 px-1.5 py-0.5 text-[11px] text-sky-200">
                    {entry.name}: <span className="font-bold">{entry.amount}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {(campaign.nanoTracker || campaign.bunkerTracker) && (
          <div className="rounded-md bg-black/30 px-2 py-1.5 space-y-1.5">
            <div className="text-[10px] uppercase text-gray-400">Trackers</div>
            {campaign.nanoTracker && (
              <TrackerBar
                label="Nano"
                position={campaign.nanoTracker.position}
                max={campaign.nanoTracker.max}
              />
            )}
            {campaign.bunkerTracker && (
              <TrackerBar
                label="Bunker"
                position={campaign.bunkerTracker.position}
                max={campaign.bunkerTracker.max}
              />
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

      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          onClose={() => setPreviewCard(null)}
        />
      )}
    </>
  );
}

export function MissionRuleHints({ gameState }: { gameState: ClientGameState }) {
  const showSequence =
    gameState.mission === 9 ||
    ((gameState.campaign?.numberCards?.visible?.length ?? 0) >= 3 &&
      gameState.campaign?.specialMarkers?.some(
        (m) => m.kind === "sequence_pointer",
      ) === true);
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
          hideNumberCards={false}
        />
      )}
    </div>
  );
}
