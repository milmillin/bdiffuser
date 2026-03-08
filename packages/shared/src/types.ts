import type { Mission66BunkerFloor } from "./bunkerMap.js";

// ── Wire Tiles ──────────────────────────────────────────────

export type WireColor = "blue" | "red" | "yellow";

/** Blue wires have numeric values 1-12. Red/yellow use their color as the "value" during play. */
export type WireValue = number | "RED" | "YELLOW";

export interface WireTile {
  id: string;
  color: WireColor;
  /** Numeric value for sorting (blue: 1-12, red: 1.5-11.5, yellow: 1.1-11.1) */
  sortValue: number;
  /** Value used during gameplay (blue: 1-12, red: "RED", yellow: "YELLOW") */
  gameValue: WireValue;
  /** Image filename e.g. "135_r1c3_front.png" */
  image: string;
  /** Whether this tile has been cut (revealed) */
  cut: boolean;
  /** Mission marker: this wire is marked with X (mission 20 style). */
  isXMarked?: boolean;
  /** The player ID who originally owned this tile at game setup. */
  originalOwnerId?: string;
}

/** What a client sees for a tile — hidden tiles omit color/value/image */
export interface VisibleTile {
  id: string;
  cut: boolean;
  /** Public marker shown on this tile position (mission 20 style). */
  isXMarked?: boolean;
  /** Only present if tile belongs to viewing player or is cut */
  color?: WireColor;
  gameValue?: WireValue;
  sortValue?: number;
  image?: string;
  /** The player ID who originally owned this tile at game setup. */
  originalOwnerId?: string;
}

// ── Players ─────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  character: CharacterId | null;
  isCaptain: boolean;
  /** All wire tiles as a single sorted hand */
  hand: WireTile[];
  /** Flat stand partition metadata (sum must equal `hand.length`). */
  standSizes: number[];
  /** Info tokens placed in front of this player's stand */
  infoTokens: InfoToken[];
  /** Whether this player's character ability has been used */
  characterUsed: boolean;
  connected: boolean;
  isBot: boolean;
}

export interface InfoToken {
  value: number;
  position: number; // index of the tile it points to
  isYellow: boolean;
  /** Optional parity variant used by mission rules (e.g. mission 21). */
  parity?: "even" | "odd";
  /** Optional count-hint variant used by mission rules (e.g. mission 24). */
  countHint?: 1 | 2 | 3 | 4;
  /** Optional relation marker for Label cards. */
  relation?: "eq" | "neq";
  /** Secondary index used by relation markers. */
  positionB?: number;
  /** Single-wire-label marker: this value appears only once on the stand. */
  singleWire?: boolean;
}

// ── Characters ──────────────────────────────────────────────

export type CharacterId =
  | "double_detector"
  | "character_2"
  | "character_3"
  | "character_4"
  | "character_5"
  | "character_e1"
  | "character_e2"
  | "character_e3"
  | "character_e4";

// ── Equipment ───────────────────────────────────────────────

export type EquipmentUnlockValue = number | "YELLOW";

export interface EquipmentCard {
  id: string;
  name: string;
  description: string;
  /** Wire value that unlocks this equipment (required cut count may vary by mission/card). */
  unlockValue: EquipmentUnlockValue;
  /** Whether this card is still hidden face-down to players. */
  faceDown?: boolean;
  /** Optional secondary mission lock value (e.g. mission 12 number-card lock). */
  secondaryLockValue?: number;
  /** Required cuts for `secondaryLockValue` before this card can be used. */
  secondaryLockCutsRequired?: number;
  unlocked: boolean;
  used: boolean;
  image: string;
}

export type BaseEquipmentId =
  | "label_neq"
  | "talkies_walkies"
  | "triple_detector"
  | "post_it"
  | "super_detector"
  | "rewinder"
  | "emergency_batteries"
  | "general_radar"
  | "stabilizer"
  | "x_or_y_ray"
  | "coffee_mug"
  | "label_eq";

export type CampaignEquipmentId =
  | "false_bottom"
  | "single_wire_label"
  | "emergency_drop"
  | "fast_pass"
  | "disintegrator"
  | "grappling_hook";

export type AnyEquipmentId = BaseEquipmentId | CampaignEquipmentId;

