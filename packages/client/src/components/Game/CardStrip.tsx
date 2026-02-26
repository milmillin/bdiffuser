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
import { CardPreviewModal, type CardPreviewCard } from "./CardPreviewModal.js";

const EQUIPMENT_DEFS_BY_ID = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));
const MULTIPLICATION_SIGN = "\u00D7";

const FOUR_CUT_EQUIPMENT_IDS = new Set<string>([
  "single_wire_label",
  "emergency_drop",
  "fast_pass",
  "disintegrator",
  "grappling_hook",
]);

function getPrimaryLockCutsRequired(eq: BoardState["equipment"][number]): number {
  return FOUR_CUT_EQUIPMENT_IDS.has(eq.id) ? 4 : 2;
}

function formatLockRequirement(value: string | number, cuts: number): string {
  return `${value}${MULTIPLICATION_SIGN}${cuts}`;
}

type StackCard = CardPreviewCard & {
  kind: "character" | "equipment";
  id: string;
  image: string | null;
  isUsed: boolean;
  isLocked: boolean;
  statusLabel: string;
  showLockIcon: boolean;
  statusClassName: string;
  frameClassName: string;
  canUse: boolean;
  onUse?: () => boolean;
};

function getStatusLabel(eq: BoardState["equipment"][number]) {
  if (eq.used) return { label: "Used", className: "bg-black/75 text-gray-200" };
  if (eq.faceDown) {
    return { label: "Face Down", className: "bg-black/75 text-slate-200" };
  }
  const primaryCuts = getPrimaryLockCutsRequired(eq);
  const primaryRequirement = formatLockRequirement(eq.unlockValue, primaryCuts);
  if (eq.unlocked && eq.secondaryLockValue !== undefined) {
    const secondaryCuts = eq.secondaryLockCutsRequired ?? 2;
    const secondaryRequirement = formatLockRequirement(
      eq.secondaryLockValue,
      secondaryCuts,
    );
    return {
      label: `Locked ${primaryRequirement} ${secondaryRequirement}`,
      className: "bg-black/75 text-amber-200",
    };
  }
  if (eq.unlocked) {
    return { label: "Available", className: "bg-emerald-700/85 text-white" };
  }
  return {
    label: `Locked ${primaryRequirement}`,
    className: "bg-black/75 text-yellow-200",
  };
}

function getFrameClass(eq: BoardState["equipment"][number]): string {
  if (eq.used) return "border-black/75";
  if (eq.faceDown) {
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
  const [previewCard, setPreviewCard] = useState<CardPreviewCard | null>(null);

  const cards = useMemo<StackCard[]>(() => {
    const builtCards: StackCard[] = [];

    if (character) {
      const charText = CHARACTER_CARD_TEXT[character];
      const charImage = CHARACTER_IMAGES[character];
      const skillUsed = characterUsed ?? false;
      builtCards.push({
        kind: "character",
        id: `personal-${character}`,
        name: charText.name,
        image: skillUsed ? "character_back.png" : charImage,
        previewImage: charImage,
        isUsed: skillUsed,
        isLocked: false,
        statusLabel: skillUsed ? "Used" : "Available",
        showLockIcon: false,
        statusClassName: skillUsed
          ? "bg-black/75 text-gray-200"
          : "bg-emerald-700/85 text-white",
        frameClassName: skillUsed
          ? "border-black/75"
          : "border-emerald-700/85",
        detailSubtitle: charText.abilityName,
        detailTiming: charText.timing,
        detailEffect: charText.effect,
        detailReminders: [...charText.reminders],
        canUse: !skillUsed,
        onUse: onSelectPersonalSkill,
      });
    }

    for (const eq of equipment) {
      const status = getStatusLabel(eq);
      const def = EQUIPMENT_DEFS_BY_ID.get(eq.id);
      const rulesText = getEquipmentCardText(eq.id, def);
      const showBackImage = eq.faceDown || eq.used;
      const isLockedEquipmentCard =
        !eq.used &&
        (eq.faceDown ||
          (eq.unlocked && eq.secondaryLockValue !== undefined) ||
          !eq.unlocked);
      builtCards.push({
        kind: "equipment",
        id: `equipment-${eq.id}`,
        name: eq.name,
        image: showBackImage ? "equipment_back.png" : eq.image,
        previewImage: eq.faceDown ? "equipment_back.png" : eq.image,
        isUsed: eq.used,
        isLocked: isLockedEquipmentCard,
        statusLabel: status.label,
        showLockIcon:
          eq.faceDown ||
          (eq.unlocked && eq.secondaryLockValue !== undefined) ||
          !eq.unlocked,
        statusClassName: status.className,
        frameClassName: getFrameClass(eq),
        detailSubtitle:
          eq.faceDown
            ? "Mission-locked card"
            : `Equipment ${eq.unlockValue}`,
        detailTiming: rulesText.timing,
        detailEffect: rulesText.effect,
        detailReminders: [...rulesText.reminders],
        canUse: !eq.faceDown && eq.unlocked && !eq.used,
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
        <div className="mx-auto w-max min-w-full py-2">
          <div className="flex flex-nowrap justify-center gap-2 sm:gap-3">
            {cards.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isCardEnabled = canSelectCards && card.canUse && !!card.onUse;
              const showDisabledOverlay =
                (card.kind === "equipment" && !isCardEnabled) ||
                (card.kind === "character" && card.isUsed);
              const overlayClassName =
                card.kind === "equipment" && card.isLocked
                  ? "bg-black/50"
                  : "bg-black/65";
              const headerBgClass = isSelected
                ? "bg-sky-700/85 text-white"
                : card.statusClassName;
              const borderClass = isSelected ? "border-sky-500" : card.frameClassName;
              const wrapperScaleClass = isSelected ? "scale-[1.02]" : "";
              const wrapperHoverClass = isCardEnabled
                ? isSelected
                  ? "cursor-pointer hover:scale-[1.025]"
                  : "cursor-pointer hover:scale-[1.01]"
                : "cursor-default";
              const buttonCursorClass = isCardEnabled
                ? "cursor-pointer"
                : "cursor-default";
              return (
                <div
                  key={card.id}
                  className={`flex w-36 shrink-0 sm:w-40 flex-col items-stretch gap-0 rounded-xl overflow-hidden transition-transform duration-150 ease-out ${headerBgClass} ${wrapperScaleClass} ${wrapperHoverClass}`}
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
                      if (!isCardEnabled) return;
                      if (isSelected) {
                        onDeselectCard?.();
                        return;
                      }
                      if (selectedCardId && selectedCardId !== card.id) {
                        onDeselectCard?.();
                        return;
                      }
                      const used = card.onUse!();
                      if (used) onSelectCard?.(card.id);
                    }}
                    className={`relative w-full aspect-[739/1040] rounded-xl border-2 overflow-hidden text-left ${borderClass} ${buttonCursorClass}`}
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
                    {showDisabledOverlay && (
                      <div
                        className={`pointer-events-none absolute inset-0 ${overlayClassName}`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollableRow>

      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          onClose={() => setPreviewCard(null)}
        />
      )}
    </div>
  );
}
