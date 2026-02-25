import { useMemo } from "react";
import type { MarkdownSection, ListItem } from "./markdownParser.js";

interface FilterInput {
  mission: number;
  equipmentIds: string[];
}

/**
 * Reconstruct raw text from a list item's tokens for matching purposes.
 */
function listItemRawText(item: { tokens: { value: string }[] }): string {
  return item.tokens.map((t) => t.value).join("");
}

// ── Campaign redaction rules ────────────────────────────────────────

interface RedactionRule {
  /** Matches the section heading that contains the items. */
  sectionMatcher: (heading: { text: string }) => boolean;
  /** Matches individual list items within the section. */
  itemMatcher: (rawText: string) => boolean;
  /** Items are redacted when current mission is below this threshold. */
  missionThreshold: number;
}

const REDACTION_RULES: RedactionRule[] = [
  // False Bottom (Yellow equipment) — unlocked at mission 9
  {
    sectionMatcher: (h) => h.text.startsWith("Additional Equipment Card Assets"),
    itemMatcher: (text) => text.startsWith("Yellow equipment"),
    missionThreshold: 9,
  },
  // Campaign equipment cards (22, 33, 99, 10-10, 11-11) — unlocked at mission 41
  {
    sectionMatcher: (h) => h.text.startsWith("Additional Equipment Card Assets"),
    itemMatcher: (text) => /^Equipment /.test(text),
    missionThreshold: 41,
  },
  // New Characters E1-E4 — unlocked at mission 31
  {
    sectionMatcher: (h) => h.text.startsWith("New Characters"),
    itemMatcher: () => true,
    missionThreshold: 31,
  },
  // Constraints A-E — unlocked at mission 31
  {
    sectionMatcher: (h) => h.text === "Constraint Cards",
    itemMatcher: (text) => /Constraint [A-E]:/.test(text),
    missionThreshold: 31,
  },
  // Constraints F-L — unlocked at mission 32
  {
    sectionMatcher: (h) => h.text === "Constraint Cards",
    itemMatcher: (text) => /Constraint [F-L]:/.test(text),
    missionThreshold: 32,
  },
  // All challenge cards — unlocked at mission 55
  {
    sectionMatcher: (h) => h.text === "Challenge Cards",
    itemMatcher: () => true,
    missionThreshold: 55,
  },
];

/** Matches "Mission 12" → 12 */
const MISSION_HEADING_RE = /^Mission (\d+)$/;

/**
 * Walks the section tree and marks list items / mission sections as
 * `redacted` based on campaign progression (mission number).
 */
function applyRedactions(
  sections: MarkdownSection[],
  mission: number,
): MarkdownSection[] {
  return sections.map((section) => {
    // ── Item-level redaction ──────────────────────────────────────
    const activeRules = REDACTION_RULES.filter(
      (rule) =>
        rule.sectionMatcher(section.heading) &&
        mission < rule.missionThreshold,
    );

    let body = section.body;
    if (activeRules.length > 0) {
      body = body.map((node) => {
        if (node.kind !== "unordered-list" && node.kind !== "ordered-list")
          return node;

        return {
          ...node,
          items: node.items.map((item): ListItem => {
            const raw = listItemRawText(item);
            const shouldRedact = activeRules.some((rule) =>
              rule.itemMatcher(raw),
            );
            return shouldRedact ? { ...item, redacted: true } : item;
          }),
        };
      });
    }

    // ── Section-level redaction (mission cards) ──────────────────
    let subsections = section.subsections;
    if (subsections.length > 0) {
      subsections = subsections.map((sub) => {
        const m = MISSION_HEADING_RE.exec(sub.heading.text);
        if (m && Number(m[1]) !== mission) {
          return { ...sub, redacted: true };
        }
        return sub;
      });
      // Recurse into non-redacted subsections for deeper redaction
      subsections = subsections.map((sub) =>
        sub.redacted
          ? sub
          : (() => {
              const deeper = applyRedactions([sub], mission);
              return deeper[0];
            })(),
      );
    }

    if (body === section.body && subsections === section.subsections)
      return section;
    return { ...section, body, subsections };
  });
}

/**
 * Filters parsed GAME_RULES.md sections to show only what's relevant
 * for the current mission, and marks campaign-locked items as redacted.
 */
export function useFilteredRules(
  sections: MarkdownSection[],
  filter: FilterInput,
): MarkdownSection[] {
  return useMemo(() => {
    const filtered = sections.flatMap((section): MarkdownSection[] => {
      const h2 = section.heading.text;

      // Always hide "Source" section
      if (h2.startsWith("Source")) return [];

      // Hide inline TOC — we have sidebar/dropdown TOC components instead
      if (h2 === "Table of Contents") return [];

      // All other sections: keep as-is
      return [section];
    });

    return applyRedactions(filtered, filter.mission);
  }, [sections, filter.mission, filter.equipmentIds]);
}