export type EquipmentGuessValue = EquipmentUnlockValue;

export type UseEquipmentPayload =
  | { kind: "label_neq"; tileIndexA: number; tileIndexB: number }
  | {
      kind: "talkies_walkies";
      teammateId: string;
      myTileIndex: number;
      /**
       * Legacy field kept for compatibility.
       * Server ignores this on initiation; the teammate must choose their own
       * wire via forced action resolution.
       */
      teammateTileIndex?: number;
    }
  | {
      kind: "triple_detector";
      targetPlayerId: string;
      targetTileIndices: number[];
      guessValue: number;
    }
  | { kind: "post_it"; tileIndex: number }
  | {
      kind: "super_detector";
      targetPlayerId: string;
      guessValue: number;
      /** Optional explicit stand targeting for multi-stand players. */
      targetStandIndex?: number;
    }
  | { kind: "rewinder" }
  | { kind: "emergency_batteries"; playerIds: string[] }
  | { kind: "general_radar"; value: number }
  | { kind: "stabilizer" }
  | {
      kind: "x_or_y_ray";
      targetPlayerId: string;
      targetTileIndex: number;
      guessValueA: EquipmentGuessValue;
      guessValueB: EquipmentGuessValue;
    }
  | { kind: "coffee_mug"; targetPlayerId: string }
  | { kind: "label_eq"; tileIndexA: number; tileIndexB: number }
  // Campaign equipment payloads
  | { kind: "false_bottom" }
  | { kind: "single_wire_label"; tileIndex: number }
  | { kind: "emergency_drop" }
  | { kind: "fast_pass"; value: number }
  | { kind: "disintegrator" }
  | {
      kind: "grappling_hook";
      targetPlayerId: string;
      targetTileIndex: number;
      /**
       * Required when the receiving player has 2 stands.
       * Indicates which stand receives the taken wire.
       */
      receiverStandIndex?: number;
    };

// ── Board State ─────────────────────────────────────────────

export interface BoardState {
  /** Current detonator position (0 = start, increases toward skull) */
  detonatorPosition: number;
  /** Maximum detonator position before explosion (varies by player count) */
  detonatorMax: number;
  /** Number of cut wires per value 1-12 (4 = fully validated) */
  validationTrack: Record<number, number>;
  /** Red/yellow markers on the board showing which values might be in play */
  markers: BoardMarker[];
  /** Equipment cards for this game */
  equipment: EquipmentCard[];
}

export interface BoardMarker {
  value: number;
  color: "red" | "yellow";
  /** True for '?' style setup markers where value is only a candidate. */
  possible?: boolean;
  /** Whether the wire has been successfully cut */
  confirmed?: boolean;
}

// ── Campaign Objects ────────────────────────────────────────

/** A numbered card used in campaign missions (e.g. action-order or value cards). */
export interface NumberCard {
  id: string;
  value: number;
  /** Whether this card is face-up (visible to all players). */
  faceUp: boolean;
  /**
   * Mission 62 setup metadata: how many spaces before explosion the
   * detonator should start when this Number card is used.
   */
  mission62StartingDetonatorDistanceFromLoss?: number;
}

/** Tracks the number-card deck, discard pile, and visible/hidden hands. */
export interface NumberCardState {
  /** Draw pile (face-down, ordered top-first). */
  deck: NumberCard[];
  /** Discard pile (most recent on top). */
  discard: NumberCard[];
  /** Cards visible to all players (e.g. a shared display). */
  visible: NumberCard[];
  /** Per-player hidden cards, keyed by player ID. */
  playerHands: Record<string, NumberCard[]>;
}

/** Remaining mission 22 token-pass values that are still on the board. */
export interface Mission22TokenPassBoardState {
  /** Numeric values still available for token passing. */
  numericTokens: number[];
  /** Remaining yellow tokens still available for token passing. */
  yellowTokens: number;
}

/** Remaining mission 27 token-draft values currently in the draft line. */
export interface Mission27TokenDraftBoardState {
  /** Numeric values currently available in the draft line. */
  numericTokens: number[];
  /** Yellow token copies currently available in the draft line. */
  yellowTokens: number;
}

