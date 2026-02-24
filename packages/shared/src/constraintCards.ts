/**
 * Constraint card definitions (A–L) from GAME_RULES.md.
 *
 * Used in missions 31, 32, 34, 37, 57, 61, 66 etc.
 */

export interface ConstraintCardDef {
  /** Card letter identifier (A–L). */
  id: string;
  /** Display name shown on the card. */
  name: string;
  /** Full rule text from the card. */
  description: string;
}

export const CONSTRAINT_CARD_DEFS: readonly ConstraintCardDef[] = [
  {
    id: "A",
    name: "Even Wires Only",
    description: "You must cut only even wires.",
  },
  {
    id: "B",
    name: "Odd Wires Only",
    description: "You must cut only odd wires.",
  },
  {
    id: "C",
    name: "Wires 1–6 Only",
    description: "You must cut only wires 1 to 6.",
  },
  {
    id: "D",
    name: "Wires 7–12 Only",
    description: "You must cut only wires 7 to 12.",
  },
  {
    id: "E",
    name: "Wires 4–9 Only",
    description: "You must cut only wires 4 to 9.",
  },
  {
    id: "F",
    name: "No Wires 4–9",
    description: "You cannot cut wires 4 to 9.",
  },
  {
    id: "G",
    name: "No Equipment",
    description:
      "You CANNOT use Equipment cards or your own personal equipment.",
  },
  {
    id: "H",
    name: "No Info on Fail",
    description:
      "If your cut or a cut in your hand fails, do not place an Info token (and do not reveal the value). You cannot cut a wire indicated by an Info token. Equipment 4 (Post-it) cannot be used.",
  },
  {
    id: "I",
    name: "No Far-Right Wire",
    description:
      "You cannot cut the far-right wire (highest number) on teammates' tile stands.",
  },
  {
    id: "J",
    name: "No Far-Left Wire",
    description:
      "You cannot cut the far-left wire (lowest number) on teammates' tile stands.",
  },
  {
    id: "K",
    name: "No Solo Cut",
    description: "You cannot do a Solo Cut action.",
  },
  {
    id: "L",
    name: "Double Detonator",
    description:
      "If the cut fails, the detonator dial advances 2 spaces (instead of 1).",
  },
] as const;

/** Look up a constraint card definition by its letter ID. */
export function getConstraintCardDef(
  id: string,
): ConstraintCardDef | undefined {
  return CONSTRAINT_CARD_DEFS.find((c) => c.id === id);
}
