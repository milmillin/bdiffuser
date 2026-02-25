import {
  ALL_MISSION_IDS,
  EQUIPMENT_DEFS,
  type GameState,
  type GamePhase,
  type GameResult,
  type MissionId,
  type Player,
  type EquipmentUnlockValue,
  type CharacterId,
  type CampaignState,
  type EquipmentCard,
  type NumberCard,
  type ConstraintCard,
  type ChallengeCard,
  type SpecialMarker,
  type MissionAudioState,
  type Mission22TokenPassBoardState,
} from "@bomb-busters/shared";
import {
  cloneFailureCounters,
  normalizeFailureCounters,
  type FailureCounters,
  ZERO_FAILURE_COUNTERS,
} from "./failureCounters.js";

export interface RoomStateSnapshot {
  gameState: GameState | null;
  players: Player[];
  mission: MissionId;
  hostId: string | null;
  captainMode: "random" | "selection";
  selectedCaptainId: string | null;
  botCount: number;
  botLastActionTurn: Record<string, number>;
  failureCounters: FailureCounters;
  finishedAt?: number;
  lastActivityAt?: number;
}

const DEFAULT_ROOM_STATE: RoomStateSnapshot = {
  gameState: null,
  players: [],
  mission: 1,
  hostId: null,
  captainMode: "random",
  selectedCaptainId: null,
  botCount: 0,
  botLastActionTurn: {},
  failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function toMissionId(value: unknown, fallback: MissionId): MissionId {
  if (typeof value !== "number") return fallback;
  return ALL_MISSION_IDS.includes(value as MissionId) ? (value as MissionId) : fallback;
}

function toCharacterId(value: unknown): CharacterId | null {
  if (
    value === "double_detector" ||
    value === "character_2" ||
    value === "character_3" ||
    value === "character_4" ||
    value === "character_5" ||
    value === "character_e1" ||
    value === "character_e2" ||
    value === "character_e3" ||
    value === "character_e4"
  ) {
    return value;
  }
  return null;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toEquipmentUnlockValue(
  value: unknown,
  fallback: EquipmentUnlockValue,
): EquipmentUnlockValue {
  if (value === "YELLOW") return "YELLOW";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumberCard(raw: unknown): NumberCard | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) return null;
  return {
    id: raw.id,
    value: raw.value,
    faceUp: toBool(raw.faceUp, false),
  };
}

function normalizeNumberCardArray(raw: unknown): NumberCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeNumberCard(entry))
    .filter((entry): entry is NumberCard => entry !== null);
}

function normalizeConstraintCard(raw: unknown): ConstraintCard | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string") return null;
  if (typeof raw.description !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    active: toBool(raw.active, false),
  };
}

function normalizeConstraintCardArray(raw: unknown): ConstraintCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeConstraintCard(entry))
    .filter((entry): entry is ConstraintCard => entry !== null);
}

function normalizeChallengeCard(raw: unknown): ChallengeCard | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string") return null;
  if (typeof raw.description !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    completed: toBool(raw.completed, false),
  };
}

function normalizeChallengeCardArray(raw: unknown): ChallengeCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeChallengeCard(entry))
    .filter((entry): entry is ChallengeCard => entry !== null);
}

function normalizeSpecialMarker(raw: unknown): SpecialMarker | null {
  if (!isObject(raw)) return null;
  const kind = raw.kind;
  // Keep this list aligned with `SpecialMarker["kind"]` in shared types.
  if (
    kind !== "x" &&
    kind !== "sequence_pointer" &&
    kind !== "action_pointer"
  ) {
    return null;
  }
  if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) return null;
  return { kind, value: raw.value };
}

function normalizeSpecialMarkers(raw: unknown): SpecialMarker[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeSpecialMarker(entry))
    .filter((entry): entry is SpecialMarker => entry !== null);
}

