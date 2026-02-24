import { useMemo } from "react";
import type { MarkdownSection } from "./markdownParser.js";
import { EQUIPMENT_ID_TO_RULES_LABEL } from "./equipmentIdMapping.js";

interface FilterInput {
  mission: number;
  equipmentIds: string[];
}

/**
 * Matches an equipment list item against a set of rules-document labels.
 *
 * Equipment items in GAME_RULES.md start with patterns like:
 *   - Equipment `1` (`Label !=`)
 *   - Yellow equipment - `False Bottom`
 *
 * We check whether the first inline token text contains "Equipment `{label}`"
 * or "Yellow equipment" depending on the label.
 */
function equipmentItemMatches(
  itemText: string,
  presentLabels: Set<string>,
): boolean {
  for (const label of presentLabels) {
    if (label === "Yellow equipment") {
      if (itemText.includes("Yellow equipment")) return true;
    } else {
      // Match "Equipment `N`" pattern — the backticks are stripped by the
      // tokenizer, so we check the raw concatenated text.
      if (itemText.includes(`Equipment`) && itemText.includes(label)) {
        // More precise: check for "Equipment `{label}`" or "Equipment {label}"
        const pattern = new RegExp(`Equipment\\s+\`?${escapeRegex(label)}\`?`);
        if (pattern.test(itemText)) return true;
      }
    }
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reconstruct raw text from a list item's tokens for matching purposes.
 */
function listItemRawText(
  item: { tokens: { value: string }[] },
): string {
  return item.tokens.map((t) => t.value).join("");
}

/**
 * Filters parsed GAME_RULES.md sections to show only what's relevant
 * for the current mission and present equipment.
 */
export function useFilteredRules(
  sections: MarkdownSection[],
  filter: FilterInput,
): MarkdownSection[] {
  return useMemo(() => {
    const { mission, equipmentIds } = filter;

    // Build the set of rules-doc labels for present equipment
    const presentLabels = new Set<string>();
    for (const id of equipmentIds) {
      const label = EQUIPMENT_ID_TO_RULES_LABEL[id];
      if (label) presentLabels.add(label);
    }

    const hasEquipment = presentLabels.size > 0;

    return sections.flatMap((section): MarkdownSection[] => {
      const h2 = section.heading.text;

      // Always hide "Source" section
      if (h2.startsWith("Source")) return [];

      // Hide inline TOC — we have sidebar/dropdown TOC components instead
      if (h2 === "Table of Contents") return [];

      // Equipment section (13): filter subsections
      if (h2.startsWith("13.")) {
        const filteredSubs = section.subsections.flatMap(
          (sub): MarkdownSection[] => {
            const subText = sub.heading.text;

            // Always hide "Equipment Back Art"
            if (subText.includes("13.6")) return [];

            // Filter 13.4 and 13.5 by present equipment
            if (subText.includes("13.4") || subText.includes("13.5")) {
              if (!hasEquipment) return [];

              // Filter the list items within the body
              const filteredBody = sub.body.map((node) => {
                if (
                  node.kind !== "unordered-list" &&
                  node.kind !== "ordered-list"
                )
                  return node;

                const filteredItems = node.items.filter((item) => {
                  const raw = listItemRawText(item);
                  return equipmentItemMatches(raw, presentLabels);
                });

                if (filteredItems.length === 0) return null;
                return { ...node, items: filteredItems };
              }).filter((n): n is NonNullable<typeof n> => n !== null);

              if (filteredBody.length === 0) return [];
              return [{ ...sub, body: filteredBody }];
            }

            // Keep other 13.x subsections as-is (13.1, 13.2, 13.3)
            return [sub];
          },
        );

        return [{ ...section, subsections: filteredSubs }];
      }

      // All other sections: keep as-is
      return [section];
    });
  }, [sections, filter.mission, filter.equipmentIds]);
}
