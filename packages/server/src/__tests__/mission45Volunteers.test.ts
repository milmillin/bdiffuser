import { describe, expect, it, vi } from "vitest";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeRedTile,
  makeTile,
} from "@bomb-busters/shared/testing";
import { dispatchHooks } from "../missionHooks";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type Mission45Server = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
  };
  saveState: () => void;
  broadcastAction: (message: unknown) => void;
  broadcastGameState: () => void;
  scheduleBotTurnIfNeeded: () => void;
  maybeRecordMissionFailure: () => void;
  sendMsg: (conn: Connection, message: unknown) => void;
};

type Mission45ServerWithHandlers = Mission45Server & {
  handleMission45Snip: (conn: Connection) => void;
  handleMission45StartCaptainFallback: (conn: Connection) => void;
  handleMission45ChooseCaptainTarget: (conn: Connection, targetPlayerId: string) => void;
  handleMission45PenaltyTokenChoice: (conn: Connection, value: number) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): Mission45Server {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
    },
    saveState: vi.fn(),
    broadcastAction: vi.fn(),
    broadcastGameState: vi.fn(),
    scheduleBotTurnIfNeeded: vi.fn(),
    maybeRecordMissionFailure: vi.fn(),
    sendMsg: vi.fn(),
  } as unknown as Mission45Server;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

function makeVolunteerWindowState() {
  return makeGameState({
    mission: 45,
    phase: "playing",
    turnNumber: 3,
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        hand: [makeTile({ id: "captain-3", gameValue: 3 })],
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
    campaign: makeCampaignState({
      numberCards: makeNumberCardState({
        visible: [makeNumberCard({ id: "m45-visible-6", value: 6, faceUp: true })],
        deck: [makeNumberCard({ id: "m45-deck-9", value: 9, faceUp: false })],
        discard: [],
        playerHands: {},
      }),
      mission45Turn: {
        stage: "awaiting_volunteer",
        captainId: "captain",
        currentCardId: "m45-visible-6",
        currentValue: 6,
      },
    }),
    pendingForcedAction: {
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    },
  });
}

describe("Mission 45 hook setup and progression", () => {
  it("sets up a deck, reveals the first Number card, and hands control to the captain", () => {
    const state = makeGameState({
      mission: 45,
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: "captain", isCaptain: true }),
        makePlayer({ id: "p2" }),
      ],
    });

    dispatchHooks(45, { point: "setup", state });

    expect(state.campaign?.numberCards?.visible).toHaveLength(1);
    expect(state.campaign?.numberCards?.deck).toHaveLength(11);
    expect(state.campaign?.numberCards?.discard).toHaveLength(0);
    expect(state.campaign?.numberCards?.visible[0]?.faceUp).toBe(true);
    expect(state.campaign?.mission45Turn).toMatchObject({
      stage: "awaiting_volunteer",
      captainId: "captain",
      currentCardId: state.campaign?.numberCards?.visible[0]?.id,
      currentValue: state.campaign?.numberCards?.visible[0]?.value,
    });
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("discards completed Number cards and reshuffles remaining visible cards when the deck empties", () => {
    const state = makeGameState({
      mission: 45,
      phase: "playing",
      currentPlayerIndex: 1,
      players: [
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-6", gameValue: 6, cut: true })],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-6", gameValue: 6, cut: true }),
            makeTile({ id: "p2-9", gameValue: 9 }),
          ],
        }),
        makePlayer({
          id: "p3",
          hand: [
            makeTile({ id: "p3-6", gameValue: 6, cut: true }),
            makeTile({ id: "p3-6b", gameValue: 6, cut: true }),
          ],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "m45-current-6", value: 6, faceUp: true }),
            makeNumberCard({ id: "m45-next-9", value: 9, faceUp: true }),
          ],
          deck: [],
          discard: [],
          playerHands: {},
        }),
        mission45Turn: {
          stage: "awaiting_cut",
          captainId: "captain",
          currentCardId: "m45-current-6",
          currentValue: 6,
          selectedCutterId: "p2",
        },
      }),
    });

    const result = dispatchHooks(45, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(result).toEqual({ nextPlayerIndex: 0 });
    expect(state.campaign?.numberCards?.discard.map((card) => card.value)).toEqual([6]);
    expect(state.campaign?.numberCards?.visible.map((card) => card.value)).toEqual([9]);
    expect(state.campaign?.numberCards?.deck).toHaveLength(0);
    expect(state.campaign?.mission45Turn).toMatchObject({
      stage: "awaiting_volunteer",
      captainId: "captain",
      currentCardId: "m45-next-9",
      currentValue: 9,
    });
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    });
  });
});