function normalizeMission22TokenPassBoard(
  raw: unknown,
): Mission22TokenPassBoardState {
  if (!isObject(raw)) {
    return { numericTokens: [], yellowTokens: 0 };
  }

  const numericTokens = Array.isArray((raw as { numericTokens?: unknown }).numericTokens)
    ? (raw as { numericTokens: unknown[] }).numericTokens
      .map((value) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 12
          ? value
          : null
      )
      .filter((value): value is number => value !== null)
    : [];
  const yellowTokens = typeof (raw as { yellowTokens?: unknown }).yellowTokens === "number" &&
    Number.isInteger((raw as { yellowTokens?: unknown }).yellowTokens) &&
    (raw as { yellowTokens: number }).yellowTokens >= 0
    ? (raw as { yellowTokens: number }).yellowTokens
    : 0;

  return { numericTokens, yellowTokens };
}

function normalizeNumberCardHands(raw: unknown): Record<string, NumberCard[]> {
  if (!isObject(raw)) return {};
  const out: Record<string, NumberCard[]> = {};
  for (const [playerId, value] of Object.entries(raw)) {
    out[playerId] = normalizeNumberCardArray(value);
  }
  return out;
}

function normalizeConstraintPerPlayer(
  raw: unknown,
): Record<string, ConstraintCard[]> {
  if (!isObject(raw)) return {};
  const out: Record<string, ConstraintCard[]> = {};
  for (const [playerId, value] of Object.entries(raw)) {
    out[playerId] = normalizeConstraintCardArray(value);
  }
  return out;
}

function normalizePlayerOxygen(raw: unknown): Record<string, number> {
  if (!isObject(raw)) return {};
  const out: Record<string, number> = {};
  for (const [playerId, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[playerId] = value;
    }
  }
  return out;
}

function normalizeStandSizes(raw: unknown, handLength: number): number[] {
  if (Array.isArray(raw)) {
    const sizes = raw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : NaN,
    );
    const isValid =
      sizes.length > 0 &&
      sizes.every((value) => Number.isInteger(value) && value >= 0) &&
      sizes.reduce((total, value) => total + value, 0) === handLength;
    if (isValid) {
      return sizes;
    }
  }
  return [handLength > 0 ? handLength : 0];
}

function normalizePlayer(raw: unknown, index: number): Player {
  const obj = isObject(raw) ? raw : {};
  const id = typeof obj.id === "string" && obj.id ? obj.id : `legacy-player-${index + 1}`;
  const name = typeof obj.name === "string" && obj.name ? obj.name : id;
  const hand = Array.isArray(obj.hand) ? (obj.hand as Player["hand"]) : [];

  return {
    id,
    name,
    character: toCharacterId(obj.character),
    isCaptain: toBool(obj.isCaptain, false),
    hand,
    standSizes: normalizeStandSizes(obj.standSizes, hand.length),
    infoTokens: Array.isArray(obj.infoTokens) ? (obj.infoTokens as Player["infoTokens"]) : [],
    characterUsed: toBool(obj.characterUsed, false),
    connected: toBool(obj.connected, true),
    isBot: toBool(obj.isBot, false),
  };
}

function normalizeValidationTrack(raw: unknown): Record<number, number> {
  const obj = isObject(raw) ? raw : {};
  const track: Record<number, number> = {};
  for (let value = 1; value <= 12; value++) {
    track[value] = toFiniteNumber(obj[String(value)], 0);
  }
  return track;
}

function normalizeEquipment(raw: unknown): EquipmentCard[] {
  if (!Array.isArray(raw)) return [];

  const defsById = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));

  return raw
    .map((entry): EquipmentCard | null => {
      if (!isObject(entry)) return null;

      const id = typeof entry.id === "string" ? entry.id : "";
      if (!id) return null;

      const def = defsById.get(id);
      const unlockValue = def
        ? def.unlockValue
        : toEquipmentUnlockValue(entry.unlockValue, 0);
      const name =
        typeof entry.name === "string" && entry.name
          ? entry.name
          : (def?.name ?? id);
      const description =
        typeof entry.description === "string"
          ? entry.description
          : (def?.description ?? "");
      const image =
        typeof entry.image === "string" && entry.image
          ? entry.image
          : (def?.image ?? "equipment_back.png");
      const secondaryLockValue =
        typeof entry.secondaryLockValue === "number" &&
        Number.isFinite(entry.secondaryLockValue)
          ? entry.secondaryLockValue
          : undefined;
      const secondaryLockCutsRequired =
        typeof entry.secondaryLockCutsRequired === "number" &&
        Number.isFinite(entry.secondaryLockCutsRequired)
          ? entry.secondaryLockCutsRequired
          : undefined;
      const faceDown = toBool(entry.faceDown, false);

      return {
        id,
        name,
        description,
        unlockValue,
        ...(secondaryLockValue !== undefined
          ? { secondaryLockValue }
          : {}),
        ...(secondaryLockCutsRequired !== undefined
          ? { secondaryLockCutsRequired }
          : {}),
        unlocked: toBool(entry.unlocked, false),
        used: toBool(entry.used, false),
        ...(faceDown ? { faceDown: true } : {}),
        image,
      };
    })
    .filter((card): card is EquipmentCard => card !== null);
}

