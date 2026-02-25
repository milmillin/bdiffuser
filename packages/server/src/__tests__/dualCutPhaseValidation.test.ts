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

type DualCutServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
  };
  handleDualCut: (
    conn: Connection,
    targetPlayerId: string,
    targetTileIndex: number,
    guessValue: number | "YELLOW",
    actorTileIndex?: number,
    oxygenRecipientPlayerId?: string,
    mission59RotateNano?: boolean,
  ) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): DualCutServer {
  return {
    room: { gameState },
  } as unknown as DualCutServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("handleDualCut phase validation", () => {
  it("rejects dual cuts when the game is not in playing phase", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "setup_info_tokens",
      }),
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleDualCut(conn, "player-2", 0, 5);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: "Dual Cut is only allowed during the playing phase." }),
    );
  });
});
