import {
  BLUE_WIRE_VALUES,
  RED_WIRE_SORT_VALUES,
  YELLOW_WIRE_SORT_VALUES,
} from "./constants.js";
import { EQUIPMENT_DEFS } from "./imageMap.js";
import { ALL_MISSION_IDS, type MissionId } from "./types.js";

export type MissionDifficulty = "novice" | "intermediate" | "expert" | "campaign";
export type PlayerCount = 2 | 3 | 4 | 5;

export type WirePoolSpec =
  | { kind: "none" }
  | {
      kind: "exact";
      count: number;
      /** Candidate sort values used for random draw. Defaults to all values of that color. */
      candidates?: readonly number[];
    }
  | {
      kind: "out_of";
      keep: number;
      draw: number;
      /** Candidate sort values used for random draw. Defaults to all values of that color. */
      candidates?: readonly number[];
    }
  | {
      kind: "fixed";
      values: readonly number[];
    };

export interface BlueWireSpec {
  minValue: number;
  maxValue: number;
}

export interface MissionEquipmentSpec {
  mode: "none" | "default" | "fixed_pool";
  /** Include campaign-only equipment cards (22/33/99/10-10/11-11/yellow) in the draw pool. */
  includeCampaignEquipment?: boolean;
  excludedUnlockValues?: readonly number[];
  /** Exclude specific equipment cards by ID (used when unlock values are not unique). */
  excludedEquipmentIds?: readonly string[];
  fixedEquipmentIds?: readonly string[];
}

export interface MissionSetupSpec {
  blue: BlueWireSpec;
  red: WirePoolSpec;
  yellow: WirePoolSpec;
  equipment: MissionEquipmentSpec;
}

// ── Resolved Hook Rule Definitions (machine-readable) ──────────

/**
 * Mission 10: Real-time countdown timer.
 * Players must complete the mission within `durationSeconds`.
 * An audio cue plays to signal time pressure.
 */
export interface TimerRuleDef {
  kind: "timer";
  /** Timer duration in seconds. */
  durationSeconds: number;
  /** Optional mission-specific timer overrides by player count. */
  durationSecondsByPlayerCount?: Partial<Record<PlayerCount, number>>;
  /** Whether an audio cue accompanies the timer. */
  audioPrompt: boolean;
}

/**
 * Mission 10: Captain designates the next player each turn
 * instead of following clockwise order.
 */
export interface DynamicTurnOrderRuleDef {
  kind: "dynamic_turn_order";
  /** Who selects the next player. */
  selector: "captain";
}

/**
 * Mission 11: One random blue wire value is secretly treated as a
 * detonator (red) during gameplay. No player knows which value it is.
 * Cutting that blue triggers a detonator advance just like cutting red.
 */
export interface BlueAsRedRuleDef {
  kind: "blue_value_treated_as_red";
  /** How many blue values become hidden reds. */
  count: 1;
  /** Whether any player knows which blue is the hidden red. */
  knownToAnyPlayer: false;
}

/**
 * Mission 12: Equipment requires cutting 2 wires whose game-value
 * matches the unlock value (instead of the normal 1).
 */
export interface EquipmentDoubleLockRuleDef {
  kind: "equipment_double_lock";
  /** Number of matching wire cuts required to unlock equipment. */
  requiredCuts: 2;
  /** Optional secondary lock source (mission 12: number cards on equipment). */
  secondaryLockSource?: "number_card";
  /** Required cuts for the secondary lock value. */
  secondaryRequiredCuts?: number;
}

/**
 * Mission 9: Sequence card priority (face A).
 * Three visible number cards define an ordered gating:
 * - Need `requiredCuts` of card[0] before card[1] / card[2] are allowed.
 * - Need `requiredCuts` of card[1] before card[2] is allowed.
 */
