import type { CharacterId } from "./types.js";

export interface CharacterCardText {
  name: string;
  abilityName: string;
  timing: string;
  effect: string;
  reminders: string[];
  comingSoon: boolean;
}

/** All base characters that have the Double Detector personal equipment. */
export const DOUBLE_DETECTOR_CHARACTERS: ReadonlySet<CharacterId> = new Set<CharacterId>([
  "double_detector",
  "character_2",
  "character_3",
  "character_4",
  "character_5",
]);

/** Shared Double Detector ability fields used by all 5 base characters. */
const DOUBLE_DETECTOR_ABILITY = {
  abilityName: "Double Detector",
  timing: "Once per mission, during your Dual Cut action.",
  effect:
    "Declare one value and point to 2 wires in one teammate's stand (instead of 1). " +
    "If either wire matches, it is cut along with your matching wire. " +
    "If both match, the first designated wire is cut. " +
    "If neither matches, the detonator advances 1 and an info token is placed on one of the two wires.",
  reminders: [
    "You must have the declared value as an uncut blue wire in your own hand.",
    "If exactly one of the two pointed wires is red, the bomb does not explode; the info token is placed on the non-red wire.",
    "The 2 designated wires need not be adjacent.",
    "Both wires must be on the same stand (cannot span 2 stands of one player).",
    "If both designated wires are red, the bomb explodes.",
    "Cannot announce YELLOW or RED — only values 1–12.",
  ],
  comingSoon: false,
} as const satisfies Omit<CharacterCardText, "name">;

/**
 * Character card text from GAME_RULES.md Section 14.
 */
export const CHARACTER_CARD_TEXT: Record<CharacterId, CharacterCardText> = {
  double_detector: {
    name: "Double Detector 2000",
    ...DOUBLE_DETECTOR_ABILITY,
  },
  character_2: {
    name: "Character 2",
    ...DOUBLE_DETECTOR_ABILITY,
  },
  character_3: {
    name: "Character 3",
    ...DOUBLE_DETECTOR_ABILITY,
  },
  character_4: {
    name: "Character 4",
    ...DOUBLE_DETECTOR_ABILITY,
  },
  character_5: {
    name: "Character 5",
    ...DOUBLE_DETECTOR_ABILITY,
  },
  character_e1: {
    name: "Character E1",
    abilityName: "General Radar",
    timing: "Once per mission, can be used at any time.",
    effect:
      "Announce a number (1–12). All players answer 'Yes' if they have at least one uncut blue wire of that value.",
    reminders: [
      "If a player has 2 stands, they answer for each stand.",
      "Only reveal yes/no, not location or quantity.",
      "YELLOW and RED wires have no numeric value.",
    ],
    comingSoon: false,
  },
  character_e2: {
    name: "Character E2",
    abilityName: "Walkie-Talkies",
    timing: "Once per mission, can be used at any time.",
    effect:
      "Swap 2 wires: take one of your uncut wires and place it face down in front of a teammate. They do the same.",
    reminders: [
      "Any uncut wire color can be exchanged, including yellow and red.",
      "Everyone sees where the wires come from and end up.",
      "If the swapped wire has an info token, the token follows the wire.",
    ],
    comingSoon: false,
  },
  character_e3: {
    name: "Character E3",
    abilityName: "Triple Detector",
    timing: "Once per mission, during your Dual Cut action.",
    effect:
      "Declare one value (not yellow) and point to 3 wires in one teammate's stand. " +
      "If at least one matches, the teammate cuts one matching wire. " +
      "If none match, the detonator advances 1 and an info token is placed on one of the three wires.",
    reminders: [
      "Works like Double Detector but with 3 wires.",
      "All 3 wires must be on the same stand.",
      "Cannot announce YELLOW or RED — only values 1–12.",
    ],
    comingSoon: false,
  },
  character_e4: {
    name: "Character E4",
    abilityName: "X or Y Ray",
    timing: "Once per mission, during your Dual Cut action.",
    effect:
      "Designate one wire and announce 2 possible values (yellow included). " +
      "Success if the wire matches either value; both that wire and your matching wire are revealed.",
    reminders: [
      "You must have both announced values in your own hand.",
      "The two announced values need not be consecutive.",
    ],
    comingSoon: false,
  },
};
