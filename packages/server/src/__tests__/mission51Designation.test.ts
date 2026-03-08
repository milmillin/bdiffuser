import { describe, expect, it, vi } from "vitest";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { BombBustersServer } from "../index";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type Mission51Server = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
    failureCounters: Record<string, number>;
  };
  saveState: () => void;
  broadcastAction: (message: unknown) => void;
  broadcastGameState: () => void;
  scheduleBotTurnIfNeeded: () => void;
  maybeRecordMissionFailure: () => void;
  sendMsg: (conn: Connection, message: unknown) => void;
};

type Mission51ServerWithHandlers = Mission51Server & {
  handleDesignateCutter: (conn: Connection, targetPlayerId: string) => void;
  handleMission51PenaltyTokenChoice: (conn: Connection, value: number) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): Mission51Server {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
      failureCounters: {},
    },
    saveState: vi.fn(),
    broadcastAction: vi.fn(),
    broadcastGameState: vi.fn(),
    scheduleBotTurnIfNeeded: vi.fn(),
    maybeRecordMissionFailure: vi.fn(),
    sendMsg: vi.fn(),
  } as unknown as Mission51Server;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

function makeDesignationState() {
  return makeGameState({
    mission: 51,
    phase: "playing",
    turnNumber: 3,
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: "sir",
        name: "Sir",
        isCaptain: true,
        hand: [makeTile({ id: "sir-6", gameValue: 6 })],
      }),
      makePlayer({
        id: "p2",
        name: "Player 2",
        hand: [makeTile({ id: "p2-6", gameValue: 6 })],
      }),
      makePlayer({
        id: "p3",
        name: "Player 3",
        hand: [makeTile({ id: "p3-4", gameValue: 4 })],
      }),
    ],
    board: {
      detonatorPosition: 0,
      detonatorMax: 4,
      validationTrack: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
        12: 0,
      },
      markers: [],
      equipment: [],
    },
    campaign: makeCampaignState({
      numberCards: makeNumberCardState({
        visible: [makeNumberCard({ id: "m51-visible-6", value: 6, faceUp: true })],
      }),
    }),
    pendingForcedAction: {
      kind: "mission51DesignateCutter",
      sirId: "sir",
      value: 6,
    },
  });
}

describe("Mission 51 designation handler", () => {
  it("hands control to the designated cutter when they have the visible Number", () => {
    const state = makeDesignationState();
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    (server as unknown as Mission51ServerWithHandlers).handleDesignateCutter(
      makeConnection("sir"),
      "p2",
    );

    expect(state.campaign?.mission51SirIndex).toBe(0);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.pendingForcedAction).toBeUndefined();
    expect(server.broadcastGameState).toHaveBeenCalled();
  });

  it("queues the Mission 51 penalty flow when the designated player lacks the Number", () => {
    const state = makeDesignationState();
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    (server as unknown as Mission51ServerWithHandlers).handleDesignateCutter(
      makeConnection("sir"),
      "p3",
    );

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.pendingForcedAction).toEqual({
      kind: "mission51PenaltyTokenChoice",
      targetPlayerId: "p3",
      sirId: "sir",
      value: 6,
    });
  });

  it("places the chosen stand token, advances the detonator, and passes the turn left of Sir/Ma'am", () => {
    const state = makeDesignationState();
    state.pendingForcedAction = {
      kind: "mission51PenaltyTokenChoice",
      targetPlayerId: "p3",
      sirId: "sir",
      value: 6,
    };
    const server = makeServer(state);
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    (server as unknown as Mission51ServerWithHandlers).handleMission51PenaltyTokenChoice(
      makeConnection("p3"),
      12,
    );

    expect(state.players[2].infoTokens).toContainEqual({
      value: 12,
      position: -1,
      isYellow: false,
    });
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.pendingForcedAction).toEqual({
      kind: "mission51DesignateCutter",
      sirId: "p2",
      value: 6,
    });
  });
});