export interface SequencePriorityRuleDef {
  kind: "sequence_priority";
  /** Number of visible sequence cards to draw from the number deck. */
  cardCount: 3;
  /** Required global cut count to unlock the next sequence step. */
  requiredCuts: 2;
  /** Printed sequence variant on mission card. */
  variant: "face_a";
}

/**
 * Discriminated union of all resolved hook rule definitions.
 * Extend this union as more hooks are resolved in later milestones.
 */
export type MissionHookRuleDef =
  | TimerRuleDef
  | DynamicTurnOrderRuleDef
  | BlueAsRedRuleDef
  | EquipmentDoubleLockRuleDef
  | SequencePriorityRuleDef;

// ── Source Reference Metadata ──────────────────────────────────

export interface MissionSourceRef {
  /** Mission card front image filename (e.g. "mission_1.jpg"). */
  cardImage: string;
  /** Mission card back image filename (e.g. "mission_1_back.jpg"). */
  cardImageBack: string;
  /** Section heading in GAME_RULES.md (e.g. "### Mission 1"). */
  rulesSection: string;
}

// ── Mission Schema ─────────────────────────────────────────────

export interface MissionRuleSchema {
  id: MissionId;
  name: string;
  difficulty: MissionDifficulty;
  setup: MissionSetupSpec;
  /** Mission-specific setup overrides by player count. */
  overrides?: Partial<Record<PlayerCount, Partial<MissionSetupSpec>>>;
  /** Some missions are explicitly marked impossible at certain player counts. */
  allowedPlayerCounts?: readonly PlayerCount[];
  /** Procedural mission logic handled in server runtime. */
  behaviorHooks?: readonly string[];
  /**
   * Resolved hook rule definitions with exact machine-readable parameters.
   * Each entry corresponds to a behaviorHook string but with full type safety
   * and unambiguous semantics. Populated as ambiguities are resolved.
   */
  hookRules?: readonly MissionHookRuleDef[];
  /** Traceability back to physical mission card and rules document. */
  sourceRef?: MissionSourceRef;
  notes?: readonly string[];
}

export interface ResolvedMissionSetup {
  mission: MissionRuleSchema;
  setup: MissionSetupSpec;
}

const PLAYER_COUNTS = [2, 3, 4, 5] as const;

const redAll = [...RED_WIRE_SORT_VALUES];
const redUpTo9_5 = RED_WIRE_SORT_VALUES.filter((v) => v <= 9.5);
const yellowAll = [...YELLOW_WIRE_SORT_VALUES];
const yellowUpTo7_1 = YELLOW_WIRE_SORT_VALUES.filter((v) => v <= 7.1);

const none = (): WirePoolSpec => ({ kind: "none" });
const exact = (count: number, candidates?: readonly number[]): WirePoolSpec => ({
  kind: "exact",
  count,
  ...(candidates ? { candidates } : {}),
});
const outOf = (keep: number, draw: number, candidates?: readonly number[]): WirePoolSpec => ({
  kind: "out_of",
  keep,
  draw,
  ...(candidates ? { candidates } : {}),
});
const fixed = (values: readonly number[]): WirePoolSpec => ({ kind: "fixed", values });

const blueRange = (minValue: number, maxValue: number): BlueWireSpec => ({
  minValue,
  maxValue,
});

const defaultSetup = (): MissionSetupSpec => ({
  blue: blueRange(1, 12),
  red: none(),
  yellow: none(),
  equipment: { mode: "default" },
});

function defaultDifficulty(id: MissionId): MissionDifficulty {
  if (id <= 3) return "novice";
  if (id <= 7) return "intermediate";
  if (id === 8) return "expert";
  return "campaign";
}

function missionImageExt(_id: MissionId): string {
  return "jpg";
}

function buildSourceRef(id: MissionId): MissionSourceRef {
  const ext = missionImageExt(id);
  return {
    cardImage: `mission_${id}.${ext}`,
    cardImageBack: `mission_${id}_back.${ext}`,
    rulesSection: `### Mission ${id}`,
  };
}

