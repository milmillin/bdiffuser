import { Server, type Connection, routePartykitRequest } from "partyserver";
import type {
  AnyEquipmentId,
  ClientMessage,
  ServerMessage,
  Player,
  MissionId,
  CharacterId,
  ChatMessage,
  UseEquipmentPayload,
  GameState,
  GameResult,
  MissionAudioState,
} from "@bomb-busters/shared";
import {
  MISSION_SCHEMAS,
  isNonCaptainCharacterForbidden,
  hasXMarkedWireTalkiesRestriction,
  logTemplate,
  wireLabel,
  wireLabelOf,
} from "@bomb-busters/shared";
import { validateMissionPlayerCount } from "./startValidation.js";
import {
  setupGame,
  shuffle,
  assignCharactersForGameStart,
} from "./setup.js";
import { filterStateForPlayer, filterStateForSpectator, createLobbyState } from "./viewFilter.js";
import {
  validateDualCutWithHooks,
  validateDualCutDoubleDetectorWithHooks,
  validateSoloCutWithHooks,
  validateRevealRedsWithHooks,
  validateSimultaneousRedCutWithHooks,
  validateSimultaneousFourCutWithHooks,
  getTileByFlatIndex,
} from "./validation.js";
import {
  executeDualCut,
  executeDualCutDoubleDetector,
  executeSoloCut,
  executeRevealReds,
  executeSimultaneousRedCut,
  executeSimultaneousFourCut,
  getBotDoubleDetectorNoMatchInfoTokenIndex,
  resolveDetectorTileChoice,
} from "./gameLogic.js";
import {
  executeUseEquipment,
  validateUseEquipment,
  validateCharacterAbility,
  executeCharacterAbility,
  resolveTalkiesWalkiesTileChoice,
} from "./equipment.js";
import {
  dispatchHooks,
  emitMissionFailureTelemetry,
} from "./missionHooks.js";
import {
  createBotPlayer,
  botPlaceInfoToken,
  getBotAction,
} from "./botController.js";
import {
  normalizeRoomState,
  type RoomStateSnapshot,
} from "./storageMigrations.js";
import {
  incrementFailureCounter,
  isFailureReason,
  cloneFailureCounters,
  ZERO_FAILURE_COUNTERS,
} from "./failureCounters.js";
import { isRepeatNextPlayerSelectionDisallowed } from "./turnOrderRules.js";
import {
  requiredSetupInfoTokenCount,
  hasCompletedSetupInfoTokens,
  allSetupInfoTokensPlaced,
  advanceToNextSetupPlayer,
  autoPlaceMission13RandomSetupInfoTokens,
  validateSetupInfoTokenPlacement,
} from "./setupTokenRules.js";
import { applyMission25ChatPenalty } from "./mission25.js";
import { applyMissionInfoTokenVariant, describeInfoToken } from "./infoTokenRules.js";
import { pushGameLog } from "./gameLog.js";
import {
  buildSimultaneousFourCutTargets,
  getSimultaneousFourCutTargetValue,
} from "./simultaneousFourCutTargets.js";
import { validateMission18DesignatedCutterTarget } from "./mission18.js";
import {
  applyMission22TokenPassChoice,
  getMission22TokenPassAvailableValues,
  getMission22TokenPassBoardState,
} from "./mission22TokenPass.js";

/** Delay before purging storage for finished rooms (1 hour). */
const FINISHED_ROOM_CLEANUP_DELAY_MS = 60 * 60 * 1000;
/** Delay before purging storage for stale rooms with no actions (2 hours). */
const STALE_ROOM_CLEANUP_DELAY_MS = 2 * 60 * 60 * 1000;

type MissionAudioControlCommand = Extract<
  ClientMessage,
  { type: "missionAudioControl" }
>["command"];

interface Env {
  [key: string]: unknown;
  BombBustersServer: DurableObjectNamespace;
  ZHIPU_API_KEY: string;
}

function describeInfoTokenLocation(
  position: number,
  player?: { id: string; hand: readonly { originalOwnerId?: string }[] },
): string {
  if (position < 0) return "beside stand";
  return player ? `wire ${wireLabelOf(player, position)}` : `wire ${wireLabel(position)}`;
}

