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
import { MISSION_SCHEMAS, logTemplate, wireLabel } from "@bomb-busters/shared";
import { validateMissionPlayerCount } from "./startValidation.js";
import { setupGame } from "./setup.js";
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
  resolveDetectorTileChoice,
} from "./gameLogic.js";
import {
  executeUseEquipment,
  validateUseEquipment,
  validateCharacterAbility,
  executeCharacterAbility,
  resolveTalkiesWalkiesTileChoice,
} from "./equipment.js";
import { dispatchHooks, emitMissionFailureTelemetry } from "./missionHooks.js";
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

/** Delay before purging storage for finished rooms (1 hour). */
const FINISHED_ROOM_CLEANUP_DELAY_MS = 60 * 60 * 1000;

type MissionAudioControlCommand = Extract<
  ClientMessage,
  { type: "missionAudioControl" }
>["command"];

interface Env {
  [key: string]: unknown;
  BombBustersServer: DurableObjectNamespace;
  ZHIPU_API_KEY: string;
}

function describeInfoTokenLocation(position: number): string {
  return position < 0 ? "beside stand" : `wire ${wireLabel(position)}`;
}

export class BombBustersServer extends Server<Env> {
  room: RoomStateSnapshot = {
    gameState: null,
    players: [],
    mission: 1,
    hostId: null,
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
  }

  async saveState() {
    try {
      await this.ctx.storage.put("room", this.room);
      // Schedule storage cleanup when a game finishes for the first time
      if (this.room.gameState?.phase === "finished" && !this.room.finishedAt) {
        this.scheduleFinishedCleanup();
      }
    } catch (e) {
      console.error("Failed to save room state to storage:", e);
    }
  }

  /** Record finish timestamp and schedule a cleanup alarm to purge storage. */
  private scheduleFinishedCleanup() {
    this.room.finishedAt = Date.now();
    // setAlarm replaces any pending alarm (bot-turn / timer), so no separate deleteAlarm needed.
    this.ctx.storage.setAlarm(Date.now() + FINISHED_ROOM_CLEANUP_DELAY_MS).catch((e) => {
      console.error("Failed to schedule finished-room cleanup alarm:", e);
    });
    // Persist the finishedAt timestamp (fire-and-forget; saveState() already wrote the room once).
    this.ctx.storage.put("room", this.room).catch((e) => {
      console.error("Failed to persist finishedAt:", e);
    });
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
        this.handleDualCut(connection, msg.targetPlayerId, msg.targetTileIndex, msg.guessValue, msg.actorTileIndex);
        break;
      case "dualCutDoubleDetector":
        this.handleDualCutDoubleDetector(connection, msg.targetPlayerId, msg.tileIndex1, msg.tileIndex2, msg.guessValue, msg.actorTileIndex);
        break;
      case "soloCut":
        this.handleSoloCut(connection, msg.value);
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
      case "addBot":
        this.handleAddBot(connection);
        break;
      case "removeBot":
        this.handleRemoveBot(connection, msg.botId);
        break;
      case "chat":
        this.handleChat(connection, msg.text);
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

    // Randomly assign characters to players
    const allCharacters: CharacterId[] = [
      "double_detector",
      "character_2",
      "character_3",
      "character_4",
      "character_5",
    ];
    // Fisher-Yates shuffle
    for (let i = allCharacters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCharacters[i], allCharacters[j]] = [allCharacters[j], allCharacters[i]];
    }
    for (let i = 0; i < this.room.players.length; i++) {
      this.room.players[i].character = allCharacters[i];
    }

