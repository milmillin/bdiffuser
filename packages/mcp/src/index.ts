#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GameConnection } from "./connection.js";
import { formatGameState, formatLobbyState } from "./formatter.js";

const server = new McpServer({
  name: "bomb-busters",
  version: "1.0.0",
});

const connections = new Map<string, GameConnection>();

function getConnection(roomId: string): GameConnection {
  const conn = connections.get(roomId);
  if (!conn) throw new Error(`Not connected to room "${roomId}". Use connect_to_game first.`);
  return conn;
}

// ── Tools ───────────────────────────────────────────────────

server.tool(
  "connect_to_game",
  "Connect to a Bomb Busters game room and join as a player. Returns the current lobby/game state.",
  {
    roomId: z.string().describe("The room ID to connect to"),
    username: z.string().describe("Your display name in the game"),
    host: z.string().optional().describe("PartyKit server host (default: localhost:1999)"),
  },
  async ({ roomId, username, host }) => {
    if (connections.has(roomId)) {
      const existing = connections.get(roomId)!;
      existing.disconnect();
      connections.delete(roomId);
    }

    const conn = new GameConnection(roomId, host ?? "localhost:1999");
    connections.set(roomId, conn);

    try {
      await conn.connect();
      conn.send({ type: "join", name: username });

      // Wait for initial state
      const state = await conn.waitForState(5000);
      return {
        content: [{ type: "text" as const, text: state }],
      };
    } catch (err) {
      connections.delete(roomId);
      conn.disconnect();
      throw err;
    }
  },
);

server.tool(
  "get_game_state",
  "Get the current game state for a connected room. Shows all visible information: your tiles, other players' cut tiles, board state, equipment, info tokens, turn info, and game log.",
  {
    roomId: z.string().describe("The room ID to get state for"),
  },
  async ({ roomId }) => {
    const conn = getConnection(roomId);
    const lobby = conn.getLobbyState();
    const game = conn.getGameState();

    let text: string;
    if (game) {
      text = formatGameState(game);
    } else if (lobby) {
      text = formatLobbyState(lobby);
    } else {
      text = "Connected but no state received yet. The game may still be loading.";
    }

    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "send_action",
  `Send a game action to the server. The action must be a valid ClientMessage JSON object.

Common actions:
- Lobby: {"type":"selectCharacter","characterId":"double_detector"}, {"type":"startGame"}
- Setup: {"type":"placeInfoToken","value":5,"tileIndex":2}
- Gameplay: {"type":"dualCut","targetPlayerId":"abc","targetTileIndex":0,"guessValue":5}
- Gameplay: {"type":"soloCut","value":3}
- Gameplay: {"type":"revealReds"}
- Equipment: {"type":"useEquipment","equipmentId":"talkies_walkies","payload":{"teammateId":"abc","tileIndex":1}}
- Turn: {"type":"chooseNextPlayer","targetPlayerId":"abc"}
- Chat: {"type":"chat","text":"I think we should cut the 5"}

After sending, returns the updated game state.`,
  {
    roomId: z.string().describe("The room ID"),
    action: z.record(z.unknown()).describe("The ClientMessage JSON object to send"),
  },
  async ({ roomId, action }) => {
    const conn = getConnection(roomId);
    conn.send(action as any);

    // Wait briefly for updated state
    const state = await conn.waitForState(3000);
    return { content: [{ type: "text" as const, text: state }] };
  },
);

server.tool(
  "disconnect_from_game",
  "Disconnect from a game room.",
  {
    roomId: z.string().describe("The room ID to disconnect from"),
  },
  async ({ roomId }) => {
    const conn = connections.get(roomId);
    if (conn) {
      conn.disconnect();
      connections.delete(roomId);
    }
    return { content: [{ type: "text" as const, text: `Disconnected from room "${roomId}".` }] };
  },
);

// ── Start ───────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
