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

type SoloCutServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
  };
  handleSoloCut: (
    conn: Connection,
    value: number | "YELLOW",
    targetPlayerId?: string,
    mission59RotateNano?: boolean,
  ) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): SoloCutServer {
  return {
    room: { gameState },
  } as unknown as SoloCutServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("handleSoloCut phase validation", () => {
  it("rejects solo cuts when the game is not in playing phase", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "setup_info_tokens",
      }),
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleSoloCut(conn, 5);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Solo Cut is only allowed during the playing phase." }),
    );
  });

  it("rejects solo cuts when no active game exists", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(null);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleSoloCut(conn, "YELLOW");

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Cannot perform Solo Cut: no active game in progress." }),
    );
  });
});
