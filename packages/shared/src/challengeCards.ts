/**
 * Challenge card definitions (1–10) from GAME_RULES.md.
 *
 * Used in missions 55, 60, etc. When a challenge is completed,
 * discard it and move the detonator dial back 1 space.
 */

export interface ChallengeCardDef {
  /** Numeric card identifier (1–10). */
  id: number;
  /** Short display name for the card. */
  name: string;
  /** Full condition text from the card. */
  description: string;
}

export const CHALLENGE_CARD_DEFS: readonly ChallengeCardDef[] = [
  {
    id: 1,
    name: "Cut a Red Wire",
    description:
      'Instead of their action, a bomb disposal expert cuts a teammate\'s wire, saying "It is RED." If that wire is not RED, the bomb explodes!',
  },
  {
    id: 2,
    name: "4 Consecutive Even Cuts",
    description: "4 bomb disposal experts consecutively cut EVEN numbers.",
  },
  {
    id: 3,
    name: "2-Wire Pairs",
    description:
      "Uncut wires on a tile stand consist of 2-wire pairs (separated by cut wires).",
  },
  {
    id: 4,
    name: "Validation Sum 18",
    description:
      "The sum of the first 3 Validation tokens used equals 18.",
  },
  {
    id: 5,
    name: "2 Consecutive Solo Cuts",
    description:
      "2 bomb disposal experts consecutively perform the SOLO Cut action.",
  },
  {
    id: 6,
    name: "5 Isolated Wires",
    description:
      "On a single tile stand, at least 5 uncut wires have been isolated (the adjacent wires have been cut).",
  },
  {
    id: 7,
    name: "3 Sequential Values",
    description:
      "3 bomb disposal experts consecutively cut sequential values (either up or down). Examples: 8-9-10 or 5-4-3.",
  },
  {
    id: 8,
    name: "First 2 Validations Match",
    description:
      "The first 2 Validation tokens are put on these numbers. Put 2 faceup Number cards HERE.",
  },
  {
    id: 9,
    name: "All Odd Stand",
    description:
      "A tile stand has only uncut ODD wires (a minimum of 6 wires). Ignore RED and YELLOW wires.",
  },
  {
    id: 10,
    name: "7 Cut, Ends Uncut",
    description:
      "On a single tile stand, at least 7 wires have been cut, but the 2 wires on each end have not been cut yet.",
  },
] as const;

/** Look up a challenge card definition by its numeric ID. */
export function getChallengeCardDef(
  id: number,
): ChallengeCardDef | undefined {
  return CHALLENGE_CARD_DEFS.find((c) => c.id === id);
}
