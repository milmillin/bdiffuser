import { describe, it, expect } from "vitest";
import { validateMissionPlayerCount } from "../startValidation";
import { setupGame } from "../setup";
import { makePlayer } from "@bomb-busters/shared/testing";

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
    expect(error).toContain("The Weak Link");
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
    const players = [
      makePlayer({ id: "p1", hand: [] }),
      makePlayer({ id: "p2", hand: [] }),
    ];
    expect(() => setupGame(players, 34)).toThrow(/not available for 2 players/);
  });

  it("succeeds when mission supports the player count", () => {
    const players = [
      makePlayer({ id: "p1", hand: [] }),
      makePlayer({ id: "p2", hand: [] }),
      makePlayer({ id: "p3", hand: [] }),
    ];
    // Mission 34 allows 3 players — should not throw
    expect(() => setupGame(players, 34)).not.toThrow();
  });
});
