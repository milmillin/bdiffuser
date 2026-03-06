import WebSocket from "ws";
import type {
  ClientMessage,
  ServerMessage,
  ClientGameState,
  LobbyState,
  GameAction,
} from "@bomb-busters/shared";
import { formatGameState, formatLobbyState } from "./formatter.js";

export class GameConnection {
  private ws: WebSocket | null = null;
  private lobbyState: LobbyState | null = null;
  private gameState: ClientGameState | null = null;
  private lastAction: GameAction | null = null;
  private lastError: string | null = null;
  private stateListeners: Array<() => void> = [];
  private playerId: string | null = null;

  constructor(
    private roomId: string,
    private host: string,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the PartyKit WebSocket URL
      const protocol = this.host.startsWith("localhost") || this.host.startsWith("127.") ? "ws" : "wss";
      const url = `${protocol}://${this.host}/parties/bomb-busters-server/${this.roomId}`;

      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        resolve();
      });

      this.ws.on("error", (err) => {
        reject(new Error(`WebSocket connection failed: ${err.message}`));
      });

      this.ws.on("close", () => {
        this.ws = null;
      });

      this.ws.on("message", (data) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        switch (msg.type) {
          case "lobby":
            this.lobbyState = msg.state;
            this.gameState = null;
            this.notifyListeners();
            break;
          case "gameState":
            this.gameState = msg.state;
            this.playerId = msg.state.playerId;
            this.lobbyState = null;
            this.notifyListeners();
            break;
          case "action":
            this.lastAction = msg.action;
            break;
          case "error":
            this.lastError = msg.message;
            this.notifyListeners();
            break;
        }
      });
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.lastError = null;
    this.ws.send(JSON.stringify(msg));
  }

  getLobbyState() {
    return this.lobbyState;
  }

  getGameState() {
    return this.gameState;
  }

  getPlayerId() {
    return this.playerId;
  }

  /** Wait for the next state update or return current state. */
  waitForState(timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
      // If we already have an error from the last send, return it immediately
      // But also wait briefly for a state update in case one comes
      const timer = setTimeout(() => {
        cleanup();
        if (this.lastError) {
          const err = this.lastError;
          this.lastError = null;
          resolve(`Error: ${err}`);
        } else if (this.gameState) {
          resolve(formatGameState(this.gameState));
        } else if (this.lobbyState) {
          resolve(formatLobbyState(this.lobbyState));
        } else {
          resolve("No state received yet.");
        }
      }, timeoutMs);

      const listener = () => {
        cleanup();
        if (this.lastError) {
          const err = this.lastError;
          this.lastError = null;
          resolve(`Error: ${err}`);
        } else if (this.gameState) {
          resolve(formatGameState(this.gameState));
        } else if (this.lobbyState) {
          resolve(formatLobbyState(this.lobbyState));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        const idx = this.stateListeners.indexOf(listener);
        if (idx >= 0) this.stateListeners.splice(idx, 1);
      };

      this.stateListeners.push(listener);
    });
  }

  private notifyListeners() {
    const listeners = [...this.stateListeners];
    this.stateListeners = [];
    for (const listener of listeners) {
      listener();
    }
  }
}