function normalizeMissionAudio(raw: unknown): MissionAudioState | undefined {
  if (!isObject(raw)) return undefined;
  if (typeof raw.audioFile !== "string" || !raw.audioFile) return undefined;

  const status: MissionAudioState["status"] =
    raw.status === "playing" || raw.status === "paused"
      ? raw.status
      : "paused";
  const syncedAtMs =
    typeof raw.syncedAtMs === "number" && Number.isFinite(raw.syncedAtMs)
      ? Math.round(raw.syncedAtMs)
      : Date.now();
  const durationMs =
    typeof raw.durationMs === "number" &&
    Number.isFinite(raw.durationMs) &&
    raw.durationMs >= 0
      ? Math.round(raw.durationMs)
      : undefined;

  let positionMs =
    typeof raw.positionMs === "number" && Number.isFinite(raw.positionMs)
      ? Math.max(0, Math.round(raw.positionMs))
      : 0;

  if (durationMs != null) {
    positionMs = Math.min(positionMs, durationMs);
  }

  return {
    audioFile: raw.audioFile,
    status,
    positionMs,
    syncedAtMs,
    ...(durationMs != null ? { durationMs } : {}),
  };
}

function normalizeCampaign(raw: unknown): CampaignState | undefined {
  if (!isObject(raw)) return undefined;

  const campaign: CampaignState = {};

  if (hasOwn(raw, "numberCards")) {
    const numberCards = isObject(raw.numberCards) ? raw.numberCards : {};
    campaign.numberCards = {
      deck: normalizeNumberCardArray(numberCards.deck),
      discard: normalizeNumberCardArray(numberCards.discard),
      visible: normalizeNumberCardArray(numberCards.visible),
      playerHands: normalizeNumberCardHands(numberCards.playerHands),
    };
  }

  if (hasOwn(raw, "constraints")) {
    const constraints = isObject(raw.constraints) ? raw.constraints : {};
    campaign.constraints = {
      global: normalizeConstraintCardArray(constraints.global),
      perPlayer: normalizeConstraintPerPlayer(constraints.perPlayer),
      deck: normalizeConstraintCardArray(constraints.deck),
    };
  }

  if (hasOwn(raw, "challenges")) {
    const challenges = isObject(raw.challenges) ? raw.challenges : {};
    campaign.challenges = {
      deck: normalizeChallengeCardArray(challenges.deck),
      active: normalizeChallengeCardArray(challenges.active),
      completed: normalizeChallengeCardArray(challenges.completed),
    };
  }

  if (hasOwn(raw, "oxygen")) {
    const oxygen = isObject(raw.oxygen) ? raw.oxygen : {};
    campaign.oxygen = {
      pool: toFiniteNumber(oxygen.pool, 0),
      playerOxygen: normalizePlayerOxygen(oxygen.playerOxygen),
    };
  }

  if (hasOwn(raw, "nanoTracker")) {
    const nanoTracker = isObject(raw.nanoTracker) ? raw.nanoTracker : {};
    campaign.nanoTracker = {
      position: toFiniteNumber(nanoTracker.position, 0),
      max: toFiniteNumber(nanoTracker.max, 0),
    };
  }

  if (hasOwn(raw, "bunkerTracker")) {
    const bunkerTracker = isObject(raw.bunkerTracker) ? raw.bunkerTracker : {};
    campaign.bunkerTracker = {
      position: toFiniteNumber(bunkerTracker.position, 0),
      max: toFiniteNumber(bunkerTracker.max, 0),
    };
  }

  if (hasOwn(raw, "specialMarkers")) {
    campaign.specialMarkers = normalizeSpecialMarkers(raw.specialMarkers);
  }

  if (hasOwn(raw, "equipmentReserve")) {
    campaign.equipmentReserve = normalizeEquipment(raw.equipmentReserve);
  }

  if (hasOwn(raw, "mission22TokenPassBoard")) {
    const board = normalizeMission22TokenPassBoard(raw.mission22TokenPassBoard);
    if (board.numericTokens.length > 0 || board.yellowTokens > 0) {
      campaign.mission22TokenPassBoard = board;
    }
  }

  if (hasOwn(raw, "mission18DesignatorIndex") && typeof raw.mission18DesignatorIndex === "number") {
    campaign.mission18DesignatorIndex = raw.mission18DesignatorIndex;
  }

  return Object.keys(campaign).length > 0 ? campaign : undefined;
}

