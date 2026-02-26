export function BoardViewOverlay({
  onBack,
  buttonClassName,
}: {
  onBack: () => void;
  buttonClassName: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40" data-testid="board-view-overlay">
      <button
        type="button"
        onClick={onBack}
        data-testid="board-view-back-button"
        className={`pointer-events-auto fixed top-[max(env(safe-area-inset-top),0.75rem)] left-3 right-3 sm:top-4 sm:left-4 sm:right-auto z-50 text-center ${buttonClassName}`}
      >
        Back to Results
      </button>
    </div>
  );
}
