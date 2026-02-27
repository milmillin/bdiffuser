import { describe, expect, it, vi } from "vitest";
import { makeGameState, makePlayer } from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type MissionAudioServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
  };
  saveState: ReturnType<typeof vi.fn>;
  broadcastGameState: ReturnType<typeof vi.fn>;
  sendMsg: ReturnType<typeof vi.fn>;
  handleMissionAudioControl: (
    conn: Connection,
    command: "play" | "pause" | "seek" | "setVolume",
    positionMs?: number,
    durationMs?: number,
    volume?: number,
    muted?: boolean,
  ) => void;
};

function makeServer(
  gameState: ReturnType<typeof makeGameState> | null,
): MissionAudioServer {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
    },
    saveState: vi.fn(async () => {}),
    broadcastGameState: vi.fn(),
    sendMsg: vi.fn(),
  } as unknown as MissionAudioServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("mission audio control", () => {
  it("updates shared volume and mute via setVolume", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 19,
      phase: "playing",
      players: [makePlayer({ id: "player-1" })],
      missionAudio: {
        audioFile: "mission_19",
        status: "paused",
        positionMs: 1000,
        syncedAtMs: 5000,
        durationMs: 90_000,
      },
    });
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("player-1");

    server.handleMissionAudioControl(conn, "setVolume", undefined, undefined, 0.37, true);

    expect(state.missionAudio?.volume).toBeCloseTo(0.37, 8);
    expect(state.missionAudio?.muted).toBe(true);
    expect(server.saveState).toHaveBeenCalledTimes(1);
    expect(server.broadcastGameState).toHaveBeenCalledTimes(1);
    expect(server.sendMsg).not.toHaveBeenCalled();
  });

  it("clamps out-of-range setVolume values to 0..1", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 19,
      phase: "playing",
      players: [makePlayer({ id: "player-1" })],
      missionAudio: {
        audioFile: "mission_19",
        status: "paused",
        positionMs: 0,
        syncedAtMs: 0,
      },
    });
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("player-1");

    server.handleMissionAudioControl(conn, "setVolume", undefined, undefined, 5, false);
    expect(state.missionAudio?.volume).toBe(1);

    server.handleMissionAudioControl(conn, "setVolume", undefined, undefined, -2, false);
    expect(state.missionAudio?.volume).toBe(0);
  });

  it("rejects setVolume when the payload is invalid", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 19,
      phase: "playing",
      players: [makePlayer({ id: "player-1" })],
      missionAudio: {
        audioFile: "mission_19",
        status: "paused",
        positionMs: 0,
        syncedAtMs: 0,
      },
    });
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("player-1");

    server.handleMissionAudioControl(
      conn,
      "setVolume",
      undefined,
      undefined,
      Number.NaN as unknown as number,
      false,
    );

    expect(server.sendMsg).toHaveBeenCalledWith(
      conn,
      expect.objectContaining({ type: "error", message: "Invalid mission audio volume" }),
    );
    expect(server.saveState).not.toHaveBeenCalled();
    expect(server.broadcastGameState).not.toHaveBeenCalled();
  });
});