function normalizeGameState(
  raw: unknown,
  roomId: string,
  fallbackPlayers: Player[],
  fallbackMission: MissionId,
): GameState {
  const obj = isObject(raw) ? raw : {};

  const players = Array.isArray(obj.players)
    ? obj.players.map((p, i) => normalizePlayer(p, i))
    : [...fallbackPlayers];

  const phaseRaw = obj.phase;
  const phase: GamePhase =
    phaseRaw === "lobby" ||
    phaseRaw === "setup_info_tokens" ||
    phaseRaw === "playing" ||
    phaseRaw === "finished"
      ? phaseRaw
      : "lobby";

  const resultRaw = obj.result;
  const result: GameResult =
    resultRaw === "win" ||
    resultRaw === "loss_red_wire" ||
    resultRaw === "loss_detonator" ||
    resultRaw === "loss_timer" ||
    resultRaw === null
      ? resultRaw
      : null;

  const boardObj = isObject(obj.board) ? obj.board : {};
  const currentPlayerIndexRaw = toFiniteNumber(obj.currentPlayerIndex, 0);
  const currentPlayerIndex = players.length
    ? Math.min(Math.max(currentPlayerIndexRaw, 0), players.length - 1)
    : 0;

  const mission = toMissionId(obj.mission, fallbackMission);
  const campaign = normalizeCampaign(obj.campaign);
  const missionAudio = normalizeMissionAudio(obj.missionAudio);
  // Forced-action migration: supports all persisted forced-action kinds.
  let pendingForcedAction: import("@bomb-busters/shared").ForcedAction | undefined;
  if (isObject(obj.pendingForcedAction)) {
    if (
      obj.pendingForcedAction.kind === "chooseNextPlayer"
      && typeof obj.pendingForcedAction.captainId === "string"
      && obj.pendingForcedAction.captainId
    ) {
      pendingForcedAction = {
        kind: "chooseNextPlayer" as const,
        captainId: obj.pendingForcedAction.captainId,
        ...(typeof obj.pendingForcedAction.lastPlayerId === "string"
          && obj.pendingForcedAction.lastPlayerId
          ? { lastPlayerId: obj.pendingForcedAction.lastPlayerId }
          : {}),
      };
    } else if (
      obj.pendingForcedAction.kind === "designateCutter"
      && typeof obj.pendingForcedAction.designatorId === "string"
      && obj.pendingForcedAction.designatorId
      && typeof obj.pendingForcedAction.value === "number"
      && isObject(obj.pendingForcedAction.radarResults)
    ) {
      pendingForcedAction = {
        kind: "designateCutter" as const,
        designatorId: obj.pendingForcedAction.designatorId,
        value: obj.pendingForcedAction.value,
        radarResults: obj.pendingForcedAction.radarResults as Record<string, boolean>,
      };
    } else if (
      obj.pendingForcedAction.kind === "mission22TokenPass"
      && typeof obj.pendingForcedAction.currentChooserIndex === "number"
      && Number.isFinite(obj.pendingForcedAction.currentChooserIndex)
      && typeof obj.pendingForcedAction.currentChooserId === "string"
      && obj.pendingForcedAction.currentChooserId
      && Array.isArray(obj.pendingForcedAction.passingOrder)
      && typeof obj.pendingForcedAction.completedCount === "number"
      && Number.isFinite(obj.pendingForcedAction.completedCount)
    ) {
      pendingForcedAction = {
        kind: "mission22TokenPass" as const,
        currentChooserIndex: obj.pendingForcedAction.currentChooserIndex,
        currentChooserId: obj.pendingForcedAction.currentChooserId,
        passingOrder: obj.pendingForcedAction.passingOrder.filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        ),
        completedCount: obj.pendingForcedAction.completedCount,
      };
    } else if (
      obj.pendingForcedAction.kind === "mission46SevensCut"
      && typeof obj.pendingForcedAction.playerId === "string"
      && obj.pendingForcedAction.playerId
    ) {
      pendingForcedAction = {
        kind: "mission46SevensCut" as const,
        playerId: obj.pendingForcedAction.playerId,
      };
    } else if (
      obj.pendingForcedAction.kind === "mission61ConstraintRotate"
      && typeof obj.pendingForcedAction.captainId === "string"
      && obj.pendingForcedAction.captainId
    ) {
      pendingForcedAction = {
        kind: "mission61ConstraintRotate" as const,
        captainId: obj.pendingForcedAction.captainId,
        direction:
          obj.pendingForcedAction.direction === "counter_clockwise"
            ? "counter_clockwise"
            : "clockwise",
        ...(typeof obj.pendingForcedAction.previousPlayerId === "string"
          && obj.pendingForcedAction.previousPlayerId
            ? { previousPlayerId: obj.pendingForcedAction.previousPlayerId }
            : {}),
      };
    } else if (
      obj.pendingForcedAction.kind === "detectorTileChoice"
      && typeof obj.pendingForcedAction.targetPlayerId === "string"
      && obj.pendingForcedAction.targetPlayerId
      && typeof obj.pendingForcedAction.actorId === "string"
      && obj.pendingForcedAction.actorId
      && Array.isArray(obj.pendingForcedAction.matchingTileIndices)
      && typeof obj.pendingForcedAction.guessValue === "number"
      && Number.isFinite(obj.pendingForcedAction.guessValue)
      && (
        obj.pendingForcedAction.source === "doubleDetector"
        || obj.pendingForcedAction.source === "tripleDetector"
        || obj.pendingForcedAction.source === "superDetector"
      )
    ) {
      pendingForcedAction = {
        kind: "detectorTileChoice" as const,
        targetPlayerId: obj.pendingForcedAction.targetPlayerId,
        actorId: obj.pendingForcedAction.actorId,
        matchingTileIndices: obj.pendingForcedAction.matchingTileIndices.filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        ),
        guessValue: obj.pendingForcedAction.guessValue,
        source: obj.pendingForcedAction.source,
        ...(typeof obj.pendingForcedAction.originalTileIndex1 === "number"
          && Number.isFinite(obj.pendingForcedAction.originalTileIndex1)
          ? { originalTileIndex1: obj.pendingForcedAction.originalTileIndex1 }
          : {}),
        ...(typeof obj.pendingForcedAction.originalTileIndex2 === "number"
          && Number.isFinite(obj.pendingForcedAction.originalTileIndex2)
          ? { originalTileIndex2: obj.pendingForcedAction.originalTileIndex2 }
          : {}),
        ...(Array.isArray(obj.pendingForcedAction.originalTargetTileIndices)
          ? {
              originalTargetTileIndices: obj.pendingForcedAction.originalTargetTileIndices.filter(
                (value): value is number => typeof value === "number" && Number.isFinite(value),
              ),
            }
          : {}),
        ...(typeof obj.pendingForcedAction.actorTileIndex === "number"
          && Number.isFinite(obj.pendingForcedAction.actorTileIndex)
          ? { actorTileIndex: obj.pendingForcedAction.actorTileIndex }
          : {}),
        ...(typeof obj.pendingForcedAction.equipmentId === "string"
          && obj.pendingForcedAction.equipmentId
          ? { equipmentId: obj.pendingForcedAction.equipmentId }
          : {}),
      };
    } else if (
      obj.pendingForcedAction.kind === "talkiesWalkiesTileChoice"
      && typeof obj.pendingForcedAction.actorId === "string"
      && obj.pendingForcedAction.actorId
      && typeof obj.pendingForcedAction.targetPlayerId === "string"
      && obj.pendingForcedAction.targetPlayerId
      && typeof obj.pendingForcedAction.actorTileIndex === "number"
      && Number.isFinite(obj.pendingForcedAction.actorTileIndex)
      && (obj.pendingForcedAction.source === "equipment"
        || obj.pendingForcedAction.source === "characterAbility")
    ) {
      pendingForcedAction = {
        kind: "talkiesWalkiesTileChoice" as const,
        actorId: obj.pendingForcedAction.actorId,
        targetPlayerId: obj.pendingForcedAction.targetPlayerId,
        actorTileIndex: obj.pendingForcedAction.actorTileIndex,
        source: obj.pendingForcedAction.source,
      };
    }
  }

  return {
    phase,
    roomId: typeof obj.roomId === "string" && obj.roomId ? obj.roomId : roomId,
    players,
    board: {
      detonatorPosition: toFiniteNumber(boardObj.detonatorPosition, 0),
      detonatorMax: toFiniteNumber(boardObj.detonatorMax, 3),
      validationTrack: normalizeValidationTrack(boardObj.validationTrack),
      markers: Array.isArray(boardObj.markers) ? boardObj.markers : [],
      equipment: normalizeEquipment(boardObj.equipment),
    },
    currentPlayerIndex,
    turnNumber: toFiniteNumber(obj.turnNumber, 0),
    mission,
    result,
    log: Array.isArray(obj.log) ? obj.log : [],
    chat: Array.isArray(obj.chat) ? obj.chat : [],
    ...(campaign ? { campaign } : {}),
    ...(missionAudio ? { missionAudio } : {}),
    ...(pendingForcedAction ? { pendingForcedAction } : {}),
    ...(typeof obj.timerDeadline === "number" && Number.isFinite(obj.timerDeadline)
      ? { timerDeadline: obj.timerDeadline }
      : {}),
  };
}

