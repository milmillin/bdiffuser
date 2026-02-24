import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ClientGameState } from "@bomb-busters/shared";
import gameRulesMarkdown from "../../../../../../GAME_RULES.md?raw";
import { parseMarkdown } from "./markdownParser.js";
import type { MarkdownSection } from "./markdownParser.js";
import { SectionView } from "./markdownRenderer.js";
import { useFilteredRules } from "./useFilteredRules.js";

// Parse once at module load — the raw markdown never changes at runtime.
const ALL_SECTIONS: MarkdownSection[] = parseMarkdown(gameRulesMarkdown);

// ── TOC ────────────────────────────────────────────────────────────

function TableOfContents({
  sections,
  activeId,
  onNavigate,
}: {
  sections: MarkdownSection[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="Table of contents" className="space-y-0.5 text-[11px]">
      {sections.map((s) => (
        <div key={s.heading.id}>
          <button
            type="button"
            onClick={() => onNavigate(s.heading.id)}
            className={`block w-full truncate rounded px-1.5 py-0.5 text-left transition-colors ${
              activeId === s.heading.id
                ? "bg-amber-500/15 font-bold text-amber-300"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {s.heading.text}
          </button>
          {s.subsections.map((sub) => (
            <button
              key={sub.heading.id}
              type="button"
              onClick={() => onNavigate(sub.heading.id)}
              className={`block w-full truncate rounded py-0.5 pl-4 pr-1.5 text-left transition-colors ${
                activeId === sub.heading.id
                  ? "bg-amber-500/15 font-bold text-amber-300"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {sub.heading.text}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function GameRulesPopup({
  isOpen,
  onClose,
  gameState,
}: {
  isOpen: boolean;
  onClose: () => void;
  gameState: ClientGameState;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState("");

  // Derive filter inputs
  const equipmentIds = useMemo(
    () => gameState.board.equipment.map((e) => e.id),
    [gameState.board.equipment],
  );

  const filteredSections = useFilteredRules(ALL_SECTIONS, {
    mission: gameState.mission,
    equipmentIds,
  });

  // Intersection observer to track active heading
  useEffect(() => {
    if (!isOpen) return;

    const container = contentRef.current;
    if (!container) return;

    const headings = container.querySelectorAll("h2[id], h3[id]");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: container,
        rootMargin: "0px 0px -80% 0px",
        threshold: 0,
      },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [isOpen, filteredSections]);

  const handleNavigate = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 p-3 sm:p-6"
      data-testid="rules-popup"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Game rules"
    >
      <div
        className="mx-auto flex h-full max-h-[95vh] max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-[var(--color-bomb-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-100">
              Game Rules
            </h2>
            <p className="text-xs text-gray-400">
              Mission {gameState.mission} — showing relevant rules only
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-rules-popup"
            className="rounded border border-gray-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-200 transition-colors hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        {/* Two-column layout: content + TOC */}
        <div className="flex min-h-0 flex-1">
          {/* Scrollable content */}
          <div
            ref={contentRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 py-3"
          >
            <div className="space-y-5">
              {filteredSections.map((section) => (
                <SectionView key={section.heading.id} section={section} />
              ))}
            </div>
          </div>

          {/* TOC sidebar — hidden on small screens */}
          <div className="hidden w-56 shrink-0 overflow-y-auto overscroll-none border-l border-gray-700 px-2 py-3 lg:block">
            <TableOfContents
              sections={filteredSections}
              activeId={activeId}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
