/**
 * Image mapping for Bomb Busters assets.
 *
 * Uses individual asset images from /images/ directory.
 */
import type { EquipmentUnlockValue } from "./types.js";

// ── Blue Wire Images (values 1-12) ─────────────────────────

export const BLUE_WIRE_IMAGES: Record<number, string> = {
  1: "wire_1.png",
  2: "wire_2.png",
  3: "wire_3.png",
  4: "wire_4.png",
  5: "wire_5.png",
  6: "wire_6.png",
  7: "wire_7.png",
  8: "wire_8.png",
  9: "wire_9.png",
  10: "wire_10.png",
  11: "wire_11.png",
  12: "wire_12.png",
};

// ── Yellow Wire Images (sort values 1.1-11.1) ──────────────

export const YELLOW_WIRE_IMAGES: Record<number, string> = {
  1.1: "wire_yellow_1-1.png",
  2.1: "wire_yellow_2-1.png",
  3.1: "wire_yellow_3-1.png",
  4.1: "wire_yellow_4-1.png",
  5.1: "wire_yellow_5-1.png",
  6.1: "wire_yellow_6-1.png",
  7.1: "wire_yellow_7-1.png",
  8.1: "wire_yellow_8-1.png",
  9.1: "wire_yellow_9-1.png",
  10.1: "wire_yellow_10-1.png",
  11.1: "wire_yellow_11-1.png",
};

// ── Red Wire Images (sort values 1.5-11.5) ──────────────────

export const RED_WIRE_IMAGES: Record<number, string> = {
  1.5: "wire_red_1-5.png",
  2.5: "wire_red_2-5.png",
  3.5: "wire_red_3-5.png",
  4.5: "wire_red_4-5.png",
  5.5: "wire_red_5-5.png",
  6.5: "wire_red_6-5.png",
  7.5: "wire_red_7-5.png",
  8.5: "wire_red_8-5.png",
  9.5: "wire_red_9-5.png",
  10.5: "wire_red_10-5.png",
  11.5: "wire_red_11-5.png",
};

// ── Wire Tile Back Image ────────────────────────────────────
// All wire tiles share the same back design
export const WIRE_BACK_IMAGE = "wire_back.png";

// ── Character Card Images ───────────────────────────────────

export const CHARACTER_IMAGES: Record<string, string> = {
  double_detector: "character_1.png",
  character_2: "character_2.png",
  character_3: "character_3.png",
  character_4: "character_4.png",
  character_5: "character_5.png",
  character_e1: "character_e1.png",
  character_e2: "character_e2.png",
  character_e3: "character_e3.png",
  character_e4: "character_e4.png",
};

// ── Equipment Card Images ───────────────────────────────────

export interface EquipmentDef {
  id: string;
  name: string;
  description: string;
  unlockValue: EquipmentUnlockValue;
  image: string;
  useTiming: "anytime" | "in_turn" | "start_of_turn" | "immediate";
  pool: "base" | "campaign";
}