/** A constraint that restricts actions during a mission. */
export interface ConstraintCard {
  id: string;
  name: string;
  description: string;
  /** Whether this constraint is currently active. */
  active: boolean;
}

/** State for the constraint card selection phase (e.g. mission 31). */
export interface ConstraintSelectionState {
  /** Card IDs still available for selection. */
  availableCardIds: string[];
}

/** Tracks global constraints and per-player constraints. */
export interface ConstraintCardState {
  /** Constraints applying to all players. */
  global: ConstraintCard[];
  /** Per-player active constraints, keyed by player ID. */
  perPlayer: Record<string, ConstraintCard[]>;
  /** Draw deck of undealt constraints (shuffled). */
  deck?: ConstraintCard[];
}

/** A challenge card that may award bonuses when completed. */
export interface ChallengeCard {
  id: string;
  name: string;
  description: string;
  /** Whether this challenge has been completed. */
  completed: boolean;
  /**
   * Mission 55/60 setup metadata: how many spaces before explosion the
   * detonator starts when this card is drawn.
   */
  startingDetonatorDistanceFromLoss?: number;
  /**
   * Mission 55/60 runtime metadata for Challenge 8.
   * The challenge completes when the first 2 validation placements match these
   * face-up values in order.
   */
  targetValues?: number[];
}

/** Tracks drawn/available/completed challenge cards. */
export interface ChallengeCardState {
  /** Undrawn challenge cards (draw pile). */
  deck: ChallengeCard[];
  /** Currently active challenge(s). */
  active: ChallengeCard[];
  /** Completed/discarded challenges. */
  completed: ChallengeCard[];
}

export interface MissionChallengeTurnEvent {
  actionType:
    | "dualCut"
    | "soloCut"
    | "equipmentCut"
    | "revealReds"
    | "challengeRedCut"
    | "failedCut";
  cutValue?: number;
}

export interface MissionChallengeProgressState {
  recentTurnEvents: MissionChallengeTurnEvent[];
  validationSequence: number[];
}

/** Tracks the oxygen economy for missions that use it. */
export interface OxygenState {
  /** Total oxygen remaining in the shared pool. */
  pool: number;
  /** Oxygen tokens held per player, keyed by player ID. */
  playerOxygen: Record<string, number>;
}

/** A linear progress tracker (used for Nano/Bunker mechanics). */
export interface ProgressTracker {
  /** Current position on the track (0-based). */
  position: number;
  /** Maximum position (inclusive) before triggering the end condition. */
  max: number;
}

/** Special markers placed on the board (X marker, sequence/action pointers). */
export interface SpecialMarker {
  /** Marker type identifier. */
  kind: "x" | "sequence_pointer" | "action_pointer";
  /** Associated value or position (e.g. wire value, player index). */
  value: number;
}

/** Mission 59: Nano navigation state on the Number card line. */
export interface Mission59NanoState {
  /** Current index into the shared Number card line. */
  position: number;
  /** Direction Nano faces: 1 for increasing index, -1 for decreasing. */
  facing: 1 | -1;
}

/** Mission 43: hidden Nano wire metadata stored off-board. */
export interface Mission43NanoWire {
  /** Stable tile identifier moved into Nano's hidden pool. */
  id: string;
  /** Sort value used to reconstruct tile semantics and insertion order. */
  sortValue: number;
  /** The player ID who originally owned this tile at mission setup. */
  originalOwnerId?: string;
}

/** Mission 29: per-turn hidden Number-card selection and outcome state. */
export interface Mission29TurnState {
  /** Active player whose turn this hidden-card applies to. */
  actorId: string;
  /** Player to the actor's right who must choose the hidden card. */
  chooserId: string;
  /** Whether the actor successfully cut the selected value this turn. */
  matchedCut?: boolean;
  /** Whether reveal/penalty is skipped this turn (Coffee Mug FAQ). */
  skipReveal?: boolean;
}

/** Mission 45: current volunteer/fallback/cut state for the active Number card. */
export interface Mission45TurnState {
  /** Current step in the mission's volunteer-selection flow. */
  stage: "awaiting_volunteer" | "awaiting_captain_choice" | "awaiting_penalty_token" | "awaiting_cut";
  /** Captain responsible for revealing the current Number card each turn. */
  captainId: string;
  /** Active visible Number card, if any incomplete numeric values remain. */
  currentCardId?: string;
  /** Value printed on the active Number card, if any. */
  currentValue?: number;
  /** Selected cutter for the current Number card. */
  selectedCutterId?: string;
  /** Player who must choose a penalty info token after a bad fallback target. */
  penaltyPlayerId?: string;
}

