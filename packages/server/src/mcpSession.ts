import { DurableObject } from "cloudflare:workers";
import type {
  ClientMessage,
  ServerMessage,
  ClientGameState,
  LobbyState,
} from "@bomb-busters/shared";

interface McpJsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpJsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const MCP_TOOLS = [
  {
    name: "connect_to_game",
    description:
      "Connect to a Bomb Busters game room and take over a player's slot. The player must already exist in the room. Returns the current lobby/game state.",
    inputSchema: {
      type: "object" as const,
      properties: {
        roomId: { type: "string", description: "The room ID to connect to" },
        username: { type: "string", description: "The player name to take over (must match an existing player in the room)" },
        password: { type: "string", description: "The 4-digit MCP password shown in the lobby" },
      },
      required: ["roomId", "username", "password"],
    },
  },
  {
    name: "get_game_state",
    description:
      "Get the current game state. Shows all visible information: your tiles, other players' cut tiles, board state, equipment, info tokens, turn info, and game log.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "send_action",
    description: `Send a game action. The action must be a valid ClientMessage JSON object.

Common actions:
- Lobby: {"type":"selectCharacter","characterId":"double_detector"}, {"type":"startGame"}
- Setup: {"type":"placeInfoToken","value":5,"tileIndex":2}
- Gameplay: {"type":"dualCut","targetPlayerId":"abc","targetTileIndex":0,"guessValue":5}
- Gameplay: {"type":"soloCut","value":3}
- Gameplay: {"type":"revealReds"}
- Equipment: {"type":"useEquipment","equipmentId":"talkies_walkies","payload":{"kind":"talkies_walkies","teammateId":"abc","myTileIndex":1}}
- Turn: {"type":"chooseNextPlayer","targetPlayerId":"abc"}
- Chat: {"type":"chat","text":"I think we should cut the 5"}

After sending, returns the updated game state.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "object",
          description: "The ClientMessage JSON object to send",
          additionalProperties: true,
        },
      },
      required: ["action"],
    },
  },
  {
    name: "disconnect_from_game",
    description: "Disconnect from the game room.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

export class McpSession extends DurableObject {
  private ws: WebSocket | null = null;
  private lobbyState: LobbyState | null = null;
  private gameState: ClientGameState | null = null;
  private lastError: string | null = null;
  private stateWaiters: Array<() => void> = [];
  private serverHost: string = "";
  private roomId: string = "";
  private playerId: string = "";

  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = (await request.json()) as McpJsonRpcRequest | McpJsonRpcRequest[];

    // Store the host from the request for WebSocket connection
    const url = new URL(request.url);
    if (!this.serverHost) {
      this.serverHost = url.host;
    }

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(body.map((req) => this.handleRequest(req)));
      // Filter out notifications (no id) that return null
      const responses = results.filter((r): r is McpJsonRpcResponse => r !== null);
      if (responses.length === 0) {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      return jsonResponse(responses);
    }

    const result = await this.handleRequest(body);
    if (result === null) {
      // Notification - no response expected
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    return jsonResponse(result);
  }

  private async handleRequest(req: McpJsonRpcRequest): Promise<McpJsonRpcResponse | null> {
    // Notifications (no id) don't get responses
    if (req.id === undefined) return null;

    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: req.id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "bomb-busters", version: "1.0.0" },
          },
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: req.id,
          result: { tools: MCP_TOOLS },
        };

      case "tools/call":
        return this.handleToolCall(req);

      default:
        return {
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
  }

  private async handleToolCall(req: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    const params = req.params as { name: string; arguments?: Record<string, unknown> } | undefined;
    if (!params?.name) {
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32602, message: "Missing tool name" },
      };
    }

    const args = params.arguments ?? {};
    let text: string;

    try {
      switch (params.name) {
        case "connect_to_game":
          text = await this.toolConnect(args.roomId as string, args.username as string, args.password as string);
          break;
        case "get_game_state":
          text = this.toolGetState();
          break;
        case "send_action":
          text = await this.toolSendAction(args.action as Record<string, unknown>);
          break;
        case "disconnect_from_game":
          text = this.toolDisconnect();
          break;
        default:
          return {
            jsonrpc: "2.0",
            id: req.id,
            error: { code: -32602, message: `Unknown tool: ${params.name}` },
          };
      }
    } catch (err) {
      text = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    return {
      jsonrpc: "2.0",
      id: req.id,
      result: {
        content: [{ type: "text", text }],
      },
    };
  }

  // ── Tool implementations ──────────────────────────────────

  private async toolConnect(roomId: string, username: string, password: string): Promise<string> {
    if (!roomId || !username) throw new Error("roomId and username are required");
    if (!password) throw new Error("password is required");

    // Disconnect existing connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.roomId = roomId;
    this.playerId = crypto.randomUUID().slice(0, 8);
    this.lobbyState = null;
    this.gameState = null;

    const protocol = this.serverHost.startsWith("localhost") || this.serverHost.startsWith("127.") ? "ws" : "wss";
    const url = `${protocol}://${this.serverHost}/parties/bomb-busters-server/${roomId}?_pk=${this.playerId}`;

    await this.connectWebSocket(url);
    // Use mcpTakeover to take over the existing player's slot with password auth
    this.sendGameMessage({ type: "mcpTakeover", name: username, password });

    return await this.waitForState(5000);
  }

  private toolGetState(): string {
    if (this.gameState) return formatGameState(this.gameState);
    if (this.lobbyState) return formatLobbyState(this.lobbyState);
    return "Not connected to any game. Use connect_to_game first.";
  }

  private async toolSendAction(action: Record<string, unknown>): Promise<string> {
    if (!this.ws) throw new Error("Not connected. Use connect_to_game first.");
    this.lastError = null;
    this.sendGameMessage(action as unknown as ClientMessage);
    return await this.waitForState(3000);
  }

  private toolDisconnect(): string {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.lobbyState = null;
    this.gameState = null;
    return "Disconnected from game.";
  }

  // ── WebSocket management ──────────────────────────────────

  private connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.addEventListener("open", () => {
        this.ws = ws;
        resolve();
      });

      ws.addEventListener("error", (event) => {
        reject(new Error(`WebSocket connection failed: ${event}`));
      });

      ws.addEventListener("close", () => {
        this.ws = null;
      });

      ws.addEventListener("message", (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(typeof event.data === "string" ? event.data : "");
        } catch {
          return;
        }

        switch (msg.type) {
          case "lobby":
            this.lobbyState = msg.state;
            this.gameState = null;
            this.notifyWaiters();
            break;
          case "gameState":
            this.gameState = msg.state;
            this.lobbyState = null;
            this.notifyWaiters();
            break;
          case "error":
            this.lastError = msg.message;
            this.notifyWaiters();
            break;
        }
      });
    });
  }

  private sendGameMessage(msg: ClientMessage) {
    if (!this.ws) throw new Error("WebSocket is not connected");
    this.ws.send(JSON.stringify(msg));
  }

  private waitForState(timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(this.resolveCurrentState());
      }, timeoutMs);

      const listener = () => {
        cleanup();
        resolve(this.resolveCurrentState());
      };

      const cleanup = () => {
        clearTimeout(timer);
        const idx = this.stateWaiters.indexOf(listener);
        if (idx >= 0) this.stateWaiters.splice(idx, 1);
      };

      this.stateWaiters.push(listener);
    });
  }

  private resolveCurrentState(): string {
    if (this.lastError) {
      const err = this.lastError;
      this.lastError = null;
      return `Error: ${err}`;
    }
    if (this.gameState) return formatGameState(this.gameState);
    if (this.lobbyState) return formatLobbyState(this.lobbyState);
    return "No state received yet.";
  }

  private notifyWaiters() {
    const waiters = [...this.stateWaiters];
    this.stateWaiters = [];
    for (const w of waiters) w();
  }
}

