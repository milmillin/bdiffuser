import type { MissionId } from "./types.js";

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
  requiredCuts: number;
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
  /** Mission card front image filename (e.g. "mission_1.png"). */
  cardImage: string;
  /** Mission card back image filename (e.g. "mission_1_back.png"). */
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
