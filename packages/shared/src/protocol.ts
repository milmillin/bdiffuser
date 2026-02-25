import type {
  ActionLegalityCode,
  AnyEquipmentId,
  BaseEquipmentId,
  CaptainMode,
  CharacterId,
  ChatMessage,
  ClientGameState,
  GameResult,
  LobbyState,
  MissionId,
  UseEquipmentPayload,
} from "./types.js";

// ── Client → Server Messages ───────────────────────────────

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "selectCharacter"; characterId: CharacterId }
  | { type: "selectMission"; mission: MissionId }
  | { type: "startGame" }
  | { type: "placeInfoToken"; value: number; tileIndex: number }
  | {
      type: "dualCut";
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
      actorTileIndex?: number;
    }
  | { type: "dualCutDoubleDetector"; targetPlayerId: string; tileIndex1: number; tileIndex2: number; guessValue: number; actorTileIndex?: number }
  | { type: "soloCut"; value: number | "YELLOW"; targetPlayerId?: string }
  | { type: "revealReds" }
  | { type: "simultaneousRedCut"; targets: Array<{ playerId: string; tileIndex: number }> }
  | { type: "useEquipment"; equipmentId: AnyEquipmentId; payload: UseEquipmentPayload }
  | { type: "useCharacterAbility"; payload: UseEquipmentPayload }
  | { type: "chooseNextPlayer"; targetPlayerId: string }
  | { type: "designateCutter"; targetPlayerId: string }
  | { type: "simultaneousFourCut"; targets: Array<{ playerId: string; tileIndex: number }> }
  | { type: "mission22TokenPassChoice"; value: number }
  | { type: "detectorTileChoice"; tileIndex?: number; infoTokenTileIndex?: number }
  | { type: "talkiesWalkiesChoice"; tileIndex: number }
  | {
      type: "missionAudioControl";
      command: "play" | "pause";
      positionMs?: number;
      durationMs?: number;
    }
  | {
      type: "missionAudioControl";
      command: "seek";
      positionMs: number;
      durationMs?: number;
    }
  | { type: "setCaptainMode"; mode: CaptainMode }
  | { type: "selectCaptain"; playerId: string }
  | { type: "addBot" }
  | { type: "removeBot"; botId: string }
  | { type: "chat"; text: string };

// ── Server → Client Messages ───────────────────────────────

export type ServerMessage =
  | { type: "lobby"; state: LobbyState }
  | { type: "gameState"; state: ClientGameState }
  | { type: "action"; action: GameAction }
  | { type: "error"; message: string; code?: ActionLegalityCode }
  | { type: "chat"; message: ChatMessage };

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
      effect?: string;
      detail?: string;
    }
  | {
      type: "dualCutDoubleDetectorResult";
      actorId: string;
      targetId: string;
      tileIndex1: number;
      tileIndex2: number;
      guessValue: number;
      outcome: "pending" | "match" | "no_match";
      cutTileIndex?: number;
      detonatorAdvanced?: boolean;
      explosion?: boolean;
      infoTokenPlacedIndex?: number;
    }
  | {
      type: "simultaneousRedCutResult";
      actorId: string;
      cuts: Array<{ playerId: string; tileIndex: number }>;
      totalCut: number;
    }
  | {
      type: "simultaneousFourCutResult";
      actorId: string;
      targetValue: number;
      cuts: Array<{ playerId: string; tileIndex: number }>;
      success: boolean;
    }
  | {
      type: "gameOver";
      result: GameResult;
    };
