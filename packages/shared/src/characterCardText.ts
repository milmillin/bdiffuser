import type { CharacterId } from "./types.js";

export interface CharacterCardText {
  name: string;
  abilityName: string;
  timing: string;
  effect: string;
  reminders: string[];
  comingSoon: boolean;
}

/**
 * Character card text from GAME_RULES.md Section 14.
 */
export const CHARACTER_CARD_TEXT: Record<CharacterId, CharacterCardText> = {
  double_detector: {
    name: "Double Detector 2000",
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
    ],
    comingSoon: false,
  },
  character_2: {
    name: "Character 2",
    abilityName: "Ability 2",
    timing: "Once per mission.",
    effect: "This character's ability is not yet implemented.",
    reminders: [],
    comingSoon: true,
  },
  character_3: {
    name: "Character 3",
    abilityName: "Ability 3",
    timing: "Once per mission.",
    effect: "This character's ability is not yet implemented.",
    reminders: [],
    comingSoon: true,
  },
  character_4: {
    name: "Character 4",
    abilityName: "Ability 4",
    timing: "Once per mission.",
    effect: "This character's ability is not yet implemented.",
    reminders: [],
    comingSoon: true,
  },
  character_5: {
    name: "Character 5",
    abilityName: "Ability 5",
    timing: "Once per mission.",
    effect: "This character's ability is not yet implemented.",
    reminders: [],
    comingSoon: true,
  },
};