const schemas = {} as Record<MissionId, MissionRuleSchema>;
for (const id of ALL_MISSION_IDS) {
  schemas[id] = {
    id,
    name: `Mission ${id}`,
    difficulty: defaultDifficulty(id),
    setup: defaultSetup(),
    allowedPlayerCounts: PLAYER_COUNTS,
    sourceRef: buildSourceRef(id),
  } satisfies MissionRuleSchema;
}

function setMission(id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">): void {
  schemas[id] = {
    ...schemas[id],
    ...patch,
    setup: patch.setup ?? schemas[id].setup,
    overrides: patch.overrides ?? schemas[id].overrides,
    allowedPlayerCounts: patch.allowedPlayerCounts ?? schemas[id].allowedPlayerCounts,
  };
}

setMission(1, {
  name: "Training, Day 1",
  setup: {
    blue: blueRange(1, 6),
    red: none(),
    yellow: none(),
    equipment: { mode: "none" },
  },
});

setMission(2, {
  name: "Training, Day 2",
  setup: {
    blue: blueRange(1, 8),
    red: none(),
    yellow: exact(2, yellowUpTo7_1),
    equipment: { mode: "none" },
  },
});

setMission(3, {
  name: "Training, Day 3",
  setup: {
    blue: blueRange(1, 10),
    red: exact(1, redUpTo9_5),
    yellow: none(),
    equipment: { mode: "default", excludedUnlockValues: [11, 12] },
  },
});

setMission(4, {
  name: "A Sense of Priorities",
  setup: {
    blue: blueRange(1, 12),
    red: exact(1),
    yellow: exact(2),
    equipment: { mode: "default" },
  },
  overrides: {
    2: { yellow: exact(4) },
  },
});

setMission(5, {
  name: "First Day in the Field",
  setup: {
    blue: blueRange(1, 12),
    red: exact(1),
    yellow: outOf(2, 3),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      red: exact(2),
      yellow: outOf(2, 3),
    },
  },
});

setMission(6, {
  name: "Under Pressure",
  setup: {
    blue: blueRange(1, 12),
    red: exact(1),
    yellow: exact(4),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      red: exact(2),
      yellow: exact(4),
    },
  },
});

setMission(7, {
  name: "Completing the Training",
  setup: {
    blue: blueRange(1, 12),
    red: outOf(1, 2),
    yellow: none(),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      red: outOf(1, 3),
    },
  },
});

setMission(8, {
  name: "Final Exam",
  setup: {
    blue: blueRange(1, 12),
    red: outOf(1, 2),
    yellow: outOf(2, 3),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      red: outOf(1, 3),
      yellow: exact(4),
    },
  },
});

setMission(9, {
  name: "The Sense of Priorities",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: exact(2),
  },
  overrides: {
    2: {
      red: exact(2),
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_9_sequence_priority_face_a"],
  hookRules: [
    { kind: "sequence_priority", cardCount: 3, requiredCuts: 2, variant: "face_a" },
  ],
});

setMission(10, {
  name: "A Bad Quarter of an Hour",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: exact(4),
    equipment: { mode: "default", excludedUnlockValues: [11] },
  },
  behaviorHooks: ["mission_10_timer_and_dynamic_turn_order"],
  hookRules: [
    {
      kind: "timer",
      durationSeconds: 900,
      durationSecondsByPlayerCount: { 2: 720 },
      audioPrompt: true,
    },
    { kind: "dynamic_turn_order", selector: "captain" },
  ],
});