export function normalizeRoomState(raw: unknown, roomId: string): RoomStateSnapshot {
  if (!isObject(raw)) {
    return {
      ...DEFAULT_ROOM_STATE,
      botLastActionTurn: { ...DEFAULT_ROOM_STATE.botLastActionTurn },
      failureCounters: cloneFailureCounters(DEFAULT_ROOM_STATE.failureCounters),
    };
  }

  const roomPlayers = Array.isArray(raw.players)
    ? raw.players.map((p, i) => normalizePlayer(p, i))
    : [];

  const mission = toMissionId(raw.mission, DEFAULT_ROOM_STATE.mission);
  const gameState = raw.gameState
    ? normalizeGameState(raw.gameState, roomId, roomPlayers, mission)
    : null;

  const players = roomPlayers.length > 0 ? roomPlayers : (gameState?.players ?? []);
  const hostId =
    typeof raw.hostId === "string" && raw.hostId
      ? raw.hostId
      : (players[0]?.id ?? null);

  let botCount = toFiniteNumber(raw.botCount, NaN);
  if (!Number.isFinite(botCount)) {
    botCount = players.filter((p) => p.isBot).length;
  }

  const botLastActionTurn: Record<string, number> = {};
  if (isObject(raw.botLastActionTurn)) {
    for (const [id, value] of Object.entries(raw.botLastActionTurn)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        botLastActionTurn[id] = value;
      }
    }
  }

  const failureCounters = normalizeFailureCounters(raw.failureCounters);

  const captainMode =
    raw.captainMode === "random" || raw.captainMode === "selection"
      ? raw.captainMode
      : "random";
  const selectedCaptainId =
    typeof raw.selectedCaptainId === "string" ? raw.selectedCaptainId : null;

  const finishedAt =
    typeof raw.finishedAt === "number" && Number.isFinite(raw.finishedAt)
      ? raw.finishedAt
      : undefined;
  const lastActivityAt =
    typeof raw.lastActivityAt === "number" && Number.isFinite(raw.lastActivityAt)
      ? raw.lastActivityAt
      : undefined;

  return {
    gameState,
    players,
    mission,
    hostId,
    captainMode,
    selectedCaptainId,
    botCount,
    botLastActionTurn,
    failureCounters,
    ...(finishedAt !== undefined ? { finishedAt } : {}),
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  };
}
