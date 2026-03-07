import { describe, expect, it, vi } from "vitest";
import { makePlayer } from "@bomb-busters/shared/testing";
import { ZERO_FAILURE_COUNTERS, cloneFailureCounters } from "../failureCounters.js";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type McpServer = {
  room: {
    gameState: unknown;
    players: ReturnType<typeof makePlayer>[];
    mission: number;
    hostId: string | null;
    captainMode: "random" | "selection";
    selectedCaptainId: string | null;
    botCount: number;
    botLastActionTurn: Record<string, number>;
    failureCounters: ReturnType<typeof cloneFailureCounters>;
    mcpPassword: string;
  };
  saveState: ReturnType<typeof vi.fn>;
  broadcastLobby: ReturnType<typeof vi.fn>;
  broadcastGameState: ReturnType<typeof vi.fn>;
  reportStats: ReturnType<typeof vi.fn>;
  handleMcpTakeover: (conn: Connection, name: string, password: string) => void;
};

function makeServer(
  players: ReturnType<typeof makePlayer>[],
  opts: { gameState?: unknown; mcpPassword?: string } = {},
): McpServer {
  return {
    room: {
      gameState: opts.gameState ?? null,
      players,
      mission: 1,
      hostId: players[0]?.id ?? null,
      captainMode: "random",
      selectedCaptainId: null,
      botCount: 0,
      botLastActionTurn: {},
      failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
      mcpPassword: opts.mcpPassword ?? "4567",
    },
    saveState: vi.fn(async () => {}),
    broadcastLobby: vi.fn(),
    broadcastGameState: vi.fn(),
    reportStats: vi.fn(),
  } as unknown as McpServer;
}

function makeConn(id: string): Connection {
  return { id, send: vi.fn() };
}

function makeGameState(players: ReturnType<typeof makePlayer>[]) {
  return {
    players: players.map((p) => ({ ...p })),
    phase: "playing",
    currentPlayerIndex: 0,
    turnNumber: 1,
    board: {
      detonatorPosition: 0,
      detonatorMax: 3,
      validationTrack: {},
      markers: [],
      equipment: [],
    },
    log: [],
    chat: [],
    result: null,
    mission: 1,
    roomId: "test-room",
  };
}

describe("mcpTakeover", () => {
  it("rejects wrong password", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [makePlayer({ id: "p1", name: "Alice", connected: true })],
      { mcpPassword: "1234" },
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-1");

    server.handleMcpTakeover(conn, "Alice", "9999");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Invalid MCP password" }),
    );
    expect(server.saveState).not.toHaveBeenCalled();
  });

  it("rejects empty password", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [makePlayer({ id: "p1", name: "Alice", connected: true })],
      { mcpPassword: "1234" },
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-1");

    server.handleMcpTakeover(conn, "Alice", "");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Invalid MCP password" }),
    );
  });

  it("rejects player name not found", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [makePlayer({ id: "p1", name: "Alice", connected: true })],
      { mcpPassword: "1234" },
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-1");

    server.handleMcpTakeover(conn, "Bob", "1234");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: 'Player "Bob" not found' }),
    );
    expect(server.saveState).not.toHaveBeenCalled();
  });

  it("takes over a lobby player by name (case-insensitive)", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [
        makePlayer({ id: "p1", name: "Alice", connected: true }),
        makePlayer({ id: "p2", name: "Bob", connected: true }),
      ],
      { mcpPassword: "1234" },
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-1");

    server.handleMcpTakeover(conn, "  aLiCe  ", "1234");

    // Player ID should be replaced
    expect(server.room.players.find((p) => p.id === "mcp-1")).toBeTruthy();
    expect(server.room.players.find((p) => p.id === "p1")).toBeFalsy();
    expect(server.room.players.find((p) => p.id === "mcp-1")?.connected).toBe(true);
    expect(server.saveState).toHaveBeenCalled();
    expect(server.broadcastLobby).toHaveBeenCalled();
  });

  it("takes over a player mid-game", async () => {
    const { BombBustersServer } = await import("../index.js");
    const players = [
      makePlayer({ id: "p1", name: "Alice", connected: true }),
      makePlayer({ id: "p2", name: "Bob", connected: true }),
    ];
    const gs = makeGameState(players);
    const server = makeServer(players, { gameState: gs, mcpPassword: "5678" });
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-2");

    server.handleMcpTakeover(conn, "Bob", "5678");

    // Room players updated
    expect(server.room.players.find((p) => p.id === "mcp-2")).toBeTruthy();
    expect(server.room.players.find((p) => p.id === "p2")).toBeFalsy();
    // GameState players updated too
    const gsPlayers = (server.room.gameState as { players: { id: string }[] }).players;
    expect(gsPlayers.find((p) => p.id === "mcp-2")).toBeTruthy();
    expect(gsPlayers.find((p) => p.id === "p2")).toBeFalsy();
    expect(server.saveState).toHaveBeenCalled();
    expect(server.broadcastGameState).toHaveBeenCalled();
  });

  it("does not reject bot players", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [
        makePlayer({ id: "p1", name: "Alice", connected: true }),
        makePlayer({ id: "bot1", name: "IRIS", connected: true, isBot: true }),
      ],
      { mcpPassword: "1234" },
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-1");

    // Trying to take over a bot should fail (bots are filtered out)
    server.handleMcpTakeover(conn, "IRIS", "1234");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: 'Player "IRIS" not found' }),
    );
  });

  it("updates hostId when taking over the host", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      [makePlayer({ id: "p1", name: "Alice", connected: true })],
      { mcpPassword: "1234" },
    );
    server.room.hostId = "p1";
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConn("mcp-host");

    server.handleMcpTakeover(conn, "Alice", "1234");

    expect(server.room.hostId).toBe("mcp-host");
  });
});
