import { afterEach, describe, expect, it, vi } from "vitest";
import {
  makeCampaignState,
  makeChallengeCard,
  makeChallengeCardState,
  makeConstraintCard,
  makeConstraintCardState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makeOxygenState,
  makePlayer,
  makeProgressTracker,
  makeSpecialMarker,
  makeTile,
  makeEquipmentCard,
} from "@bomb-busters/shared/testing";
import { filterStateForPlayer } from "../viewFilter";
import { buildUserMessage } from "../botPrompt";

describe("buildUserMessage campaign context", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes mission object summaries for constraints/challenges/oxygen/trackers", () => {
    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 31,
      players: [p1, p2],
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          deck: [makeNumberCard({ id: "deck-1", value: 11, faceUp: false })],
          discard: [makeNumberCard({ id: "discard-1", value: 4, faceUp: true })],
          visible: [
            makeNumberCard({ id: "visible-1", value: 2, faceUp: true }),
            makeNumberCard({ id: "visible-2", value: 9, faceUp: true }),
          ],
          playerHands: {},
        }),
        constraints: makeConstraintCardState({
          global: [makeConstraintCard({ id: "g1", name: "No Fives", active: true })],
          perPlayer: {
            p1: [makeConstraintCard({ id: "p1c", name: "No Solo", active: true })],
            p2: [makeConstraintCard({ id: "p2c", name: "No Sevens", active: true })],
          },
        }),
        challenges: makeChallengeCardState({
          deck: [makeChallengeCard({ id: "hidden", name: "Hidden Deck Challenge" })],
          active: [makeChallengeCard({ id: "active", name: "Cut Pair" })],
          completed: [makeChallengeCard({ id: "done", name: "Completed", completed: true })],
        }),
        oxygen: makeOxygenState({
          pool: 7,
          playerOxygen: { p1: 2, p2: 1 },
        }),
        nanoTracker: makeProgressTracker({ position: 1, max: 4 }),
        bunkerTracker: makeProgressTracker({ position: 2, max: 6 }),
        specialMarkers: [
          makeSpecialMarker({ kind: "x", value: 8 }),
          makeSpecialMarker({ kind: "action_pointer", value: 1 }),
        ],
      }),
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("Number cards: deck 1, discard 1");
    expect(message).toContain("Visible number cards: 2 -> 9");
    expect(message).toContain("Constraints (global): No Fives");
    expect(message).toContain("Constraints (per-player): Alpha: No Solo | Bravo: No Sevens");
    expect(message).toContain("Challenges active: Cut Pair");
    expect(message).toContain("Challenges completed: Completed");
    expect(message).toContain("Challenges deck remaining: 1");
    expect(message).toContain("Oxygen: pool 7 | Alpha:2, Bravo:1");
    expect(message).toContain("Nano tracker: 1/4");
    expect(message).toContain("Bunker tracker: 2/6");
    expect(message).toContain("Special markers: x:8, action_pointer:1");
  });

  it("renders parity tokens as EVEN/ODD in bot prompt context", () => {
    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [{ value: 0, parity: "odd", position: 0, isYellow: false }],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 8, sortValue: 8 })],
      infoTokens: [{ value: 0, parity: "even", position: 0, isYellow: false }],
    });

    const state = makeGameState({
      mission: 21,
      players: [p1, p2],
      currentPlayerIndex: 0,
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("[Info Token: ODD]");
    expect(message).toContain("[Info Token: EVEN]");
  });

  it("does not leak hidden challenge deck names in bot prompt", () => {
    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 31,
      players: [p1, p2],
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          deck: [makeChallengeCard({ id: "hidden", name: "Should Stay Hidden" })],
        }),
      }),
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("Challenges deck remaining: 1");
    expect(message).not.toContain("Should Stay Hidden");
    expect(message).not.toContain("hidden");
  });

  it("shows timer and pending choose-next forced action context", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-23T12:00:00.000Z"));

    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 3, sortValue: 3 })],
      isCaptain: true,
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const now = Date.now();
    const state = makeGameState({
      mission: 10,
      players: [p1, p2],
      currentPlayerIndex: 0,
      timerDeadline: now + 30_000,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "p1",
      },
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("Mission timer: 30s remaining");
    expect(message).toContain(
      "Forced action pending: Captain Alpha must choose next player",
    );
  });

  it("shows sequence pointer once and avoids duplicate sequence marker output", () => {
    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "p1-1", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 7, sortValue: 7 })],
    });

    const state = makeGameState({
      mission: 9,
      players: [p1, p2],
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "visible-1", value: 2, faceUp: true }),
            makeNumberCard({ id: "visible-2", value: 9, faceUp: true }),
          ],
          deck: [],
          discard: [],
          playerHands: {},
        }),
        specialMarkers: [
          makeSpecialMarker({ kind: "sequence_pointer", value: 1 }),
          makeSpecialMarker({ kind: "x", value: 8 }),
        ],
      }),
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("Sequence pointer index: 1");
    expect(message).toContain("Special markers: x:8");
    expect(message).not.toContain("sequence_pointer:1");
  });

  it("includes equipment secondary-lock progress from cut values across all players", () => {
    const p1 = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [
        makeTile({
          id: "p1-1",
          color: "blue",
          gameValue: 6,
          sortValue: 6,
          cut: true,
        }),
      ],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bravo",
      hand: [
        makeTile({
          id: "p2-1",
          color: "blue",
          gameValue: 6,
          sortValue: 6,
          cut: true,
        }),
      ],
    });

    const state = makeGameState({
      mission: 12,
      players: [p1, p2],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            secondaryLockValue: 6,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    });

    const filtered = filterStateForPlayer(state, "p1");
    const message = buildUserMessage(filtered);

    expect(message).toContain("Equipment secondary locks: Rewinder: 6 (2/2)");
  });
});