/** Mission 34: hidden weakest-link role and hidden personal constraints. */
export interface Mission34HiddenState {
  /** Server-only hidden weakest-link identity; omitted in filtered client views. */
  weakestLinkPlayerId?: string;
  /** Hidden dealt constraints. Clients only receive their own entry while hidden. */
  constraintsByPlayerId: Record<string, ConstraintCard[]>;
}

/** Mission 61: one public constraint slot per seat, plus public extra table slots. */
export interface Mission61ConstraintRingSlot {
  /** Stable slot key in clockwise order starting at the Captain's seat. */
  id: string;
  /** Whether this slot belongs to a player seat or an extra table position. */
  kind: "player" | "extra";
  /** Player owning this seat slot, if any. */
  playerId?: string;
  /** Public label for extra slots such as Captain's Left / Right. */
  label?: string;
  /** Constraint card currently in front of this slot. */
  card: ConstraintCard;
}

/** Mission 61: public ring plus server-only replacement pool. */
export interface Mission61ConstraintRingState {
  /** Clockwise ring order, starting at the Captain's seat. */
  slots: Mission61ConstraintRingSlot[];
  /** Replacement F-L cards not currently on the table; omitted from client views. */
  replacementPool?: ConstraintCard[];
}

export type Mission30Phase =
  | "briefing_locked"
  | "prologue_free_play"
  | "round_a1"
  | "round_a2"
  | "round_b1"
  | "round_b2"
  | "mime_intro"
  | "round_c1"
  | "round_c2"
  | "triple_lock_intro"
  | "triple_lock"
  | "yellow_sweep"
  | "final_cleanup"
  | "completed"
  | "failed";

export type Mission30Mode = "instruction" | "action" | "resolving" | "paused";

export interface Mission30YesNoReveal {
  actorId: string;
  value: number;
  hasValue: boolean;
}

export interface Mission30State {
  phase: Mission30Phase;
  mode: Mission30Mode;
  currentClipId: string;
  cueEndsAtMs?: number;
  visibleDeadlineMs?: number;
  hardDeadlineMs?: number;
  pausedAtMs?: number;
  currentTargetValue?: number;
  visibleTargetValues?: number[];
  mimeMode: boolean;
  yellowCountsRevealed: boolean;
  publicYellowCountsByPlayerId?: Record<string, number>;
  lastYesNoReveal?: Mission30YesNoReveal;
  roundB1Succeeded?: boolean;
}

export type Mission66BunkerDirection = "north" | "south" | "east" | "west";

export type Mission66BunkerActivationTarget =
  | "front_key"
  | "front_skull"
  | "back_alarm"
  | "back_detonator";

export interface Mission66BunkerPosition {
  floor: Mission66BunkerFloor;
  row: number;
  col: number;
}

export interface Mission66BunkerConstraintState {
  north: ConstraintCard;
  south: ConstraintCard;
  east: ConstraintCard;
  west: ConstraintCard;
  action: ConstraintCard;
}

export interface Mission66BunkerState {
  position: Mission66BunkerPosition;
  constraints: Mission66BunkerConstraintState;
  frontKeyActivated: boolean;
  frontSkullActivated: boolean;
  backAlarmActivated: boolean;
  backDetonatorActivated: boolean;
}

export type Mission66BunkerChoiceOption =
  | {
      kind: "move";
      direction: Mission66BunkerDirection;
      destination: Mission66BunkerPosition;
    }
  | {
      kind: "activate";
      target: Mission66BunkerActivationTarget;
    };

export type Mission66BunkerChoiceSelection =
  | { kind: "move"; direction: Mission66BunkerDirection }
  | { kind: "activate"; target: Mission66BunkerActivationTarget };

/**
 * All campaign-specific state, attached optionally to GameState.
 * Each sub-object is present only when the active mission uses that mechanic.
 */