export const EQUIPMENT_DEFS: EquipmentDef[] = [
  {
    id: "talkies_walkies",
    name: "Talkies-Walkies",
    description: "Swap 2 wires: take one of your uncut wires and place it face down in front of a teammate. They do the same.",
    unlockValue: 2,
    image: "equipment_2.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "rewinder",
    name: "Rewinder",
    description: "Move the detonator back one notch.",
    unlockValue: 6,
    image: "equipment_6.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "post_it",
    name: "Post-it",
    description: "Place an Info token in front of one of your blue wires.",
    unlockValue: 4,
    image: "equipment_4.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "coffee_mug",
    name: "Coffee Mug",
    description: "Pass your turn and choose the next active player (without consultation).",
    unlockValue: 11,
    image: "equipment_11.png",
    useTiming: "in_turn",
    pool: "base",
  },
  {
    id: "label_neq",
    name: "Label ≠",
    description: "Place the ≠ token in front of 2 of your adjacent wires of different values.",
    unlockValue: 1,
    image: "equipment_1.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "general_radar",
    name: "General Radar",
    description: "Announce a number (1-12). All players say 'yes' if they have at least one uncut blue wire of that value.",
    unlockValue: 8,
    image: "equipment_8.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "emergency_batteries",
    name: "Emergency Batteries",
    description: "Turn one or two Character cards that have been used face up. Their personal equipment is available again.",
    unlockValue: 7,
    image: "equipment_7.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "label_eq",
    name: "Label =",
    description: "Place the = token in front of 2 of your adjacent wires of the same value.",
    unlockValue: 12,
    image: "equipment_12.png",
    useTiming: "anytime",
    pool: "base",
  },
  {
    id: "super_detector",
    name: "Super Detector",
    description: "During a Dual Cut action, designate an entire stand of a teammate instead of a single wire.",
    unlockValue: 5,
    image: "equipment_5.png",
    useTiming: "in_turn",
    pool: "base",
  },
  {
    id: "stabilizer",
    name: "Stabilizer",
    description: "Use before a Dual Cut. The detonator does not advance and the bomb does not explode on failure.",
    unlockValue: 9,
    image: "equipment_9.png",
    useTiming: "start_of_turn",
    pool: "base",
  },
  {
    id: "x_or_y_ray",
    name: "X or Y Ray",
    description: "During a Dual Cut action, announce 2 values by designating a wire (yellow included).",
    unlockValue: 10,
    image: "equipment_10.png",
    useTiming: "in_turn",
    pool: "base",
  },
  {
    id: "triple_detector",
    name: "Triple Detector 3000",
    description: "During a Dual Cut action, designate 3 wires from a teammate's stand instead of 1.",
    unlockValue: 3,
    image: "equipment_3.png",
    useTiming: "in_turn",
    pool: "base",
  },
  {
    id: "false_bottom",
    name: "False Bottom",
    description: "Draw 2 Equipment cards and put them into play with the others.",
    unlockValue: "YELLOW",
    image: "equipment_yellow.png",
    useTiming: "immediate",
    pool: "campaign",
  },
  {
    id: "single_wire_label",
    name: "Single Wire Label",
    description: "Place a token in front of one of your blue wires (cut or uncut) to show this value appears once on that stand.",
    unlockValue: 2,
    image: "equipment_22.png",
    useTiming: "anytime",
    pool: "campaign",
  },
  {
    id: "emergency_drop",
    name: "Emergency Drop",
    description: "Return already-used Equipment cards immediately so they become available again this mission.",
    unlockValue: 3,
    image: "equipment_33.png",
    useTiming: "immediate",
    pool: "campaign",
  },
  {
    id: "fast_pass",
    name: "Fast Pass",
    description: "During a Solo Cut action, cut 2 identical wires even if they are not the last remaining ones of that value.",
    unlockValue: 9,
    image: "equipment_99.png",
    useTiming: "in_turn",
    pool: "campaign",
  },
  {
    id: "disintegrator",
    name: "Disintegrator",
    description: "Draw a random Info token (1-12); all players cut their possible remaining wires of that value.",
    unlockValue: 10,
    image: "equipment_1010.png",
    useTiming: "immediate",
    pool: "campaign",
  },
  {
    id: "grappling_hook",
    name: "Grappling Hook",
    description: "Take a designated teammate wire without revealing it and file it into your own hand.",
    unlockValue: 11,
    image: "equipment_1111.png",
    useTiming: "anytime",
    pool: "campaign",
  },
];

// ── Mission Card Images ─────────────────────────────────────

export const MISSION_IMAGES: Record<number, string> = {
  1: "mission_1.jpg",
  2: "mission_2.jpg",
  3: "mission_3.jpg",
  4: "mission_4.jpg",
  5: "mission_5.jpg",
  6: "mission_6.jpg",
  7: "mission_7.jpg",
  8: "mission_8.jpg",
  9: "mission_9.jpg",
  10: "mission_10.jpg",
  11: "mission_11.jpg",
  12: "mission_12.jpg",
  13: "mission_13.jpg",
  14: "mission_14.jpg",
  15: "mission_15.jpg",
  16: "mission_16.jpg",
  17: "mission_17.jpg",
  18: "mission_18.jpg",
  19: "mission_19.jpg",
  20: "mission_20.jpg",
  21: "mission_21.jpg",
  22: "mission_22.jpg",
  23: "mission_23.jpg",
  24: "mission_24.jpg",
  25: "mission_25.jpg",
  26: "mission_26.jpg",
  27: "mission_27.jpg",
  28: "mission_28.jpg",
  29: "mission_29.jpg",
  30: "mission_30.jpg",
  31: "mission_31.jpg",
  32: "mission_32.jpg",
  33: "mission_33.jpg",
  34: "mission_34.jpg",
  35: "mission_35.jpg",
  36: "mission_36.jpg",
  37: "mission_37.jpg",
  38: "mission_38.jpg",
  39: "mission_39.jpg",
  40: "mission_40.jpg",
  41: "mission_41.jpg",
  42: "mission_42.jpg",
  43: "mission_43.jpg",
  44: "mission_44.jpg",
  45: "mission_45.jpg",
  46: "mission_46.jpg",
  47: "mission_47.jpg",
  48: "mission_48.jpg",
  49: "mission_49.jpg",
  50: "mission_50.jpg",
  51: "mission_51.jpg",
  52: "mission_52.jpg",
  53: "mission_53.jpg",
  54: "mission_54.jpg",
  55: "mission_55.jpg",
  56: "mission_56.jpg",
  57: "mission_57.jpg",
  58: "mission_58.jpg",
  59: "mission_59.jpg",
  60: "mission_60.jpg",
  61: "mission_61.jpg",
  62: "mission_62.jpg",
  63: "mission_63.jpg",
  64: "mission_64.jpg",
  65: "mission_65.jpg",
  66: "mission_66.jpg",
};