describe("Mission 45 server handlers", () => {
  it("assigns the first valid Snip! volunteer as the cutter", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeVolunteerWindowState();
    const server = makeServer(state) as Mission45ServerWithHandlers;
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleMission45Snip(makeConnection("p2"));

    expect(state.campaign?.mission45Turn).toMatchObject({
      stage: "awaiting_cut",
      selectedCutterId: "p2",
      currentValue: 6,
    });
    expect(state.pendingForcedAction).toBeUndefined();
    expect(state.currentPlayerIndex).toBe(1);
    expect(server.sendMsg).not.toHaveBeenCalled();
  });

  it("penalizes a wrong volunteer and moves to captain fallback", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeVolunteerWindowState();
    const beforeDetonator = state.board.detonatorPosition;
    const server = makeServer(state) as Mission45ServerWithHandlers;
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleMission45Snip(makeConnection("p3"));

    expect(state.board.detonatorPosition).toBe(beforeDetonator + 1);
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45CaptainChoice",
      captainId: "captain",
    });
    expect(state.campaign?.mission45Turn).toMatchObject({
      stage: "awaiting_captain_choice",
      captainId: "captain",
      currentValue: 6,
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("applies the captain wrong-target penalty and resolves it after a token choice", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeVolunteerWindowState();
    const server = makeServer(state) as Mission45ServerWithHandlers;
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleMission45StartCaptainFallback(makeConnection("captain"));
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45CaptainChoice",
      captainId: "captain",
    });

    const beforeDetonator = state.board.detonatorPosition;
    server.handleMission45ChooseCaptainTarget(makeConnection("captain"), "p3");

    expect(state.board.detonatorPosition).toBe(beforeDetonator + 1);
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45PenaltyTokenChoice",
      playerId: "p3",
    });
    expect(state.campaign?.mission45Turn).toMatchObject({
      stage: "awaiting_penalty_token",
      penaltyPlayerId: "p3",
      currentValue: 6,
    });
    expect(state.currentPlayerIndex).toBe(2);

    server.handleMission45PenaltyTokenChoice(makeConnection("p3"), 12);

    expect(state.players[2]?.infoTokens.some((token) => token.position === -1 && token.value === 12)).toBe(true);
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    });
    expect(state.campaign?.mission45Turn?.stage).toBe("awaiting_volunteer");
    expect(state.turnNumber).toBe(4);
  });

  it("lets a red-only player Snip! into the Reveal Reds branch", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeVolunteerWindowState();
    state.players[2] = makePlayer({
      id: "p3",
      name: "Player 3",
      hand: [makeRedTile({ id: "p3-red-1" }), makeRedTile({ id: "p3-red-2" })],
    });
    const server = makeServer(state) as Mission45ServerWithHandlers;
    Object.setPrototypeOf(server, BombBustersServer.prototype);

    server.handleMission45Snip(makeConnection("p3"));

    expect(state.players[2]?.hand.every((tile) => tile.cut)).toBe(true);
    expect(server.broadcastAction).toHaveBeenCalledWith({
      type: "revealRedsResult",
      actorId: "p3",
      tilesRevealed: 2,
    });
    expect(state.pendingForcedAction).toEqual({
      kind: "mission45VolunteerWindow",
      captainId: "captain",
    });
    expect(state.campaign?.mission45Turn?.stage).toBe("awaiting_volunteer");
  });
});
