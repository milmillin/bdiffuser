import { describe, it, expect } from "vitest";
import { validateMissionPlayerCount } from "../startValidation";
import { setupGame } from "../setup";
import { makePlayer } from "@bomb-busters/shared/testing";

function createSetupPlayers(count: 2 | 3 | 4 | 5) {
  return Array.from({ length: count }, (_, idx) =>
    makePlayer({
      id: `p${idx + 1}`,
      name: `P${idx + 1}`,
      isCaptain: idx === 0,
      hand: [],
      infoTokens: [],
    }),
  );
}

describe("validateMissionPlayerCount", () => {
  it("returns null for a mission that allows all player counts", () => {
    // Mission 1 allows 2-5 players
    expect(validateMissionPlayerCount(1, 2)).toBeNull();
    expect(validateMissionPlayerCount(1, 3)).toBeNull();
    expect(validateMissionPlayerCount(1, 4)).toBeNull();
    expect(validateMissionPlayerCount(1, 5)).toBeNull();
  });

  it("returns null when player count is within allowed range", () => {
    // Mission 34 allows [3, 4, 5]
    expect(validateMissionPlayerCount(34, 3)).toBeNull();
    expect(validateMissionPlayerCount(34, 5)).toBeNull();
  });

  it("rejects a player count not in allowedPlayerCounts", () => {
    // Mission 34 allows [3, 4, 5] — 2 is not allowed
    const error = validateMissionPlayerCount(34, 2);
    expect(error).not.toBeNull();
    expect(error).toContain("Mission 34");
    expect(error).toContain("3, 4, 5");
    expect(error).toContain("2");
  });

  it("includes the mission name in the error message", () => {
    const error = validateMissionPlayerCount(34, 2);
    expect(error).toContain("The Weakest Link");
  });

  it("includes the actual player count in the error message", () => {
    // Mission 65 allows [3, 4, 5] — 2 is not allowed
    const error = validateMissionPlayerCount(65, 2);
    expect(error).not.toBeNull();
    expect(error).toContain("2");
  });
});

describe("setupGame rejects invalid player count for restricted missions", () => {
  it("throws when mission does not support the player count", () => {
    // Mission 34 requires 3-5 players; 2 should throw
    const players = createSetupPlayers(2);
    expect(() => setupGame(players, 34)).toThrow(/not available for 2 players/);
  });

  it("succeeds when mission supports the player count", () => {
    const players = createSetupPlayers(3);
    // Mission 34 allows 3 players — should not throw
    expect(() => setupGame(players, 34)).not.toThrow();
  });
});

describe("setupGame stand distribution", () => {
  it("sets standSizes by player count rules and deals evenly across stand seats", () => {
    const cases: Array<{
      count: 2 | 3 | 4 | 5;
      expectedStandCounts: number[];
    }> = [
      { count: 2, expectedStandCounts: [2, 2] },
      { count: 3, expectedStandCounts: [2, 1, 1] },
      { count: 4, expectedStandCounts: [1, 1, 1, 1] },
      { count: 5, expectedStandCounts: [1, 1, 1, 1, 1] },
    ];

    for (const { count, expectedStandCounts } of cases) {
      const players = createSetupPlayers(count);
      const { players: dealtPlayers } = setupGame(players, 1);

      expect(dealtPlayers.map((player) => player.standSizes.length)).toEqual(
        expectedStandCounts,
      );
      for (const player of dealtPlayers) {
        expect(player.standSizes.reduce((sum, size) => sum + size, 0)).toBe(
          player.hand.length,
        );
      }

      const standSeatSizes = dealtPlayers.flatMap((player) => player.standSizes);
      const minStandSize = Math.min(...standSeatSizes);
      const maxStandSize = Math.max(...standSeatSizes);
      expect(maxStandSize - minStandSize).toBeLessThanOrEqual(1);
    }
  });
});

describe("setupGame sorting", () => {
  it("deals each stand partition in non-decreasing sortValue order", () => {
    const players = createSetupPlayers(3);

    const { players: dealtPlayers } = setupGame(players, 1);

    for (const player of dealtPlayers) {
      let start = 0;
      for (const standSize of player.standSizes) {
        const end = start + standSize;
        for (let index = start + 1; index < end; index++) {
          expect(player.hand[index - 1].sortValue).toBeLessThanOrEqual(
            player.hand[index].sortValue,
          );
        }
        start = end;
      }
    }
  });
});
