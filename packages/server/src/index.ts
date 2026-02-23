import { Server, type Connection, routePartykitRequest } from "partyserver";
import type {
  BaseEquipmentId,
  ClientMessage,
  ServerMessage,
  Player,
  MissionId,
  CharacterId,
  ChatMessage,
  UseEquipmentPayload,
  GameState,
  GameResult,
} from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";
import { validateMissionPlayerCount } from "./startValidation.js";
import { setupGame } from "./setup.js";
import { filterStateForPlayer, filterStateForSpectator, createLobbyState } from "./viewFilter.js";
import {
  validateDualCutWithHooks,
  validateDualCutDoubleDetectorWithHooks,
  validateSoloCutWithHooks,
  validateRevealRedsWithHooks,
} from "./validation.js";
import {
  executeDualCut,
  executeDualCutDoubleDetector,
  executeSoloCut,
  executeRevealReds,
} from "./gameLogic.js";
import { executeUseEquipment, validateUseEquipment } from "./equipment.js";
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
  validateSetupInfoTokenPlacement,
} from "./setupTokenRules.js";

interface Env {
  [key: string]: unknown;
  BombBustersServer: DurableObjectNamespace;
  ZHIPU_API_KEY: string;
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
    } catch (e) {
      console.error("Failed to save room state to storage:", e);
    }
  }

  private maybeRecordMissionFailure(previousResult: GameResult | null, state: GameState): void {
    if (isFailureReason(previousResult)) return;
    if (!isFailureReason(state.result)) return;
    incrementFailureCounter(this.room.failureCounters, state.result);
  }

  onConnect(connection: Connection) {
    // Send current state to connecting player
    if (this.room.gameState) {
      const player = this.room.players.find((p) => p.id === connection.id);
      if (player) {
        player.connected = true;
        const filtered = filterStateForPlayer(this.room.gameState, connection.id);
        this.sendMsg(connection, { type: "gameState", state: filtered });
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
        this.handleSelectCharacter(connection, msg.character);
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
      case "useEquipment":
        this.handleUseEquipment(connection, msg.equipmentId, msg.payload);
        break;
      case "chooseNextPlayer":
        this.handleChooseNextPlayer(connection, msg.targetPlayerId);
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

  handleJoin(conn: Connection, name: string) {
    if (this.room.gameState) {
      // Reconnection during game
      const existing = this.room.players.find((p) => p.id === conn.id);
      if (existing) {
        existing.connected = true;
        existing.name = name;
        this.broadcastGameState();
      } else {
        // Late joiner becomes a spectator — send omniscient view
        const spectatorView = filterStateForSpectator(this.room.gameState);
        this.sendMsg(conn, { type: "gameState", state: spectatorView });
      }
      return;
    }

    // Check if player already exists (reconnection in lobby)
    let player = this.room.players.find((p) => p.id === conn.id);
    if (player) {
      player.name = name;
      player.connected = true;
    } else {
      if (this.room.players.length >= 5) {
        this.sendMsg(conn, { type: "error", message: "Room is full (max 5 players)" });
        return;
      }

      player = {
        id: conn.id,
        name,
        character: null,
        isCaptain: false,
        hand: [],
        infoTokens: [],
        characterUsed: false,
        connected: true,
        isBot: false,
      };
      this.room.players.push(player);

      // First player is host
      if (!this.room.hostId) {
        this.room.hostId = conn.id;
      }
    }

    this.saveState();
    this.broadcastLobby();
  }

  handleSelectCharacter(_conn: Connection, _character: CharacterId) {
    // Characters are assigned randomly at game start; lobby selection is disabled.
    return;
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
    try {
      ({ board, players } = setupGame(this.room.players, this.room.mission));
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
    };

    // Dispatch mission setup hooks (timer config, hidden reds, etc.)
    dispatchHooks(this.room.mission, {
      point: "setup",
      state: this.room.gameState,
    });

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

    const placementError = validateSetupInfoTokenPlacement(player, value, tileIndex);
    if (placementError) {
      this.sendMsg(conn, {
        type: "error",
        message: placementError.message,
        code: placementError.code,
      });
      return;
    }

    player.infoTokens.push({
      value,
      position: tileIndex,
      isYellow: false,
    });

    state.log.push({
      turn: 0,
      playerId: conn.id,
      action: "placeInfoToken",
      detail: `placed info token ${value} on wire ${wireLabel(tileIndex)}`,
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

  handleUseEquipment(
    conn: Connection,
    equipmentId: BaseEquipmentId,
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

  // -- Chat handlers -----------------------------------------------------

  handleChat(conn: Connection, text: string) {
    const state = this.room.gameState;
    if (!state) return;

    const player = state.players.find((p) => p.id === conn.id);
    if (!player) return;

    const sanitized = text.trim().slice(0, 500);
    if (!sanitized) return;

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
      if (hasCompletedSetupInfoTokens(state, player)) continue;

      botPlaceInfoToken(state, player.id);
      const token = player.infoTokens[player.infoTokens.length - 1];
      if (token) {
        state.log.push({
          turn: 0,
          playerId: player.id,
          action: "placeInfoToken",
          detail: `placed info token ${token.value} on wire ${wireLabel(token.position)}`,
          timestamp: Date.now(),
        });
      }
    }
    this.advanceSetupTurnAndMaybeStart(state);
  }

  /** Schedule the next alarm: picks the earliest of bot turn and timer deadline. */
  scheduleNextAlarm() {
    const state = this.room.gameState;
    if (!state || (state.phase !== "playing" && state.phase !== "setup_info_tokens")) return;

    let nextAlarmMs: number | null = null;

    // Bot turn alarm: 1.5s if it's a bot's turn (playing phase only)
    if (state.phase === "playing") {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer?.isBot) {
        nextAlarmMs = Date.now() + 1500;
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
    if (!state || (state.phase !== "playing" && state.phase !== "setup_info_tokens")) return;

    try {
      // Check timer expiry first (takes priority over bot turns)
      if (state.timerDeadline != null && Date.now() >= state.timerDeadline) {
        const previousResult = state.result;
        state.result = "loss_timer";
        state.phase = "finished";
        emitMissionFailureTelemetry(state, "loss_timer", "system");
        this.maybeRecordMissionFailure(previousResult, state);
        state.log.push({
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
