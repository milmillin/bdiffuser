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

type DoubleDetectorServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
  };
  handleDualCutDoubleDetector: (
    conn: Connection,
    targetPlayerId: string,
    tileIndex1: number,
    tileIndex2: number,
    guessValue: number,
    actorTileIndex?: number,
    oxygenRecipientPlayerId?: string,
    mission59RotateNano?: boolean,
  ) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): DoubleDetectorServer {
  return {
    room: { gameState },
  } as unknown as DoubleDetectorServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("handleDualCutDoubleDetector phase validation", () => {
  it("rejects dual-cut double-detector actions when the game is not in playing phase", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "setup_info_tokens",
      }),
    );
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleDualCutDoubleDetector(conn, "player-2", 0, 1, 5);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Dual Cut Double Detector is only allowed during the playing phase.",
      }),
    );
  });

  it("rejects dual-cut double-detector actions when no active game exists", async () => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(null);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    const conn = makeConnection("player-1");

    server.handleDualCutDoubleDetector(conn, "player-2", 0, 1, 5);

    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Cannot perform Dual Cut Double Detector: no active game in progress.",
      }),
    );
  });
});
