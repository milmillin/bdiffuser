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
}

/** What a client sees for a tile — hidden tiles omit color/value/image */
export interface VisibleTile {
  id: string;
  cut: boolean;
  /** Only present if tile belongs to viewing player or is cut */
  color?: WireColor;
  gameValue?: WireValue;
  sortValue?: number;
  image?: string;
}

// ── Players ─────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  character: CharacterId | null;
  isCaptain: boolean;
  /** All wire tiles as a single sorted hand */
  hand: WireTile[];
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
}

// ── Characters ──────────────────────────────────────────────

export type CharacterId =
  | "double_detector"
  | "character_2"
  | "character_3"
  | "character_4"
  | "character_5";

// ── Equipment ───────────────────────────────────────────────

export interface EquipmentCard {
  id: string;
  name: string;
  description: string;
  /** Wire value that unlocks this equipment (when 2 of this value are cut) */
  unlockValue: number;
  unlocked: boolean;
  used: boolean;
  image: string;
}

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

/** A constraint that restricts actions during a mission. */
export interface ConstraintCard {
  id: string;
  name: string;
  description: string;
  /** Whether this constraint is currently active. */
  active: boolean;
}

/** Tracks global constraints and per-player constraints. */
export interface ConstraintCardState {
  /** Constraints applying to all players. */
  global: ConstraintCard[];
  /** Per-player active constraints, keyed by player ID. */
  perPlayer: Record<string, ConstraintCard[]>;
}

/** A challenge card that may award bonuses when completed. */
export interface ChallengeCard {
  id: string;
  name: string;
  description: string;
  /** Whether this challenge has been completed. */
  completed: boolean;
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

/**
 * All campaign-specific state, attached optionally to GameState.
 * Each sub-object is present only when the active mission uses that mechanic.
 */
export interface CampaignState {
  numberCards?: NumberCardState;
  constraints?: ConstraintCardState;
  challenges?: ChallengeCardState;
  oxygen?: OxygenState;
  nanoTracker?: ProgressTracker;
  bunkerTracker?: ProgressTracker;
  specialMarkers?: SpecialMarker[];
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

// ── Game State ──────────────────────────────────────────────

export type GamePhase = "lobby" | "setup_info_tokens" | "playing" | "finished";
export type GameResult = "win" | "loss_red_wire" | "loss_detonator" | null;

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
}

export const ALL_MISSION_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
] as const;

export type MissionId = (typeof ALL_MISSION_IDS)[number];

export interface GameLogEntry {
  turn: number;
  playerId: string;
  action: string;
  detail: string;
  timestamp: number;
}

// ── Client View (filtered state) ────────────────────────────

export interface ClientGameState {
  phase: GamePhase;
  roomId: string;
  playerId: string;
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
}

export interface ClientPlayer {
  id: string;
  name: string;
  character: CharacterId | null;
  isCaptain: boolean;
  /** Wire tiles with visibility filtering applied */
  hand: VisibleTile[];
  infoTokens: InfoToken[];
  characterUsed: boolean;
  connected: boolean;
  isBot: boolean;
  /** Total tile count (for UI display) */
  remainingTiles: number;
}

// ── Lobby State ─────────────────────────────────────────────

export interface LobbyState {
  roomId: string;
  players: LobbyPlayer[];
  mission: MissionId;
  hostId: string;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  character: CharacterId | null;
  isHost: boolean;
  connected: boolean;
  isBot: boolean;
}
