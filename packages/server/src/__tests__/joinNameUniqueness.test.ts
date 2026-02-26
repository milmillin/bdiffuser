import { describe, expect, it, vi } from "vitest";
import { makePlayer } from "@bomb-busters/shared/testing";
import { ZERO_FAILURE_COUNTERS, cloneFailureCounters } from "../failureCounters.js";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type JoinConnection = {
  id: string;
  send: (message: string) => void;
};

type JoinServer = {
  room: {
    gameState: null;
    players: ReturnType<typeof makePlayer>[];
    mission: number;
    hostId: string | null;
    captainMode: "random" | "selection";
    selectedCaptainId: string | null;
    botCount: number;
    botLastActionTurn: Record<string, number>;
    failureCounters: {
      loss_red_wire: number;
      loss_detonator: number;
      loss_timer: number;
    };
  };
  saveState: ReturnType<typeof vi.fn>;
  broadcastLobby: ReturnType<typeof vi.fn>;
  reportStats: ReturnType<typeof vi.fn>;
  handleJoin: (conn: JoinConnection, name: string) => void;
};

function makeServer(players: ReturnType<typeof makePlayer>[]): JoinServer {
  return {
    room: {
      gameState: null,
      players,
      mission: 1,
      hostId: players[0]?.id ?? null,
      captainMode: "random",
      selectedCaptainId: null,
      botCount: players.filter((player) => player.isBot).length,
      botLastActionTurn: {},
      failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
    },
    saveState: vi.fn(async () => {}),
    broadcastLobby: vi.fn(),
    reportStats: vi.fn(),
  } as unknown as JoinServer;
}

function makeConnection(id: string): JoinConnection {
  return { id, send: vi.fn() };
}

describe("join name uniqueness", () => {
  it("rejects duplicate lobby join name case-insensitively", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer([
      makePlayer({ id: "p1", name: "Alice", connected: true }),
    ]);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("p2");

    server.handleJoin(conn, "  alice ");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Name already taken" }),
    );
    expect(server.room.players).toHaveLength(1);
    expect(server.broadcastLobby).not.toHaveBeenCalled();
    expect(server.saveState).not.toHaveBeenCalled();
    expect(server.reportStats).not.toHaveBeenCalled();
  });

  it("rejects rename to a duplicate name for an existing lobby player ID", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer([
      makePlayer({ id: "p1", name: "Alpha", connected: true }),
      makePlayer({ id: "p2", name: "Bravo", connected: true }),
    ]);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("p1");

    server.handleJoin(conn, "  bRaVo ");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Name already taken" }),
    );
    expect(server.room.players.find((player) => player.id === "p1")?.name).toBe("Alpha");
    expect(server.broadcastLobby).not.toHaveBeenCalled();
    expect(server.saveState).not.toHaveBeenCalled();
  });

  it("allows disconnected same-name reconnect fallback case-insensitively", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer([
      makePlayer({ id: "host", name: "Host", connected: true }),
      makePlayer({ id: "old-alice", name: "Alice", connected: false }),
    ]);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("new-alice");

    server.handleJoin(conn, "  aLiCe  ");

    expect(conn.send).not.toHaveBeenCalled();
    expect(server.room.players.find((player) => player.id === "new-alice")).toMatchObject({
      id: "new-alice",
      connected: true,
      name: "aLiCe",
    });
    expect(server.room.players.some((player) => player.id === "old-alice")).toBe(false);
    expect(server.saveState).toHaveBeenCalledTimes(1);
    expect(server.broadcastLobby).toHaveBeenCalledTimes(1);
    expect(server.reportStats).toHaveBeenCalledTimes(1);
  });
});
