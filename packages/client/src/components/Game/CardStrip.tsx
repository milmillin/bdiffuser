import { useMemo, useState } from "react";
import {
  EQUIPMENT_DEFS,
  getEquipmentCardText,
  CHARACTER_CARD_TEXT,
  CHARACTER_IMAGES,
  type BoardState,
  type CharacterId,
} from "@bomb-busters/shared";
import { ScrollableRow } from "./Board/BoardArea.js";

const EQUIPMENT_DEFS_BY_ID = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));

type StackCard = {
  id: string;
  name: string;
  image: string | null;
  statusLabel: string;
  showLockIcon: boolean;
  statusClassName: string;
  frameClassName: string;
  detailSubtitle?: string;
  detailTiming?: string;
  detailEffect?: string;
  detailReminders?: string[];
  canUseOnTurn: boolean;
  onUse?: () => boolean;
};

function getStatusLabel(eq: BoardState["equipment"][number]) {
  if (eq.used) return { label: "Used", className: "bg-black/75 text-gray-200" };
  if (eq.faceDown && !eq.unlocked) {
    return { label: "Face Down", className: "bg-black/75 text-slate-200" };
  }
  if (eq.unlocked && eq.secondaryLockValue !== undefined) {
    return {
      label: `Locked ${eq.secondaryLockValue}x4`,
      className: "bg-black/75 text-amber-200",
    };
  }
  if (eq.unlocked) {
    return { label: "Available", className: "bg-emerald-700/85 text-white" };
  }
  return { label: "Locked", className: "bg-black/75 text-yellow-200" };
}

function getFrameClass(eq: BoardState["equipment"][number]): string {
  if (eq.used) return "border-black/75";
  if (eq.faceDown && !eq.unlocked) {
    return "border-black/75";
  }
  if (eq.unlocked && eq.secondaryLockValue !== undefined) {
    return "border-black/75";
  }
  if (eq.unlocked) {
    return "border-emerald-700/85";
  }
  return "border-black/75";
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="10" height="10" aria-hidden="true">
      <path fillRule="evenodd" d="M5 8V7a5 5 0 1110 0v1a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm8-1a3 3 0 10-6 0v1h6V7z" clipRule="evenodd" />
    </svg>
  );
}

