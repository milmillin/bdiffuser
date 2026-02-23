/**
 * Image mapping for Bomb Busters assets.
 *
 * Uses individual asset images from /images/ directory.
 */

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
};

// ── Equipment Card Images ───────────────────────────────────

export interface EquipmentDef {
  id: string;
  name: string;
  description: string;
  unlockValue: number;
  image: string;
  useTiming: "anytime" | "in_turn" | "start_of_turn";
}

export const EQUIPMENT_DEFS: EquipmentDef[] = [
  {
    id: "talkies_walkies",
    name: "Talkies-Walkies",
    description: "Swap 2 wires: take one of your uncut wires and place it face down in front of a teammate. They do the same.",
    unlockValue: 2,
    image: "equipment_2.png",
    useTiming: "anytime",
  },
  {
    id: "rewinder",
    name: "Rewinder",
    description: "Move the detonator back one notch.",
    unlockValue: 6,
    image: "equipment_6.png",
    useTiming: "anytime",
  },
  {
    id: "post_it",
    name: "Post-it",
    description: "Place an Info token in front of one of your blue wires.",
    unlockValue: 4,
    image: "equipment_4.png",
    useTiming: "anytime",
  },
  {
    id: "coffee_thermos",
    name: "Coffee Thermos",
    description: "Pass your turn and choose the next active player (without consultation).",
    unlockValue: 11,
    image: "equipment_11.png",
    useTiming: "in_turn",
  },
  {
    id: "label_neq",
    name: "Label ≠",
    description: "Place the ≠ token in front of 2 of your adjacent wires of different values.",
    unlockValue: 1,
    image: "equipment_1.png",
    useTiming: "anytime",
  },
  {
    id: "general_radar",
    name: "General Radar",
    description: "Announce a number (1-12). All players say 'yes' if they have at least one uncut blue wire of that value.",
    unlockValue: 8,
    image: "equipment_8.png",
    useTiming: "anytime",
  },
  {
    id: "emergency_batteries",
    name: "Emergency Batteries",
    description: "Turn one or two Character cards that have been used face up. Their personal equipment is available again.",
    unlockValue: 7,
    image: "equipment_7.png",
    useTiming: "anytime",
  },
  {
    id: "label_eq",
    name: "Label =",
    description: "Place the = token in front of 2 of your adjacent wires of the same value.",
    unlockValue: 12,
    image: "equipment_12.png",
    useTiming: "anytime",
  },
  {
    id: "super_detector",
    name: "Super Detector",
    description: "During a Dual Cut action, designate an entire stand of a teammate instead of a single wire.",
    unlockValue: 5,
    image: "equipment_5.png",
    useTiming: "in_turn",
  },
  {
    id: "stabilizer",
    name: "Stabilizer",
    description: "Use before a Dual Cut. The detonator does not advance and the bomb does not explode on failure.",
    unlockValue: 9,
    image: "equipment_9.png",
    useTiming: "start_of_turn",
  },
  {
    id: "x_or_y_ray",
    name: "X or Y Ray",
    description: "During a Dual Cut action, announce 2 values by designating a wire (yellow included).",
    unlockValue: 10,
    image: "equipment_10.png",
    useTiming: "in_turn",
  },
  {
    id: "triple_detector",
    name: "Triple Detector 3000",
    description: "During a Dual Cut action, designate 3 wires from a teammate's stand instead of 1.",
    unlockValue: 3,
    image: "equipment_3.png",
    useTiming: "in_turn",
  },
];

// ── Mission Card Images ─────────────────────────────────────

export const MISSION_IMAGES: Record<number, string> = {
  1: "mission_1.png",
  2: "mission_2.png",
  3: "mission_3.png",
  4: "mission_4.png",
  5: "mission_5.png",
  6: "mission_6.png",
  7: "mission_7.png",
  8: "mission_8.png",
  9: "mission_9.png",
  10: "mission_10.png",
  11: "mission_11.png",
  12: "mission_12.png",
  13: "mission_13.png",
  14: "mission_14.png",
  15: "mission_15.png",
  16: "mission_16.png",
  17: "mission_17.png",
  18: "mission_18.png",
  19: "mission_19.png",
  20: "mission_20.png",
  21: "mission_21.png",
  22: "mission_22.png",
  23: "mission_23.png",
  24: "mission_24.png",
  25: "mission_25.png",
  26: "mission_26.png",
  27: "mission_27.png",
  28: "mission_28.png",
  29: "mission_29.png",
  30: "mission_30.png",
  31: "mission_31.jpg",
  32: "mission_32.jpg",
  33: "mission_33.png",
  34: "mission_34.png",
  35: "mission_35.jpg",
  36: "mission_36.png",
  37: "mission_37.png",
  38: "mission_38.png",
  39: "mission_39.png",
  40: "mission_40.png",
  41: "mission_41.png",
  42: "mission_42.png",
  43: "mission_43.png",
  44: "mission_44.png",
  45: "mission_45.png",
  46: "mission_46.png",
  47: "mission_47.png",
  48: "mission_48.png",
  49: "mission_49.png",
  50: "mission_50.png",
  51: "mission_51.png",
  52: "mission_52.png",
  53: "mission_53.png",
  54: "mission_54.png",
  55: "mission_55.png",
  56: "mission_56.png",
  57: "mission_57.png",
  58: "mission_58.png",
  59: "mission_59.png",
  60: "mission_60.png",
  61: "mission_61.png",
  62: "mission_62.png",
  63: "mission_63.png",
  64: "mission_64.png",
  65: "mission_65.png",
  66: "mission_66.png",
};

// ── Helper to get wire image by color and sort value ────────

export function getWireImage(color: "blue" | "red" | "yellow", sortValue: number): string {
  switch (color) {
    case "blue":
      return BLUE_WIRE_IMAGES[sortValue] ?? "wire_1.png";
    case "red":
      return RED_WIRE_IMAGES[sortValue] ?? "wire_red_1-5.png";
    case "yellow":
      return YELLOW_WIRE_IMAGES[sortValue] ?? "wire_yellow_1-1.png";
  }
}