export class BombBustersServer extends Server<Env> {
  room: RoomStateSnapshot = {
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

  async onStart() {
    try {
      const stored = await this.ctx.storage.get<unknown>("room");
      if (stored) {
        this.room = normalizeRoomState(stored, this.name);
      }
    } catch (e) {
      console.error("Failed to load room state from storage:", e);
    }

    this.scheduleNextAlarm();
  }

  async saveState() {
    try {
      this.room.lastActivityAt = Date.now();
      await this.ctx.storage.put("room", this.room);
      // Schedule storage cleanup when a game finishes for the first time
      if (this.room.gameState?.phase === "finished" && !this.room.finishedAt) {
        this.scheduleFinishedCleanup();
      }
      this.scheduleNextAlarm();
    } catch (e) {
      console.error("Failed to save room state to storage:", e);
    }
  }

  /** Record finish timestamp and schedule a cleanup alarm to purge storage. */
  private scheduleFinishedCleanup() {
    this.room.finishedAt = Date.now();
    const cleanupDeadline = this.getFinishedCleanupDeadline();
    if (cleanupDeadline == null) return;
    // setAlarm replaces any pending alarm (bot-turn / timer), so no separate deleteAlarm needed.
    this.ctx.storage.setAlarm(cleanupDeadline).catch((e) => {
      console.error("Failed to schedule finished-room cleanup alarm:", e);
    });
    // Persist the finishedAt timestamp (fire-and-forget; saveState() already wrote the room once).
    this.ctx.storage.put("room", this.room).catch((e) => {
      console.error("Failed to persist finishedAt:", e);
    });
  }

  private getFinishedCleanupDeadline(): number | null {
    if (this.room.finishedAt == null) return null;
    return this.room.finishedAt + FINISHED_ROOM_CLEANUP_DELAY_MS;
  }

  private getStaleCleanupDeadline(): number | null {
    if (this.room.lastActivityAt == null) return null;
    return this.room.lastActivityAt + STALE_ROOM_CLEANUP_DELAY_MS;
  }

  private pickEarlierAlarm(nextAlarmMs: number | null, candidateMs: number | null): number | null {
    if (candidateMs == null) return nextAlarmMs;
    if (nextAlarmMs == null) return candidateMs;
    return candidateMs < nextAlarmMs ? candidateMs : nextAlarmMs;
  }

  private resetRoomState() {
    this.room = {
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
  }

  private maybeRecordMissionFailure(previousResult: GameResult | null, state: GameState): void {
    if (isFailureReason(previousResult)) return;
    if (!isFailureReason(state.result)) return;
    incrementFailureCounter(this.room.failureCounters, state.result);
  }

  private getMissionAudioFile(mission: MissionId): string | null {
    const schema = MISSION_SCHEMAS[mission];
    if (!schema) return null;

    const audioRule = schema.hookRules?.find((rule) => rule.kind === "audio_prompt");
    if (!audioRule || audioRule.kind !== "audio_prompt") return null;
    return audioRule.audioFile;
  }

  private initializeMissionAudioState(state: GameState): void {
    const audioFile = this.getMissionAudioFile(state.mission);
    if (!audioFile) {
      state.missionAudio = undefined;
      return;
    }

    state.missionAudio = {
      audioFile,
      status: "paused",
      positionMs: 0,
      syncedAtMs: Date.now(),
    };
  }

  private clampMissionAudioPosition(
    missionAudio: MissionAudioState,
    positionMs: number,
  ): number {
    const normalized = Math.max(0, Math.round(positionMs));
    if (missionAudio.durationMs == null) return normalized;
    return Math.min(normalized, missionAudio.durationMs);
  }

  private getMissionAudioCurrentPosition(
    missionAudio: MissionAudioState,
    nowMs: number,
  ): number {
    if (missionAudio.status !== "playing") {
      return this.clampMissionAudioPosition(missionAudio, missionAudio.positionMs);
    }

    const elapsedMs = Math.max(0, nowMs - missionAudio.syncedAtMs);
    return this.clampMissionAudioPosition(
      missionAudio,
      missionAudio.positionMs + elapsedMs,
    );
  }

  onConnect(connection: Connection) {
    // Send current state to connecting player
    if (this.room.gameState) {
      const player = this.room.players.find((p) => p.id === connection.id);
      if (player) {
        player.connected = true;
        // Broadcast to all so everyone sees the updated connection status
        this.broadcastGameState();
      } else {
        // Spectator: not in players list, send omniscient view
        const spectatorView = filterStateForSpectator(this.room.gameState);
        this.sendMsg(connection, { type: "gameState", state: spectatorView });
      }
    } else {
      // In lobby
      this.broadcastLobby();
    }
  }

  onClose(connection: Connection, _code: number, _reason: string, _wasClean: boolean) {
    const player = this.room.players.find((p) => p.id === connection.id);
    if (player) {
      player.connected = false;
      if (this.room.gameState) {
        this.broadcastGameState();
      } else {
        this.broadcastLobby();
      }
    }
  }

  onMessage(connection: Connection, message: string | ArrayBuffer) {
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse client message:", e);
      this.sendMsg(connection, { type: "error", message: "Invalid message format" });
      return;
    }

    // Block spectators from performing game actions
    if (
      msg.type !== "join" &&
      this.room.gameState &&
      !this.room.players.some((p) => p.id === connection.id)
    ) {
      this.sendMsg(connection, { type: "error", message: "Spectators cannot perform actions" });
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(connection, msg.name);
        break;
      case "selectCharacter":
        this.handleSelectCharacter(connection, msg.characterId);
        break;
      case "selectMission":
        this.handleSelectMission(connection, msg.mission);
        break;
      case "startGame":
        this.handleStartGame(connection);
        break;
      case "placeInfoToken":
        this.handlePlaceInfoToken(connection, msg.value, msg.tileIndex);
        break;
      case "dualCut":
        this.handleDualCut(
          connection,
          msg.targetPlayerId,
          msg.targetTileIndex,
          msg.guessValue,
          msg.actorTileIndex,
          msg.oxygenRecipientPlayerId,
          msg.mission59RotateNano,
        );
        break;
      case "dualCutDoubleDetector":
        this.handleDualCutDoubleDetector(
          connection,
          msg.targetPlayerId,
          msg.tileIndex1,
          msg.tileIndex2,
          msg.guessValue,
          msg.actorTileIndex,
          msg.oxygenRecipientPlayerId,
          msg.mission59RotateNano,
        );
        break;
      case "soloCut":
        this.handleSoloCut(
          connection,
          msg.value,
          msg.targetPlayerId,
          msg.mission59RotateNano,
        );
        break;
      case "revealReds":
        this.handleRevealReds(connection);
        break;
      case "simultaneousRedCut":
        this.handleSimultaneousRedCut(connection, msg.targets);
        break;
      case "simultaneousFourCut":
        this.handleSimultaneousFourCut(connection, msg.targets);
        break;
      case "useEquipment":
        this.handleUseEquipment(connection, msg.equipmentId, msg.payload);
        break;
      case "useCharacterAbility":
        this.handleUseCharacterAbility(connection, msg.payload);
        break;
      case "chooseNextPlayer":
        this.handleChooseNextPlayer(connection, msg.targetPlayerId);
        break;
      case "designateCutter":
        this.handleDesignateCutter(connection, msg.targetPlayerId);
        break;
      case "mission22TokenPassChoice":
        this.handleMission22TokenPassChoice(connection, msg.value);
        break;
      case "detectorTileChoice":
        this.handleDetectorTileChoice(connection, msg.tileIndex, msg.infoTokenTileIndex);
        break;
      case "talkiesWalkiesChoice":
        this.handleTalkiesWalkiesChoice(connection, msg.tileIndex);
        break;
      case "missionAudioControl":
        this.handleMissionAudioControl(
          connection,
          msg.command,
          msg.positionMs,
          msg.durationMs,
        );
        break;
      case "setCaptainMode":
        this.handleSetCaptainMode(connection, msg.mode);
        break;
      case "selectCaptain":
        this.handleSelectCaptain(connection, msg.playerId);
        break;
      case "addBot":
        this.handleAddBot(connection);
        break;
      case "removeBot":
        this.handleRemoveBot(connection, msg.botId);
        break;
      case "chat":
        this.handleChat(connection, msg.text);
        break;
      case "playAgain":
        this.handlePlayAgain(connection);
        break;
      default:
        this.sendMsg(connection, { type: "error", message: "Unknown message type" });
    }
  }

  /**
   * Replace a player's old ID with a new one across all room state references.
   * Used when a disconnected player reconnects with a different connection ID.
   */
  private replacePlayerId(oldId: string, newId: string) {
    // Update player object
    const player = this.room.players.find((p) => p.id === oldId);
    if (player) player.id = newId;

    // Update hostId
    if (this.room.hostId === oldId) {
      this.room.hostId = newId;
    }

    // Update game state references
    const gs = this.room.gameState;
    if (gs) {
      // Update player ID in gameState.players
      const gsPlayer = gs.players.find((p) => p.id === oldId);
      if (gsPlayer) gsPlayer.id = newId;

      // Update pendingForcedAction references
      if (gs.pendingForcedAction) {
        if (gs.pendingForcedAction.kind === "chooseNextPlayer") {
          if (gs.pendingForcedAction.captainId === oldId) {
            gs.pendingForcedAction.captainId = newId;
          }
          if (gs.pendingForcedAction.lastPlayerId === oldId) {
            gs.pendingForcedAction.lastPlayerId = newId;
          }
        } else if (gs.pendingForcedAction.kind === "designateCutter") {
          if (gs.pendingForcedAction.designatorId === oldId) {
            gs.pendingForcedAction.designatorId = newId;
          }
        } else if (gs.pendingForcedAction.kind === "mission22TokenPass") {
          if (gs.pendingForcedAction.currentChooserId === oldId) {
            gs.pendingForcedAction.currentChooserId = newId;
          }
        } else if (gs.pendingForcedAction.kind === "detectorTileChoice") {
          if (gs.pendingForcedAction.targetPlayerId === oldId) {
            gs.pendingForcedAction.targetPlayerId = newId;
          }
          if (gs.pendingForcedAction.actorId === oldId) {
            gs.pendingForcedAction.actorId = newId;
          }
          if (gs.pendingForcedAction.oxygenRecipientPlayerId === oldId) {
            gs.pendingForcedAction.oxygenRecipientPlayerId = newId;
          }
        } else if (gs.pendingForcedAction.kind === "talkiesWalkiesTileChoice") {
          if (gs.pendingForcedAction.targetPlayerId === oldId) {
            gs.pendingForcedAction.targetPlayerId = newId;
          }
          if (gs.pendingForcedAction.actorId === oldId) {
            gs.pendingForcedAction.actorId = newId;
          }
        }
      }
    }
  }

  handleJoin(conn: Connection, name: string) {
    if (this.room.gameState) {
      // Reconnection during game — try exact ID match first
      let existing = this.room.players.find((p) => p.id === conn.id);
      if (existing) {
        existing.connected = true;
        existing.name = name;
        this.broadcastGameState();
        return;
      }

      // Name-based fallback: find a disconnected player with the same name
      const byName = this.room.players.find(
        (p) => !p.isBot && !p.connected && p.name === name,
      );
      if (byName) {
        this.replacePlayerId(byName.id, conn.id);
        byName.connected = true;
        this.saveState();
        this.broadcastGameState();
        return;
      }

      // Late joiner becomes a spectator — send omniscient view
      const spectatorView = filterStateForSpectator(this.room.gameState);
      this.sendMsg(conn, { type: "gameState", state: spectatorView });
      return;
    }

    // Check if player already exists (reconnection in lobby — exact ID)
    let player = this.room.players.find((p) => p.id === conn.id);
    if (player) {
      player.name = name;
      player.connected = true;
    } else {
      // Name-based fallback in lobby: find a disconnected player with the same name
      const byName = this.room.players.find(
        (p) => !p.isBot && !p.connected && p.name === name,
      );
      if (byName) {
        this.replacePlayerId(byName.id, conn.id);
        byName.connected = true;
        player = byName;
      } else {
        if (this.room.players.length >= 5) {
          this.sendMsg(conn, { type: "error", message: "Room is full (max 5 players)" });
          return;
        }

        const newPlayer: Player = {
          id: conn.id,
          name,
          character: null,
          isCaptain: false,
          hand: [],
          standSizes: [0],
          infoTokens: [],
          characterUsed: false,
          connected: true,
          isBot: false,
        };
        player = newPlayer;
        this.room.players.push(newPlayer);

        // First player is host
        if (!this.room.hostId) {
          this.room.hostId = conn.id;
        }
      }
    }

    this.saveState();
    this.broadcastLobby();
  }

  handleSelectCharacter(conn: Connection, characterId: CharacterId) {
    if (this.room.gameState) return;
    if (this.room.mission < 31) return;

    const validCharacterIds: CharacterId[] = [
      "double_detector",
      "character_2",
      "character_3",
      "character_4",
      "character_5",
      "character_e1",
      "character_e2",
      "character_e3",
      "character_e4",
    ];
    if (!validCharacterIds.includes(characterId)) return;

    const player = this.room.players.find((p) => p.id === conn.id);
    if (!player) return;
    if (isNonCaptainCharacterForbidden(this.room.mission, characterId)) {
      this.sendMsg(conn, {
        type: "error",
        message: `Character selection rejected: forbidden on mission ${this.room.mission}`,
      });
      return;
    }

    player.character = characterId;
    this.saveState();
    this.broadcastLobby();
  }

  handleSelectMission(conn: Connection, mission: MissionId) {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can change the mission" });
      return;
    }

    this.room.mission = mission;
    this.saveState();
    this.broadcastLobby();
  }