// ── Formatting (inline to avoid cross-package deps in CF Worker) ──

function formatLobbyState(state: LobbyState): string {
  const lines: string[] = [];
  lines.push(`=== LOBBY (Room: ${state.roomId}) ===`);
  lines.push(`Mission: ${state.mission}`);
  lines.push(`Captain Mode: ${state.captainMode}`);
  if (state.selectedCaptainId) {
    const captain = state.players.find((p) => p.id === state.selectedCaptainId);
    lines.push(`Selected Captain: ${captain?.name ?? state.selectedCaptainId}`);
  }
  lines.push("");
  lines.push("Players:");
  for (const p of state.players) {
    const tags: string[] = [];
    if (p.isHost) tags.push("HOST");
    if (p.isBot) tags.push("BOT");
    if (!p.connected) tags.push("DISCONNECTED");
    if (p.character) tags.push(`character: ${p.character}`);
    const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
    lines.push(`  - ${p.name} (${p.id})${tagStr}`);
  }
  return lines.join("\n");
}

function formatGameState(state: ClientGameState): string {
  const lines: string[] = [];
  lines.push(`=== GAME STATE (Room: ${state.roomId}, Mission: ${state.mission}) ===`);
  lines.push(`Phase: ${state.phase} | Turn: ${state.turnNumber}`);
  if (state.result) lines.push(`Result: ${state.result}`);
  if (state.isSpectator) lines.push("(You are a spectator)");

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer) {
    const isMyTurn = currentPlayer.id === state.playerId;
    lines.push(`Current Player: ${currentPlayer.name}${isMyTurn ? " (YOUR TURN)" : ""}`);
  }

  if (state.pendingForcedAction) {
    lines.push("");
    const fa = state.pendingForcedAction;
    const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
    switch (fa.kind) {
      case "chooseNextPlayer":
        lines.push(`FORCED ACTION: ${nameOf(fa.captainId)} must choose next player`);
        break;
      case "designateCutter":
        lines.push(`FORCED ACTION: ${nameOf(fa.designatorId)} must designate a cutter for value ${fa.value}`);
        break;
      case "detectorTileChoice":
        lines.push(`FORCED ACTION: ${nameOf(fa.targetPlayerId)} must choose tile from indices [${fa.matchingTileIndices.join(",")}] for ${fa.source} guess ${fa.guessValue}`);
        break;
      case "talkiesWalkiesTileChoice":
        lines.push(`FORCED ACTION: ${nameOf(fa.targetPlayerId)} must choose a tile to swap (talkies-walkies)`);
        break;
      default:
        lines.push(`FORCED ACTION: ${fa.kind}`);
    }
  }

  lines.push("");
  lines.push("-- Board --");
  lines.push(`Detonator: ${state.board.detonatorPosition}/${state.board.detonatorMax}`);

  const validationEntries = Object.entries(state.board.validationTrack)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => Number(a) - Number(b));
  if (validationEntries.length) {
    lines.push(`Validation Track: ${validationEntries.map(([v, c]) => `${v}:${c}/4`).join(" ")}`);
  }

  if (state.board.markers.length) {
    lines.push(`Markers: ${state.board.markers.map((m) => {
      const prefix = m.possible ? "?" : m.confirmed ? "!" : "";
      return `${prefix}${m.value}${m.color === "red" ? "R" : "Y"}`;
    }).join(" ")}`);
  }

  const equipment = state.board.equipment.filter((e) => !e.faceDown);
  if (equipment.length) {
    lines.push("");
    lines.push("-- Equipment --");
    for (const eq of equipment) {
      const status = eq.used ? "USED" : eq.unlocked ? "UNLOCKED" : `locked (need ${eq.unlockValue})`;
      lines.push(`  ${eq.name} (${eq.id}) — ${status}: ${eq.description}`);
    }
  }

  lines.push("");
  lines.push("-- Players --");
  for (const player of state.players) {
    const isMe = player.id === state.playerId;
    const tags: string[] = [];
    if (isMe) tags.push("YOU");
    if (player.isCaptain) tags.push("CAPTAIN");
    if (player.isBot) tags.push("BOT");
    if (!player.connected) tags.push("DISCONNECTED");
    if (player.character) tags.push(player.character);
    if (player.characterUsed) tags.push("ability used");
    const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
    lines.push(`  ${player.name} (${player.id})${tagStr} — ${player.remainingTiles} tiles remaining`);

    if (player.hand.length) {
      let offset = 0;
      for (let i = 0; i < player.standSizes.length; i++) {
        const stand = player.hand.slice(offset, offset + player.standSizes[i]);
        offset += player.standSizes[i];
        const standLabel = player.standSizes.length > 1 ? ` (stand ${i + 1})` : "";
        const tileStrs = stand.map((t) => {
          if (t.cut) {
            const val = t.gameValue === "RED" ? "RED" : t.gameValue === "YELLOW" ? "YEL" : String(t.gameValue);
            return `[${val} ${t.color ?? "?"} CUT]`;
          }
          if (isMe && t.color) {
            const val = t.gameValue === "RED" ? "RED" : t.gameValue === "YELLOW" ? "YEL" : String(t.gameValue);
            return `{${val} ${t.color}}`;
          }
          return `[?${t.isXMarked ? " X" : ""}]`;
        });
        lines.push(`    Tiles${standLabel}: ${tileStrs.join(" | ")}`);
      }
    }

    if (player.infoTokens.length) {
      const tokenStrs = player.infoTokens.map((tk) => {
        const parts: string[] = [];
        parts.push(tk.isYellow ? `YEL@pos${tk.position}` : `${tk.value}@pos${tk.position}`);
        if (tk.parity) parts.push(tk.parity);
        if (tk.countHint) parts.push(`count:${tk.countHint}`);
        if (tk.relation) parts.push(`${tk.relation}@pos${tk.positionB}`);
        if (tk.singleWire) parts.push("single");
        return parts.join(" ");
      });
      lines.push(`    Info tokens: ${tokenStrs.join(", ")}`);
    }
  }

  if (state.campaign) {
    lines.push("");
    lines.push("-- Campaign --");
    const c = state.campaign;
    if (c.nanoTracker) lines.push(`  Nano: ${c.nanoTracker.position}/${c.nanoTracker.max}`);
    if (c.bunkerTracker) lines.push(`  Bunker: ${c.bunkerTracker.position}/${c.bunkerTracker.max}`);
    if (c.oxygen) lines.push(`  Oxygen Pool: ${c.oxygen.pool}`);
    if (c.numberCards?.visible?.length) {
      lines.push(`  Visible Number Cards: ${c.numberCards.visible.map((nc) => nc.value).join(", ")}`);
    }
    if (c.constraints?.global?.length) {
      for (const con of c.constraints.global) {
        lines.push(`  Constraint: ${con.name} — ${con.description}${con.active ? "" : " (inactive)"}`);
      }
    }
    if (c.challenges?.active?.length) {
      for (const ch of c.challenges.active) {
        lines.push(`  Challenge: ${ch.name} — ${ch.description}${ch.completed ? " (DONE)" : ""}`);
      }
    }
  }

  const recentLog = state.log.slice(-10);
  if (recentLog.length) {
    lines.push("");
    lines.push("-- Recent Log --");
    for (const entry of recentLog) {
      const pName = state.players.find((p) => p.id === entry.playerId)?.name ?? entry.playerId;
      const detail = entry.detail.type === "text" ? entry.detail.text : `[${entry.detail.template}]`;
      lines.push(`  T${entry.turn} ${pName}: ${entry.action} — ${detail}`);
    }
  }

  return lines.join("\n");
}

// ── Helpers ──────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
