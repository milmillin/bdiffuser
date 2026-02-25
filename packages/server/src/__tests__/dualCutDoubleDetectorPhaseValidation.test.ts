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

type PhaseHandlerServer = DoubleDetectorServer & {
  handleSimultaneousRedCut: (conn: Connection, targets: Array<{ playerId: string; tileIndex: number }>) => void;
  handleSimultaneousFourCut: (conn: Connection, targets: Array<{ playerId: string; tileIndex: number }>) => void;
  handleUseEquipment: (conn: Connection, equipmentId: string, payload: Record<string, unknown>) => void;
  handleUseCharacterAbility: (conn: Connection, payload: Record<string, unknown>) => void;
  handleChooseNextPlayer: (conn: Connection, targetPlayerId: string) => void;
  handleDesignateCutter: (conn: Connection, targetPlayerId: string) => void;
  handleMission22TokenPassChoice: (conn: Connection, value: number) => void;
  handleDetectorTileChoice: (conn: Connection, tileIndex?: number, infoTokenTileIndex?: number) => void;
  handleTalkiesWalkiesChoice: (conn: Connection, tileIndex: number) => void;
};

function makePhaseServer(gameState: ReturnType<typeof makeGameState> | null): PhaseHandlerServer {
  return {
    room: { gameState },
  } as unknown as PhaseHandlerServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

type ActionPhaseCase = {
  label: string;
  invokeNoGame: (server: PhaseHandlerServer, conn: Connection) => void;
  invokeNotPlaying: (server: PhaseHandlerServer, conn: Connection) => void;
  noGameMessage: string;
  notPlayingMessage: string;
};

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

  it.each([
    {
      label: "simultaneous red cut",
      invokeNoGame: (server, conn) => server.handleSimultaneousRedCut(conn, []),
      invokeNotPlaying: (server, conn) =>
        server.handleSimultaneousRedCut(conn, [{ playerId: "p1", tileIndex: 0 }]),
      noGameMessage: "Cannot perform Simultaneous Red Cut: no active game in progress.",
      notPlayingMessage: "Simultaneous Red Cut is only allowed during the playing phase.",
    },
    {
      label: "simultaneous four cut",
      invokeNoGame: (server, conn) => server.handleSimultaneousFourCut(conn, []),
      invokeNotPlaying: (server, conn) =>
        server.handleSimultaneousFourCut(conn, [{ playerId: "p1", tileIndex: 0 }]),
      noGameMessage: "Cannot perform Simultaneous Four Cut: no active game in progress.",
      notPlayingMessage: "Simultaneous Four Cut is only allowed during the playing phase.",
    },
    {
      label: "use equipment",
      invokeNoGame: (server, conn) => server.handleUseEquipment(conn, "stabilizer", {}),
      invokeNotPlaying: (server, conn) => server.handleUseEquipment(conn, "stabilizer", {}),
      noGameMessage: "Cannot use Equipment: no active game in progress.",
      notPlayingMessage: "Using Equipment is only allowed during the playing phase.",
    },
    {
      label: "use character ability",
      invokeNoGame: (server, conn) => server.handleUseCharacterAbility(conn, {}),
      invokeNotPlaying: (server, conn) => server.handleUseCharacterAbility(conn, {}),
      noGameMessage: "Cannot use Character Ability: no active game in progress.",
      notPlayingMessage: "Character Ability is only allowed during the playing phase.",
    },
    {
      label: "choose next player",
      invokeNoGame: (server, conn) => server.handleChooseNextPlayer(conn, "p1"),
      invokeNotPlaying: (server, conn) => server.handleChooseNextPlayer(conn, "p1"),
      noGameMessage: "Cannot choose next player: no active game in progress.",
      notPlayingMessage: "Choose Next Player is only allowed during the playing phase.",
    },
    {
      label: "designate cutter",
      invokeNoGame: (server, conn) => server.handleDesignateCutter(conn, "p1"),
      invokeNotPlaying: (server, conn) => server.handleDesignateCutter(conn, "p1"),
      noGameMessage: "Cannot designate next cutter: no active game in progress.",
      notPlayingMessage: "Designate Cutter is only allowed during the playing phase.",
    },
    {
      label: "mission 22 token pass",
      invokeNoGame: (server, conn) => server.handleMission22TokenPassChoice(conn, 1),
      invokeNotPlaying: (server, conn) => server.handleMission22TokenPassChoice(conn, 1),
      noGameMessage: "Cannot perform Mission 22 token pass: no active game in progress.",
      notPlayingMessage: "Mission 22 token pass is only allowed during the playing phase.",
    },
    {
      label: "detector tile choice",
      invokeNoGame: (server, conn) => server.handleDetectorTileChoice(conn, 1),
      invokeNotPlaying: (server, conn) => server.handleDetectorTileChoice(conn, 1),
      noGameMessage: "Cannot choose detector tile: no active game in progress.",
      notPlayingMessage: "Detector tile choice is only allowed during the playing phase.",
    },
    {
      label: "walkies walkies tile choice",
      invokeNoGame: (server, conn) => server.handleTalkiesWalkiesChoice(conn, 0),
      invokeNotPlaying: (server, conn) => server.handleTalkiesWalkiesChoice(conn, 0),
      noGameMessage: "Cannot choose Walkie-Talkies tile: no active game in progress.",
      notPlayingMessage: "Walkie-Talkies tile choice is only allowed during the playing phase.",
    },
  ] as ActionPhaseCase[])(
    "rejects $label when no active game exists",
    async ({ invokeNoGame, noGameMessage }) => {
      const { BombBustersServer } = await import("../index.js");
      const server = makePhaseServer(null);
      Object.setPrototypeOf(server, BombBustersServer.prototype);

      const conn = makeConnection("player-1");
      invokeNoGame(server, conn);

      expect(conn.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "error", message: noGameMessage }),
      );
    },
  );

  it.each([
    {
      label: "simultaneous red cut",
      invokeNotPlaying: (server, conn) =>
        server.handleSimultaneousRedCut(conn, [{ playerId: "p1", tileIndex: 0 }]),
      invokeNoGame: (server, conn) => server.handleSimultaneousRedCut(conn, []),
      noGameMessage: "Cannot perform Simultaneous Red Cut: no active game in progress.",
      notPlayingMessage: "Simultaneous Red Cut is only allowed during the playing phase.",
    },
    {
      label: "simultaneous four cut",
      invokeNotPlaying: (server, conn) =>
        server.handleSimultaneousFourCut(conn, [{ playerId: "p1", tileIndex: 0 }]),
      invokeNoGame: (server, conn) => server.handleSimultaneousFourCut(conn, []),
      noGameMessage: "Cannot perform Simultaneous Four Cut: no active game in progress.",
      notPlayingMessage: "Simultaneous Four Cut is only allowed during the playing phase.",
    },
    {
      label: "use equipment",
      invokeNotPlaying: (server, conn) => server.handleUseEquipment(conn, "stabilizer", {}),
      invokeNoGame: (server, conn) => server.handleUseEquipment(conn, "stabilizer", {}),
      noGameMessage: "Cannot use Equipment: no active game in progress.",
      notPlayingMessage: "Using Equipment is only allowed during the playing phase.",
    },
    {
      label: "use character ability",
      invokeNotPlaying: (server, conn) => server.handleUseCharacterAbility(conn, {}),
      invokeNoGame: (server, conn) => server.handleUseCharacterAbility(conn, {}),
      noGameMessage: "Cannot use Character Ability: no active game in progress.",
      notPlayingMessage: "Character Ability is only allowed during the playing phase.",
    },
    {
      label: "choose next player",
      invokeNotPlaying: (server, conn) => server.handleChooseNextPlayer(conn, "p1"),
      invokeNoGame: (server, conn) => server.handleChooseNextPlayer(conn, "p1"),
      noGameMessage: "Cannot choose next player: no active game in progress.",
      notPlayingMessage: "Choose Next Player is only allowed during the playing phase.",
    },
    {
      label: "designate cutter",
      invokeNotPlaying: (server, conn) => server.handleDesignateCutter(conn, "p1"),
      invokeNoGame: (server, conn) => server.handleDesignateCutter(conn, "p1"),
      noGameMessage: "Cannot designate next cutter: no active game in progress.",
      notPlayingMessage: "Designate Cutter is only allowed during the playing phase.",
    },
    {
      label: "mission 22 token pass",
      invokeNotPlaying: (server, conn) => server.handleMission22TokenPassChoice(conn, 1),
      invokeNoGame: (server, conn) => server.handleMission22TokenPassChoice(conn, 1),
      noGameMessage: "Cannot perform Mission 22 token pass: no active game in progress.",
      notPlayingMessage: "Mission 22 token pass is only allowed during the playing phase.",
    },
    {
      label: "detector tile choice",
      invokeNotPlaying: (server, conn) => server.handleDetectorTileChoice(conn, 1),
      invokeNoGame: (server, conn) => server.handleDetectorTileChoice(conn, 1),
      noGameMessage: "Cannot choose detector tile: no active game in progress.",
      notPlayingMessage: "Detector tile choice is only allowed during the playing phase.",
    },
    {
      label: "walkies walkies tile choice",
      invokeNotPlaying: (server, conn) => server.handleTalkiesWalkiesChoice(conn, 0),
      invokeNoGame: (server, conn) => server.handleTalkiesWalkiesChoice(conn, 0),
      noGameMessage: "Cannot choose Walkie-Talkies tile: no active game in progress.",
      notPlayingMessage: "Walkie-Talkies tile choice is only allowed during the playing phase.",
    },
  ] as ActionPhaseCase[])(
    "rejects $label outside the playing phase",
    async ({ invokeNotPlaying, notPlayingMessage }) => {
      const { BombBustersServer } = await import("../index.js");
      const server = makePhaseServer(
        makeGameState({
          phase: "setup_info_tokens",
        }),
      );
      Object.setPrototypeOf(server, BombBustersServer.prototype);

      const conn = makeConnection("player-1");
      invokeNotPlaying(server, conn);

      expect(conn.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "error", message: notPlayingMessage }),
      );
    },
  );
});
