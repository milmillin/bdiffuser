import { useState, type ReactNode } from "react";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  getNumberCardImage,
  getConstraintCardImage,
  getChallengeCardImage,
  NUMBER_CARD_BACK,
  CONSTRAINT_CARD_BACK,
  CUTTER_CARD_IMAGES,
  BUNKER_CARD_IMAGES,
  MISSION_SCHEMAS,
} from "@bomb-busters/shared";
import { CardPreviewModal, type CardPreviewCard } from "./CardPreviewModal.js";
import { ScrollableRow } from "./Board/BoardArea.js";

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
  const safeMax = Math.max(1, Math.floor(max));
  const safePosition = Math.max(0, Math.min(Math.floor(position), safeMax));
  const pct = safeMax > 0 ? Math.min(100, (safePosition / safeMax) * 100) : 0;
  const barColor = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";
  const tickCount = Math.min(safeMax + 1, 11);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300 font-semibold w-12">{label}</span>
        <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-200 tabular-nums">
          {safePosition}/{safeMax}
        </span>
      </div>
      <div className="ml-14 flex items-center gap-1.5">
        {Array.from({ length: tickCount }, (_, idx) => {
          const tickValue =
            tickCount <= 1
              ? 0
              : Math.round((safeMax * idx) / (tickCount - 1));
          const reached = safePosition >= tickValue;
          return (
            <span
              key={`${label}-tick-${idx}`}
              className={`h-1.5 flex-1 rounded-full ${reached ? "bg-white/70" : "bg-white/20"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function OxygenTokenRow({ amount }: { amount: number }) {
  const count = Math.max(0, Math.floor(amount));
  const shown = Math.min(count, 12);

  if (count === 0) {
    return <span className="text-[10px] uppercase text-gray-500">Empty</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 flex-wrap">
        {Array.from({ length: shown }, (_, idx) => (
          <span
            key={`o2-${idx}`}
            className="h-2.5 w-2.5 rounded-full bg-sky-400 ring-1 ring-sky-200/60"
          />
        ))}
      </div>
      {count > shown && (
        <span className="text-[10px] font-semibold text-sky-200">+{count - shown}</span>
      )}
    </div>
  );
}

function CampaignObjectCard({
  image,
  borderClassName,
  landscape,
  dimmed,
  overlayLabel,
  rotateCcw90,
  badgeLabel,
  sizeClassName,
  onClick,
}: {
  image: string;
  borderClassName: string;
  landscape?: boolean;
  dimmed?: boolean;
  overlayLabel?: string;
  /** Display a portrait image in a landscape container, rotated -90°. */
  rotateCcw90?: boolean;
  badgeLabel?: string;
  /** Override the default outer width classes (e.g. larger cards). */
  sizeClassName?: string;
  onClick: () => void;
}) {
  const widthClass =
    sizeClassName ?? (rotateCcw90
      ? "w-auto"
      : landscape
        ? "w-[10.5rem] sm:w-48"
        : "w-20 sm:w-24");
  const aspectClass = landscape ? "aspect-[1037/736]" : "aspect-[739/1040]";
  const frameClass = rotateCcw90 ? "h-20 sm:h-24 aspect-[1037/736]" : `w-full ${aspectClass}`;

  if (rotateCcw90) {
    return (
      <div
        className={`flex ${widthClass} shrink-0 items-center justify-center rounded-xl overflow-hidden transition-transform duration-150 ease-out hover:scale-[1.01]`}
      >
        <button
          type="button"
          onClick={onClick}
          className={`relative flex ${frameClass} items-center justify-center rounded-xl border-2 ${borderClassName} overflow-hidden bg-slate-900`}
        >
          <div
            className="absolute"
            style={{
              width: "calc(100% * 736 / 1037)",
              height: "calc(100% * 1037 / 736)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-90deg)",
            }}
          >
            <img
              src={`/images/${image}`}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          {badgeLabel && (
            <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
              {badgeLabel}
            </span>
          )}
          {dimmed && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              {overlayLabel && (
                <span className="text-[9px] font-bold text-white uppercase">{overlayLabel}</span>
              )}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex ${widthClass} shrink-0 flex-col rounded-xl overflow-hidden transition-transform duration-150 ease-out hover:scale-[1.01]`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full ${aspectClass} rounded-xl border-2 ${borderClassName} overflow-hidden bg-slate-900`}
      >
        <img
          src={`/images/${image}`}
          alt=""
          className="h-full w-full object-cover"
        />
        {badgeLabel && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
            {badgeLabel}
          </span>
        )}
        {dimmed && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            {overlayLabel && (
              <span className="text-[9px] font-bold text-white uppercase">{overlayLabel}</span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

function CampaignRow({ children }: { children: ReactNode }) {
  return (
    <ScrollableRow>
      <div className="mx-auto w-max min-w-full py-0.5">
        <div className="flex items-center justify-center gap-2">{children}</div>
      </div>
    </ScrollableRow>
  );
}

function SectionShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-2.5 py-2 space-y-1.5">
      {children}
    </div>
  );
}

function MarkerTile({
  shortLabel,
  value,
  className,
}: {
  shortLabel: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`relative w-24 sm:w-28 shrink-0 rounded-xl border overflow-hidden ${className}`}>
      <div className="h-16 flex items-center justify-center text-2xl font-black tabular-nums">
        <span>{shortLabel}</span>
        <span className="ml-2">{value}</span>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-lg px-2 py-1 ${className}`}>
      <div className="text-[10px] uppercase tracking-wide text-white/80">{label}</div>
      <div className="text-base font-black text-white tabular-nums">{value}</div>
    </div>
  );
}

function SequencePriorityHint({ gameState }: { gameState: ClientGameState }) {
  const visible = gameState.campaign?.numberCards?.visible ?? [];
  if (visible.length < 3) return null;
  const pointer =
    gameState.campaign?.specialMarkers?.find((m) => m.kind === "sequence_pointer")
      ?.value ?? 0;

  return (
    <div className="rounded-xl bg-[var(--color-bomb-surface)] px-2.5 py-2 space-y-1.5">
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
    <div className="rounded-xl bg-[var(--color-bomb-surface)] px-2.5 py-2 space-y-1.5">
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
  sequencePointer,
  hideNumberCards,
}: {
  gameState: ClientGameState;
  sequencePointer: number | null;
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
  const displayVisibleCards =
    gameState.mission === 26
      ? [...visibleCards].sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))
      : visibleCards;
  const deckCount = campaign.numberCards?.deck.length ?? 0;
  const discardCount = campaign.numberCards?.discard.length ?? 0;
  const numberCardHandsByPlayer = gameState.players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      cards: campaign.numberCards?.playerHands?.[player.id] ?? [],
    }))
    .filter((entry) => entry.cards.length > 0);

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
  const sortedActiveChallenges = [...activeChallenges].sort(
    (a, b) => Number(a.id) - Number(b.id),
  );
  const sortedCompletedChallenges = [...completedChallenges].sort(
    (a, b) => Number(a.id) - Number(b.id),
  );

  const oxygen = campaign.oxygen;
  const oxygenByPlayer = oxygen
    ? gameState.players
      .map((player) => ({
        name: player.name,
        amount: oxygen.playerOxygen[player.id] ?? 0,
      }))
    : [];

  const specialMarkers = (campaign.specialMarkers ?? []).filter((marker) =>
    sequencePointer != null ? marker.kind !== "sequence_pointer" : true,
  );

  const hasNumberCardContent =
    cutterImage != null ||
    (!hideNumberCards &&
      (displayVisibleCards.length > 0 ||
        deckCount > 0 ||
        discardCount > 0 ||
        numberCardHandsByPlayer.length > 0));

  const hasAnyContent =
    hasNumberCardContent ||
    globalConstraints.length > 0 ||
    perPlayerConstraints.length > 0 ||
    sortedActiveChallenges.length > 0 ||
    sortedCompletedChallenges.length > 0 ||
    oxygen != null ||
    campaign.nanoTracker != null ||
    campaign.bunkerTracker != null ||
    specialMarkers.length > 0 ||
    gameState.mission >= 9;

  if (!hasAnyContent) return null;

  return (
    <>
      <div className="space-y-3">
        {hasNumberCardContent && (
          <SectionShell>
            {(cutterImage || displayVisibleCards.length > 0 || deckCount > 0 || discardCount > 0) && (
              <CampaignRow>
                {cutterImage && (
                  <CampaignObjectCard
                    image={cutterImage}
                    borderClassName="border-emerald-500"
                    landscape
                    rotateCcw90
                    onClick={() =>
                      setPreviewCard({
                        name: `Sequence Priority (${sequenceRule?.variant === "face_a" ? "2 cuts" : "4 cuts"})`,
                        previewImage: cutterImage,
                        previewAspectRatio: "1037/736",
                        previewRotateCcw90: true,
                      })
                    }
                  />
                )}
                {displayVisibleCards.map((card, idx) => {
                  const isSequenceCard = sequencePointer != null && idx < 3;
                  let image: string;
                  let borderClassName: string;
                  let dimmed = false;

                  if (isSequenceCard) {
                    if (idx < sequencePointer) {
                      image = NUMBER_CARD_BACK;
                      borderClassName = "border-black/75";
                      dimmed = true;
                    } else if (idx === sequencePointer) {
                      image = getNumberCardImage(card.value);
                      borderClassName = "border-emerald-500";
                    } else {
                      image = getNumberCardImage(card.value);
                      borderClassName = "border-amber-500";
                    }
                  } else {
                    image = card.faceUp
                      ? getNumberCardImage(card.value)
                      : NUMBER_CARD_BACK;
                    borderClassName = card.faceUp ? "border-sky-500" : "border-black/75";
                    dimmed = !card.faceUp;
                  }

                  return (
                    <CampaignObjectCard
                      key={card.id}
                      image={image}
                      borderClassName={borderClassName}
                      dimmed={dimmed}
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
                {deckCount > 0 && (
                  <CampaignObjectCard
                    image={NUMBER_CARD_BACK}
                    borderClassName="border-slate-500"
                    badgeLabel={String(deckCount)}
                    onClick={() =>
                      setPreviewCard({
                        name: "Number Deck",
                        previewImage: NUMBER_CARD_BACK,
                        detailSubtitle: `${deckCount} card${deckCount === 1 ? "" : "s"} remaining`,
                      })
                    }
                  />
                )}
                {discardCount > 0 && (
                  <CampaignObjectCard
                    image={NUMBER_CARD_BACK}
                    borderClassName="border-black/75"
                    badgeLabel={String(discardCount)}
                    dimmed
                    overlayLabel="Used"
                    onClick={() =>
                      setPreviewCard({
                        name: "Number Discard",
                        previewImage: NUMBER_CARD_BACK,
                        detailSubtitle: `${discardCount} card${discardCount === 1 ? "" : "s"} in discard`,
                      })
                    }
                  />
                )}
              </CampaignRow>
            )}
            {numberCardHandsByPlayer.length > 0 && (
              <CampaignRow>
                {numberCardHandsByPlayer.flatMap((entry) =>
                  entry.cards.map((card, idx) => {
                    const image = card.faceUp
                      ? getNumberCardImage(card.value)
                      : NUMBER_CARD_BACK;
                    return (
                    <CampaignObjectCard
                      key={`${entry.playerId}-${card.id}-${idx}`}
                      image={image}
                      borderClassName={
                        card.faceUp ? "border-sky-500" : "border-black/75"
                      }
                        dimmed={!card.faceUp}
                        overlayLabel={card.faceUp ? undefined : "Down"}
                        onClick={() =>
                          setPreviewCard({
                            name: card.faceUp
                              ? `${entry.playerName}: Number ${card.value}`
                              : `${entry.playerName}: Number Card (face down)`,
                            previewImage: image,
                            detailSubtitle: card.faceUp
                              ? `Value: ${card.value}`
                              : "This card is face down.",
                          })
                        }
                      />
                    );
                  }),
                )}
              </CampaignRow>
            )}
          </SectionShell>
        )}

        {(globalConstraints.length > 0 || perPlayerConstraints.length > 0) && (
          <SectionShell>
            <div className="text-[10px] font-bold uppercase tracking-wide text-rose-200">
              Constraints
            </div>
            <CampaignRow>
              {globalConstraints.map((constraint) => {
                const image = getConstraintCardImage(constraint.id);
                return (
                  <CampaignObjectCard
                    key={`global-${constraint.id}`}
                    image={image}
                    borderClassName="border-rose-500"
                    sizeClassName="w-[7.5rem] sm:w-[9rem]"
                    onClick={() =>
                      setPreviewCard({
                        name: `Constraint ${constraint.id}`,
                        previewImage: image,
                        previewScale: 1.5,
                        detailSubtitle: constraint.name || constraint.id,
                        detailEffect: constraint.description,
                      })
                    }
                  />
                );
              })}
              {perPlayerConstraints.flatMap((entry) =>
                entry.cards.map((constraint) => {
                  const image = getConstraintCardImage(constraint.id);
                  return (
                    <CampaignObjectCard
                      key={`${entry.playerName}-${constraint.id}`}
                      image={image}
                      borderClassName="border-amber-500"
                      sizeClassName="w-[7.5rem] sm:w-[9rem]"
                      onClick={() =>
                        setPreviewCard({
                          name: `Constraint ${constraint.id}`,
                          previewImage: image,
                          previewScale: 1.5,
                          detailSubtitle: constraint.name || constraint.id,
                          detailEffect: constraint.description,
                        })
                      }
                    />
                  );
                }),
              )}
            </CampaignRow>
          </SectionShell>
        )}

        {(sortedActiveChallenges.length > 0 || sortedCompletedChallenges.length > 0) && (
          <SectionShell>
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-200">
              Challenges
            </div>
            <CampaignRow>
              {sortedActiveChallenges.map((challenge) => {
                const image = getChallengeCardImage(challenge.id);
                return (
                  <CampaignObjectCard
                    key={`active-${challenge.id}`}
                    image={image}
                    borderClassName="border-amber-500"
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
              {sortedCompletedChallenges.map((challenge) => {
                const image = getChallengeCardImage(challenge.id);
                return (
                  <CampaignObjectCard
                    key={`done-${challenge.id}`}
                    image={image}
                    borderClassName="border-emerald-500"
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
            </CampaignRow>
          </SectionShell>
        )}

        {oxygen && (
          <SectionShell>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <div className="space-y-2 rounded-lg bg-sky-950/20 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sky-300 font-semibold">Pool</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-sky-500"
                      style={{ width: `${Math.min(100, (oxygen.pool / Math.max(oxygen.pool, 10)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-sky-100 tabular-nums">{oxygen.pool}</span>
                </div>
                <OxygenTokenRow amount={oxygen.pool} />
              </div>
              <StatPill
                label="Contributors"
                value={oxygenByPlayer.filter((entry) => entry.amount > 0).length}
                className="bg-sky-900/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {oxygenByPlayer.map((entry) => (
                <div
                  key={entry.name}
                  className={`rounded-lg px-2 py-1.5 ${entry.amount > 0 ? "bg-sky-900/40" : "bg-gray-900/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs ${entry.amount > 0 ? "text-sky-200" : "text-gray-500"}`}>
                      {entry.name}
                    </span>
                    <span className={`text-sm font-black tabular-nums ${entry.amount > 0 ? "text-sky-100" : "text-gray-500"}`}>
                      {entry.amount}
                    </span>
                  </div>
                  <div className="mt-1">
                    <OxygenTokenRow amount={entry.amount} />
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>
        )}

        {(campaign.nanoTracker || campaign.bunkerTracker) && (
          <SectionShell>
            {campaign.nanoTracker && (
              <div className="rounded-lg bg-emerald-950/20 px-2.5 py-2">
                <TrackerBar
                  label="Nano"
                  position={campaign.nanoTracker.position}
                  max={campaign.nanoTracker.max}
                />
              </div>
            )}
            {campaign.bunkerTracker && (
              <div className="space-y-2 rounded-lg bg-blue-950/20 px-2.5 py-2">
                <CampaignRow>
                  <CampaignObjectCard
                    image={BUNKER_CARD_IMAGES.front}
                    borderClassName="border-blue-500"
                    onClick={() => setPreviewCard({
                      name: "Bunker Card (Front)",
                      previewImage: BUNKER_CARD_IMAGES.front,
                    })}
                  />
                  <CampaignObjectCard
                    image={BUNKER_CARD_IMAGES.back}
                    borderClassName="border-slate-500"
                    onClick={() => setPreviewCard({
                      name: "Bunker Card (Back)",
                      previewImage: BUNKER_CARD_IMAGES.back,
                    })}
                  />
                </CampaignRow>
                <TrackerBar
                  label="Bunker"
                  position={campaign.bunkerTracker.position}
                  max={campaign.bunkerTracker.max}
                />
              </div>
            )}
          </SectionShell>
        )}

        {specialMarkers.length > 0 && (
          <SectionShell>
            <CampaignRow>
              {specialMarkers.map((marker, idx) => {
                const markerMeta =
                  marker.kind === "action_pointer"
                    ? {
                      short: "ACT",
                      className: "border-blue-500/60 bg-blue-950/30 text-blue-200",
                    }
                    : marker.kind === "sequence_pointer"
                      ? {
                        short: "SEQ",
                        className: "border-emerald-500/60 bg-emerald-950/30 text-emerald-200",
                      }
                      : {
                        short: "X",
                        className: "border-rose-500/60 bg-rose-950/30 text-rose-200",
                      };
                return (
                  <MarkerTile
                    key={`${marker.kind}-${marker.value}-${idx}`}
                    shortLabel={markerMeta.short}
                    value={marker.value}
                    className={markerMeta.className}
                  />
                );
              })}
            </CampaignRow>
          </SectionShell>
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
      {showSequence && !showCampaignObjects && <SequencePriorityHint gameState={gameState} />}
      {showEquipmentLocks && <EquipmentSecondaryLocksHint gameState={gameState} />}
      {showCampaignObjects && (
        <CampaignObjectsHint
          gameState={gameState}
          sequencePointer={showSequence ? (gameState.campaign?.specialMarkers?.find(m => m.kind === "sequence_pointer")?.value ?? 0) : null}
          hideNumberCards={false}
        />
      )}
    </div>
  );
}
