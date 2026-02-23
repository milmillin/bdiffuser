import type * as Party from "partykit/server";
import type {
  ClientMessage,
  ServerMessage,
  GameState,
  Player,
  MissionId,
  CharacterId,
} from "@bomb-busters/shared";
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

interface RoomState {
  gameState: GameState | null;
  players: Player[];
  mission: MissionId;
  hostId: string | null;
}

export default class BombBustersServer implements Party.Server {
  room: RoomState = {
    gameState: null,
    players: [],
    mission: 1,
    hostId: null,
  };

  constructor(readonly party: Party.Party) {}

  async onStart() {
    const stored = await this.party.storage.get<RoomState>("room");
    if (stored) {
      this.room = stored;
    }
  }

  async saveState() {
    await this.party.storage.put("room", this.room);
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state to connecting player
    if (this.room.gameState) {
      const player = this.room.players.find((p) => p.id === conn.id);
      if (player) {
        player.connected = true;
        const filtered = filterStateForPlayer(this.room.gameState, conn.id);
        this.send(conn, { type: "gameState", state: filtered });
      }
    } else {
      // In lobby
      this.broadcastLobby();
    }
  }

  onClose(conn: Party.Connection) {
    const player = this.room.players.find((p) => p.id === conn.id);
    if (player) {
      player.connected = false;
      if (this.room.gameState) {
        this.broadcastGameState();
      } else {
        this.broadcastLobby();
      }
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      this.send(sender, { type: "error", message: "Invalid message format" });
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg.name);
        break;
      case "selectCharacter":
        this.handleSelectCharacter(sender, msg.character);
        break;
      case "selectMission":
        this.handleSelectMission(sender, msg.mission);
        break;
      case "startGame":
        this.handleStartGame(sender);
        break;
      case "placeInfoToken":
        this.handlePlaceInfoToken(sender, msg.value, msg.tileIndex);
        break;
      case "dualCut":
        this.handleDualCut(sender, msg.targetPlayerId, msg.targetTileIndex, msg.guessValue);
        break;
      case "soloCut":
        this.handleSoloCut(sender, msg.value);
        break;
      case "revealReds":
        this.handleRevealReds(sender);
        break;
      default:
        this.send(sender, { type: "error", message: "Unknown message type" });
    }
  }

  handleJoin(conn: Party.Connection, name: string) {
    if (this.room.gameState) {
      // Reconnection during game
      const existing = this.room.players.find((p) => p.id === conn.id);
      if (existing) {
        existing.connected = true;
        existing.name = name;
        this.broadcastGameState();
      } else {
        this.send(conn, { type: "error", message: "Game already in progress" });
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
        this.send(conn, { type: "error", message: "Room is full (max 5 players)" });
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

  handleSelectCharacter(_conn: Party.Connection, _character: CharacterId) {
    // Characters are assigned randomly at game start; lobby selection is disabled.
    return;
  }

  handleSelectMission(conn: Party.Connection, mission: MissionId) {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.send(conn, { type: "error", message: "Only the host can change the mission" });
      return;
    }

    this.room.mission = mission;
    this.saveState();
    this.broadcastLobby();
  }

  handleStartGame(conn: Party.Connection) {
    if (this.room.gameState) return;
    if (conn.id !== this.room.hostId) {
      this.send(conn, { type: "error", message: "Only the host can start the game" });
      return;
    }

    if (this.room.players.length < 2) {
      this.send(conn, { type: "error", message: "Need at least 2 players" });
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
    const { board, players } = setupGame(this.room.players, this.room.mission);

    this.room.gameState = {
      phase: "setup_info_tokens",
      roomId: this.party.id,
      players,
      board,
      currentPlayerIndex: captainIndex,
      turnNumber: 0,
      mission: this.room.mission,
      result: null,
      log: [],
    };

    this.saveState();
    this.broadcastGameState();
  }

  handlePlaceInfoToken(conn: Party.Connection, value: number, tileIndex: number) {
    const state = this.room.gameState;
    if (!state || state.phase !== "setup_info_tokens") return;

    const player = state.players.find((p) => p.id === conn.id);
    if (!player) return;

    // Each player places one info token during setup
    if (player.infoTokens.length > 0) {
      this.send(conn, { type: "error", message: "You already placed an info token" });
      return;
    }

    player.infoTokens.push({
      value,
      position: tileIndex,
      isYellow: false,
    });

    // Check if all players have placed tokens
    const allPlaced = state.players.every((p) => p.infoTokens.length > 0);
    if (allPlaced) {
      state.phase = "playing";
      state.currentPlayerIndex = state.players.findIndex((p) => p.isCaptain);
      state.turnNumber = 1;
    }

    this.saveState();
    this.broadcastGameState();
  }

  handleDualCut(
    conn: Party.Connection,
    targetPlayerId: string,
    targetTileIndex: number,
    guessValue: number | "YELLOW",
  ) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateDualCut(state, conn.id, targetPlayerId, targetTileIndex, guessValue);
    if (error) {
      this.send(conn, { type: "error", message: error });
      return;
    }

    const action = executeDualCut(state, conn.id, targetPlayerId, targetTileIndex, guessValue);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
  }

  handleSoloCut(conn: Party.Connection, value: number | "YELLOW") {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateSoloCut(state, conn.id, value);
    if (error) {
      this.send(conn, { type: "error", message: error });
      return;
    }

    const action = executeSoloCut(state, conn.id, value);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
  }

  handleRevealReds(conn: Party.Connection) {
    const state = this.room.gameState;
    if (!state || state.phase !== "playing") return;

    const error = validateRevealReds(state, conn.id);
    if (error) {
      this.send(conn, { type: "error", message: error });
      return;
    }

    const action = executeRevealReds(state, conn.id);

    this.saveState();
    this.broadcastAction(action);
    this.broadcastGameState();
  }

  // ── Broadcast helpers ──────────────────────────────────────

  send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  broadcastLobby() {
    const lobbyState = createLobbyState(
      this.party.id,
      this.room.players,
      this.room.mission,
      this.room.hostId ?? "",
    );
    const msg: ServerMessage = { type: "lobby", state: lobbyState };
    const json = JSON.stringify(msg);
    for (const conn of this.party.getConnections()) {
      conn.send(json);
    }
  }

  broadcastGameState() {
    const state = this.room.gameState;
    if (!state) return;

    for (const conn of this.party.getConnections()) {
      const filtered = filterStateForPlayer(state, conn.id);
      this.send(conn, { type: "gameState", state: filtered });
    }
  }

  broadcastAction(action: import("@bomb-busters/shared").GameAction) {
    const msg: ServerMessage = { type: "action", action };
    const json = JSON.stringify(msg);
    for (const conn of this.party.getConnections()) {
      conn.send(json);
    }
  }
}

BombBustersServer satisfies Party.Worker;
