import { describe, expect, it, vi } from "vitest";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";
import { ZERO_FAILURE_COUNTERS, cloneFailureCounters } from "../failureCounters.js";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type PlayAgainConnection = {
  id: string;
  send: (message: string) => void;
};

type PlayAgainServer = {
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
    finishedAt?: number;
  };
  broadcastLobby: ReturnType<typeof vi.fn>;
  saveState: ReturnType<typeof vi.fn>;
  handlePlayAgain: (conn: PlayAgainConnection) => void;
};

function makeServer({
  players,
  gameState,
  finishedAt = 1_700_000_000_000,
  botLastActionTurn = { botX: 3, botY: 9 },
}: {
  players: ReturnType<typeof makePlayer>[];
  gameState: ReturnType<typeof makeGameState>;
  finishedAt?: number;
  botLastActionTurn?: Record<string, number>;
}): PlayAgainServer {
  return {
    room: {
      gameState,
      players,
      mission: 1,
      hostId: players[0]?.id ?? null,
      captainMode: "random",
      selectedCaptainId: null,
      botCount: 0,
      botLastActionTurn,
      failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
      finishedAt,
    },
    broadcastLobby: vi.fn(),
    saveState: vi.fn(async () => {}),
  } as unknown as PlayAgainServer;
}

function makeConnection(id: string): PlayAgainConnection {
  return { id, send: vi.fn() };
}

describe("play-again handler", () => {
  it("rejects playAgain from spectators", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer({
      players: [makePlayer({ id: "player-1", name: "Player One" })],
      gameState: makeGameState({
        phase: "finished",
        result: "loss_red_wire",
      }),
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const spectatorConn = makeConnection("spectator-conn");

    server.handlePlayAgain(spectatorConn);

    expect(server.broadcastLobby).not.toHaveBeenCalled();
    expect(server.room.gameState?.phase).toBe("finished");
    expect(server.room.botLastActionTurn).toEqual({ botX: 3, botY: 9 });
    expect(spectatorConn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Only players can restart after mission complete." }),
    );
  });

  it("resets game and room state when a player in the room requests playAgain", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer({
      players: [
        makePlayer({
          id: "player-1",
          name: "Player One",
          hand: [{ id: "t1", color: "blue", sortValue: 7, gameValue: 7, image: "tile.png", cut: false }],
          standSizes: [1],
          infoTokens: [{ value: 7, position: 0, isYellow: false }],
          characterUsed: true,
          character: "double_detector",
        }),
      ],
      gameState: makeGameState({
        phase: "finished",
        result: "loss_timer",
        players: [
          makePlayer({
            id: "player-1",
            hand: [{ id: "t1", color: "blue", sortValue: 7, gameValue: 7, image: "tile.png", cut: false }],
            standSizes: [1],
            infoTokens: [{ value: 7, position: 0, isYellow: false }],
            characterUsed: true,
            character: "double_detector",
          }),
        ],
      }),
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const playerConn = makeConnection("player-1");

    server.handlePlayAgain(playerConn);

    expect(server.room.gameState).toBeNull();
    expect(server.room.finishedAt).toBeUndefined();
    expect(server.room.botLastActionTurn).toEqual({});
    expect(server.room.players).toHaveLength(1);
    expect(server.room.players[0]).toMatchObject({
      hand: [],
      standSizes: [0],
      infoTokens: [],
      isCaptain: false,
      characterUsed: false,
      character: null,
    });
    expect(server.broadcastLobby).toHaveBeenCalledTimes(1);
    expect(server.saveState).toHaveBeenCalledTimes(1);
    expect(playerConn.send).not.toHaveBeenCalled();
  });
});
