import { useEffect } from "react";

export type CardPreviewCard = {
  name: string;
  previewImage: string | null;
  detailSubtitle?: string;
  detailTiming?: string;
  detailEffect?: string;
  detailReminders?: string[];
};

export function CardPreviewModal({
  card,
  onClose,
}: {
  card: CardPreviewCard;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} card details`}
    >
      <div
        className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-gray-600 bg-[var(--color-bomb-surface)] p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white"
        >
          Close
        </button>
        <div className="min-h-0 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="shrink-0 w-full aspect-[739/1040] max-h-[50dvh] sm:max-h-none overflow-hidden rounded-xl bg-slate-900">
            {card.previewImage ? (
              <img
                src={`/images/${card.previewImage}`}
                alt={card.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full bg-slate-900" />
            )}
          </div>
          <div className="space-y-4 pr-2 text-white min-h-0 max-h-[40dvh] sm:max-h-none overflow-y-auto overscroll-none">
            <div className="text-base font-bold leading-tight">{card.name}</div>
            {card.detailSubtitle && (
              <div className="text-sm leading-relaxed text-gray-300">
                {card.detailSubtitle}
              </div>
            )}
            {card.detailTiming && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                  Timing
                </div>
                <div className="text-sm leading-relaxed text-gray-100">
                  {card.detailTiming}
                </div>
              </div>
            )}
            {card.detailEffect && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wide text-amber-300">
                  Effect
                </div>
                <div className="text-sm leading-relaxed text-gray-100">
                  {card.detailEffect}
                </div>
              </div>
            )}
            {card.detailReminders && card.detailReminders.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wide text-fuchsia-300">
                  Reminder
                </div>
                <ul className="space-y-2">
                  {card.detailReminders.map((reminder) => (
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
  );
}
