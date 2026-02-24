import type { EquipmentUnlockValue, MissionId } from "./types.js";

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
  excludedUnlockValues?: readonly EquipmentUnlockValue[];
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
  /**
   * How active challenge count is derived:
   * - fixed: use `activeCount`
   * - per_player: keep one active challenge per bomb disposal expert
   */
  activeCountMode?: "fixed" | "per_player";
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
 * Constraint enforcement: validates player actions against active constraint cards.
 * Constraints may be global (apply to all) or per-player.
 */
export interface ConstraintEnforcementRuleDef {
  kind: "constraint_enforcement";
  /** Which constraint cards to draw at setup. Empty means configured by mission data. */
  constraintIds: readonly string[];
  /** Whether constraints are personal (per-player) or global. */
  scope: "global" | "per_player";
}

/**
 * Missions 19, 30, 42: Audio prompt required.
 * Players must use a mobile device/app for sound effects.
 */
export interface AudioPromptRuleDef {
  kind: "audio_prompt";
  /** Mission-specific audio file identifier. */
  audioFile: string;
}

/**
 * Mission 25: No spoken numbers.
 * Players cannot say any numbers aloud during the mission.
 */
export interface NoSpokenNumbersRuleDef {
  kind: "no_spoken_numbers";
}

/**
 * Mission 50: No markers / memory mode.
 * No info tokens are placed on failed cuts. Players must remember wire values.
 */
export interface NoMarkersMemoryModeRuleDef {
  kind: "no_markers_memory_mode";
}

/**
 * Missions 21, 33: Replace standard info tokens with even/odd tokens.
 */
export interface EvenOddTokensRuleDef {
  kind: "even_odd_tokens";
}

/**
 * Missions 24, 40: Replace standard info tokens with count tokens (x1/x2/x3)
 * indicating how many wires of that value exist on the stand.
 */
export interface CountTokensRuleDef {
  kind: "count_tokens";
}

/**
 * Mission 52: All info tokens are false — the values must NOT match
 * the wires they point at.
 */
export interface FalseTokensRuleDef {
  kind: "false_tokens";
}

/**
 * Missions 20, 35: The last dealt wire on each stand is moved unsorted
 * to the far right and marked with X.
 */
export interface XMarkedWireRuleDef {
  kind: "x_marked_wire";
  /** Whether Equipment 2 (Walkie-Talkies) is excluded. */
  excludeWalkieTalkies?: boolean;
}

/**
 * Missions 38, 56, 64: Each player flips wire(s) face-down (upside-down)
 * without looking. Teammates can see the value but the player cannot.
 */
export interface UpsideDownWireRuleDef {
  kind: "upside_down_wire";
  /** Number of wires flipped per player. */
  count: 1 | 2;
  /** Whether a failed self-cut of the flipped wire causes immediate explosion. */
  selfCutExplodes?: boolean;
  /** Whether using equipment/detector on own flipped wire is forbidden. */
  noEquipmentOnFlipped?: boolean;
}

/**
 * Missions 26: Visible number card gate — cut wires matching the
 * revealed number card value to proceed.
 */
export interface VisibleNumberCardGateRuleDef {
  kind: "visible_number_card_gate";
}

/**
 * Mission 29: Hidden number card penalty — each turn a hidden number
 * card is revealed and penalizes the player.
 */
export interface HiddenNumberCardPenaltyRuleDef {
  kind: "hidden_number_card_penalty";
}

/**
 * Mission 45: Squeak number challenge — players challenge a number
 * and must cut it before someone else does.
 */
export interface SqueakNumberChallengeRuleDef {
  kind: "squeak_number_challenge";
}

/**
 * Mission 47: Add/subtract number cards — mathematical operations on
 * number cards determine valid cut targets.
 */
export interface AddSubtractNumberCardsRuleDef {
  kind: "add_subtract_number_cards";
}

