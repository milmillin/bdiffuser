import { describe, expect, it, vi } from "vitest";
import { makeGameState } from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type PlaceInfoTokenServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
  };
  handlePlaceInfoToken: (conn: Connection, value: number, tileIndex: number) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): PlaceInfoTokenServer {
  return {
    room: { gameState },
  } as unknown as PlaceInfoTokenServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("handlePlaceInfoToken phase validation", () => {
  it("rejects setup info token placement when no active game exists", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(null);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");
    server.handlePlaceInfoToken(conn, 3, 1);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Cannot place setup info token: no active game in progress.",
      }),
    );
  });

  it("rejects setup info token placement outside setup phase", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "playing",
      }),
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");
    server.handlePlaceInfoToken(conn, 3, 1);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Info token placement is only allowed during the setup phase.",
      }),
    );
  });
});