setMission(11, {
  name: "Blue on Red, Nothing Moves",
  setup: {
    ...defaultSetup(),
    red: none(),
    yellow: exact(2),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_11_blue_value_treated_as_red"],
  hookRules: [
    { kind: "blue_value_treated_as_red", count: 1, knownToAnyPlayer: false },
  ],
});

setMission(12, {
  name: "Equipment out of Reach",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: exact(4),
  },
  overrides: {
    2: {
      red: exact(2),
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_12_equipment_double_lock"],
  hookRules: [
    {
      kind: "equipment_double_lock",
      requiredCuts: 2,
      secondaryLockSource: "number_card",
      secondaryRequiredCuts: 2,
    },
  ],
});

setMission(13, {
  name: "Red Alert!",
  setup: {
    ...defaultSetup(),
    red: exact(3),
    yellow: none(),
  },
  behaviorHooks: ["mission_13_simultaneous_red_cut_action", "mission_13_random_info_token_setup"],
});

setMission(14, {
  name: "High Risk Mine Clearance",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: outOf(2, 3),
  },
  overrides: {
    2: {
      red: exact(3),
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_14_intern_failure_explodes"],
});

setMission(15, {
  name: "Mission NOVOSIBIRSK CK",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    yellow: none(),
    equipment: { mode: "default" },
  },
  overrides: {
    2: {
      red: outOf(2, 3),
    },
  },
  behaviorHooks: ["mission_15_face_down_equipment_unlock_via_number_deck"],
});

setMission(16, {
  name: "A Story of Common Sense",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: outOf(2, 3),
  },
  overrides: {
    2: {
      red: exact(2),
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_16_sequence_priority_face_b"],
});

setMission(17, {
  name: "Sergio El Mytho",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
  },
  overrides: {
    2: { red: exact(3) },
  },
  behaviorHooks: ["mission_17_false_info_tokens", "mission_17_sergio_equipment_restriction"],
});

setMission(18, {
  name: "BAT-helping hand",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "fixed_pool", fixedEquipmentIds: ["general_radar"] },
  },
  overrides: {
    2: { red: exact(3) },
  },
  behaviorHooks: ["mission_18_forced_general_radar_flow"],
});

setMission(19, {
  name: "In the Villain's Lair...",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: outOf(2, 3),
  },
  behaviorHooks: ["mission_19_audio_prompt"],
});

setMission(20, {
  name: "The Big Bad Wolf",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [2] },
  },
  overrides: {
    2: {
      red: outOf(2, 3),
      yellow: exact(4),
    },
  },
  behaviorHooks: ["mission_20_x_marked_unsorted_wires"],
});

setMission(21, {
  name: "Kouign Amann Mortal",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 2),
  },
  overrides: {
    2: { red: exact(2) },
  },
  behaviorHooks: ["mission_21_even_odd_tokens"],
});

setMission(22, {
  name: "None of That in My House!",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: exact(4),
  },
  behaviorHooks: ["mission_22_absent_value_tokens", "mission_22_yellow_trigger_token_pass"],
});

setMission(23, {
  name: "Mission in Sevenans",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    equipment: { mode: "none" },
  },
  overrides: {
    2: { red: outOf(2, 3) },
  },
  behaviorHooks: ["mission_23_hidden_equipment_pile", "mission_23_simultaneous_four_of_value_action"],
});

setMission(24, {
  name: "The Count Is Good!",
  setup: {
    ...defaultSetup(),
    red: exact(2),
  },
  overrides: {
    2: { red: exact(3) },
  },
  behaviorHooks: ["mission_24_count_tokens_x1_x2_x3"],
});

setMission(25, {
  name: "It's to Hear You Better...",
  setup: { ...defaultSetup(), red: exact(2) },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_25_no_spoken_numbers"],
});

setMission(26, {
  name: "When We Talk About the Wolf...",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  behaviorHooks: ["mission_26_visible_number_card_gate"],
});

setMission(27, {
  name: "Dough Threads",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    yellow: exact(4),
    equipment: { mode: "default", excludedUnlockValues: [7] },
  },
  behaviorHooks: ["mission_27_no_character_cards", "mission_27_yellow_trigger_random_token_draft"],
});