/**
 * Mission 62: Number card completions — cutting 4 of a value matching
 * a face-up number card grants a detonator reduction.
 */
export interface NumberCardCompletionsRuleDef {
  kind: "number_card_completions";
}

/**
 * Mission 65: Personal number cards — each player has private number
 * cards determining their valid cut targets.
 */
export interface PersonalNumberCardsRuleDef {
  kind: "personal_number_cards";
}

/**
 * Mission 27: No character cards — Double Detectors are unavailable.
 * Also: yellow-trigger random token draft at 2 yellow wire threshold.
 */
export interface NoCharacterCardsRuleDef {
  kind: "no_character_cards";
  /** Trigger threshold for the token draft event. */
  yellowTriggerDraftCount?: number;
}

/**
 * Mission 28: Captain lazy constraints — captain has no character card
 * and special turn-skipping rules.
 */
export interface CaptainLazyConstraintsRuleDef {
  kind: "captain_lazy_constraints";
}

/**
 * Mission 17: False info tokens — captain places misleading tokens.
 */
export interface FalseInfoTokensRuleDef {
  kind: "false_info_tokens";
}

/**
 * Missions 39, 48: Simultaneous multi-wire cut — players simultaneously
 * cut wires of the same color.
 */
export interface SimultaneousMultiCutRuleDef {
  kind: "simultaneous_multi_cut";
  /** Color of wires cut simultaneously. */
  color: "yellow" | "red";
  /** Number of wires to cut simultaneously. */
  count: 3 | 4;
}

/**
 * Mission 46: Sevens must be last — all 7-value wires must be the last
 * wires cut on each stand.
 */
export interface SevensLastRuleDef {
  kind: "sevens_last";
}

/**
 * Mission 51: Boss designates value — the designated player announces
 * a value and a teammate must cut it.
 */
export interface BossDesignatesValueRuleDef {
  kind: "boss_designates_value";
}

/**
 * Mission 58: No-info unlimited Double Detector — DD is always available
 * but failed cuts give no information.
 */
export interface NoInfoUnlimitedDDRuleDef {
  kind: "no_info_unlimited_dd";
}

/**
 * Mission 59: Nano value-parity navigation — Nano moves based on
 * wire value parity (even/odd) matching.
 */
export interface NanoValueParityRuleDef {
  kind: "nano_value_parity";
}

/**
 * Mission 13: Random setup info tokens — during setup, random info
 * tokens are placed instead of player-chosen ones.
 */
export interface RandomSetupInfoTokensRuleDef {
  kind: "random_setup_info_tokens";
}

/**
 * Mission 41: Iberian yellow mode — special yellow wire handling
 * where a designated wire must be cut when instructed.
 */
export interface IberianYellowModeRuleDef {
  kind: "iberian_yellow_mode";
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
  | YellowTriggerTokenPassRuleDef
  | ConstraintEnforcementRuleDef
  | AudioPromptRuleDef
  | NoSpokenNumbersRuleDef
  | NoMarkersMemoryModeRuleDef
  | EvenOddTokensRuleDef
  | CountTokensRuleDef
  | FalseTokensRuleDef
  | XMarkedWireRuleDef
  | UpsideDownWireRuleDef
  | VisibleNumberCardGateRuleDef
  | HiddenNumberCardPenaltyRuleDef
  | SqueakNumberChallengeRuleDef
  | AddSubtractNumberCardsRuleDef
  | NumberCardCompletionsRuleDef
  | PersonalNumberCardsRuleDef
  | NoCharacterCardsRuleDef
  | CaptainLazyConstraintsRuleDef
  | FalseInfoTokensRuleDef
  | SimultaneousMultiCutRuleDef
  | SevensLastRuleDef
  | BossDesignatesValueRuleDef
  | NoInfoUnlimitedDDRuleDef
  | NanoValueParityRuleDef
  | RandomSetupInfoTokensRuleDef
  | IberianYellowModeRuleDef;

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