  handleSetCaptainMode(conn: Connection, mode: "random" | "selection") {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can change captain mode" });
      return;
    }
    this.room.captainMode = mode;
    if (mode === "random") {
      this.room.selectedCaptainId = null;
    }
    this.saveState();
    this.broadcastLobby();
  }

  handleSelectCaptain(conn: Connection, playerId: string) {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can select the captain" });
      return;
    }
    if (this.room.captainMode !== "selection") {
      this.sendMsg(conn, { type: "error", message: "Captain selection is only available in selection mode" });
      return;
    }
    if (!this.room.players.some((p) => p.id === playerId)) {
      this.sendMsg(conn, { type: "error", message: "Player not found" });
      return;
    }
    this.room.selectedCaptainId = playerId;
    this.saveState();
    this.broadcastLobby();
  }

  handleStartGame(conn: Connection) {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can start the game" });
      return;
    }

    if (this.room.players.length < 2) {
      this.sendMsg(conn, { type: "error", message: "Need at least 2 players" });
      return;
    }

    // Validate mission supports current player count
    const missionError = validateMissionPlayerCount(this.room.mission, this.room.players.length);
    if (missionError) {
      this.sendMsg(conn, { type: "error", message: missionError });
      return;
    }

    // Randomize turn order
    shuffle(this.room.players);

    // Randomly assign characters to players
    // Assign captain based on mode
    let captainIndex: number;
    if (this.room.captainMode === "selection" && this.room.selectedCaptainId) {
      const selectedIdx = this.room.players.findIndex(
        (p) => p.id === this.room.selectedCaptainId,
      );
      captainIndex = selectedIdx >= 0 ? selectedIdx : Math.floor(Math.random() * this.room.players.length);
    } else {
      captainIndex = Math.floor(Math.random() * this.room.players.length);
    }
    for (let i = 0; i < this.room.players.length; i++) {
      this.room.players[i].isCaptain = i === captainIndex;
    }

    assignCharactersForGameStart(this.room.players, this.room.mission);

    // Setup the game
    let board: import("@bomb-busters/shared").BoardState;
    let players: Player[];
    let equipmentReserve: import("@bomb-busters/shared").EquipmentCard[];
    try {
      ({ board, players, equipmentReserve } = setupGame(this.room.players, this.room.mission));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to setup mission";
      this.sendMsg(conn, { type: "error", message });
      return;
    }

    this.room.gameState = {
      phase: "setup_info_tokens",
      roomId: this.name,
      players,
      board,
      currentPlayerIndex: captainIndex,
      turnNumber: 0,
      mission: this.room.mission,
      result: null,
      log: [],
      chat: [],
      ...(equipmentReserve.length > 0 ? { campaign: { equipmentReserve } } : {}),
    };

    // Dispatch mission setup hooks (timer config, hidden reds, etc.)
    dispatchHooks(this.room.mission, {
      point: "setup",
      state: this.room.gameState,
    });
    this.initializeMissionAudioState(this.room.gameState);

    const autoPlacements = autoPlaceMission13RandomSetupInfoTokens(this.room.gameState);
    for (const placement of autoPlacements) {
      const placementPlayer = this.room.gameState.players.find((p) => p.id === placement.playerId);
      pushGameLog(this.room.gameState, {
        turn: 0,
        playerId: placement.playerId,
        action: "placeInfoToken",
        detail: `placed random info token ${describeInfoToken(placement.token)} on ${describeInfoTokenLocation(placement.token.position, placementPlayer)}`,
        timestamp: Date.now(),
      });
    }

    this.advanceSetupTurnAndMaybeStart(this.room.gameState);

    // Auto-place info tokens for bots
    this.handleBotInfoTokens();

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  advanceSetupTurnAndMaybeStart(state: GameState) {
    if (state.phase !== "setup_info_tokens") return;

    advanceToNextSetupPlayer(state);
    if (allSetupInfoTokensPlaced(state)) {
      state.phase = "playing";
      state.currentPlayerIndex = state.players.findIndex((p) => p.isCaptain);
      state.turnNumber = 1;
    }
  }

  handlePlaceInfoToken(conn: Connection, value: number, tileIndex: number) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot place setup info token: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "setup_info_tokens") {
      this.sendMsg(conn, {
        type: "error",
        message: "Info token placement is only allowed during the setup phase.",
      });
      return;
    }

    // Enforce turn order during setup
    if (state.players[state.currentPlayerIndex].id !== conn.id) {
      this.sendMsg(conn, { type: "error", message: "It's not your turn to place an info token" });
      return;
    }

    const player = state.players.find((p) => p.id === conn.id);
    if (!player) {
      this.sendMsg(conn, { type: "error", message: "Player not found in game" });
      return;
    }

    const requiredTokenCount = requiredSetupInfoTokenCount(state, player);
    if (requiredTokenCount === 0) {
      this.sendMsg(conn, {
        type: "error",
        message: "You do not place an info token in this mission setup",
      });
      return;
    }

    if (hasCompletedSetupInfoTokens(state, player)) {
      this.sendMsg(conn, { type: "error", message: "You already placed your setup info token" });
      return;
    }

    const placementError = validateSetupInfoTokenPlacement(state, player, value, tileIndex);
    if (placementError) {
      this.sendMsg(conn, {
        type: "error",
        message: placementError.message,
        code: placementError.code,
      });
      return;
    }

    const isYellowToken = state.mission === 22 && value === 0;
    const infoTokenPlacementIndex = state.mission === 50 ? -1 : tileIndex;
    const token = applyMissionInfoTokenVariant(state, {
      value,
      position: infoTokenPlacementIndex,
      isYellow: isYellowToken,
    }, player);
    player.infoTokens.push(token);
    if (state.mission === 22) {
      getMission22TokenPassBoardState(state);
    }

    pushGameLog(state, {
      turn: 0,
      playerId: conn.id,
      action: "placeInfoToken",
      detail: `placed info token ${describeInfoToken(token)} on ${describeInfoTokenLocation(infoTokenPlacementIndex, player)}`,
      timestamp: Date.now(),
    });

    this.advanceSetupTurnAndMaybeStart(state);

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleDualCut(
    conn: Connection,
    targetPlayerId: string,
    targetTileIndex: number,
    guessValue: number | "YELLOW",
    actorTileIndex?: number,
    oxygenRecipientPlayerId?: string,
    mission59RotateNano?: boolean,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, { type: "error", message: "Cannot perform Dual Cut: no active game in progress." });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, { type: "error", message: "Dual Cut is only allowed during the playing phase." });
      return;
    }

    const error = validateDualCutWithHooks(
      state,
      conn.id,
      targetPlayerId,
      targetTileIndex,
      guessValue,
      oxygenRecipientPlayerId,
    );
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeDualCut(
      state,
      conn.id,
      targetPlayerId,
      targetTileIndex,
      guessValue,
      actorTileIndex,
      undefined,
      oxygenRecipientPlayerId,
      mission59RotateNano,
    );
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleDualCutDoubleDetector(
    conn: Connection,
    targetPlayerId: string,
    tileIndex1: number,
    tileIndex2: number,
    guessValue: number,
    actorTileIndex?: number,
    oxygenRecipientPlayerId?: string,
    mission59RotateNano?: boolean,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot perform Dual Cut Double Detector: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Dual Cut Double Detector is only allowed during the playing phase.",
      });
      return;
    }

    const error = validateDualCutDoubleDetectorWithHooks(
      state,
      conn.id,
      targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
      oxygenRecipientPlayerId,
    );
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeDualCutDoubleDetector(
      state,
      conn.id,
      targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
      actorTileIndex,
      oxygenRecipientPlayerId,
      mission59RotateNano,
    );
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleSoloCut(
    conn: Connection,
    value: number | "YELLOW",
    targetPlayerId?: string,
    mission59RotateNano?: boolean,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, { type: "error", message: "Cannot perform Solo Cut: no active game in progress." });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, { type: "error", message: "Solo Cut is only allowed during the playing phase." });
      return;
    }

    const error = validateSoloCutWithHooks(
      state,
      conn.id,
      value,
      targetPlayerId,
    );
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeSoloCut(
      state,
      conn.id,
      value,
      targetPlayerId,
      mission59RotateNano,
    );
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleRevealReds(conn: Connection) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, { type: "error", message: "Cannot perform Reveal Reds: no active game in progress." });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, { type: "error", message: "Reveal Reds is only allowed during the playing phase." });
      return;
    }

    const error = validateRevealRedsWithHooks(state, conn.id);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeRevealReds(state, conn.id);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleSimultaneousRedCut(
    conn: Connection,
    targets: Array<{ playerId: string; tileIndex: number }>,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot perform Simultaneous Red Cut: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Simultaneous Red Cut is only allowed during the playing phase.",
      });
      return;
    }

    const error = validateSimultaneousRedCutWithHooks(state, conn.id, targets);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeSimultaneousRedCut(state, conn.id, targets);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleSimultaneousFourCut(
    conn: Connection,
    targets: Array<{ playerId: string; tileIndex: number }>,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot perform Simultaneous Four Cut: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Simultaneous Four Cut is only allowed during the playing phase.",
      });
      return;
    }

    const error = validateSimultaneousFourCutWithHooks(state, conn.id, targets);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeSimultaneousFourCut(state, conn.id, targets);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleUseEquipment(
    conn: Connection,
    equipmentId: AnyEquipmentId,
    payload: UseEquipmentPayload,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot use Equipment: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Using Equipment is only allowed during the playing phase.",
      });
      return;
    }

    const error = validateUseEquipment(state, conn.id, equipmentId, payload);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeUseEquipment(state, conn.id, equipmentId, payload);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleUseCharacterAbility(
    conn: Connection,
    payload: UseEquipmentPayload,
  ) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot use Character Ability: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Character Ability is only allowed during the playing phase.",
      });
      return;
    }

    const error = validateCharacterAbility(state, conn.id, payload);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeCharacterAbility(state, conn.id, payload);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleChooseNextPlayer(conn: Connection, targetPlayerId: string) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot choose next player: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Choose Next Player is only allowed during the playing phase.",
      });
      return;
    }

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "chooseNextPlayer") {
      this.sendMsg(conn, { type: "error", message: "No pending choose-next-player action" });
      return;
    }

    if (conn.id !== forced.captainId) {
      this.sendMsg(conn, { type: "error", message: "Only the captain can choose the next player" });
      return;
    }

    const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIndex === -1) {
      this.sendMsg(conn, { type: "error", message: "Target player not found" });
      return;
    }

    const target = state.players[targetIndex];
    const uncutCount = target.hand.filter((t) => !t.cut).length;
    if (uncutCount === 0) {
      this.sendMsg(conn, { type: "error", message: "Target player has no remaining tiles" });
      return;
    }

    // Mission 10: same player cannot take consecutive turns in 3+ player games,
    // unless there is no other active player to choose.
    if (isRepeatNextPlayerSelectionDisallowed(state, forced.lastPlayerId, targetPlayerId)) {
      this.sendMsg(conn, {
        type: "error",
        message: "In this mission, the same player cannot act twice in a row",
        code: "MISSION_RULE_VIOLATION",
      });
      return;
    }

    state.pendingForcedAction = undefined;
    state.currentPlayerIndex = targetIndex;

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleDesignateCutter(conn: Connection, targetPlayerId: string) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot designate next cutter: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Designate Cutter is only allowed during the playing phase.",
      });
      return;
    }

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "designateCutter") {
      this.sendMsg(conn, { type: "error", message: "No pending designate-cutter action" });
      return;
    }

    if (conn.id !== forced.designatorId) {
      this.sendMsg(conn, { type: "error", message: "Only the active player can designate who cuts" });
      return;
    }

    const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIndex === -1) {
      this.sendMsg(conn, { type: "error", message: "Target player not found" });
      return;
    }

    const target = state.players[targetIndex];
    const uncutCount = target.hand.filter((t) => !t.cut).length;
    if (uncutCount === 0) {
      this.sendMsg(conn, { type: "error", message: "Target player has no remaining tiles" });
      return;
    }

    const mission18TargetError = validateMission18DesignatedCutterTarget(
      forced.value,
      targetPlayerId,
      forced.radarResults,
    );
    if (mission18TargetError) {
      this.sendMsg(conn, {
        type: "error",
        message: mission18TargetError.message,
        code: mission18TargetError.code,
      });
      return;
    }

    // Store the designator's index for turn advancement after the cut
    const designatorIndex = state.players.findIndex((p) => p.id === forced.designatorId);
    state.campaign ??= {};
    state.campaign.mission18DesignatorIndex = designatorIndex;

    // Hand control to the designated cutter
    state.currentPlayerIndex = targetIndex;
    state.pendingForcedAction = undefined;

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: forced.designatorId,
      action: "designateCutter",
      detail: logTemplate("designate_cutter.selected", {
        targetPlayerId,
      }),
      timestamp: Date.now(),
    });

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleMission22TokenPassChoice(conn: Connection, value: number) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot perform Mission 22 token pass: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Mission 22 token pass is only allowed during the playing phase.",
      });
      return;
    }

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "mission22TokenPass") {
      this.sendMsg(conn, { type: "error", message: "No pending mission 22 token pass action" });
      return;
    }

    if (conn.id !== forced.currentChooserId) {
      this.sendMsg(conn, { type: "error", message: "It's not your turn to pass a token" });
      return;
    }

    if (!Number.isInteger(value) || value < 0 || value > 12) {
      this.sendMsg(conn, { type: "error", message: "Token value must be 0 (yellow) or 1-12" });
      return;
    }

    const result = applyMission22TokenPassChoice(state, forced, value);
    if (!result.ok) {
      this.sendMsg(conn, { type: "error", message: result.message });
      return;
    }

    const token = result.updatedRecipientToken;
    const recipient = state.players[result.recipientIndex];
    if (!recipient) return false;

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: forced.currentChooserId,
      action: "hookEffect",
      detail: `m22:token_pass:value=${token.value}|to=${recipient.id}|position=${wireLabelOf(recipient, token.position)}`,
      timestamp: Date.now(),
    });

    const nextCompleted = forced.completedCount + 1;
    if (nextCompleted >= forced.passingOrder.length) {
      // All players have passed tokens
      state.pendingForcedAction = undefined;
    } else {
      const nextOrderIndex = nextCompleted;
      const nextChooserIndex = forced.passingOrder[nextOrderIndex];
      const nextChooser = state.players[nextChooserIndex];
      state.pendingForcedAction = {
        kind: "mission22TokenPass",
        currentChooserIndex: nextChooserIndex,
        currentChooserId: nextChooser.id,
        passingOrder: forced.passingOrder,
        completedCount: nextCompleted,
      };
    }

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  private executeMission22TokenPass(
    state: GameState,
    forced: Extract<import("@bomb-busters/shared").ForcedAction, { kind: "mission22TokenPass" }>,
    value: number,
  ): boolean {
    const result = applyMission22TokenPassChoice(state, forced, value);
    if (!result.ok) {
      return false;
    }

    const token = result.updatedRecipientToken;
    const recipient = state.players[result.recipientIndex];
    if (!recipient) return false;

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: forced.currentChooserId,
      action: "hookEffect",
      detail: `m22:token_pass:value=${token.value}|to=${recipient.id}|position=${wireLabelOf(recipient, token.position)}`,
      timestamp: Date.now(),
    });

    const nextCompleted = forced.completedCount + 1;
    if (nextCompleted >= forced.passingOrder.length) {
      state.pendingForcedAction = undefined;
    } else {
      const nextOrderIndex = nextCompleted;
      const nextChooserIndex = forced.passingOrder[nextOrderIndex];
      const nextChooser = state.players[nextChooserIndex];
      state.pendingForcedAction = {
        kind: "mission22TokenPass",
        currentChooserIndex: nextChooserIndex,
        currentChooserId: nextChooser.id,
        passingOrder: forced.passingOrder,
        completedCount: nextCompleted,
      };
    }

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
    return true;
  }

  handleDetectorTileChoice(conn: Connection, tileIndex?: number, infoTokenTileIndex?: number) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot choose detector tile: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Detector tile choice is only allowed during the playing phase.",
      });
      return;
    }

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "detectorTileChoice") {
      this.sendMsg(conn, { type: "error", message: "No pending detector tile choice" });
      return;
    }

    if (conn.id !== forced.targetPlayerId) {
      this.sendMsg(conn, { type: "error", message: "Only the target player can choose which tile to cut" });
      return;
    }

    const target = state.players.find((p) => p.id === forced.targetPlayerId);
    if (!target) {
      this.sendMsg(conn, { type: "error", message: "Target player not found" });
      return;
    }

    const availableMatches = forced.matchingTileIndices.filter((idx) => {
      const tile = getTileByFlatIndex(target, idx);
      return !!tile && !tile.cut && tile.gameValue === forced.guessValue;
    });
    const matchCount = availableMatches.length;

    if (matchCount >= 2) {
      if (tileIndex == null || !availableMatches.includes(tileIndex)) {
        this.sendMsg(conn, { type: "error", message: "Invalid tile choice" });
        return;
      }
    }

    if (matchCount === 0 && forced.source === "doubleDetector" && infoTokenTileIndex != null) {
      const validIndices = [forced.originalTileIndex1, forced.originalTileIndex2].filter((i): i is number => i != null);
      if (!validIndices.includes(infoTokenTileIndex)) {
        this.sendMsg(conn, { type: "error", message: "Invalid info token tile choice" });
        return;
      }
    }

    const previousResult = state.result;
    const action = resolveDetectorTileChoice(state, tileIndex, infoTokenTileIndex);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleTalkiesWalkiesChoice(conn: Connection, tileIndex: number) {
    const state = this.room.gameState;
    if (!state) {
      this.sendMsg(conn, {
        type: "error",
        message: "Cannot choose Walkie-Talkies tile: no active game in progress.",
      });
      return;
    }
    if (state.phase !== "playing") {
      this.sendMsg(conn, {
        type: "error",
        message: "Walkie-Talkies tile choice is only allowed during the playing phase.",
      });
      return;
    }

    const forced = state.pendingForcedAction;
    if (!forced || forced.kind !== "talkiesWalkiesTileChoice") {
      this.sendMsg(conn, { type: "error", message: "No pending Walkie-Talkies choice" });
      return;
    }

    if (conn.id !== forced.targetPlayerId) {
      this.sendMsg(conn, { type: "error", message: "Only the target player can choose the wire to swap" });
      return;
    }

    const target = state.players.find((p) => p.id === forced.targetPlayerId);
    if (!target) {
      this.sendMsg(conn, { type: "error", message: "Target player not found" });
      return;
    }

    const tile = getTileByFlatIndex(target, tileIndex);
    if (!tile) {
      this.sendMsg(conn, { type: "error", message: "Invalid tile index" });
      return;
    }
    if (tile.cut) {
      this.sendMsg(conn, { type: "error", message: "Tile already cut" });
      return;
    }
    if (
      hasXMarkedWireTalkiesRestriction(state.mission) &&
      tile.isXMarked
    ) {
      this.sendMsg(conn, {
        type: "error",
        message: "X-marked wires are ignored by equipment in this mission",
        code: "MISSION_RULE_VIOLATION",
      });
      return;
    }

    const action = resolveTalkiesWalkiesTileChoice(state, tileIndex);
    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleMissionAudioControl(
    conn: Connection,
    command: MissionAudioControlCommand,
    positionMs?: number,
    durationMs?: number,
  ) {
    const state = this.room.gameState;
    if (!state || state.phase === "finished") return;
    if (!state.missionAudio) return;
    if (
      command !== "play" &&
      command !== "pause" &&
      command !== "seek"
    ) {
      this.sendMsg(conn, { type: "error", message: "Invalid mission audio command" });
      return;
    }

    const missionAudio = state.missionAudio;

    if (durationMs !== undefined) {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        this.sendMsg(conn, { type: "error", message: "Invalid mission audio duration" });
        return;
      }
      missionAudio.durationMs = Math.round(durationMs);
      missionAudio.positionMs = this.clampMissionAudioPosition(
        missionAudio,
        missionAudio.positionMs,
      );
    }

    const parsedPosition =
      typeof positionMs === "number" && Number.isFinite(positionMs)
        ? Math.round(positionMs)
        : undefined;

    if (positionMs !== undefined && parsedPosition === undefined) {
      this.sendMsg(conn, { type: "error", message: "Invalid mission audio position" });
      return;
    }

    if (command === "seek" && parsedPosition === undefined) {
      this.sendMsg(conn, { type: "error", message: "Seek requires a playback position" });
      return;
    }

    const nowMs = Date.now();
    const currentPosition = this.getMissionAudioCurrentPosition(
      missionAudio,
      nowMs,
    );
    const nextPosition = this.clampMissionAudioPosition(
      missionAudio,
      parsedPosition ?? currentPosition,
    );

    if (command === "play") {
      missionAudio.status = "playing";
    } else if (command === "pause") {
      missionAudio.status = "paused";
    }
    missionAudio.positionMs = nextPosition;
    missionAudio.syncedAtMs = nowMs;

    this.saveState();
    this.broadcastGameState();
  }

  // -- Chat handlers -----------------------------------------------------

  handleChat(conn: Connection, text: string) {
    const state = this.room.gameState;
    if (!state) return;

    const player = state.players.find((p) => p.id === conn.id);
    if (!player) return;

    const sanitized = text.trim().slice(0, 500);
    if (!sanitized) return;

    const previousResult = state.result;
    const penaltyApplied = applyMission25ChatPenalty(state, sanitized);
    if (penaltyApplied) {
      if (state.result === "loss_detonator" && previousResult !== "loss_detonator") {
        emitMissionFailureTelemetry(state, "loss_detonator", player.id, null);
      }
      this.maybeRecordMissionFailure(previousResult, state);
    }

    const chatMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: player.id,
      senderName: player.name,
      text: sanitized,
      timestamp: Date.now(),
      isBotReasoning: false,
      turnNumber: state.turnNumber,
    };

    state.chat.push(chatMsg);
    if (state.chat.length > 200) {
      state.chat = state.chat.slice(-200);
    }

    this.broadcastChat(chatMsg);
    if (penaltyApplied) {
      this.broadcastGameState();
    }
    this.saveState();
  }

  handlePlayAgain(conn: Connection) {
    if (!this.room.gameState || this.room.gameState.phase !== "finished") {
      this.sendMsg(conn, { type: "error", message: "Mission must be finished before restarting." });
      return;
    }
    if (!this.room.players.some((player) => player.id === conn.id)) {
      this.sendMsg(conn, { type: "error", message: "Only players can restart after mission complete." });
      return;
    }

    // Clear game state
    this.room.gameState = null;
    this.room.finishedAt = undefined;
    this.room.botLastActionTurn = {};

    // Reset each player's game-specific state back to lobby defaults
    for (const player of this.room.players) {
      player.hand = [];
      player.standSizes = [0];
      player.infoTokens = [];
      player.isCaptain = false;
      player.characterUsed = false;
      player.character = null;
    }

    this.saveState();
    this.broadcastLobby();
  }

  broadcastChat(chatMsg: ChatMessage) {
    const msg: ServerMessage = { type: "chat", message: chatMsg };
    const json = JSON.stringify(msg);
    for (const conn of this.getConnections()) {
      conn.send(json);
    }
  }

  // -- Bot handlers -----------------------------------------------------

  handleAddBot(conn: Connection) {
    if (this.room.gameState) {
      this.sendMsg(conn, { type: "error", message: "Cannot add bots during game" });
      return;
    }
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can add bots" });
      return;
    }
    if (this.room.players.length >= 5) {
      this.sendMsg(conn, { type: "error", message: "Room is full (max 5 players)" });
      return;
    }

    this.room.botCount++;
    const botId = `bot-${this.room.botCount}`;
    const bot = createBotPlayer(botId, this.room.botCount - 1);
    this.room.players.push(bot);

    this.saveState();
    this.broadcastLobby();
  }

  handleRemoveBot(conn: Connection, botId: string) {
    if (this.room.gameState) {
      this.sendMsg(conn, { type: "error", message: "Cannot remove bots during game" });
      return;
    }
    if (conn.id !== this.room.hostId) {
      this.sendMsg(conn, { type: "error", message: "Only the host can remove bots" });
      return;
    }

    const idx = this.room.players.findIndex((p) => p.id === botId && p.isBot);
    if (idx === -1) {
      this.sendMsg(conn, { type: "error", message: "Bot not found" });
      return;
    }

    this.room.players.splice(idx, 1);
    this.saveState();
    this.broadcastLobby();
  }

  /** Auto-place info tokens for all bots during setup phase */
  handleBotInfoTokens() {
    const state = this.room.gameState;
    if (!state || state.phase !== "setup_info_tokens") return;

    for (const player of state.players) {
      if (!player.isBot) continue;
      while (!hasCompletedSetupInfoTokens(state, player)) {
        const beforeCount = player.infoTokens.length;
        botPlaceInfoToken(state, player.id);
        if (player.infoTokens.length === beforeCount) break;

        const token = player.infoTokens[player.infoTokens.length - 1];
        if (token) {
          pushGameLog(state, {
            turn: 0,
            playerId: player.id,
            action: "placeInfoToken",
            detail: `placed info token ${describeInfoToken(token)} on ${describeInfoTokenLocation(token.position, player)}`,
            timestamp: Date.now(),
          });
        }
      }
    }
    this.advanceSetupTurnAndMaybeStart(state);
  }

  /** Schedule the next alarm: picks the earliest of cleanup, bot turn, and timer deadlines. */
  scheduleNextAlarm() {
    const state = this.room.gameState;
    let nextAlarmMs: number | null = null;
    nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, this.getFinishedCleanupDeadline());
    nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, this.getStaleCleanupDeadline());

    // Bot and timer alarms only apply during active game phases.
    if (
      state &&
      state.phase !== "finished" &&
      (state.phase === "playing" || state.phase === "setup_info_tokens")
    ) {
      const forced = state.pendingForcedAction;

      // Bot turn alarm: 1.5s if it's a bot's turn (playing phase only)
      if (state.phase === "playing") {
        // For choose/designate forced actions, currentPlayer remains the decider.
        if (
          !forced
          || forced.kind === "chooseNextPlayer"
          || forced.kind === "designateCutter"
        ) {
          const currentPlayer = state.players[state.currentPlayerIndex];
          if (currentPlayer?.isBot) {
            const botMs = Date.now() + 1500;
            nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, botMs);
          }
        }

        // Mission 22 token pass: schedule alarm if current chooser is a bot
        if (forced?.kind === "mission22TokenPass") {
          const chooser = state.players.find((p) => p.id === forced.currentChooserId);
          if (chooser?.isBot) {
            const botMs = Date.now() + 1500;
            nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, botMs);
          }
        } else if (forced?.kind === "detectorTileChoice") {
          const chooser = state.players.find((p) => p.id === forced.targetPlayerId);
          if (chooser?.isBot) {
            const botMs = Date.now() + 1500;
            nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, botMs);
          }
        } else if (forced?.kind === "talkiesWalkiesTileChoice") {
          const chooser = state.players.find((p) => p.id === forced.targetPlayerId);
          if (chooser?.isBot) {
            const botMs = Date.now() + 1500;
            nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, botMs);
          }
        }
      }

      // Timer deadline alarm (mission 10) — active from setup through playing
      if (state.timerDeadline != null) {
        nextAlarmMs = this.pickEarlierAlarm(nextAlarmMs, state.timerDeadline);
      }
    }

    if (nextAlarmMs !== null) {
      this.ctx.storage.setAlarm(nextAlarmMs).catch((e) => {
        console.error("Failed to schedule alarm:", e);
      });
    }
  }

  /** @deprecated Use scheduleNextAlarm() instead. Kept as alias for clarity. */
  scheduleBotTurnIfNeeded() {
    this.scheduleNextAlarm();
  }

  async onAlarm() {
    const nowMs = Date.now();

    const finishedCleanupDeadline = this.getFinishedCleanupDeadline();
    if (finishedCleanupDeadline != null && nowMs >= finishedCleanupDeadline) {
      await this.ctx.storage.deleteAll();
      this.resetRoomState();
      return;
    }

    const staleCleanupDeadline = this.getStaleCleanupDeadline();
    if (staleCleanupDeadline != null && nowMs >= staleCleanupDeadline) {
      await this.ctx.storage.deleteAll();
      this.resetRoomState();
      return;
    }

    const state = this.room.gameState;
    if (!state || (state.phase !== "playing" && state.phase !== "setup_info_tokens")) {
      this.scheduleNextAlarm();
      return;
    }

    try {
      // Check timer expiry first (takes priority over bot turns)
      if (state.timerDeadline != null && nowMs >= state.timerDeadline) {
        const previousResult = state.result;
        state.result = "loss_timer";
        state.phase = "finished";
        emitMissionFailureTelemetry(state, "loss_timer", "system");
        this.maybeRecordMissionFailure(previousResult, state);
        pushGameLog(state, {
          turn: state.turnNumber,
          playerId: "system",
          action: "timerExpired",
          detail: "Mission timer expired - mission failed!",
          timestamp: Date.now(),
        });
        this.saveState();
        this.broadcastAction({ type: "gameOver", result: "loss_timer" });
        this.broadcastGameState();
        return;
      }

      // Otherwise handle bot turn (playing phase only)
      if (state.phase === "playing") {
        await this.executeBotTurn();
      }
    } catch (e) {
      console.error("Alarm handler failed:", e);
    }

    this.scheduleNextAlarm();
  }

  async executeBotTurn() {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    // Detector tile choice: if a bot is the target, auto-resolve
    const detectorForced = state.pendingForcedAction;
    if (detectorForced?.kind === "detectorTileChoice") {
      const targetPlayer = state.players.find((p) => p.id === detectorForced.targetPlayerId);
      if (targetPlayer?.isBot) {
        const matchCount = detectorForced.matchingTileIndices.length;
        let tileIndex: number | undefined;
        let infoTokenTileIndex: number | undefined;

        if (matchCount >= 1) {
          tileIndex = detectorForced.matchingTileIndices[0];
        } else if (detectorForced.source === "doubleDetector") {
          // 0 match: pick first non-red tile for info token
          const tile1Idx = detectorForced.originalTileIndex1!;
          const tile2Idx = detectorForced.originalTileIndex2!;
          infoTokenTileIndex = getBotDoubleDetectorNoMatchInfoTokenIndex(
            state,
            targetPlayer,
            tile1Idx,
            tile2Idx,
          );
        }
        // else: triple/super 0-match, no choice needed

        const previousResult = state.result;
        const action = resolveDetectorTileChoice(state, tileIndex, infoTokenTileIndex);
        this.maybeRecordMissionFailure(previousResult, state);
        this.saveState();
        this.broadcastAction(action);
        this.broadcastGameState();
        this.scheduleBotTurnIfNeeded();
        return;
      }
    }

    const talkiesForced = state.pendingForcedAction;
    if (talkiesForced?.kind === "talkiesWalkiesTileChoice") {
      const targetPlayer = state.players.find((p) => p.id === talkiesForced.targetPlayerId);
      if (targetPlayer?.isBot) {
        const tileIndex = targetPlayer.hand.findIndex(
          (tile) =>
            !tile.cut &&
            !(
              hasXMarkedWireTalkiesRestriction(state.mission) &&
              tile.isXMarked
            ),
        );
        if (tileIndex === -1) {
          console.log(
            `Bot ${targetPlayer.id} talkiesWalkiesChoice rejected: no swappable uncut tile`,
          );
          return;
        }

        const action = resolveTalkiesWalkiesTileChoice(state, tileIndex);
        this.saveState();
        this.broadcastAction(action);
        this.broadcastGameState();
        this.scheduleBotTurnIfNeeded();
        return;
      }
    }

    // Mission 22 token pass: if a bot is the current chooser, pick a random value
    const m22Forced = state.pendingForcedAction;
    if (m22Forced?.kind === "mission22TokenPass") {
      const chooser = state.players.find((p) => p.id === m22Forced.currentChooserId);
      if (chooser?.isBot) {
        // Bot picks a random available board token value.
        const availableValues = getMission22TokenPassAvailableValues(state);
        if (availableValues.length === 0) {
          state.pendingForcedAction = undefined;
          this.saveState();
          this.broadcastGameState();
          return;
        }
        const value = availableValues[Math.floor(Math.random() * availableValues.length)];
        const success = this.executeMission22TokenPass(state, m22Forced, value);
        if (!success) {
          state.pendingForcedAction = undefined;
          this.saveState();
          this.broadcastGameState();
        }
        return;
      }
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    const botId = currentPlayer.id;

    const apiKey = (this.env as Env).ZHIPU_API_KEY;

    // Build chat context: messages since this bot's last action
    const lastTurn = this.room.botLastActionTurn[botId] ?? 0;
    const chatContext = state.chat
      .filter((m) => m.turnNumber > lastTurn)
      .map((m) => `[${m.senderName}]: ${m.text}`)
      .join("\n");

    const botResult = await getBotAction(state, botId, apiKey || "", chatContext);

    // Broadcast bot reasoning as a chat message
    if (botResult.reasoning) {
      const reasoningMsg: ChatMessage = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: botId,
        senderName: currentPlayer.name,
        text: botResult.reasoning,
        timestamp: Date.now(),
        isBotReasoning: true,
        turnNumber: state.turnNumber,
      };
      state.chat.push(reasoningMsg);
      if (state.chat.length > 200) {
        state.chat = state.chat.slice(-200);
      }
      this.broadcastChat(reasoningMsg);
    }

    const botAction = botResult.action;
    const previousResult = state.result;
    let action: import("@bomb-busters/shared").GameAction;
    switch (botAction.action) {
      case "designateCutter": {
        const forced = state.pendingForcedAction;
        if (!forced || forced.kind !== "designateCutter") {
          console.log(`Bot ${botId} designateCutter ignored: no pending forced action`);
          return;
        }
        if (forced.designatorId !== botId) {
          console.log(`Bot ${botId} designateCutter rejected: bot is not designator`);
          return;
        }

        const targetIndex = state.players.findIndex(
          (p) => p.id === botAction.targetPlayerId,
        );
        if (targetIndex === -1) {
          console.log(`Bot ${botId} designateCutter rejected: target not found`);
          return;
        }

        const target = state.players[targetIndex];
        if (!target.hand.some((t) => !t.cut)) {
          console.log(`Bot ${botId} designateCutter rejected: target has no remaining tiles`);
          return;
        }

        const designatorIndex = state.players.findIndex((p) => p.id === forced.designatorId);
        state.campaign ??= {};
        state.campaign.mission18DesignatorIndex = designatorIndex;
        state.currentPlayerIndex = targetIndex;
        state.pendingForcedAction = undefined;

        pushGameLog(state, {
          turn: state.turnNumber,
          playerId: forced.designatorId,
          action: "designateCutter",
          detail: logTemplate("designate_cutter.selected", {
            targetPlayerId: botAction.targetPlayerId,
          }),
          timestamp: Date.now(),
        });

        this.saveState();
        this.broadcastGameState();
        this.scheduleBotTurnIfNeeded();
        return;
      }
      case "chooseNextPlayer": {
        const forced = state.pendingForcedAction;
        if (!forced || forced.kind !== "chooseNextPlayer") {
          console.log(`Bot ${botId} chooseNextPlayer ignored: no pending forced action`);
          return;
        }
        if (forced.captainId !== botId) {
          console.log(`Bot ${botId} chooseNextPlayer rejected: bot is not forced-action captain`);
          return;
        }

        const targetIndex = state.players.findIndex(
          (p) => p.id === botAction.targetPlayerId,
        );
        if (targetIndex === -1) {
          console.log(`Bot ${botId} chooseNextPlayer rejected: target not found`);
          return;
        }

        const target = state.players[targetIndex];
        if (!target.hand.some((t) => !t.cut)) {
          console.log(`Bot ${botId} chooseNextPlayer rejected: target has no remaining tiles`);
          return;
        }

        if (
          isRepeatNextPlayerSelectionDisallowed(
            state,
            forced.lastPlayerId,
            botAction.targetPlayerId,
          )
        ) {
          console.log(`Bot ${botId} chooseNextPlayer rejected: violates no-consecutive-turn rule`);
          return;
        }

        state.pendingForcedAction = undefined;
        state.currentPlayerIndex = targetIndex;
        this.saveState();
        this.broadcastGameState();
        this.scheduleBotTurnIfNeeded();
        return;
      }
      case "dualCut": {
        const error = validateDualCutWithHooks(
          state,
          botId,
          botAction.targetPlayerId,
          botAction.targetTileIndex,
          botAction.guessValue,
        );
        if (error) {
          console.log(`Bot ${botId} dualCut validation failed [${error.code}]: ${error.message}`);
          return;
        }
        action = executeDualCut(
          state,
          botId,
          botAction.targetPlayerId,
          botAction.targetTileIndex,
          botAction.guessValue,
        );
        break;
      }
      case "dualCutDoubleDetector": {
        const error = validateDualCutDoubleDetectorWithHooks(
          state,
          botId,
          botAction.targetPlayerId,
          botAction.tileIndex1,
          botAction.tileIndex2,
          botAction.guessValue,
        );
        if (error) {
          console.log(`Bot ${botId} dualCutDoubleDetector validation failed [${error.code}]: ${error.message}`);
          return;
        }
        action = executeDualCutDoubleDetector(
          state,
          botId,
          botAction.targetPlayerId,
          botAction.tileIndex1,
          botAction.tileIndex2,
          botAction.guessValue,
        );
        break;
      }
      case "soloCut": {
        const error = validateSoloCutWithHooks(state, botId, botAction.value);
        if (error) {
          console.log(`Bot ${botId} soloCut validation failed [${error.code}]: ${error.message}`);
          return;
        }
        action = executeSoloCut(state, botId, botAction.value);
        break;
      }
      case "revealReds": {
        const error = validateRevealRedsWithHooks(state, botId);
        if (error) {
          console.log(`Bot ${botId} revealReds validation failed [${error.code}]: ${error.message}`);
          return;
        }
        action = executeRevealReds(state, botId);
        break;
      }
      case "simultaneousRedCut": {
        const error = validateSimultaneousRedCutWithHooks(state, botId, botAction.targets);
        if (error) {
          console.log(`Bot ${botId} simultaneousRedCut validation failed [${error.code}]: ${error.message}`);
          return;
        }
        action = executeSimultaneousRedCut(state, botId, botAction.targets);
        break;
      }
      case "simultaneousFourCut": {
        const targetValue = getSimultaneousFourCutTargetValue(state);
        if (targetValue == null) {
          console.log(`Bot ${botId} simultaneousFourCut rejected: no target value in play`);
          return;
        }

        const targets = buildSimultaneousFourCutTargets(state);
        if (!targets) {
          let foundCount = 0;
          for (const player of state.players) {
            for (const tile of player.hand) {
              if (!tile.cut && tile.gameValue === targetValue) {
                foundCount++;
              }
            }
          }
          console.log(`Bot ${botId} simultaneousFourCut rejected: expected 4 targets for value ${targetValue}, found ${foundCount}`);
          return;
        }

        const error = validateSimultaneousFourCutWithHooks(state, botId, targets);
        if (error) {
          console.log(`Bot ${botId} simultaneousFourCut validation failed [${error.code}]: ${error.message}`);
          return;
        }

        action = executeSimultaneousFourCut(state, botId, targets);
        break;
      }
      case "useEquipment": {
        const equipmentId = botAction.equipmentId as AnyEquipmentId;
        const payload = botAction.payload as UseEquipmentPayload;
        const error = validateUseEquipment(state, botId, equipmentId, payload);
        if (error) {
          console.log(`Bot ${botId} useEquipment validation failed [${error.code}]: ${error.message}`);
          return;
        }

        action = executeUseEquipment(state, botId, equipmentId, payload);
        break;
      }
      default: {
        console.log(`Bot ${botId} unknown action type: ${(botAction as { action: string }).action}`);
        return;
      }
    }

    this.maybeRecordMissionFailure(previousResult, state);

    // Track this bot's last action turn for context windowing
    this.room.botLastActionTurn[botId] = state.turnNumber;

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  onRequest(request: Request): Response {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/debug")) {
      return Response.json({
        roomId: this.name,
        queriedAt: Date.now(),
        room: this.room,
      });
    }

    if (!url.pathname.endsWith("/telemetry/failure-counters")) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }

    const { loss_red_wire, loss_detonator, loss_timer } = this.room.failureCounters;
    return Response.json({
      roomId: this.name,
      scope: "room_lifetime",
      currentMission: this.room.mission,
      failureCounters: this.room.failureCounters,
      totalFailures: loss_red_wire + loss_detonator + loss_timer,
      queriedAt: Date.now(),
    });
  }

  // -- Broadcast helpers ------------------------------------------------

  sendMsg(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  broadcastLobby() {
    const lobbyState = createLobbyState(
      this.name,
      this.room.players,
      this.room.mission,
      this.room.hostId ?? "",
      this.room.captainMode,
      this.room.selectedCaptainId,
    );
    const msg: ServerMessage = { type: "lobby", state: lobbyState };
    const json = JSON.stringify(msg);
    for (const conn of this.getConnections()) {
      conn.send(json);
    }
  }

  broadcastGameState() {
    const state = this.room.gameState;
    if (!state) return;

    if (state.mission === 10) {
      console.log(
        "[broadcastGameState] mission=10",
        "phase=", state.phase,
        "pendingForcedAction=", JSON.stringify(state.pendingForcedAction),
        "currentPlayerIndex=", state.currentPlayerIndex,
        "turnNumber=", state.turnNumber,
      );
    }

    const playerIds = new Set(this.room.players.map((p) => p.id));
    let spectatorView: ReturnType<typeof filterStateForSpectator> | null = null;

    for (const conn of this.getConnections()) {
      if (playerIds.has(conn.id)) {
        const filtered = filterStateForPlayer(state, conn.id);
        this.sendMsg(conn, { type: "gameState", state: filtered });
      } else {
        // Spectator — compute once, reuse for all spectator connections
        if (!spectatorView) {
          spectatorView = filterStateForSpectator(state);
        }
        this.sendMsg(conn, { type: "gameState", state: spectatorView });
      }
    }
  }

  broadcastAction(action: import("@bomb-busters/shared").GameAction) {
    const msg: ServerMessage = { type: "action", action };
    const json = JSON.stringify(msg);
    for (const conn of this.getConnections()) {
      conn.send(json);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