export function CardStrip({
  equipment,
  character,
  characterUsed,
  isMyTurn,
  canSelectCards,
  selectedCardId,
  onSelectCard,
  onDeselectCard,
  onSelectEquipmentAction,
  onSelectPersonalSkill,
}: {
  equipment: BoardState["equipment"];
  character?: CharacterId | null;
  characterUsed?: boolean;
  isMyTurn: boolean;
  canSelectCards: boolean;
  selectedCardId: string | null;
  onSelectCard?: (cardId: string) => void;
  onDeselectCard?: () => void;
  onSelectEquipmentAction?: (equipmentId: string) => boolean;
  onSelectPersonalSkill?: () => boolean;
}) {
  const [previewCard, setPreviewCard] = useState<StackCard | null>(null);

  const cards = useMemo<StackCard[]>(() => {
    const builtCards: StackCard[] = [];

    if (character) {
      const charText = CHARACTER_CARD_TEXT[character];
      const charImage = CHARACTER_IMAGES[character];
      const skillUsed = characterUsed ?? false;
      builtCards.push({
        id: `personal-${character}`,
        name: charText.name,
        image: charImage,
        statusLabel: skillUsed ? "Used" : "Available",
        showLockIcon: false,
        statusClassName: skillUsed
          ? "bg-rose-700/85 text-white"
          : "bg-emerald-700/85 text-white",
        frameClassName: skillUsed
          ? "border-rose-700/85"
          : "border-emerald-700/85",
        detailSubtitle: charText.abilityName,
        detailTiming: charText.timing,
        detailEffect: charText.effect,
        detailReminders: [...charText.reminders],
        canUseOnTurn: !skillUsed,
        onUse: onSelectPersonalSkill,
      });
    }

    for (const eq of equipment) {
      const status = getStatusLabel(eq);
      const def = EQUIPMENT_DEFS_BY_ID.get(eq.id);
      const rulesText = getEquipmentCardText(eq.id, def);
      builtCards.push({
        id: `equipment-${eq.id}`,
        name: eq.name,
        image: eq.image,
        statusLabel: status.label,
        showLockIcon:
          (eq.faceDown && !eq.unlocked) ||
          (eq.unlocked && eq.secondaryLockValue !== undefined) ||
          !eq.unlocked,
        statusClassName: status.className,
        frameClassName: getFrameClass(eq),
        detailSubtitle:
          eq.faceDown && !eq.unlocked
            ? "Mission-locked card"
            : `Equipment ${eq.unlockValue}`,
        detailTiming: rulesText.timing,
        detailEffect: rulesText.effect,
        detailReminders: [...rulesText.reminders],
        canUseOnTurn: eq.unlocked && !eq.used,
        onUse: onSelectEquipmentAction
          ? () => onSelectEquipmentAction(eq.id)
          : undefined,
      });
    }

    return builtCards;
  }, [character, characterUsed, equipment, onSelectEquipmentAction, onSelectPersonalSkill]);

  return (
    <div className="w-full" data-testid="card-stack">
      <ScrollableRow>
        <div className="mx-auto w-max min-w-full">
          <div className="flex flex-nowrap justify-center gap-2 sm:gap-3">
            {cards.map((card) => {
              const isSelected = selectedCardId === card.id;
              const headerBgClass = isSelected
                ? "bg-sky-700/85 text-white"
                : card.statusClassName;
              const borderClass = isSelected ? "border-sky-500" : card.frameClassName;
              return (
                <div
                  key={card.id}
                  className={`flex w-36 shrink-0 sm:w-40 flex-col items-stretch gap-0 rounded-xl overflow-hidden ${headerBgClass}`}
                >
                  <div
                    className="w-full rounded-t-xl rounded-b-none pl-3 pr-2 py-1 text-left text-[9px] font-bold uppercase leading-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1">
                        {!isSelected && card.showLockIcon && (
                          <LockIcon className="opacity-95" />
                        )}
                        <span>{isSelected ? "Selected" : card.statusLabel}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`View ${card.name}`}
                        onClick={() => setPreviewCard(card)}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-black/30 text-[9px] font-black leading-none text-white"
                      >
                        i
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSelectCards) return;
                      if (isSelected) {
                        onDeselectCard?.();
                        return;
                      }
                      if (selectedCardId && selectedCardId !== card.id) {
                        onDeselectCard?.();
                        return;
                      }
                      const canUseNow = isMyTurn && card.canUseOnTurn && !!card.onUse;
                      if (!canUseNow) return;
                      const used = card.onUse!();
                      if (used) onSelectCard?.(card.id);
                    }}
                    className={`relative w-full aspect-[739/1040] rounded-xl border-2 overflow-hidden text-left ${borderClass}`}
                  >
                    {card.image ? (
                      <img
                        src={`/images/${card.image}`}
                        alt={card.name}
                        className="block h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-900" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollableRow>

      {previewCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewCard(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-gray-600 bg-[var(--color-bomb-surface)] p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewCard(null)}
              className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white"
            >
              Close
            </button>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="w-full aspect-[739/1040] overflow-hidden rounded-xl bg-slate-900">
                {previewCard.image ? (
                  <img
                    src={`/images/${previewCard.image}`}
                    alt={previewCard.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-900" />
                )}
              </div>
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2 text-white">
                <div className="text-base font-bold leading-tight">
                  {previewCard.name}
                </div>
                {previewCard.detailSubtitle && (
                  <div className="text-sm leading-relaxed text-gray-300">
                    {previewCard.detailSubtitle}
                  </div>
                )}
                {previewCard.detailTiming && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                      Timing
                    </div>
                    <div className="text-sm leading-relaxed text-gray-100">
                      {previewCard.detailTiming}
                    </div>
                  </div>
                )}
                {previewCard.detailEffect && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-300">
                      Effect
                    </div>
                    <div className="text-sm leading-relaxed text-gray-100">
                      {previewCard.detailEffect}
                    </div>
                  </div>
                )}
                {previewCard.detailReminders &&
                  previewCard.detailReminders.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold uppercase tracking-wide text-fuchsia-300">
                        Reminder
                      </div>
                      <ul className="space-y-2">
                        {previewCard.detailReminders.map((reminder) => (
                          <li key={reminder} className="text-sm leading-relaxed text-gray-200">
                            - {reminder}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
