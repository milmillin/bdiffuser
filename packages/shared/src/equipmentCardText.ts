import type { EquipmentDef } from "./imageMap.js";

export interface EquipmentCardText {
  timing: string;
  effect: string;
  reminders: string[];
}

const TIMING_FALLBACK: Record<EquipmentDef["useTiming"], string> = {
  anytime: "Can be used at any time.",
  in_turn: "To be used in turn.",
  start_of_turn: "To be used at the start of your turn.",
  immediate: "Immediate effect.",
};

/**
 * Rule text source: GAME_RULES.md section 13.4 and 13.5.
 * Keep wording aligned with the rulebook while we use generated text cards.
 */
export const EQUIPMENT_CARD_TEXT: Record<string, EquipmentCardText> = {
  label_neq: {
    timing: "Can be used at any time.",
    effect:
      "Place the != token in front of 2 adjacent wires of different values.",
    reminders: [
      "One of the 2 wires may already be cut.",
      "Two yellow wires or two red wires are considered identical for this check.",
    ],
  },
  talkies_walkies: {
    timing: "Can be used at any time.",
    effect:
      "Swap 2 wires: you place one of your uncut wires face down in front of a teammate, then they do the same.",
    reminders: [
      "Any uncut wire color can be exchanged, including yellow and red.",
      "Everyone sees where these wires are taken and replaced.",
      "If the swapped wire has an info token, the token follows the wire to its new stand.",
      "Players cannot communicate or request a specific value during the swap.",
    ],
  },
  triple_detector: {
    timing: "To be used in turn.",
    effect:
      "During a Dual Cut action, announce one value (not yellow) and designate 3 wires from a teammate stand.",
    reminders: [
      "Works like Double Detector 2000, but with 3 wires.",
      "Success: at least one of the 3 wires matches; teammate cuts one matching wire without revealing if multiple match.",
      "Failure: none match; teammate places an info token on one of the 3 wires (their choice).",
    ],
  },
  post_it: {
    timing: "Can be used at any time.",
    effect: "Place an Info token in front of one of your blue wires.",
    reminders: [],
  },
  super_detector: {
    timing: "To be used in turn.",
    effect:
      "During a Dual Cut action, announce one value (not yellow) and designate an entire teammate stand.",
    reminders: [
      "Works like Double Detector 2000, but with all wires in that stand.",
      "Same success/failure rules as Triple Detector but for the entire stand.",
    ],
  },
  rewinder: {
    timing: "Can be used at any time.",
    effect: "Move the detonator back one notch.",
    reminders: [],
  },
  emergency_batteries: {
    timing: "Can be used at any time.",
    effect:
      "Turn one or two used Character cards face up so their personal equipment is available again this mission.",
    reminders: [],
  },
  general_radar: {
    timing: "Can be used at any time.",
    effect:
      "Announce a number (1-12). All players answer yes if they have at least one uncut blue wire of that value.",
    reminders: [
      "If a player has 2 stands, they answer for each stand.",
      "Only reveal yes/no, not location or quantity.",
      "YELLOW and RED wires have no numeric value — a 7.5 red wire does NOT count as '7'.",
    ],
  },
  stabilizer: {
    timing: "To be used at the start of your turn.",
    effect:
      "Use before a Dual Cut. If that Dual Cut fails this turn, the detonator does not advance and the bomb does not explode.",
    reminders: [
      "If a wrong wire was designated, the targeted player still places the usual Info token.",
      "If the chosen wire is RED, do not place an info token.",
    ],
  },
  x_or_y_ray: {
    timing: "To be used in turn.",
    effect:
      "During a Dual Cut action, designate one wire and announce 2 possible values (yellow included).",
    reminders: [
      "You must have both announced values in your own hand.",
      "Success if the wire matches either announced value; both that wire and your matching wire are revealed.",
      "The two announced values need not be consecutive.",
    ],
  },
  coffee_mug: {
    timing: "To be used in turn.",
    effect:
      "Skip your turn and choose who the next active bomb disposal expert will be (without consulting teammates).",
    reminders: ["The game then continues clockwise from the chosen bomb disposal expert."],
  },
  label_eq: {
    timing: "Can be used at any time.",
    effect: "Place the = token in front of 2 adjacent wires of the same value.",
    reminders: [
      "One of the 2 wires may already be cut.",
      "Two yellow wires or two red wires are considered identical for this effect.",
    ],
  },
  false_bottom: {
    timing: "Immediate effect.",
    effect: "Take 2 Equipment cards and put them in the game with the others.",
    reminders: [
      "Depending on the wire values already cut, it is possible for these cards to be used immediately.",
    ],
  },
  single_wire_label: {
    timing: "Can be used at any time.",
    effect:
      "Put a x1 token in front of 1 of your blue wires (either cut or uncut). This shows the indicated value is represented only once on the tile stand (cut wires included).",
    reminders: [],
  },
  emergency_drop: {
    timing: "Immediate effect.",
    effect:
      "Immediately flip all used Equipment cards faceup. They can now be used again during this mission.",
    reminders: [],
  },
  fast_pass: {
    timing: "To be used in turn.",
    effect:
      "You can do a Solo Cut action to cut 2 identical wires — even if they are not the last remaining wires of that value.",
    reminders: [],
  },
  disintegrator: {
    timing: "Immediate effect.",
    effect:
      "Draw a random Info token (1-12); all players cut their possible remaining wires of that value.",
    reminders: [],
  },
  grappling_hook: {
    timing: "Can be used at any time.",
    effect:
      "Point at a teammate's wire, take it without revealing it, and put it in order in your hand.",
    reminders: [
      "Everyone sees where this wire comes from and ends up.",
      "If the receiving player has 2 stands, they choose which stand to place the wire on.",
    ],
  },
};

export function getEquipmentCardText(
  equipmentId: string,
  fallback?: Pick<EquipmentDef, "useTiming" | "description">,
): EquipmentCardText {
  const fromRules = EQUIPMENT_CARD_TEXT[equipmentId];
  if (fromRules) return fromRules;

  return {
    timing: fallback ? TIMING_FALLBACK[fallback.useTiming] : "Timing not specified.",
    effect: fallback?.description ?? "Effect text unavailable.",
    reminders: [],
  };
}
