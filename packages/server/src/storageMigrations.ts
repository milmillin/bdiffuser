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
} from "@bomb-busters/shared";

export interface RoomStateSnapshot {
  gameState: GameState | null;
  players: Player[];
  mission: MissionId;
  hostId: string | null;
  botCount: number;
  botLastActionTurn: Record<string, number>;
}

const DEFAULT_ROOM_STATE: RoomStateSnapshot = {
  gameState: null,
  players: [],
  mission: 1,
  hostId: null,
  botCount: 0,
  botLastActionTurn: {},
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

      return {
        id,
        name,
        description,
        unlockValue,
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

  if (isObject(raw.numberCards)) {
    campaign.numberCards = {
      deck: Array.isArray(raw.numberCards.deck) ? raw.numberCards.deck : [],
      discard: Array.isArray(raw.numberCards.discard) ? raw.numberCards.discard : [],
      visible: Array.isArray(raw.numberCards.visible) ? raw.numberCards.visible : [],
      playerHands: isObject(raw.numberCards.playerHands)
        ? (raw.numberCards.playerHands as Record<string, import("@bomb-busters/shared").NumberCard[]>)
        : {},
    };
  }

  if (isObject(raw.constraints)) {
    campaign.constraints = {
      global: Array.isArray(raw.constraints.global) ? raw.constraints.global : [],
      perPlayer: isObject(raw.constraints.perPlayer)
        ? (raw.constraints.perPlayer as Record<string, import("@bomb-busters/shared").ConstraintCard[]>)
        : {},
    };
  }

  if (isObject(raw.challenges)) {
    campaign.challenges = {
      deck: Array.isArray(raw.challenges.deck) ? raw.challenges.deck : [],
      active: Array.isArray(raw.challenges.active) ? raw.challenges.active : [],
      completed: Array.isArray(raw.challenges.completed) ? raw.challenges.completed : [],
    };
  }

  if (isObject(raw.oxygen)) {
    campaign.oxygen = {
      pool: toFiniteNumber(raw.oxygen.pool, 0),
      playerOxygen: isObject(raw.oxygen.playerOxygen)
        ? (raw.oxygen.playerOxygen as Record<string, number>)
        : {},
    };
  }

  if (isObject(raw.nanoTracker)) {
    campaign.nanoTracker = {
      position: toFiniteNumber(raw.nanoTracker.position, 0),
      max: toFiniteNumber(raw.nanoTracker.max, 0),
    };
  }

  if (isObject(raw.bunkerTracker)) {
    campaign.bunkerTracker = {
      position: toFiniteNumber(raw.bunkerTracker.position, 0),
      max: toFiniteNumber(raw.bunkerTracker.max, 0),
    };
  }

  if (Array.isArray(raw.specialMarkers)) {
    campaign.specialMarkers = raw.specialMarkers as CampaignState["specialMarkers"];
  }

  return campaign;
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
    ...(typeof obj.timerDeadline === "number" && Number.isFinite(obj.timerDeadline)
      ? { timerDeadline: obj.timerDeadline }
      : {}),
  };
}

export function normalizeRoomState(raw: unknown, roomId: string): RoomStateSnapshot {
  if (!isObject(raw)) return { ...DEFAULT_ROOM_STATE };

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

  return {
    gameState,
    players,
    mission,
    hostId,
    botCount,
    botLastActionTurn,
  };
}
