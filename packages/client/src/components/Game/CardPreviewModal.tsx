import { useEffect } from "react";
import { getCardRotationTransform, type CardRotation } from "./cardRotation.js";
import { useIsMobileViewport } from "./useIsMobileViewport.js";

export type CardPreviewCard = {
  name: string;
  previewImage: string | null;
  /** Override the default portrait aspect ratio (e.g. "1037/736" for landscape). */
  previewAspectRatio?: string;
  /** Mobile-only aspect ratio override. */
  previewMobileAspectRatio?: string;
  /** Scale the modal/card display size (e.g. 1.5 = 150%). */
  previewScale?: number;
  /** Rotate preview image in 90-degree steps. */
  previewRotation?: CardRotation;
  /** Mobile-only rotation override. */
  previewMobileRotation?: CardRotation;
  /** Rotate the preview image counter-clockwise 90 degrees. */
  previewRotateCcw90?: boolean;
  detailSubtitle?: string;
  detailTiming?: string;
  detailEffect?: string;
  detailReminders?: string[];
};

export function getEffectivePreviewRotation(
  card: CardPreviewCard,
  isMobile: boolean,
): CardRotation {
  if (isMobile && card.previewMobileRotation) return card.previewMobileRotation;
  if (card.previewRotation) return card.previewRotation;
  if (card.previewRotateCcw90) return "ccw90";
  return "none";
}

export function getEffectivePreviewAspectRatio(
  card: CardPreviewCard,
  isMobile: boolean,
): string {
  if (isMobile && card.previewMobileAspectRatio) return card.previewMobileAspectRatio;
  return card.previewAspectRatio ?? "739/1040";
}

export function CardPreviewModal({
  card,
  onClose,
}: {
  card: CardPreviewCard;
  onClose: () => void;
}) {
  const isMobile = useIsMobileViewport();
  const requestedScale = card.previewScale ?? 1;
  const previewScale =
    Number.isFinite(requestedScale) && requestedScale > 0
      ? requestedScale
      : 1;
  const maxWidthRem = 42 * previewScale;
  const imageRotation = getEffectivePreviewRotation(card, isMobile);
  const imageTransform = getCardRotationTransform(imageRotation);
  const previewAspectRatio = getEffectivePreviewAspectRatio(card, isMobile);

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
        className="relative w-full max-w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-gray-600 bg-[var(--color-bomb-surface)] p-3"
        style={{ maxWidth: `${maxWidthRem}rem` }}
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
          <div
            className="shrink-0 w-full max-h-[50dvh] sm:max-h-none overflow-hidden rounded-xl bg-slate-900"
            style={{ aspectRatio: previewAspectRatio }}
            data-preview-aspect={previewAspectRatio}
          >
            {card.previewImage ? (
              <img
                src={`/images/${card.previewImage}`}
                alt={card.name}
                className="h-full w-full object-contain"
                style={imageTransform ? { transform: imageTransform } : undefined}
                data-preview-rotation={imageRotation}
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
