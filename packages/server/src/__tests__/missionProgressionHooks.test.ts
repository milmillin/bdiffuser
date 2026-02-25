import { describe, it, expect } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import {
  makeBoardState,
  makeGameState,
  makeTile,
  makePlayer,
} from "@bomb-busters/shared/testing";
import { dispatchHooks } from "../missionHooks";
import { executeSoloCut } from "../gameLogic";

// Side-effect import registers built-in handlers.
import "../missionHooks";

function parseChallengeValue(id: string): number | null {
  const match = /challenge-value-(\d+)/.exec(id);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

describe("mission progression hooks", () => {
  it("mission 43 setup initializes nano tracker", () => {
    const state = makeGameState({
      mission: 43,
      log: [],
    });

    dispatchHooks(43, { point: "setup", state });

    expect(state.campaign?.nanoTracker).toEqual({ position: 0, max: 6 });
    expect(
      state.log.some(
        (entry) => entry.action === "hookSetup" && renderLogDetail(entry.detail).startsWith("nano_progression:"),
      ),
    ).toBe(true);
  });

  it("mission 43 resolve advances nano and fails when max is reached", () => {
    const state = makeGameState({
      mission: 43,
      log: [],
      players: [makePlayer({ id: "p1" })],
      board: makeBoardState({ detonatorMax: 3 }),
    });
    dispatchHooks(43, { point: "setup", state });

    expect(state.campaign?.nanoTracker).toBeDefined();
    state.campaign!.nanoTracker!.position = 5;

    dispatchHooks(43, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 6 },
      cutValue: 6,
      cutSuccess: true,
    });

    expect(state.campaign?.nanoTracker?.position).toBe(6);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
  });

  it("mission 44 endTurn consumes oxygen and advances detonator on deficit", () => {
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 2 }),
    });
    dispatchHooks(44, { point: "setup", state });

    expect(state.campaign?.oxygen?.pool).toBe(4);

    dispatchHooks(44, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });
    expect(state.campaign?.oxygen?.pool).toBe(3);

    state.campaign!.oxygen!.pool = 0;
    dispatchHooks(44, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.board.detonatorPosition).toBe(2);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
  });

  it("mission 44 setup scales oxygen reserve by player count", () => {
    const cases: Array<{ playerCount: 2 | 3 | 4 | 5; expectedPool: number }> = [
      { playerCount: 2, expectedPool: 4 },
      { playerCount: 3, expectedPool: 6 },
      { playerCount: 4, expectedPool: 8 },
      { playerCount: 5, expectedPool: 10 },
    ];

    for (const { playerCount, expectedPool } of cases) {
      const players = Array.from({ length: playerCount }, (_, idx) =>
        makePlayer({ id: `p${idx + 1}` }),
      );
      const state = makeGameState({
        mission: 44,
        log: [],
        players,
      });

      dispatchHooks(44, { point: "setup", state });

      expect(state.campaign?.oxygen?.pool).toBe(expectedPool);
    }
  });

  it("mission 49 setup distributes oxygen per player count", () => {
    const cases: Array<{ playerCount: 2 | 3 | 4 | 5; expectedPerPlayer: number }> = [
      { playerCount: 2, expectedPerPlayer: 7 },
      { playerCount: 3, expectedPerPlayer: 6 },
      { playerCount: 4, expectedPerPlayer: 5 },
      { playerCount: 5, expectedPerPlayer: 4 },
    ];

    for (const { playerCount, expectedPerPlayer } of cases) {
      const players = Array.from({ length: playerCount }, (_, idx) =>
        makePlayer({ id: `p${idx + 1}` }),
      );
      const state = makeGameState({
        mission: 49,
        log: [],
        players,
      });

      dispatchHooks(49, { point: "setup", state });

      expect(state.campaign?.oxygen?.pool).toBe(0);
      for (const player of players) {
        expect(state.campaign?.oxygen?.playerOxygen[player.id]).toBe(expectedPerPlayer);
      }
    }
  });

  it("mission 55 challenge completion reduces detonator and refills active challenge", () => {
    const state = makeGameState({
      mission: 55,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" }), makePlayer({ id: "p3" })],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 4 }),
    });
    dispatchHooks(55, { point: "setup", state });

    const active = state.campaign?.challenges?.active ?? [];
    expect(active.length).toBe(3);
    const target = parseChallengeValue(active[0]?.id ?? "");
    expect(target).not.toBeNull();

    dispatchHooks(55, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: target! },
      cutValue: target!,
      cutSuccess: true,
    });

    expect(state.campaign?.challenges?.completed.length).toBe(1);
    expect(state.campaign?.challenges?.active.length).toBe(3);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it("mission 60 setup creates one active challenge per player", () => {
    const state = makeGameState({
      mission: 60,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
        makePlayer({ id: "p4" }),
      ],
    });

    dispatchHooks(60, { point: "setup", state });

    expect(state.campaign?.challenges?.active.length).toBe(4);
  });

  it("mission 62 setup reveals one Number card per player", () => {
    const state = makeGameState({
      mission: 62,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
        makePlayer({ id: "p4" }),
      ],
    });

    dispatchHooks(62, { point: "setup", state });

    const numberCards = state.campaign?.numberCards;
    expect(numberCards?.visible.length).toBe(4);
    expect(numberCards?.visible.every((card) => card.faceUp)).toBe(true);
    expect(numberCards?.deck.length).toBe(8);
  });

  it("mission 62 completion removes only the matched face-up card without refilling", () => {
    const state = makeGameState({
      mission: 62,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 6 }),
    });

    dispatchHooks(62, { point: "setup", state });

    const target = state.campaign?.numberCards?.visible[0]?.value;
    expect(typeof target).toBe("number");

    state.players[0]!.hand = [
      makeTile({ id: "p1-target", gameValue: target as number, sortValue: target as number }),
      makeTile({
        id: "p1-cut",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
    ];
    state.players[1]!.hand = [
      makeTile({
        id: "p2-cut-a",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
      makeTile({
        id: "p2-cut-b",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
    ];

    const beforeVisibleLength = state.campaign?.numberCards?.visible.length ?? 0;
    const beforeDeckLength = state.campaign?.numberCards?.deck.length ?? 0;

    dispatchHooks(62, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: target as number },
      cutValue: target as number,
      cutSuccess: true,
    });

    expect(state.board.detonatorPosition).toBe(1);
    expect(state.campaign?.numberCards?.visible.length).toBe(beforeVisibleLength - 1);
    expect(state.campaign?.numberCards?.deck.length).toBe(beforeDeckLength);
    expect(state.campaign?.numberCards?.visible.some((card) => card.value === target)).toBe(false);
    expect(state.campaign?.numberCards?.discard.some((card) => card.value === target)).toBe(true);
  });

  it("mission 66 bunker flow setup + resolve advances bunker tracker and action pointer", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [makePlayer({ id: "p1" })],
    });
    dispatchHooks(66, { point: "setup", state });

    expect(state.campaign?.bunkerTracker).toEqual({ position: 0, max: 10 });
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(0);

    dispatchHooks(66, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.bunkerTracker?.position).toBe(1);
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(1);
  });

  it("mission 66: solo cut of 4 wires advances bunker flow as two cuts", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-5a", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5b", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5c", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5d", gameValue: 5, sortValue: 5 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-2a", gameValue: 2, sortValue: 2 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    dispatchHooks(66, { point: "setup", state });
    executeSoloCut(state, "p1", 5);

    expect(state.campaign?.bunkerTracker?.position).toBe(2);
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(2);
  });
});
