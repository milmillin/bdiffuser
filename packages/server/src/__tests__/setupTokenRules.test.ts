import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
  makeRedTile,
} from "@bomb-busters/shared/testing";
import {
  requiredSetupInfoTokenCount,
  hasCompletedSetupInfoTokens,
  allSetupInfoTokensPlaced,
  advanceToNextSetupPlayer,
  validateSetupInfoTokenPlacement,
} from "../setupTokenRules";

describe("setupTokenRules", () => {
  it("mission 11 (2p): captain requires 0 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({ mission: 11, players: [captain, partner] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, partner)).toBe(1);
  });

  it("mission 11 (3p): captain still requires token", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const p2 = makePlayer({ id: "p2", infoTokens: [] });
    const p3 = makePlayer({ id: "p3", infoTokens: [] });
    const state = makeGameState({ mission: 11, players: [captain, p2, p3] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(1);
  });

  it("non-mission-11 (2p): captain requires token", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({ mission: 1, players: [captain, partner] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(1);
  });

  it("considers setup complete when only non-captain placed token in mission 11 (2p)", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({
      id: "partner",
      isCaptain: false,
      infoTokens: [{ value: 3, position: 0, isYellow: false }],
    });
    const state = makeGameState({ mission: 11, players: [captain, partner] });

    expect(hasCompletedSetupInfoTokens(state, captain)).toBe(true);
    expect(hasCompletedSetupInfoTokens(state, partner)).toBe(true);
    expect(allSetupInfoTokensPlaced(state)).toBe(true);
  });

  it("advanceToNextSetupPlayer skips already-complete captain in mission 11 (2p)", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({
      mission: 11,
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    advanceToNextSetupPlayer(state);
    expect(state.currentPlayerIndex).toBe(1);
  });

  describe("validateSetupInfoTokenPlacement", () => {
    it("accepts a matching blue wire/value placement", () => {
      const player = makePlayer({
        hand: [
          makeTile({ id: "b-3", gameValue: 3, sortValue: 3, color: "blue" }),
        ],
      });

      const error = validateSetupInfoTokenPlacement(player, 3, 0);
      expect(error).toBeNull();
    });

    it("rejects non-integer and out-of-range values", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-3", gameValue: 3, sortValue: 3, color: "blue" })],
      });

      expect(validateSetupInfoTokenPlacement(player, 0, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(player, 13, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(player, 3.5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
    });

    it("rejects invalid tile index", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-4", gameValue: 4, sortValue: 4, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(player, 4, 2);
      expect(error).toEqual({
        code: "INVALID_TILE_INDEX",
        message: "Invalid tile index",
      });
    });

    it("rejects non-blue target tiles", () => {
      const yellowPlayer = makePlayer({ hand: [makeYellowTile()] });
      const redPlayer = makePlayer({ hand: [makeRedTile()] });

      expect(validateSetupInfoTokenPlacement(yellowPlayer, 5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(redPlayer, 5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
    });

    it("rejects mismatched value for target blue tile", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-6", gameValue: 6, sortValue: 6, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(player, 5, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Setup info token value must match the targeted blue wire",
      });
    });

    it("rejects cut tiles", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-2", gameValue: 2, sortValue: 2, color: "blue", cut: true })],
      });

      const error = validateSetupInfoTokenPlacement(player, 2, 0);
      expect(error).toEqual({
        code: "TILE_ALREADY_CUT",
        message: "Cannot place token on a cut wire",
      });
    });
  });
});
