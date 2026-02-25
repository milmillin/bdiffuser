import { describe, expect, it, vi } from "vitest";
import { MissionId, CharacterId } from "@bomb-busters/shared";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type LobbyValidationConnection = {
  id: string;
  send: (message: string) => void;
};

type LobbyValidationServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makePlayer>[];
    mission: MissionId;
    hostId: string | null;
    captainMode: "random" | "selection";
    selectedCaptainId: string | null;
  };
  broadcastLobby: ReturnType<typeof vi.fn>;
  saveState: ReturnType<typeof vi.fn>;
  handleSelectCharacter: (conn: LobbyValidationConnection, characterId: CharacterId) => void;
  handleSelectMission: (conn: LobbyValidationConnection, mission: MissionId) => void;
  handleSetCaptainMode: (conn: LobbyValidationConnection, mode: "random" | "selection") => void;
  handleSelectCaptain: (conn: LobbyValidationConnection, playerId: string) => void;
  handleStartGame: (conn: LobbyValidationConnection) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): LobbyValidationServer {
  const hostId = "player-1";
  return {
    room: {
      gameState,
      players: [makePlayer({ id: hostId, name: "Host" })],
      mission: 31 as MissionId,
      hostId,
      captainMode: "random",
      selectedCaptainId: null,
    },
    broadcastLobby: vi.fn(),
    saveState: vi.fn(async () => {}),
  } as unknown as LobbyValidationServer;
}

function makeConnection(id: string): LobbyValidationConnection {
  return { id, send: vi.fn() };
}

describe("setup-time handler validation", () => {
  it.each([
    {
      label: "select character",
      invoke: (server: LobbyValidationServer, conn: LobbyValidationConnection) => {
        server.handleSelectCharacter(conn, "double_detector");
      },
      expected: "Cannot select character: game has already started.",
    },
    {
      label: "select mission",
      invoke: (server: LobbyValidationServer, conn: LobbyValidationConnection) => {
        server.handleSelectMission(conn, 31);
      },
      expected: "Cannot select mission: game has already started.",
    },
    {
      label: "change captain mode",
      invoke: (server: LobbyValidationServer, conn: LobbyValidationConnection) => {
        server.handleSetCaptainMode(conn, "selection");
      },
      expected: "Cannot change captain mode: game has already started.",
    },
    {
      label: "select captain",
      invoke: (server: LobbyValidationServer, conn: LobbyValidationConnection) => {
        server.handleSelectCaptain(conn, "player-1");
      },
      expected: "Cannot select captain: game has already started.",
    },
    {
      label: "start game",
      invoke: (server: LobbyValidationServer, conn: LobbyValidationConnection) => {
        server.handleStartGame(conn);
      },
      expected: "Cannot start game: one is already in progress.",
    },
  ])("rejects $label during an active game", async ({ invoke, expected }) => {
    const { BombBustersServer } = await import("../index.js");
    const server = makeServer(
      makeGameState({
        phase: "playing",
      }),
    );

    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("player-1");

    invoke(server, conn);

    expect(server.broadcastLobby).not.toHaveBeenCalled();
    expect(server.saveState).not.toHaveBeenCalled();
    expect(conn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "error", message: expected }),
    );
  });
});
