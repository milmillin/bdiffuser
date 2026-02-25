import { describe, expect, it, vi } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import { makeBoardState, makeConstraintCard, makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type Mission61ConstraintServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
  };
  saveState: () => void;
  broadcastGameState: () => void;
  scheduleBotTurnIfNeeded: () => void;
  sendMsg: (conn: Connection, message: unknown) => void;
};

type Mission61ConstraintServerWithAction = Mission61ConstraintServer & {
  handleMission61ConstraintRotate: (
    conn: Connection,
    direction: "clockwise" | "counter_clockwise" | "skip",
  ) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): Mission61ConstraintServer {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
    },
    saveState: () => {},
    broadcastGameState: () => {},
    scheduleBotTurnIfNeeded: () => {},
    sendMsg: (_conn: Connection, _message: unknown) => {},
  } as unknown as Mission61ConstraintServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("mission61 constraint rotation", () => {
  it("does not rotate constraints when captain chooses skip", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 61,
      phase: "playing",
      currentPlayerIndex: 0,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({
          id: "captain",
          name: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-red", gameValue: "RED" })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-red", gameValue: "RED" })],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "B", name: "B", description: "B", active: false })],
        },
      },
      pendingForcedAction: {
        kind: "mission61ConstraintRotate",
        captainId: "captain",
        direction: "clockwise",
        previousPlayerId: "p2",
      },
      turnNumber: 7,
    });

    const server = makeServer(state) as Mission61ConstraintServerWithAction;
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("captain");

    server.handleMission61ConstraintRotate(conn, "skip");

    expect(state.campaign?.constraints?.global[0]?.id).toBe("A");
    expect(state.campaign?.constraints?.deck?.[0]?.id).toBe("B");
    expect(state.pendingForcedAction).toBeUndefined();
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission61:constraints_not_rotated|captain=captain",
      ),
    ).toBe(true);
  });

  it("rotates constraint deck when captain chooses clockwise", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 61,
      phase: "playing",
      currentPlayerIndex: 0,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-red", gameValue: "RED" })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-red", gameValue: "RED" })],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "B", name: "B", description: "B", active: false })],
        },
      },
      pendingForcedAction: {
        kind: "mission61ConstraintRotate",
        captainId: "captain",
        direction: "clockwise",
        previousPlayerId: "p2",
      },
      turnNumber: 7,
    });

    const server = makeServer(state) as Mission61ConstraintServerWithAction;
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("captain");

    server.handleMission61ConstraintRotate(conn, "clockwise");

    expect(state.campaign?.constraints?.global[0]?.id).toBe("B");
    expect(state.campaign?.constraints?.deck?.[0]?.id).toBe("A");
    expect(state.pendingForcedAction).toBeUndefined();
  });
});
