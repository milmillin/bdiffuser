import { describe, expect, it, vi } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import { makeBoardState, makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type TokenLogServer = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
  };
  saveState: () => void;
  broadcastGameState: () => void;
  scheduleBotTurnIfNeeded: () => void;
  sendMsg: (conn: Connection, message: unknown) => void;
  handleMission22TokenPassChoice: (conn: Connection, value: number) => void;
  handleMission27TokenDraftChoice: (conn: Connection, value: number) => void;
  handleMission61ConstraintRotate: (
    conn: Connection,
    direction: "clockwise" | "counter_clockwise" | "skip",
  ) => void;
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function makeServer(gameState: ReturnType<typeof makeGameState> | null): TokenLogServer {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
    },
    saveState: () => {},
    broadcastGameState: () => {},
    scheduleBotTurnIfNeeded: () => {},
    sendMsg: (_conn: Connection, _message: unknown) => {},
  } as unknown as TokenLogServer;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

function getLastLogDetail(state: ReturnType<typeof makeGameState>): string {
  const entry = state.log[state.log.length - 1];
  expect(entry).toBeDefined();
  return renderLogDetail(entry!.detail);
}

describe("token log naming", () => {
  it("mission 22 token pass log uses recipient name and stand position", async () => {
    const { BombBustersServer } = await import("../index.js");
    const chooserId = "e1e43f07-d675-4d9c-bce7-00d5106fbc92";
    const recipientId = "b90afd82-e9c8-487c-9b57-2584e183485f";
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [
        makePlayer({
          id: chooserId,
          name: "T6mek",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 5 })],
        }),
        makePlayer({
          id: recipientId,
          name: "T6MM",
          hand: [makeTile({ id: "r1", gameValue: 8 })],
        }),
      ],
      campaign: {
        mission22TokenPassBoard: {
          numericTokens: [3],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: chooserId,
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });

    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    server.handleMission22TokenPassChoice(makeConnection(chooserId), 3);

    const detail = getLastLogDetail(state);
    expect(detail).toBe("m22:token_pass:value=3|to=T6MM|position=stand");
    expect(detail).not.toMatch(UUID_RE);
  });

  it("mission 27 token draft log uses chooser name and stand position", async () => {
    const { BombBustersServer } = await import("../index.js");
    const chooserId = "59cc5491-4bf2-45f0-8c44-cbd7a8207d72";
    const teammateId = "78d2df4d-5b21-4ce2-b35e-74db38e34929";
    const state = makeGameState({
      mission: 27,
      phase: "playing",
      players: [
        makePlayer({
          id: chooserId,
          name: "T6cha",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 4 })],
        }),
        makePlayer({
          id: teammateId,
          name: "T6flame",
          hand: [makeTile({ id: "t1", gameValue: 6 })],
        }),
      ],
      campaign: {
        mission27TokenDraftBoard: {
          numericTokens: [9],
          yellowTokens: 0,
        },
      },
      pendingForcedAction: {
        kind: "mission27TokenDraft",
        currentChooserIndex: 0,
        currentChooserId: chooserId,
        draftOrder: [0, 1],
        completedCount: 0,
      },
    });

    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    server.handleMission27TokenDraftChoice(makeConnection(chooserId), 9);

    const detail = getLastLogDetail(state);
    expect(detail).toBe("m27:token_draft:value=9|chooser=T6cha|position=stand");
    expect(detail).not.toMatch(UUID_RE);
  });

  it("mission 61 captain log falls back to unknown instead of UUID", async () => {
    const { BombBustersServer } = await import("../index.js");
    const captainId = "11111111-2222-4333-8444-555555555555";
    const state = makeGameState({
      mission: 61,
      phase: "playing",
      currentPlayerIndex: 0,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({
          id: captainId,
          name: "   ",
          isCaptain: true,
          hand: [makeTile({ id: "captain-wire", gameValue: 3 })],
        }),
      ],
      pendingForcedAction: {
        kind: "mission61ConstraintRotate",
        captainId,
        direction: "clockwise",
        previousPlayerId: captainId,
      },
      turnNumber: 2,
    });

    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    server.handleMission61ConstraintRotate(makeConnection(captainId), "skip");

    const detail = getLastLogDetail(state);
    expect(detail).toBe("mission61:constraints_not_rotated|captain=unknown");
    expect(detail).not.toMatch(UUID_RE);
  });
});