setMission(28, {
  name: "Captain Lazy",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: exact(4),
  },
  overrides: { 2: { red: exact(3), yellow: exact(4) } },
  behaviorHooks: ["mission_28_captain_lazy_constraints"],
});

setMission(29, {
  name: "Number Error",
  setup: {
    ...defaultSetup(),
    red: exact(3),
  },
  behaviorHooks: ["mission_29_hidden_number_card_penalty"],
});

setMission(30, {
  name: "A Very Speedy Mission!",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 2),
    yellow: exact(4),
  },
  behaviorHooks: ["mission_30_audio_prompt"],
});

setMission(31, {
  name: "Everyone Has Their Own Constraints",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
  },
  behaviorHooks: ["mission_31_personal_constraints_a_to_e"],
});

setMission(32, {
  name: "Prank Attack!",
  setup: {
    ...defaultSetup(),
    red: exact(2),
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_32_global_constraint_stack"],
});

setMission(33, {
  name: "Ce qui se passe a Vegas...",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_33_even_odd_tokens"],
});

setMission(34, {
  name: "The Weak Link",
  setup: {
    ...defaultSetup(),
    red: exact(1),
  },
  allowedPlayerCounts: [3, 4, 5],
  behaviorHooks: ["mission_34_hidden_weak_link_and_constraints"],
});

setMission(35, {
  name: "No Ties, Single Thread",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
    yellow: exact(4),
    equipment: { mode: "default", excludedUnlockValues: [2] },
  },
  overrides: {
    2: { red: exact(3), yellow: exact(4) },
  },
  behaviorHooks: ["mission_35_x_marked_blue_wires"],
});

setMission(36, {
  name: "Panic in the Tropics",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    yellow: exact(2),
  },
  overrides: {
    2: { red: outOf(2, 3), yellow: exact(4) },
  },
  behaviorHooks: ["mission_36_sequence_card_reposition"],
});

setMission(37, {
  name: "The Boss of the Farce!",
  setup: { ...defaultSetup(), red: exact(2) },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_37_rolling_constraint"],
});

setMission(38, {
  name: "One Thread Upside Down...",
  setup: { ...defaultSetup(), red: exact(2) },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_38_captain_upside_down_wire"],
});

setMission(39, {
  name: "The Doctor's 4 Sons Walk",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
    yellow: exact(4),
    equipment: { mode: "none" },
  },
  overrides: {
    2: { red: exact(3), yellow: exact(4) },
  },
  behaviorHooks: ["mission_39_no_equipment_simultaneous_four"],
});

setMission(40, {
  name: "Christmas Trap",
  setup: {
    ...defaultSetup(),
    red: exact(3),
  },
  behaviorHooks: ["mission_40_alternating_token_types"],
});

setMission(41, {
  name: "Bomba latina",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    yellow: exact(4),
    equipment: {
      mode: "default",
      includeCampaignEquipment: true,
      excludedEquipmentIds: ["double_fond"],
    },
  },
  overrides: {
    2: { red: outOf(2, 3), yellow: exact(2) },
    3: { yellow: exact(3) },
    5: { yellow: exact(4) },
  },
  behaviorHooks: ["mission_41_iberian_yellow_mode"],
});

setMission(42, {
  name: "What Is This Circus?",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    yellow: exact(4),
  },
  behaviorHooks: ["mission_42_audio_prompt"],
});

setMission(43, {
  name: "Nano and Robot",
  setup: {
    ...defaultSetup(),
    red: exact(3),
  },
  behaviorHooks: ["mission_43_nano_track_and_hidden_wire_pool"],
});

