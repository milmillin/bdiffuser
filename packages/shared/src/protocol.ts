import type {
  ActionLegalityCode,
  AnyEquipmentId,
  BaseEquipmentId,
  CaptainMode,
  Mission32ConstraintDecision,
  Mission66BunkerChoiceSelection,
  Mission61ConstraintRotationDirection,
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
      oxygenRecipientPlayerId?: string;
      actorTileIndex?: number;
      mission59RotateNano?: boolean;
      mission43NanoStandIndex?: number;
    }
  | {
      type: "dualCutDoubleDetector";
      targetPlayerId: string;
      tileIndex1: number;
      tileIndex2: number;
      guessValue: number;
      oxygenRecipientPlayerId?: string;
      actorTileIndex?: number;
      mission59RotateNano?: boolean;
      mission43NanoStandIndex?: number;
    }
  | {
      type: "soloCut";
      value: number | "YELLOW";
      targetPlayerId?: string;
      mission59RotateNano?: boolean;
      mission43NanoStandIndex?: number;
    }
  | {
      type: "challengeRedCut";
      targetPlayerId: string;
      targetTileIndex: number;
    }
  | { type: "revealReds" }
  | { type: "mission45Snip" }
  | { type: "mission45StartCaptainFallback" }
  | { type: "mission45ChooseCaptainTarget"; targetPlayerId: string }
  | { type: "mission45PenaltyTokenChoice"; value: number }
  | { type: "mission51PenaltyTokenChoice"; value: number }
  | { type: "simultaneousRedCut"; targets: Array<{ playerId: string; tileIndex: number }> }
  | {
      type: "useEquipment";
      equipmentId: AnyEquipmentId;
      payload: UseEquipmentPayload;
      mission43NanoStandIndex?: number;
    }
  | {
      type: "useCharacterAbility";
      payload: UseEquipmentPayload;
      mission43NanoStandIndex?: number;
    }
  | { type: "chooseNextPlayer"; targetPlayerId: string }
  | { type: "designateCutter"; targetPlayerId: string }
  | { type: "simultaneousFourCut"; targets: Array<{ playerId: string; tileIndex: number }> }
  | { type: "mission22TokenPassChoice"; value: number }
  | { type: "mission27TokenDraftChoice"; value: number; tileIndex?: number }
  | { type: "mission29HiddenNumberCardChoice"; cardIndex: number }
  | { type: "mission65CardHandoff"; cardId: string; recipientPlayerId: string }
  | { type: "mission34GuessWeakestLink"; targetPlayerId: string; constraintId: string }
  | { type: "mission61ReplaceOwnConstraint" }
  | { type: "mission66BunkerChoice"; choice: Mission66BunkerChoiceSelection }
  | { type: "detectorTileChoice"; tileIndex?: number; infoTokenTileIndex?: number }
  | { type: "talkiesWalkiesChoice"; tileIndex: number }
  | {
      type: "mission32ConstraintDecision";
      decision: Mission32ConstraintDecision;
    }
  | {
      type: "mission61ConstraintRotate";
      direction: Mission61ConstraintRotationDirection;
    }
  | {
      type: "mission36SequencePosition";
      side: "left" | "right";
    }
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
  | { type: "mission30ManualDetonatorAdvance" }
  | { type: "mission30ManualSkipTurn" }
  | { type: "mission30CutRemainingYellows" }
  | { type: "selectConstraintCard"; constraintId: string }
  | { type: "setCaptainMode"; mode: CaptainMode }
  | { type: "selectCaptain"; playerId: string }
  | { type: "addBot" }
  | { type: "removeBot"; botId: string }
  | { type: "kickPlayer"; playerId: string }
  | { type: "surrenderVote"; vote: boolean }
  | { type: "confirmSurrender" }
  | { type: "chat"; text: string }
  | { type: "playAgain" }
  | { type: "mcpTakeover"; name: string; password: string }
  | { type: "toggleScouter" };

// ── Server → Client Messages ───────────────────────────────

export type ServerMessage =
  | { type: "lobby"; state: LobbyState }
  | { type: "gameState"; state: ClientGameState; serverNowMs: number }
  | { type: "action"; action: GameAction }
  | { type: "error"; message: string; code?: ActionLegalityCode }
  | { type: "kicked" }
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
      type: "challengeRedCutResult";
      actorId: string;
      targetId: string;
      targetTileIndex: number;
      success: boolean;
      revealedColor?: string;
      revealedValue?: number | "YELLOW" | "RED";
      explosion?: boolean;
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
