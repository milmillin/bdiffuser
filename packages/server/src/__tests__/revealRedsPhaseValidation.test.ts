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

type RevealRedsServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
  };
  handleRevealReds: (conn: Connection) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): RevealRedsServer {
  return {
    room: { gameState },
  } as unknown as RevealRedsServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("handleRevealReds phase validation", () => {
  it("rejects reveal reds when the game is not in playing phase", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "setup_info_tokens",
      }),
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleRevealReds(conn);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Reveal Reds is only allowed during the playing phase." }),
    );
  });

  it("rejects reveal reds when no active game exists", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(null);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleRevealReds(conn);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Cannot perform Reveal Reds: no active game in progress." }),
    );
  });
});