export interface CampaignState {
  numberCards?: NumberCardState;
  constraints?: ConstraintCardState;
  challenges?: ChallengeCardState;
  challengeProgress?: MissionChallengeProgressState;
  oxygen?: OxygenState;
  nanoTracker?: ProgressTracker;
  bunkerTracker?: ProgressTracker;
  specialMarkers?: SpecialMarker[];
  /** Mission 18: index of the designator (active player) during a cutter sub-turn. */
  mission18DesignatorIndex?: number;
  /** Mission 51: index of the active Sir/Ma'am during a designated-cut sub-turn. */
  mission51SirIndex?: number;
  /** Mission 22: whether the yellow-trigger token pass has been triggered. */
  mission22TokenPassTriggered?: boolean;
  /** Mission 22: remaining board supply for the token pass action. */
  mission22TokenPassBoard?: Mission22TokenPassBoardState;
  /** Mission 27: whether the yellow-trigger token draft has been triggered. */
  mission27TokenDraftTriggered?: boolean;
  /** Mission 27: remaining values in the random token draft line. */
  mission27TokenDraftBoard?: Mission27TokenDraftBoardState;
  /** Reserve pool of undealt equipment cards for False Bottom. */
  equipmentReserve?: EquipmentCard[];
  /** Mission 23: whether the simultaneous four-of-value cut has been completed. */
  mission23SpecialActionDone?: boolean;
  /** Mission 46: which player must trigger the simultaneous sevens cut this turn. */
  mission46PendingSevensPlayerId?: string;
  /** Mission 17: Rhett Herrings places false info tokens. */
  falseInfoTokenMode?: boolean;
  /** Mission 52 (and variants): all setup info tokens are false. */
  falseTokenMode?: boolean;
  /** Mission 59: Nano line navigation state. */
  mission59Nano?: Mission59NanoState;
  /** Mission 29: hidden Number-card turn state. */
  mission29Turn?: Mission29TurnState;
  /** Mission 45: volunteer/fallback/cut state for the current Number card. */
  mission45Turn?: Mission45TurnState;
  /** Mission 34: hidden weakest-link role and hidden dealt constraints. */
  mission34Hidden?: Mission34HiddenState;
  /** Mission 30: scripted audio-first mission runtime state. */
  mission30?: Mission30State;
  /** Mission 61: public rotating constraint ring. */
  mission61Ring?: Mission61ConstraintRingState;
  /** Mission 66: public bunker board state and fixed directional/ACTION constraints. */
  mission66Bunker?: Mission66BunkerState;
  /** Mission 31: constraint card selection state (active during select_constraints phase). */
  constraintSelection?: ConstraintSelectionState;
  /** Mission 43: hidden wires currently held by Nano. */
  mission43NanoWires?: Mission43NanoWire[];
  /** Mission 43: Nano movement direction on the 1-12 strip. */
  mission43NanoDirection?: 1 | -1;
  /**
   * Mission 43: public count of hidden Nano wires.
   * Server authoritative source remains `mission43NanoWires.length`.
   */
  mission43NanoWireCount?: number;
}

// ── Campaign Defaults ───────────────────────────────────────

/** Empty number-card state (no cards in play). */
export function emptyNumberCardState(): NumberCardState {
  return { deck: [], discard: [], visible: [], playerHands: {} };
}

/** Empty constraint-card state (no constraints). */
export function emptyConstraintCardState(): ConstraintCardState {
  return { global: [], perPlayer: {} };
}

/** Empty challenge-card state (no challenges). */
export function emptyChallengeCardState(): ChallengeCardState {
  return { deck: [], active: [], completed: [] };
}

/** Default oxygen state with a given pool size. */
export function defaultOxygenState(pool = 0): OxygenState {
  return { pool, playerOxygen: {} };
}

/** Default progress tracker at position 0. */
export function defaultProgressTracker(max: number): ProgressTracker {
  return { position: 0, max };
}

// ── Chat ────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isBotReasoning: boolean;
  turnNumber: number;
}

// ── Forced Actions ───────────────────────────────────────

