import { describe, expect, it, vi } from "vitest";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";
import { ZERO_FAILURE_COUNTERS, cloneFailureCounters } from "../failureCounters.js";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type SurrenderConnection = {
  id: string;
  send: ReturnType<typeof vi.fn>;
};

type SurrenderServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
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
  broadcastGameState: ReturnType<typeof vi.fn>;
  broadcastAction: ReturnType<typeof vi.fn>;
  handleSurrenderVote: (conn: SurrenderConnection, vote: boolean) => void;
};

function makeConnection(id: string): SurrenderConnection {
  return { id, send: vi.fn() };
}

function makeServer(players: ReturnType<typeof makePlayer>[]): SurrenderServer {
  return {
    room: {
      gameState: makeGameState({
        phase: "playing",
        players,
      }),
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
    broadcastGameState: vi.fn(),
    broadcastAction: vi.fn(),
  } as unknown as SurrenderServer;
}

describe("surrender vote handler", () => {
  it("finishes the mission when a human-player majority votes yes (bots excluded)", async () => {
    const { BombBustersServer } = await import("../index.js");
    const players = [
      makePlayer({ id: "p1", name: "Alpha", isBot: false }),
      makePlayer({ id: "p2", name: "Bravo", isBot: false }),
      makePlayer({ id: "bot-1", name: "Bot 1", isBot: true }),
    ];
    const server = makeServer(players);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleSurrenderVote(makeConnection("p1"), true);
    expect(server.room.gameState?.phase).toBe("playing");
    expect(server.room.gameState?.surrenderVote?.yesVoterIds).toEqual(["p1"]);
    expect(server.broadcastGameState).toHaveBeenCalledTimes(1);
    expect(server.broadcastAction).not.toHaveBeenCalled();

    server.handleSurrenderVote(makeConnection("p2"), true);
    expect(server.room.gameState?.phase).toBe("finished");
    expect(server.room.gameState?.result).toBe("loss_surrender");
    expect(server.room.gameState?.surrenderVote).toBeUndefined();
    expect(server.broadcastAction).toHaveBeenCalledWith({
      type: "gameOver",
      result: "loss_surrender",
    });
  });

  it("keeps playing when votes are below majority and tracks yes voters", async () => {
    const { BombBustersServer } = await import("../index.js");
    const players = [
      makePlayer({ id: "p1", isBot: false }),
      makePlayer({ id: "p2", isBot: false }),
      makePlayer({ id: "p3", isBot: false }),
      makePlayer({ id: "bot-1", isBot: true }),
    ];
    const server = makeServer(players);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleSurrenderVote(makeConnection("p1"), true);

    expect(server.room.gameState?.phase).toBe("playing");
    expect(server.room.gameState?.result).toBeNull();
    expect(server.room.gameState?.surrenderVote?.yesVoterIds).toEqual(["p1"]);
    expect(server.broadcastAction).not.toHaveBeenCalled();
    expect(server.broadcastGameState).toHaveBeenCalledTimes(1);
  });

  it("rejects surrender votes from bots", async () => {
    const { BombBustersServer } = await import("../index.js");
    const players = [
      makePlayer({ id: "p1", isBot: false }),
      makePlayer({ id: "bot-1", isBot: true }),
      makePlayer({ id: "bot-2", isBot: true }),
    ];
    const server = makeServer(players);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const botConn = makeConnection("bot-1");

    server.handleSurrenderVote(botConn, true);

    expect(server.room.gameState?.phase).toBe("playing");
    expect(server.room.gameState?.surrenderVote).toBeUndefined();
    expect(server.broadcastAction).not.toHaveBeenCalled();
    expect(server.broadcastGameState).not.toHaveBeenCalled();
    expect(botConn.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Only human players can vote to surrender.",
      }),
    );
  });
});
