import { useEffect } from "react";
import type { CharacterId } from "@bomb-busters/shared";
import { CHARACTER_IMAGES, CHARACTER_CARD_TEXT } from "@bomb-busters/shared";

export function CharacterCardOverlay({
  characterId,
  characterUsed,
  onClose,
}: {
  characterId: CharacterId;
  characterUsed: boolean;
  onClose: () => void;
}) {
  const card = CHARACTER_CARD_TEXT[characterId];
  const image = CHARACTER_IMAGES[characterId];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 p-3 sm:p-6 flex items-center justify-center"
      data-testid="character-card-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} character card`}
    >
      <div
        className="relative max-w-sm w-full rounded-xl border border-gray-700 bg-[var(--color-bomb-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-100">
            {card.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-character-overlay"
            className="rounded border border-gray-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-200 transition-colors hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        {/* Character image */}
        {image && (
          <div className="flex justify-center px-4 pt-4">
            <img
              src={`/images/${image}`}
              alt={card.name}
              className="w-32 h-32 rounded-lg object-cover"
            />
          </div>
        )}

        {/* Card content */}
        <div className="px-4 py-3 space-y-3">
          {/* Skill status badge */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                characterUsed
                  ? "bg-rose-900/70 text-rose-200"
                  : "bg-emerald-900/70 text-emerald-200"
              }`}
            >
              Skill {characterUsed ? "Used" : "Ready"}
            </span>
          </div>

          {/* Ability name & timing */}
          <div>
            <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide">
              {card.abilityName}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {card.timing}
            </div>
          </div>

          {/* Effect */}
          <p className="text-xs text-gray-200 leading-relaxed">
            {card.effect}
          </p>

          {/* Reminders */}
          {card.reminders.length > 0 && (
            <ul className="space-y-1">
              {card.reminders.map((r, i) => (
                <li
                  key={i}
                  className="text-[11px] text-gray-400 leading-snug pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-gray-600"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
