import { Server, type Connection, routePartykitRequest } from "partyserver";
import type {
  ClientMessage,
  ServerMessage,
  GameState,
  Player,
  MissionId,
  CharacterId,
  ChatMessage,
} from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";
import { setupGame } from "./setup.js";
import { filterStateForPlayer, createLobbyState } from "./viewFilter.js";
import {
  validateDualCut,
  validateSoloCut,
  validateRevealReds,
} from "./validation.js";
import {
  executeDualCut,
  executeSoloCut,
  executeRevealReds,
} from "./gameLogic.js";
import {
  createBotPlayer,
  botPlaceInfoToken,
  getBotAction,
} from "./botController.js";

interface Env {
  [key: string]: unknown;
  BombBustersServer: DurableObjectNamespace;
  ZHIPU_API_KEY: string;
}

interface RoomState {
  gameState: GameState | null;
  players: Player[];
  mission: MissionId;
  hostId: string | null;
  botCount: number;
  botLastActionTurn: Record<string, number>;
}

export class BombBustersServer extends Server<Env> {
  room: RoomState = {
    gameState: null,
    players: [],
    mission: 1,
    hostId: null,
    botCount: 0,
    botLastActionTurn: {},
  };

  async onStart() {
    const stored = await this.ctx.storage.get<RoomState>("room");
    if (stored) {
      this.room = stored;
    }
  }

  async saveState() {
    await this.ctx.storage.put("room", this.room);
  }

  onConnect(connection: Connection) {
    // Send current state to connecting player
    if (this.room.gameState) {
      const player = this.room.players.find((p) => p.id === connection.id);
      if (player) {
        player.connected = true;
        const filtered = filterStateForPlayer(this.room.gameState, connection.id);
        this.sendMsg(connection, { type: "gameState", state: filtered });
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
    } catch {
      this.sendMsg(connection, { type: "error", message: "Invalid message format" });
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
        this.handleDualCut(connection, msg.targetPlayerId, msg.targetTileIndex, msg.guessValue);
        break;
      case "soloCut":
        this.handleSoloCut(connection, msg.value);
        break;
      case "revealReds":
        this.handleRevealReds(connection);
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
        this.sendMsg(conn, { type: "error", message: "Game already in progress" });
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

    // Auto-place info tokens for bots
    this.handleBotInfoTokens();

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
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

    // Each player places one info token during setup
    if (player.infoTokens.length > 0) {
      this.sendMsg(conn, { type: "error", message: "You already placed an info token" });
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

    // Advance to next player for setup
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

    // Check if all players have placed tokens
    const allPlaced = state.players.every((p) => p.infoTokens.length > 0);
    if (allPlaced) {
      state.phase = "playing";
      state.currentPlayerIndex = state.players.findIndex((p) => p.isCaptain);
      state.turnNumber = 1;
    }

    this.saveState();
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleDualCut(
    conn: Connection,
    targetPlayerId: string,
    targetTileIndex: number,
    guessValue: number | "YELLOW",
  ) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateDualCut(state, conn.id, targetPlayerId, targetTileIndex, guessValue);
    if (error) {
      this.sendMsg(conn, { type: "error", message: error });
      return;
    }

    const action = executeDualCut(state, conn.id, targetPlayerId, targetTileIndex, guessValue);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleSoloCut(conn: Connection, value: number | "YELLOW") {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateSoloCut(state, conn.id, value);
    if (error) {
      this.sendMsg(conn, { type: "error", message: error });
      return;
    }

    const action = executeSoloCut(state, conn.id, value);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
  }

  handleRevealReds(conn: Connection) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateRevealReds(state, conn.id);
    if (error) {
      this.sendMsg(conn, { type: "error", message: error });
      return;
    }

    const action = executeRevealReds(state, conn.id);

    this.saveState();
    this.broadcastAction(action);
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
      if (player.isBot) {
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
    }

    // Check if all players have placed tokens (bots + humans who already placed)
    const allPlaced = state.players.every((p) => p.infoTokens.length > 0);
    if (allPlaced) {
      state.phase = "playing";
      state.currentPlayerIndex = state.players.findIndex((p) => p.isCaptain);
      state.turnNumber = 1;
    }
  }

  /** Schedule an alarm if it's a bot's turn */
  scheduleBotTurnIfNeeded() {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer?.isBot) {
      this.ctx.storage.setAlarm(Date.now() + 1500);
    }
  }

  async onAlarm() {
    await this.executeBotTurn();
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
    let action: import("@bomb-busters/shared").GameAction;
    switch (botAction.action) {
      case "dualCut": {
        const error = validateDualCut(
          state,
          botId,
          botAction.targetPlayerId,
          botAction.targetTileIndex,
          botAction.guessValue,
        );
        if (error) {
          console.log(`Bot ${botId} dualCut validation failed: ${error}`);
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
        const error = validateSoloCut(state, botId, botAction.value);
        if (error) {
          console.log(`Bot ${botId} soloCut validation failed: ${error}`);
          return;
        }
        action = executeSoloCut(state, botId, botAction.value);
        break;
      }
      case "revealReds": {
        const error = validateRevealReds(state, botId);
        if (error) {
          console.log(`Bot ${botId} revealReds validation failed: ${error}`);
          return;
        }
        action = executeRevealReds(state, botId);
        break;
      }
    }

    // Track this bot's last action turn for context windowing
    this.room.botLastActionTurn[botId] = state.turnNumber;

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
    this.scheduleBotTurnIfNeeded();
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

    for (const conn of this.getConnections()) {
      const filtered = filterStateForPlayer(state, conn.id);
      this.sendMsg(conn, { type: "gameState", state: filtered });
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