/** A forced action that must be resolved before normal play resumes. */
export type ForcedAction =
  | {
      kind: "mission45VolunteerWindow";
      /** The captain controlling manual fallback for the current Number card. */
      captainId: string;
    }
  | {
      kind: "mission45CaptainChoice";
      /** The captain who must pick a cutter after no / bad volunteer. */
      captainId: string;
    }
  | {
      kind: "mission45PenaltyTokenChoice";
      /** The player who must choose one info token for their stand. */
      playerId: string;
    }
  | {
      kind: "chooseNextPlayer";
      /** The player who must resolve this forced action (typically the captain). */
      captainId: string;
      /** The player who took the previous turn (used by mission-10 no-consecutive rule). */
      lastPlayerId?: string;
    }
  | {
      kind: "designateCutter";
      /** The player who must designate who cuts (the active player). */
      designatorId: string;
      /** The Number card value drawn this turn. */
      value: number;
      /** General Radar results: per-player boolean (true = has at least one uncut wire of this value). */
      radarResults: Record<string, boolean>;
    }
  | {
      kind: "mission51DesignateCutter";
      /** The active Sir/Ma'am who must designate who cuts this Number value. */
      sirId: string;
      /** The shared visible Number card value. */
      value: number;
    }
  | {
      kind: "mission51PenaltyTokenChoice";
      /** The player who must choose a stand-side penalty token. */
      targetPlayerId: string;
      /** The Sir/Ma'am whose turn caused the penalty. */
      sirId: string;
      /** The currently active Mission 51 Number card value. */
      value: number;
    }
  | {
      kind: "mission22TokenPass";
      /** Index of the player who currently must choose a token value to pass. */
      currentChooserIndex: number;
      /** ID of the current chooser (convenience for message routing). */
      currentChooserId: string;
      /** Player indices in clockwise passing order, starting from captain. */
      passingOrder: number[];
      /** How many players have completed their token pass. */
      completedCount: number;
    }
  | {
      kind: "mission27TokenDraft";
      /** Index of the player who currently must choose a token from the draft line. */
      currentChooserIndex: number;
      /** ID of the current chooser (convenience for message routing). */
      currentChooserId: string;
      /** Player indices in clockwise draft order, starting from captain. */
      draftOrder: number[];
      /** How many players have completed their draft pick. */
      completedCount: number;
    }
  | {
      kind: "mission29HiddenNumberCard";
      /** The active Mission 29 player whose turn this card applies to. */
      actorId: string;
      /** The right-hand chooser who must select one hidden Number card. */
      chooserId: string;
    }
  | {
      kind: "mission65CardHandoff";
      /** The player who must give one Number card to a teammate. */
      actorId: string;
    }
  | {
      kind: "mission46SevensCut";
      /** Player ID required to perform the simultaneous four-cut of all 7s. */
      playerId: string;
    }
  | {
      kind: "detectorTileChoice";
      /** The player who must choose which matching tile to cut. */
      targetPlayerId: string;
      /** The player who used the detector. */
      actorId: string;
      /** Tile indices the target can pick from. */
      matchingTileIndices: number[];
      /** The guessed value. */
      guessValue: number;
      /** Which detector triggered this choice. */
      source: "doubleDetector" | "tripleDetector" | "superDetector";
      /** Double Detector: first designated tile index. */
      originalTileIndex1?: number;
      /** Double Detector: second designated tile index. */
      originalTileIndex2?: number;
      mission59RotateNano?: boolean;
      /** Oxygen recipient player ID selected by the actor (for Mission 49 rules). */
      oxygenRecipientPlayerId?: string;
      /** Triple Detector: the 3 originally targeted tile indices. */
      originalTargetTileIndices?: number[];
      /** Actor's tile index to cut on resolution. */
      actorTileIndex?: number;
      /** Mission 43: chosen receiving stand for Nano wire transfer. */
      mission43NanoStandIndex?: number;
      /** Equipment card ID if triggered via equipment (not character ability). */
      equipmentId?: string;
    }
  | {
      kind: "talkiesWalkiesTileChoice";
      /** The player who initiated Walkie-Talkies. */
      actorId: string;
      /** The player who must choose which of their uncut wires to swap. */
      targetPlayerId: string;
      /** The actor's already selected uncut wire index. */
      actorTileIndex: number;
      /** Whether this came from equipment card or personal character ability. */
      source: "equipment" | "characterAbility";
    }
  | {
      kind: "mission61ConstraintRotate";
      /** The captain who must resolve the rotation choice. */
      captainId: string;
      /** Direction the team chooses for the rotation. */
      direction: Mission61ConstraintRotationDirection;
      /** The player who acted immediately before this round started. */
      previousPlayerId?: string;
    }
  | {
      kind: "mission32ConstraintDecision";
      /** The captain who must choose whether to keep or replace the visible constraint. */
      captainId: string;
      /** The player whose turn is about to begin. */
      actorId: string;
      /** Current captain decision selection. */
      decision: Mission32ConstraintDecision;
    }
  | {
      kind: "mission66BunkerChoice";
      /** The current player who must resolve the bunker choice for this cut step. */
      actorId: string;
      /** Numeric value cut by the action that triggered this bunker step. */
      cutValue: number;
      /** Remaining Mission 66 bunker steps including this one. */
      remainingSteps: number;
      /** Legal bunker options for this cut step. */
      options: Mission66BunkerChoiceOption[];
    }
  | {
      kind: "mission36SequencePosition";
      /** The captain who must choose the sequence-card side on Mission 36. */
      captainId: string;
      /** Why this choice is currently required. */
      reason: "initial" | "advance";
    };

