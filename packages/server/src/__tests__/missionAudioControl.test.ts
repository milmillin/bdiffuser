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
    hostId: string | null;
  };
  ctx: {
    storage: {
      setAlarm: ReturnType<typeof vi.fn>;
      deleteAlarm: ReturnType<typeof vi.fn>;
    };
  };
  saveState: ReturnType<typeof vi.fn>;
  broadcastGameState: ReturnType<typeof vi.fn>;
  sendMsg: ReturnType<typeof vi.fn>;
  handleMissionAudioControl: (
    conn: Connection,
    command: "play" | "pause" | "seek",
    positionMs?: number,
    durationMs?: number,
  ) => void;
};

function makeServer(
  gameState: ReturnType<typeof makeGameState> | null,
  hostId: string | null = gameState?.players[0]?.id ?? null,
): MissionAudioServer {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
      hostId,
    },
    ctx: {
      storage: {
        setAlarm: vi.fn(async () => {}),
        deleteAlarm: vi.fn(async () => {}),
      },
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
  it("allows the host to seek Mission 30 instruction audio and reanchors the cue end", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 30,
      phase: "playing",
      players: [makePlayer({ id: "host" }), makePlayer({ id: "player-2" })],
      campaign: {
        mission30: {
          phase: "briefing_locked",
          mode: "instruction",
          currentClipId: "briefing",
          cueEndsAtMs: 60_000,
          mimeMode: false,
          yellowCountsRevealed: false,
        },
      },
      missionAudio: {
        audioFile: "mission_30",
        status: "playing",
        positionMs: 2_630,
        syncedAtMs: 0,
        durationMs: 769_080,
        clipId: "briefing",
        segmentStartMs: 2_630,
        segmentEndMs: 54_320,
        transportLocked: true,
      },
    });
    const server = makeServer(state, "host");
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("host");

    vi.spyOn(Date, "now").mockReturnValue(10_000);
    server.handleMissionAudioControl(conn, "seek", 30_000);

    expect(state.missionAudio?.positionMs).toBe(30_000);
    expect(state.missionAudio?.syncedAtMs).toBe(10_000);
    expect(state.campaign?.mission30?.cueEndsAtMs).toBe(34_320);
    expect(server.saveState).toHaveBeenCalledTimes(1);
    expect(server.broadcastGameState).toHaveBeenCalledTimes(1);
    expect(server.sendMsg).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("clamps host Mission 30 seeks to the active segment without changing loop deadlines", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 30,
      phase: "playing",
      players: [makePlayer({ id: "host" }), makePlayer({ id: "player-2" })],
      campaign: {
        mission30: {
          phase: "triple_lock",
          mode: "action",
          currentClipId: "tripleLockBed",
          visibleDeadlineMs: 130_000,
          hardDeadlineMs: 135_000,
          mimeMode: true,
          yellowCountsRevealed: true,
        },
      },
      missionAudio: {
        audioFile: "mission_30",
        status: "playing",
        positionMs: 439_160,
        syncedAtMs: 0,
        durationMs: 769_080,
        clipId: "tripleLockBed",
        segmentStartMs: 439_160,
        segmentEndMs: 556_590,
        loopSegment: true,
        transportLocked: true,
      },
    });
    const server = makeServer(state, "host");
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("host");

    vi.spyOn(Date, "now").mockReturnValue(20_000);
    server.handleMissionAudioControl(conn, "seek", 999_999);

    expect(state.missionAudio?.positionMs).toBe(556_590);
    expect(state.campaign?.mission30?.visibleDeadlineMs).toBe(130_000);
    expect(state.campaign?.mission30?.hardDeadlineMs).toBe(135_000);
    vi.restoreAllMocks();
  });

  it("rejects Mission 30 transport control from non-host players", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 30,
      phase: "playing",
      players: [makePlayer({ id: "host" }), makePlayer({ id: "player-2" })],
      campaign: {
        mission30: {
          phase: "briefing_locked",
          mode: "instruction",
          currentClipId: "briefing",
          cueEndsAtMs: 60_000,
          mimeMode: false,
          yellowCountsRevealed: false,
        },
      },
      missionAudio: {
        audioFile: "mission_30",
        status: "paused",
        positionMs: 2_630,
        syncedAtMs: 0,
        clipId: "briefing",
        segmentStartMs: 2_630,
        segmentEndMs: 54_320,
        transportLocked: true,
      },
    });
    const server = makeServer(state, "host");
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("player-2");

    server.handleMissionAudioControl(conn, "seek", 30_000);

    expect(server.sendMsg).toHaveBeenCalledWith(
      conn,
      expect.objectContaining({
        type: "error",
        message: "Only the host can control Mission 30 audio.",
      }),
    );
    expect(server.saveState).not.toHaveBeenCalled();
    expect(server.broadcastGameState).not.toHaveBeenCalled();
  });
});