// ── Number Card Images (campaign) ───────────────────────────

export const NUMBER_CARD_IMAGES: Record<number, string> = {
  1: "number_1.png",
  2: "number_2.png",
  3: "number_3.png",
  4: "number_4.png",
  5: "number_5.png",
  6: "number_6.png",
  7: "number_7.png",
  8: "number_8.png",
  9: "number_9.png",
  10: "number_10.png",
  11: "number_11.png",
  12: "number_12.png",
};

export const NUMBER_CARD_BACK = "number_back.png";

// ── Constraint Card Images (campaign) ───────────────────────

export const CONSTRAINT_CARD_IMAGES: Record<string, string> = {
  A: "constraint_a.png",
  B: "constraint_b.png",
  C: "constraint_c.png",
  D: "constraint_d.png",
  E: "constraint_e.png",
  F: "constraint_f.png",
  G: "constraint_g.png",
  H: "constraint_h.png",
  I: "constraint_i.png",
  J: "constraint_j.png",
  K: "constraint_k.png",
  L: "constraint_l.png",
};

export const CONSTRAINT_CARD_BACK = "constraint_back.png";

// ── Challenge Card Images (campaign, landscape) ─────────────

export const CHALLENGE_CARD_IMAGES: Record<string, string> = {
  "1": "challenge_1.png",
  "2": "challenge_2.png",
  "3": "challenge_3.png",
  "4": "challenge_4.png",
  "5": "challenge_5.png",
  "6": "challenge_6.png",
  "7": "challenge_7.png",
  "8": "challenge_8.png",
  "9": "challenge_9.png",
  "10": "challenge_10.png",
};

export const CHALLENGE_CARD_BACK = "challenge_back.png";

// ── Cutter Card Images (sequence priority) ──────────────────

export const CUTTER_CARD_IMAGES: Record<string, string> = {
  face_a: "cutter_a.png",
  face_b: "cutter_b.png",
};

// ── Helper to get wire image by color and sort value ────────

export function getWireImage(
  color: "blue" | "red" | "yellow",
  sortValue: number,
): string {
  switch (color) {
    case "blue":
      return BLUE_WIRE_IMAGES[sortValue] ?? "wire_1.png";
    case "red":
      return RED_WIRE_IMAGES[sortValue] ?? "wire_red_1-5.png";
    case "yellow":
      return YELLOW_WIRE_IMAGES[sortValue] ?? "wire_yellow_1-1.png";
  }
}

// ── Campaign card image helpers ─────────────────────────────

export function getNumberCardImage(value: number): string {
  return NUMBER_CARD_IMAGES[value] ?? NUMBER_CARD_BACK;
}

export function getConstraintCardImage(id: string): string {
  return CONSTRAINT_CARD_IMAGES[id.toUpperCase()] ?? CONSTRAINT_CARD_BACK;
}

function parseChallengeCardValue(id: string): number | null {
  const bareNumber = /^\d+$/.exec(id);
  if (bareNumber?.[0]) {
    const parsed = Number.parseInt(bareNumber[0], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const prefixed = /^challenge-value-(\d+)(?:-.*)?$/.exec(id);
  if (!prefixed?.[1]) return null;

  const parsed = Number.parseInt(prefixed[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getChallengeCardImage(id: string): string {
  const value = parseChallengeCardValue(id);
  return value != null ? CHALLENGE_CARD_IMAGES[value] ?? CHALLENGE_CARD_BACK : CHALLENGE_CARD_BACK;
}
