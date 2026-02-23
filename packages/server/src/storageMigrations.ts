import {
  ALL_MISSION_IDS,
  EQUIPMENT_DEFS,
  type GameState,
  type GamePhase,
  type GameResult,
  type MissionId,
  type Player,
  type CharacterId,
  type CampaignState,
  type EquipmentCard,
  type NumberCard,
  type ConstraintCard,
  type ChallengeCard,
  type SpecialMarker,
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
  botCount: number;
  botLastActionTurn: Record<string, number>;
  failureCounters: FailureCounters;
}

const DEFAULT_ROOM_STATE: RoomStateSnapshot = {
  gameState: null,
  players: [],
  mission: 1,
  hostId: null,
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
    value === "character_5"
  ) {
    return value;
  }
  return null;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function normalizePlayer(raw: unknown, index: number): Player {
  const obj = isObject(raw) ? raw : {};
  const id = typeof obj.id === "string" && obj.id ? obj.id : `legacy-player-${index + 1}`;
  const name = typeof obj.name === "string" && obj.name ? obj.name : id;

  return {
    id,
    name,
    character: toCharacterId(obj.character),
    isCaptain: toBool(obj.isCaptain, false),
    hand: Array.isArray(obj.hand) ? (obj.hand as Player["hand"]) : [],
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
      const unlockValue = toFiniteNumber(
        entry.unlockValue,
        def?.unlockValue ?? 0,
      );
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
        image,
      };
    })
    .filter((card): card is EquipmentCard => card !== null);
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
  // Current forced-action migration only supports mission-10 chooseNextPlayer.
  // Extend this branch if new forced action kinds are introduced.
  const pendingForcedAction = isObject(obj.pendingForcedAction)
    && obj.pendingForcedAction.kind === "chooseNextPlayer"
    && typeof obj.pendingForcedAction.captainId === "string"
    && obj.pendingForcedAction.captainId
      ? {
          kind: "chooseNextPlayer" as const,
          captainId: obj.pendingForcedAction.captainId,
          ...(typeof obj.pendingForcedAction.lastPlayerId === "string"
            && obj.pendingForcedAction.lastPlayerId
            ? { lastPlayerId: obj.pendingForcedAction.lastPlayerId }
            : {}),
        }
      : undefined;

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

  return {
    gameState,
    players,
    mission,
    hostId,
    botCount,
    botLastActionTurn,
    failureCounters,
  };
}