export interface TurnEffects {
  /** Stabilizer protection for the specified player's current turn. */
  stabilizer?: {
    playerId: string;
    turnNumber: number;
  };
}

export interface SurrenderVoteState {
  /** Player IDs (humans only) currently voting yes to surrender. */
  yesVoterIds: string[];
}

// ── Action Validation ─────────────────────────────────────

/** Stable machine-readable legality reasons for action rejection. */
export type ActionLegalityCode =
  | "NOT_YOUR_TURN"
  | "ACTOR_NOT_FOUND"
  | "TARGET_PLAYER_NOT_FOUND"
  | "CANNOT_TARGET_SELF"
  | "INVALID_TILE_INDEX"
  | "TILE_ALREADY_CUT"
  | "GUESS_VALUE_NOT_IN_HAND"
  | "NO_MATCHING_WIRES_IN_HAND"
  | "SOLO_NOT_ALL_REMAINING_IN_HAND"
  | "SOLO_REQUIRES_TWO_OR_FOUR"
  | "NO_WIRES_TO_REVEAL"
  | "REVEAL_REDS_REQUIRES_ALL_RED"
  | "EQUIPMENT_NOT_FOUND"
  | "EQUIPMENT_LOCKED"
  | "EQUIPMENT_ALREADY_USED"
  | "EQUIPMENT_TIMING_VIOLATION"
  | "EQUIPMENT_INVALID_PAYLOAD"
  | "EQUIPMENT_RULE_VIOLATION"
  | "FORCED_ACTION_PENDING"
  | "FORCED_REVEAL_REDS_REQUIRED"
  | "MISSION_RULE_VIOLATION"
  | "CHARACTER_ABILITY_ALREADY_USED"
  | "CHARACTER_ABILITY_WRONG_CHARACTER"
  | "DOUBLE_DETECTOR_INVALID_TILES"
  | "DOUBLE_DETECTOR_GUESS_NOT_BLUE"
  | "SIMULTANEOUS_RED_CUT_WRONG_MISSION"
  | "SIMULTANEOUS_RED_CUT_INVALID_TARGETS"
  | "NO_UNCUT_RED_WIRES"
  | "SIMULTANEOUS_FOUR_CUT_WRONG_MISSION"
  | "SIMULTANEOUS_FOUR_CUT_INVALID_TARGETS"
  | "SIMULTANEOUS_FOUR_CUT_ALREADY_DONE";

export interface ActionLegalityError {
  code: ActionLegalityCode;
  message: string;
}

// ── Game State ──────────────────────────────────────────────

export type GamePhase = "lobby" | "select_constraints" | "setup_info_tokens" | "playing" | "finished";
export type GameResult =
  | "win"
  | "loss_red_wire"
  | "loss_detonator"
  | "loss_timer"
  | "loss_surrender"
  | null;

export type MissionAudioStatus = "playing" | "paused";