    // Assign captain (first player / host)
    const captainIndex = 0;
    for (let i = 0; i < this.room.players.length; i++) {
      this.room.players[i].isCaptain = i === captainIndex;
    }

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
      pushGameLog(this.room.gameState, {
        turn: 0,
        playerId: placement.playerId,
        action: "placeInfoToken",
        detail: `placed random info token ${describeInfoToken(placement.token)} on ${describeInfoTokenLocation(placement.token.position)}`,
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
    if (!state || state.phase !== "setup_info_tokens") return;

    // Enforce turn order during setup
    if (state.players[state.currentPlayerIndex].id !== conn.id) {
      this.sendMsg(conn, { type: "error", message: "It's not your turn to place an info token" });
      return;
    }

    const player = state.players.find((p) => p.id === conn.id);
    if (!player) return;

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
    const token = applyMissionInfoTokenVariant(state, {
      value,
      position: tileIndex,
      isYellow: isYellowToken,
    }, player);
    player.infoTokens.push(token);

    pushGameLog(state, {
      turn: 0,
      playerId: conn.id,
      action: "placeInfoToken",
      detail: `placed info token ${describeInfoToken(token)} on ${describeInfoTokenLocation(tileIndex)}`,
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
  ) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateDualCutWithHooks(
      state,
      conn.id,
      targetPlayerId,
      targetTileIndex,
      guessValue,
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
    const action = executeDualCut(state, conn.id, targetPlayerId, targetTileIndex, guessValue, actorTileIndex);
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
  ) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateDualCutDoubleDetectorWithHooks(
      state,
      conn.id,
      targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
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
    );
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleSoloCut(conn: Connection, value: number | "YELLOW") {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateSoloCutWithHooks(state, conn.id, value);
    if (error) {
      this.sendMsg(conn, {
        type: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }

    const previousResult = state.result;
    const action = executeSoloCut(state, conn.id, value);
    this.maybeRecordMissionFailure(previousResult, state);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleRevealReds(conn: Connection) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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

    this.executeMission22TokenPass(state, forced, value);
  }

  private executeMission22TokenPass(
    state: GameState,
    forced: Extract<import("@bomb-busters/shared").ForcedAction, { kind: "mission22TokenPass" }>,
    value: number,
  ) {
    const chooserIndex = forced.currentChooserIndex;
    const playerCount = state.players.length;

    // Recipient is the player to the chooser's left (clockwise)
    const recipientIndex = (chooserIndex + 1) % playerCount;
    const recipient = state.players[recipientIndex];

    // Build the token: auto-place on matching uncut wire, or position -1
    const isYellow = value === 0;
    let position = -1;
    if (isYellow) {
      const yellowIdx = recipient.hand.findIndex((t) => !t.cut && t.color === "yellow");
      if (yellowIdx !== -1) position = yellowIdx;
    } else {
      const wireIdx = recipient.hand.findIndex(
        (t) => !t.cut && typeof t.gameValue === "number" && t.gameValue === value,
      );
      if (wireIdx !== -1) position = wireIdx;
    }

    const token = applyMissionInfoTokenVariant(state, {
      value,
      position,
      isYellow,
    }, recipient);
    recipient.infoTokens.push(token);

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: forced.currentChooserId,
      action: "hookEffect",
      detail: `m22:token_pass:value=${value}|to=${recipient.id}|position=${wireLabel(position)}`,
      timestamp: Date.now(),
    });

    // Advance to next chooser or clear forced action
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

  handleDetectorTileChoice(conn: Connection, tileIndex?: number, infoTokenTileIndex?: number) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

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
    if (!state || state.phase !== "playing") return;

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
    if ((state.mission === 20 || state.mission === 35) && tile.isXMarked) {
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
            detail: `placed info token ${describeInfoToken(token)} on ${describeInfoTokenLocation(token.position)}`,
            timestamp: Date.now(),
          });
        }
      }
    }
    this.advanceSetupTurnAndMaybeStart(state);
  }

  /** Schedule the next alarm: picks the earliest of bot turn and timer deadline. */
  scheduleNextAlarm() {
    const state = this.room.gameState;
    if (!state || state.phase === "finished" || (state.phase !== "playing" && state.phase !== "setup_info_tokens")) return;

    let nextAlarmMs: number | null = null;

    // Bot turn alarm: 1.5s if it's a bot's turn (playing phase only)
    if (state.phase === "playing") {
      const forced = state.pendingForcedAction;

      // For choose/designate forced actions, currentPlayer remains the decider.
      if (
        !forced
        || forced.kind === "chooseNextPlayer"
        || forced.kind === "designateCutter"
      ) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer?.isBot) {
          nextAlarmMs = Date.now() + 1500;
        }
      }

      // Mission 22 token pass: schedule alarm if current chooser is a bot
      if (forced?.kind === "mission22TokenPass") {
        const chooser = state.players.find((p) => p.id === forced.currentChooserId);
        if (chooser?.isBot) {
          const botMs = Date.now() + 1500;
          if (nextAlarmMs === null || botMs < nextAlarmMs) {
            nextAlarmMs = botMs;
          }
        }
      } else if (forced?.kind === "detectorTileChoice") {
        const chooser = state.players.find((p) => p.id === forced.targetPlayerId);
        if (chooser?.isBot) {
          const botMs = Date.now() + 1500;
          if (nextAlarmMs === null || botMs < nextAlarmMs) {
            nextAlarmMs = botMs;
          }
        }
      } else if (forced?.kind === "talkiesWalkiesTileChoice") {
        const chooser = state.players.find((p) => p.id === forced.targetPlayerId);
        if (chooser?.isBot) {
          const botMs = Date.now() + 1500;
          if (nextAlarmMs === null || botMs < nextAlarmMs) {
            nextAlarmMs = botMs;
          }
        }
      }
    }

    // Timer deadline alarm (mission 10) — active from setup through playing
    if (state.timerDeadline != null) {
      const timerMs = state.timerDeadline;
      if (nextAlarmMs === null || timerMs < nextAlarmMs) {
        nextAlarmMs = timerMs;
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
    const state = this.room.gameState;

    // Finished-room cleanup: purge storage so the DO can be evicted.
    if (!state || state.phase === "finished") {
      if (this.room.finishedAt) {
        await this.ctx.storage.deleteAll();
        this.room = {
          gameState: null,
          players: [],
          mission: 1,
          hostId: null,
          botCount: 0,
          botLastActionTurn: {},
          failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
        };
      }
      return;
    }

    if (state.phase !== "playing" && state.phase !== "setup_info_tokens") return;

    try {
      // Check timer expiry first (takes priority over bot turns)
      if (state.timerDeadline != null && Date.now() >= state.timerDeadline) {
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
          const tile1 = targetPlayer.hand[tile1Idx];
          const tile2 = targetPlayer.hand[tile2Idx];
          infoTokenTileIndex = (tile1 && tile1.color !== "red") ? tile1Idx : tile2Idx;
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
          (tile) => !tile.cut && !((state.mission === 20 || state.mission === 35) && tile.isXMarked),
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
        // Bot picks a random numeric value 1-12
        const value = Math.floor(Math.random() * 12) + 1;
        this.executeMission22TokenPass(state, m22Forced, value);
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