setMission(44, {
  name: "Underwater Pressure",
  setup: {
    ...defaultSetup(),
    red: outOf(1, 3),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  behaviorHooks: ["mission_44_oxygen_cost_and_no_talking"],
});

setMission(45, {
  name: "My Thread, My Battle!",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [10, 11] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_45_squeak_number_challenge"],
});

setMission(46, {
  name: "Agent 007",
  setup: {
    ...defaultSetup(),
    red: none(),
    yellow: fixed([5.1, 6.1, 7.1, 8.1]),
    equipment: { mode: "default", excludedUnlockValues: [7] },
  },
  behaviorHooks: ["mission_46_sevens_must_be_last"],
});

setMission(47, {
  name: "L'addition SVP!",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_47_add_subtract_number_cards"],
});

setMission(48, {
  name: "3-wire Plan",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: exact(3),
  },
  overrides: { 2: { red: exact(3), yellow: exact(3) } },
  behaviorHooks: ["mission_48_simultaneous_three_yellow"],
});

setMission(49, {
  name: "Bottles in the Sea",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_49_oxygen_transfer_economy"],
});

setMission(50, {
  name: "The Black Sea",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: exact(2),
  },
  overrides: { 2: { red: exact(3), yellow: exact(4) } },
  behaviorHooks: ["mission_50_no_markers_memory_mode"],
});

setMission(51, {
  name: "Unlucky Day",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  overrides: { 2: { red: exact(2) } },
  behaviorHooks: ["mission_51_boss_designates_value"],
});

setMission(52, {
  name: "All Traitors!",
  setup: {
    ...defaultSetup(),
    red: exact(3),
    yellow: none(),
    equipment: { mode: "default", excludedUnlockValues: [1, 12] },
  },
  overrides: { 2: { red: exact(3), yellow: exact(4) } },
  behaviorHooks: ["mission_52_all_tokens_false"],
});

setMission(53, {
  name: "Nano Is Back",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [6, 9] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_53_nano_replaces_detonator"],
});

