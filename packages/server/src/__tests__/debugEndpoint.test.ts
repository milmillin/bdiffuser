import { describe, expect, it, vi } from "vitest";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { ZERO_FAILURE_COUNTERS, cloneFailureCounters } from "../failureCounters.js";
import { filterStateForPlayer } from "../viewFilter.js";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type DebugServer = {
  name: string;
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
  onRequest: (request: Request) => Response | Promise<Response>;
};

function makeServer({
  gameState,
  players,
}: {
  gameState: ReturnType<typeof makeGameState> | null;
  players: ReturnType<typeof makePlayer>[];
}): DebugServer {
  return {
    name: "room-1",
    room: {
      gameState,
      players,
      mission: gameState?.mission ?? 1,
      hostId: players[0]?.id ?? null,
      captainMode: "random",
      selectedCaptainId: null,
      botCount: players.filter((player) => player.isBot).length,
      botLastActionTurn: {},
      failureCounters: cloneFailureCounters(ZERO_FAILURE_COUNTERS),
    },
  } as unknown as DebugServer;
}

async function requestJson(server: DebugServer, pathname: string): Promise<{
  response: Response;
  body: unknown;
}> {
  const request = new Request(`https://example.com${pathname}`, { method: "GET" });
  const response = await Promise.resolve(server.onRequest(request));
  const body = await response.json();
  return { response, body };
}

describe("debug endpoints", () => {
  it("/debug returns omniscience true", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer({
      gameState: null,
      players: [makePlayer({ id: "p1", name: "Alice" })],
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const { response, body } = await requestJson(server, "/parties/bomb-busters-server/room-1/debug");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      roomId: "room-1",
      omniscience: true,
      room: server.room,
    });
    expect((body as { queriedAt: unknown }).queriedAt).toEqual(expect.any(Number));
  });

  it("/debug/1 returns omniscience false with filtered player state", async () => {
    const { BombBustersServer } = await import("../index.js");
    const seatOne = makePlayer({
      id: "p1",
      name: "Alice",
      hand: [
        makeTile({ id: "a1", gameValue: 2, sortValue: 2 }),
      ],
    });
    const seatTwo = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [
        makeTile({ id: "b1", gameValue: 7, sortValue: 7 }),
      ],
    });
    const state = makeGameState({
      roomId: "room-1",
      players: [seatOne, seatTwo],
    });
    const server = makeServer({
      gameState: state,
      players: [seatOne, seatTwo],
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const { response, body } = await requestJson(server, "/parties/bomb-busters-server/room-1/debug/1");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      roomId: "room-1",
      uid: 1,
      playerId: "p1",
      playerName: "Alice",
      omniscience: false,
    });
    expect((body as { state: unknown }).state).toEqual(filterStateForPlayer(state, "p1"));
  });

  it("returns 404 for invalid or unoccupied uid", async () => {
    const { BombBustersServer } = await import("../index.js");
    const player = makePlayer({ id: "p1", name: "Alice" });
    const state = makeGameState({
      roomId: "room-1",
      players: [player],
    });
    const server = makeServer({
      gameState: state,
      players: [player],
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const invalidUid = await requestJson(server, "/parties/bomb-busters-server/room-1/debug/0");
    const unoccupiedUid = await requestJson(server, "/parties/bomb-busters-server/room-1/debug/2");

    expect(invalidUid.response.status).toBe(404);
    expect(invalidUid.body).toEqual({ error: "Player not found" });
    expect(unoccupiedUid.response.status).toBe(404);
    expect(unoccupiedUid.body).toEqual({ error: "Player not found" });
  });

  it("returns 409 when there is no active game", async () => {
    const { BombBustersServer } = await import("../index.js");
    const player = makePlayer({ id: "p1", name: "Alice" });
    const server = makeServer({
      gameState: null,
      players: [player],
    });
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const { response, body } = await requestJson(server, "/parties/bomb-busters-server/room-1/debug/1");

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "No active game" });
  });
});
