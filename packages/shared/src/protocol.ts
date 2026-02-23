import type {
  CharacterId,
  ClientGameState,
  GameResult,
  LobbyState,
  MissionId,
} from "./types.js";

// ── Client → Server Messages ───────────────────────────────

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "selectCharacter"; character: CharacterId }
  | { type: "selectMission"; mission: MissionId }
  | { type: "startGame" }
  | { type: "placeInfoToken"; value: number; tileIndex: number }
  | {
      type: "dualCut";
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
    }
  | { type: "dualCutDoubleDetector"; targetPlayerId: string; tileIndex1: number; tileIndex2: number; guessValue: number | "YELLOW" }
  | { type: "soloCut"; value: number | "YELLOW" }
  | { type: "revealReds" }
  | { type: "useEquipment"; equipmentId: string };

// ── Server → Client Messages ───────────────────────────────

export type ServerMessage =
  | { type: "lobby"; state: LobbyState }
  | { type: "gameState"; state: ClientGameState }
  | { type: "action"; action: GameAction }
  | { type: "error"; message: string };

// ── Game Actions (for animations) ───────────────────────────

export type GameAction =
  | {
      type: "dualCutResult";
      actorId: string;
      targetId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
      success: boolean;
      revealedColor?: string;
      revealedValue?: number | "YELLOW" | "RED";
      detonatorAdvanced?: boolean;
      explosion?: boolean;
    }
  | {
      type: "soloCutResult";
      actorId: string;
      value: number | "YELLOW";
      tilesCut: number;
    }
  | {
      type: "revealRedsResult";
      actorId: string;
      tilesRevealed: number;
    }
  | {
      type: "validationPlaced";
      value: number;
    }
  | {
      type: "equipmentUsed";
      equipmentId: string;
      playerId: string;
    }
  | {
      type: "gameOver";
      result: GameResult;
    };