setMission(54, {
  name: "The Attack of Red Rabbit",
  setup: {
    ...defaultSetup(),
    red: fixed(redAll),
    yellow: none(),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  behaviorHooks: ["mission_54_red_stack_and_oxygen"],
});

setMission(55, {
  name: "Doctor No's Challenge",
  setup: {
    ...defaultSetup(),
    red: exact(2),
  },
  overrides: { 2: { red: outOf(2, 3) } },
  behaviorHooks: ["mission_55_challenge_cards_reduce_detonator"],
});

setMission(56, {
  name: "The Rebel Sons",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_56_each_player_upside_down_wire"],
});

setMission(57, {
  name: "Mission Impossible",
  setup: {
    ...defaultSetup(),
    red: exact(1),
    equipment: {
      mode: "default",
      includeCampaignEquipment: true,
      excludedEquipmentIds: ["disintegrator"],
    },
  },
  overrides: { 2: { red: exact(2) } },
  behaviorHooks: ["mission_57_constraint_per_validated_value"],
});

setMission(58, {
  name: "System D",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [4, 7] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_58_no_info_tokens_unlimited_double_detector"],
});

setMission(59, {
  name: "Nano to the Rescue",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_59_nano_navigation_values"],
});

setMission(60, {
  name: "The Return of Doctor No",
  setup: {
    ...defaultSetup(),
    red: outOf(2, 3),
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_60_challenge_cards_reduce_detonator"],
});

setMission(61, {
  name: "Quiet, We're Filming!",
  setup: {
    ...defaultSetup(),
    red: exact(1),
  },
  overrides: { 2: { red: exact(2) } },
  behaviorHooks: ["mission_61_rotating_constraints"],
});

setMission(62, {
  name: "Armageddon Dumpling",
  setup: {
    ...defaultSetup(),
    red: exact(2),
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_62_number_card_completions_reduce_detonator"],
});

setMission(63, {
  name: "Titanic II",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  overrides: { 2: { red: exact(3) } },
  behaviorHooks: ["mission_63_rotating_oxygen_pool"],
});

setMission(64, {
  name: "The Return of the Rebel Sons!",
  setup: {
    ...defaultSetup(),
    red: exact(1),
  },
  overrides: { 2: { red: exact(2) } },
  behaviorHooks: ["mission_64_two_upside_down_wires_each"],
});

setMission(65, {
  name: "Good Thread and Not Good Thread",
  setup: {
    ...defaultSetup(),
    red: exact(3),
    equipment: { mode: "default", excludedUnlockValues: [10] },
  },
  allowedPlayerCounts: [3, 4, 5],
  behaviorHooks: ["mission_65_personal_number_cards"],
});

setMission(66, {
  name: "The Final Boss!",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: exact(2),
  },
  behaviorHooks: ["mission_66_bunker_flow"],
});

export const MISSION_SCHEMAS: Record<MissionId, MissionRuleSchema> = schemas;

function mergeEquipment(
  base: MissionEquipmentSpec,
  override?: MissionSetupSpec["equipment"],
): MissionEquipmentSpec {
  if (!override) return base;
  return {
    ...base,
    ...override,
  };
}

export function resolveMissionSetup(
  missionId: MissionId,
  playerCount: number,
): ResolvedMissionSetup {
  const mission = MISSION_SCHEMAS[missionId];
  if (!mission) {
    throw new Error(`Missing mission schema for mission ${missionId}`);
  }

  const count = playerCount as PlayerCount;
  if (mission.allowedPlayerCounts && !mission.allowedPlayerCounts.includes(count)) {
    throw new Error(
      `Mission ${missionId} is not available for ${playerCount} players`,
    );
  }

  const override = mission.overrides?.[count];
  const setup: MissionSetupSpec = {
    blue: override?.blue ?? mission.setup.blue,
    red: override?.red ?? mission.setup.red,
    yellow: override?.yellow ?? mission.setup.yellow,
    equipment: mergeEquipment(mission.setup.equipment, override?.equipment),
  };

  return { mission, setup };
}

export function getWirePoolCount(spec: WirePoolSpec): number {
  switch (spec.kind) {
    case "none":
      return 0;
    case "exact":
      return spec.count;
    case "out_of":
      return spec.keep;
    case "fixed":
      return spec.values.length;
  }
}

export function describeWirePoolSpec(spec: WirePoolSpec): string {
  switch (spec.kind) {
    case "none":
      return "0";
    case "exact":
      return `${spec.count}`;
    case "out_of":
      return `${spec.keep} out of ${spec.draw}`;
    case "fixed":
      return `fixed ${spec.values.length}`;
  }
}

function validateBlueSpec(missionId: MissionId, spec: BlueWireSpec): void {
  if (!Number.isInteger(spec.minValue) || !Number.isInteger(spec.maxValue)) {
    throw new Error(`Mission ${missionId}: blue range must be integer values`);
  }
  if (spec.minValue < 1 || spec.maxValue > 12 || spec.minValue > spec.maxValue) {
    throw new Error(`Mission ${missionId}: invalid blue range ${spec.minValue}-${spec.maxValue}`);
  }
  if (!BLUE_WIRE_VALUES.includes(spec.minValue as (typeof BLUE_WIRE_VALUES)[number])) {
    throw new Error(`Mission ${missionId}: invalid blue min value ${spec.minValue}`);
  }
  if (!BLUE_WIRE_VALUES.includes(spec.maxValue as (typeof BLUE_WIRE_VALUES)[number])) {
    throw new Error(`Mission ${missionId}: invalid blue max value ${spec.maxValue}`);
  }
}

function validatePoolSpec(
  missionId: MissionId,
  color: "red" | "yellow",
  spec: WirePoolSpec,
): void {
  const defaultCandidates = color === "red" ? RED_WIRE_SORT_VALUES : YELLOW_WIRE_SORT_VALUES;

  switch (spec.kind) {
    case "none":
      return;
    case "exact": {
      if (!Number.isInteger(spec.count) || spec.count < 0) {
        throw new Error(`Mission ${missionId}: ${color} exact count must be non-negative integer`);
      }
      const candidates = spec.candidates ?? defaultCandidates;
      if (spec.count > candidates.length) {
        throw new Error(
          `Mission ${missionId}: ${color} exact count ${spec.count} exceeds candidates ${candidates.length}`,
        );
      }
      return;
    }
    case "out_of": {
      if (
        !Number.isInteger(spec.keep) ||
        !Number.isInteger(spec.draw) ||
        spec.keep < 0 ||
        spec.draw < 0 ||
        spec.keep > spec.draw
      ) {
        throw new Error(`Mission ${missionId}: invalid ${color} out_of keep/draw`);
      }
      const candidates = spec.candidates ?? defaultCandidates;
      if (spec.draw > candidates.length) {
        throw new Error(
          `Mission ${missionId}: ${color} out_of draw ${spec.draw} exceeds candidates ${candidates.length}`,
        );
      }
      return;
    }
    case "fixed": {
      if (spec.values.length === 0) {
        throw new Error(`Mission ${missionId}: ${color} fixed values cannot be empty`);
      }
      const candidateSet = new Set<number>(defaultCandidates as readonly number[]);
      for (const value of spec.values) {
        if (!candidateSet.has(value)) {
          throw new Error(`Mission ${missionId}: invalid fixed ${color} value ${value}`);
        }
      }
      return;
    }
  }
}

function validateEquipmentSpec(missionId: MissionId, spec: MissionEquipmentSpec): void {
  const allEquipmentIds = new Set(EQUIPMENT_DEFS.map((d) => d.id));
  const allUnlockValues = new Set(EQUIPMENT_DEFS.map((d) => d.unlockValue));

  if (spec.mode === "fixed_pool") {
    if (!spec.fixedEquipmentIds || spec.fixedEquipmentIds.length === 0) {
      throw new Error(`Mission ${missionId}: fixed_pool requires fixedEquipmentIds`);
    }
    for (const id of spec.fixedEquipmentIds) {
      if (!allEquipmentIds.has(id)) {
        throw new Error(`Mission ${missionId}: unknown fixed equipment id ${id}`);
      }
    }
  }

  if (spec.excludedUnlockValues) {
    for (const value of spec.excludedUnlockValues) {
      if (!allUnlockValues.has(value)) {
        throw new Error(`Mission ${missionId}: unknown equipment unlock value ${value}`);
      }
    }
  }

  if (spec.excludedEquipmentIds) {
    for (const id of spec.excludedEquipmentIds) {
      if (!allEquipmentIds.has(id)) {
        throw new Error(`Mission ${missionId}: unknown excluded equipment id ${id}`);
      }
    }
  }
}

function validateMissionSchemas(): void {
  for (const missionId of ALL_MISSION_IDS) {
    const mission = MISSION_SCHEMAS[missionId];
    if (!mission) {
      throw new Error(`Missing mission schema for mission ${missionId}`);
    }

    validateBlueSpec(missionId, mission.setup.blue);
    validatePoolSpec(missionId, "red", mission.setup.red);
    validatePoolSpec(missionId, "yellow", mission.setup.yellow);
    validateEquipmentSpec(missionId, mission.setup.equipment);

    if (mission.overrides) {
      for (const [count, override] of Object.entries(mission.overrides)) {
        const parsed = Number(count) as PlayerCount;
        if (![2, 3, 4, 5].includes(parsed)) {
          throw new Error(`Mission ${missionId}: unsupported player-count override ${count}`);
        }
        if (override.blue) validateBlueSpec(missionId, override.blue);
        if (override.red) validatePoolSpec(missionId, "red", override.red);
        if (override.yellow) validatePoolSpec(missionId, "yellow", override.yellow);
        if (override.equipment) {
          validateEquipmentSpec(
            missionId,
            mergeEquipment(mission.setup.equipment, override.equipment),
          );
        }
      }
    }
  }
}

validateMissionSchemas();
