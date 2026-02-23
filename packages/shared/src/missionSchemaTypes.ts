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
    }
  | {
      /** Pick 1 random candidate value, create `count` tiles all with that same value. */
      kind: "exact_same_value";
      count: number;
      candidates?: readonly number[];
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
 * Mission 15: Equipment starts face-down and is revealed/unlocked when
 * number-card objectives are completed.
 */
export interface NumberDeckEquipmentRevealRuleDef {
  kind: "number_deck_equipment_reveal";
}

/**
 * Mission 23: replaces normal equipment setup with a face-down pile.
 */
export interface HiddenEquipmentPileRuleDef {
  kind: "hidden_equipment_pile";
  /** Number of random equipment cards in the hidden pile. */
  pileSize: number;
}

/**
 * Campaign Nano missions: track mission pressure on a dedicated progress bar.
 */
export interface NanoProgressionRuleDef {
  kind: "nano_progression";
  /** Starting tracker position. */
  start: number;
  /** Inclusive maximum tracker position before mission failure. */
  max: number;
  /** Which lifecycle event advances Nano progression. */
  advanceOn: "successful_cut" | "end_turn";
  /** Base advancement amount per trigger (defaults to 1). */
  advanceBy?: number;
  /** Optional movement mode for value-driven Nano navigation missions. */
  movement?: "forward" | "value_parity";
}

/**
 * Campaign oxygen missions: shared pool + optional per-player oxygen rotation.
 */
export interface OxygenProgressionRuleDef {
  kind: "oxygen_progression";
  /** Initial shared oxygen pool for mission start. */
  initialPool: number;
  /** Oxygen spent at each end-turn hook execution. */
  perTurnCost: number;
  /** Optional per-player oxygen stock at setup time. */
  initialPlayerOxygen?: number;
  /** Rotate per-player oxygen ownership clockwise each turn. */
  rotatePlayerOxygen?: boolean;
}

/**
 * Campaign challenge-card missions: complete active challenges for rewards.
 */
export interface ChallengeRewardsRuleDef {
  kind: "challenge_rewards";
  /** Number of simultaneously active challenge cards. */
  activeCount: number;
  /** Detonator reduction applied when a challenge is completed. */
  rewardDetonatorReduction: number;
}

/**
 * Mission 66 bunker flow: a linear progression track with action pointer.
 */
export interface BunkerFlowRuleDef {
  kind: "bunker_flow";
  /** Initial bunker tracker position. */
  start: number;
  /** Inclusive max bunker tracker position. */
  max: number;
  /** Progress increment for each successful cut. */
  advanceBy: number;
  /** Pointer cycle used for action-marker rotation (defaults to 4). */
  actionCycleLength?: number;
}

/**
 * Sequence card priority (face A or face B).
 * Three visible number cards define an ordered gating:
 * - Need `requiredCuts` of card[0] before card[1] / card[2] are allowed.
 * - Need `requiredCuts` of card[1] before card[2] is allowed.
 *
 * Face A (mission 9): requiredCuts = 2.
 * Face B (mission 16): requiredCuts = 4.
 */
export interface SequencePriorityRuleDef {
  kind: "sequence_priority";
  /** Number of visible sequence cards to draw from the number deck. */
  cardCount: 3;
  /** Required global cut count to unlock the next sequence step. */
  requiredCuts: 2 | 4;
  /** Printed sequence variant on mission card. */
  variant: "face_a" | "face_b";
}

/**
 * Mission 18 — Forced General Radar flow.
 * Each turn: reveal a Number card, auto-compute General Radar on that value,
 * then active player designates which player performs the cut.
 */
export interface ForcedGeneralRadarFlowRuleDef {
  kind: "forced_general_radar_flow";
}

/**
 * Mission 23 — Simultaneous four-of-value cut.
 * Active player designates 4 wires across other players' stands that should
 * match the Number card value. If all 4 match, they are cut simultaneously
 * and remaining hidden equipment becomes usable. If any mismatch, explosion.
 */
export interface SimultaneousFourCutRuleDef {
  kind: "simultaneous_four_cut";
}

/**
 * Mission 14 — Intern (captain) failure explodes.
 * If the captain fails a Dual Cut, the bomb explodes immediately.
 * The captain is also forbidden from using specific equipment.
 */
export interface InternFailureExplodesRuleDef {
  kind: "intern_failure_explodes";
  /** Equipment IDs the intern is forbidden from using. */
  forbiddenEquipment: readonly string[];
}

/**
 * Mission 22 — Yellow-trigger token pass.
 * After `triggerCount` yellow wires have been cut globally, all players
 * pass a token clockwise starting from the captain.
 */
export interface YellowTriggerTokenPassRuleDef {
  kind: "yellow_trigger_token_pass";
  /** Number of yellow wire cuts that triggers the token pass. */
  triggerCount: number;
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
  | NumberDeckEquipmentRevealRuleDef
  | HiddenEquipmentPileRuleDef
  | NanoProgressionRuleDef
  | OxygenProgressionRuleDef
  | ChallengeRewardsRuleDef
  | BunkerFlowRuleDef
  | SequencePriorityRuleDef
  | InternFailureExplodesRuleDef
  | ForcedGeneralRadarFlowRuleDef
  | SimultaneousFourCutRuleDef
  | YellowTriggerTokenPassRuleDef;

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
