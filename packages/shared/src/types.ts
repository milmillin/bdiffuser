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
}

export type MissionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
}
