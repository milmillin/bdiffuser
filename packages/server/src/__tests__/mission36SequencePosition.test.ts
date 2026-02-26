import { describe, expect, it, vi } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";

vi.mock("partyserver", () => ({
  Server: class {},
  routePartykitRequest: vi.fn(),
}));

type Connection = {
  id: string;
  send: (message: string) => void;
};

type Mission36Server = {
  room: {
    gameState: ReturnType<typeof makeGameState> | null;
    players: ReturnType<typeof makeGameState>["players"];
  };
  saveState: () => void;
  broadcastGameState: () => void;
  scheduleBotTurnIfNeeded: () => void;
  sendMsg: (conn: Connection, message: unknown) => void;
};

type Mission36ServerWithAction = Mission36Server & {
  handleMission36SequencePosition: (
    conn: Connection,
    side: "left" | "right",
  ) => void;
};

function makeServer(gameState: ReturnType<typeof makeGameState> | null): Mission36Server {
  return {
    room: {
      gameState,
      players: gameState?.players ?? [],
    },
    saveState: vi.fn(),
    broadcastGameState: vi.fn(),
    scheduleBotTurnIfNeeded: vi.fn(),
    sendMsg: vi.fn(),
  } as unknown as Mission36Server;
}

function makeConnection(id: string): Connection {
  return { id, send: vi.fn() };
}

describe("mission36 sequence position", () => {
  it("sets active pointer to the chosen side and clears forced action", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 36,
      phase: "playing",
      currentPlayerIndex: 1,
      players: [
        makePlayer({
          id: "captain",
          name: "Captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 5 })],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "m36-1", value: 2, faceUp: true }),
            makeNumberCard({ id: "m36-2", value: 5, faceUp: true }),
            makeNumberCard({ id: "m36-3", value: 7, faceUp: true }),
            makeNumberCard({ id: "m36-4", value: 9, faceUp: true }),
          ],
        }),
      }),
      pendingForcedAction: {
        kind: "mission36SequencePosition",
        captainId: "captain",
        reason: "advance",
      },
      turnNumber: 8,
    });

    const server = makeServer(state) as Mission36ServerWithAction;
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("captain");

    server.handleMission36SequencePosition(conn, "right");

    expect(state.pendingForcedAction).toBeUndefined();
    const pointer = state.campaign?.specialMarkers?.find(
      (marker) => marker.kind === "sequence_pointer",
    );
    expect(pointer?.value).toBe(3);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect" &&
          renderLogDetail(entry.detail).startsWith(
            "mission36:sequence_position:side=right|reason=advance|value=9",
          ),
      ),
    ).toBe(true);
  });

  it("rejects non-captain attempts", async () => {
    const { BombBustersServer } = await import("../index.js");
    const state = makeGameState({
      mission: 36,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "captain-1", gameValue: 3 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 5 })],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "m36-1", value: 2, faceUp: true }),
            makeNumberCard({ id: "m36-2", value: 5, faceUp: true }),
          ],
        }),
      }),
      pendingForcedAction: {
        kind: "mission36SequencePosition",
        captainId: "captain",
        reason: "initial",
      },
    });

    const server = makeServer(state) as Mission36ServerWithAction;
    Object.setPrototypeOf(server, BombBustersServer.prototype);
    const conn = makeConnection("p2");

    server.handleMission36SequencePosition(conn, "left");

    expect(state.pendingForcedAction).toEqual({
      kind: "mission36SequencePosition",
      captainId: "captain",
      reason: "initial",
    });
    expect(server.sendMsg).toHaveBeenCalledTimes(1);
  });
});