export interface MissionAudioState {
  audioFile: string;
  status: MissionAudioStatus;
  /** Position in milliseconds captured at `syncedAtMs`. */
  positionMs: number;
  /** Unix-ms timestamp for the canonical playback snapshot. */
  syncedAtMs: number;
  /** Optional known duration in milliseconds. */
  durationMs?: number;
  /** Optional current scripted-clip identifier for segmented missions. */
  clipId?: string;
  /** Inclusive segment start bound in milliseconds. */
  segmentStartMs?: number;
  /** Exclusive segment end bound in milliseconds. */
  segmentEndMs?: number;
  /** Whether playback should wrap between `segmentStartMs` and `segmentEndMs`. */
  loopSegment?: boolean;
  /** Whether timeline seeking is disabled by mission rules. */
  transportLocked?: boolean;
}

export interface GameState {
  phase: GamePhase;
  roomId: string;
  players: Player[];
  board: BoardState;
  currentPlayerIndex: number;
  turnNumber: number;
  mission: MissionId;
  result: GameResult;
  /** Log of actions taken */
  log: GameLogEntry[];
  chat: ChatMessage[];
  /** Campaign-specific state; absent for non-campaign missions. */
  campaign?: CampaignState;
  /** A forced action that must be resolved before normal play resumes. */
  pendingForcedAction?: ForcedAction;
  /** Ongoing surrender vote (yes voters only). */
  surrenderVote?: SurrenderVoteState;
  /** Temporary turn-scoped effects from equipment cards. */
  turnEffects?: TurnEffects;
  /** Mission audio playback state synchronized across all players. */
  missionAudio?: MissionAudioState;
  /** Unix-ms deadline for mission timer (mission 10). Game is lost when reached. */
  timerDeadline?: number;
}

export const ALL_MISSION_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
] as const;

export type MissionId = (typeof ALL_MISSION_IDS)[number];

export type LogTemplateKey =
  | "equipment.coffee_mug.pass_turn"
  | "designate_cutter.selected";

export interface LogTextDetail {
  type: "text";
  text: string;
}

export interface LogTemplateDetail {
  type: "template";
  template: LogTemplateKey;
  params: Record<string, string | number | boolean>;
}

export type GameLogDetail = LogTextDetail | LogTemplateDetail;

export interface GameLogEntry {
  turn: number;
  playerId: string;
  action: string;
  detail: GameLogDetail;
  timestamp: number;
}

// ── Client View (filtered state) ────────────────────────────

export interface ClientGameState {
  phase: GamePhase;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSpectator?: boolean;
  players: ClientPlayer[];
  board: BoardState;
  currentPlayerIndex: number;
  turnNumber: number;
  mission: MissionId;
  result: GameResult;
  log: GameLogEntry[];
  chat: ChatMessage[];
  /** Campaign-specific state (visibility-filtered); absent for non-campaign missions. */
  campaign?: CampaignState;
  /** A forced action that must be resolved before normal play resumes. */
  pendingForcedAction?: ForcedAction;
  /** Ongoing surrender vote (yes voters only). */
  surrenderVote?: SurrenderVoteState;
  /** Mission audio playback state synchronized across all players. */
  missionAudio?: MissionAudioState;
  /** Unix-ms deadline for mission timer (mission 10). Game is lost when reached. */
  timerDeadline?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  character: CharacterId | null;
  isCaptain: boolean;
  /** Wire tiles with visibility filtering applied */
  hand: VisibleTile[];
  /** Flat stand partition metadata (sum must equal `hand.length`). */
  standSizes: number[];
  infoTokens: InfoToken[];
  characterUsed: boolean;
  connected: boolean;
  isBot: boolean;
  /** Total tile count (for UI display) */
  remainingTiles: number;
}

// ── Lobby State ─────────────────────────────────────────────

export type CaptainMode = "random" | "selection";

export interface LobbyState {
  roomId: string;
  players: LobbyPlayer[];
  mission: MissionId;
  hostId: string;
  captainMode: CaptainMode;
  selectedCaptainId: string | null;
  mcpPassword: string;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  character: CharacterId | null;
  isHost: boolean;
  connected: boolean;
  isBot: boolean;
}
export type Mission61ConstraintRotationDirection =
  | "clockwise"
  | "counter_clockwise"
  | "skip";
export type Mission32ConstraintDecision = "keep" | "replace";
