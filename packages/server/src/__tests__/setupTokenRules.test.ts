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
  autoPlaceMission13RandomSetupInfoTokens,
  validateSetupInfoTokenPlacement,
} from "../setupTokenRules";
import { dispatchHooks } from "../missionHooks";

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

  it("mission 18: all players require 0 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const p2 = makePlayer({ id: "p2", infoTokens: [] });
    const p3 = makePlayer({ id: "p3", infoTokens: [] });
    const state = makeGameState({ mission: 18, players: [captain, p2, p3] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, p2)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, p3)).toBe(0);
    expect(allSetupInfoTokensPlaced(state)).toBe(true);
  });

  it("mission 18 (2p): both captain and partner require 0 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({ mission: 18, players: [captain, partner] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, partner)).toBe(0);
    expect(allSetupInfoTokensPlaced(state)).toBe(true);
  });

  it("mission 17: captain requires 2 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({ mission: 17, players: [captain, partner] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(2);
    expect(requiredSetupInfoTokenCount(state, partner)).toBe(1);
  });

  it("mission 58: all players require 0 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const p2 = makePlayer({ id: "p2", infoTokens: [] });
    const p3 = makePlayer({ id: "p3", infoTokens: [] });
    const state = makeGameState({ mission: 58, players: [captain, p2, p3] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, p2)).toBe(0);
    expect(requiredSetupInfoTokenCount(state, p3)).toBe(0);
    expect(allSetupInfoTokensPlaced(state)).toBe(true);
  });

  it("mission 52: all players require 2 setup info tokens", () => {
    const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
    const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
    const state = makeGameState({ mission: 52, players: [captain, partner] });

    expect(requiredSetupInfoTokenCount(state, captain)).toBe(2);
    expect(requiredSetupInfoTokenCount(state, partner)).toBe(2);
    expect(allSetupInfoTokensPlaced(state)).toBe(false);
  });

  it.each([13, 27, 29, 40, 46, 51] as const)(
    "mission %i (2p): captain requires 0 setup info tokens",
    (mission) => {
      const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
      const partner = makePlayer({ id: "partner", isCaptain: false, infoTokens: [] });
      const state = makeGameState({ mission, players: [captain, partner] });

      expect(requiredSetupInfoTokenCount(state, captain)).toBe(0);
      expect(requiredSetupInfoTokenCount(state, partner)).toBe(1);
    },
  );

  it.each([13, 27, 29, 40, 46, 51] as const)(
    "mission %i (3p): captain still requires setup info token",
    (mission) => {
      const captain = makePlayer({ id: "captain", isCaptain: true, infoTokens: [] });
      const p2 = makePlayer({ id: "p2", infoTokens: [] });
      const p3 = makePlayer({ id: "p3", infoTokens: [] });
      const state = makeGameState({ mission, players: [captain, p2, p3] });

      expect(requiredSetupInfoTokenCount(state, captain)).toBe(1);
    },
  );

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

  describe("autoPlaceMission13RandomSetupInfoTokens", () => {
    it("auto-places random setup tokens and allows beside-stand placement when value is absent", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "c-1", color: "blue", gameValue: 2, sortValue: 2 }),
          makeTile({ id: "c-2", color: "blue", gameValue: 6, sortValue: 6 }),
          makeRedTile({ id: "c-r1" }),
        ],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [
          makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4 }),
          makeTile({ id: "p2-2", color: "blue", gameValue: 9, sortValue: 9 }),
        ],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [
          makeTile({ id: "p3-1", color: "blue", gameValue: 1, sortValue: 1 }),
          makeTile({ id: "p3-2", color: "blue", gameValue: 8, sortValue: 8 }),
        ],
      });
      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 13,
        players: [captain, p2, p3],
      });
      dispatchHooks(13, { point: "setup", state });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toHaveLength(3);
      expect(captain.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
      expect(p2.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
      expect(p3.infoTokens).toEqual([{ value: 1, position: 0, isYellow: false }]);
    });

    it("preserves mission-13 two-player captain skip", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [makeTile({ color: "blue", gameValue: 5, sortValue: 5 })],
      });
      const partner = makePlayer({
        id: "partner",
        hand: [makeTile({ color: "blue", gameValue: 7, sortValue: 7 })],
      });
      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 13,
        players: [captain, partner],
      });
      dispatchHooks(13, { point: "setup", state });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toHaveLength(1);
      expect(captain.infoTokens).toHaveLength(0);
      expect(partner.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
    });

    it("auto-places random setup tokens for mission 39 after setup hooks", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "c-1", color: "blue", gameValue: 3, sortValue: 3 }),
          makeTile({ id: "c-2", color: "blue", gameValue: 8, sortValue: 8 }),
          makeYellowTile({ id: "c-y1" }),
        ],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [
          makeTile({ id: "p2-1", color: "blue", gameValue: 4, sortValue: 4 }),
          makeTile({ id: "p2-2", color: "blue", gameValue: 9, sortValue: 9 }),
          makeRedTile({ id: "p2-r1" }),
        ],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [
          makeTile({ id: "p3-1", color: "blue", gameValue: 1, sortValue: 1 }),
          makeTile({ id: "p3-2", color: "blue", gameValue: 11, sortValue: 11 }),
        ],
      });

      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 39,
        players: [captain, p2, p3],
      });
      dispatchHooks(39, { point: "setup", state });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toHaveLength(3);
      expect(captain.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
      expect(p2.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
      expect(p3.infoTokens).toEqual([{ value: 1, position: 0, isYellow: false }]);
    });

    it("auto-places random setup tokens for mission 41 after setup hooks", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "c-1", color: "blue", gameValue: 3, sortValue: 3 }),
          makeYellowTile({ id: "c-y1" }),
        ],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [
          makeTile({ id: "p2-1", color: "blue", gameValue: 1, sortValue: 1 }),
          makeTile({ id: "p2-2", color: "blue", gameValue: 9, sortValue: 9 }),
        ],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [
          makeTile({ id: "p3-1", color: "blue", gameValue: 7, sortValue: 7 }),
          makeRedTile({ id: "p3-r1" }),
        ],
      });

      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 41,
        players: [captain, p2, p3],
      });
      dispatchHooks(41, { point: "setup", state });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toHaveLength(3);
      expect(captain.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
      expect(p2.infoTokens).toEqual([{ value: 1, position: 0, isYellow: false }]);
      expect(p3.infoTokens).toEqual([{ value: 1, position: -1, isYellow: false }]);
    });

    it("mission 43 (2p): auto-places a random setup token for captain only", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [makeTile({ id: "c-1", color: "blue", gameValue: 1, sortValue: 1 })],
      });
      const partner = makePlayer({
        id: "partner",
        hand: [makeTile({ id: "p-1", color: "blue", gameValue: 1, sortValue: 1 })],
      });
      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 43,
        players: [captain, partner],
      });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toEqual([
        {
          playerId: "captain",
          token: { value: 1, position: 0, isYellow: false },
        },
      ]);
      expect(captain.infoTokens).toEqual([{ value: 1, position: 0, isYellow: false }]);
      expect(partner.infoTokens).toEqual([]);
    });

    it("mission 43 (3p): does not auto-place random setup tokens", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [makeTile({ id: "c-1", color: "blue", gameValue: 1, sortValue: 1 })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", color: "blue", gameValue: 2, sortValue: 2 })],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [makeTile({ id: "p3-1", color: "blue", gameValue: 3, sortValue: 3 })],
      });
      const state = makeGameState({
        phase: "setup_info_tokens",
        mission: 43,
        players: [captain, p2, p3],
      });

      const placements = autoPlaceMission13RandomSetupInfoTokens(state, () => 0);

      expect(placements).toEqual([]);
      expect(captain.infoTokens).toEqual([]);
      expect(p2.infoTokens).toEqual([]);
      expect(p3.infoTokens).toEqual([]);
    });
  });

  describe("validateSetupInfoTokenPlacement", () => {
    const stateFor = (
      mission: ReturnType<typeof makeGameState>["mission"],
      player: ReturnType<typeof makePlayer>,
    ) =>
      makeGameState({ mission, players: [player] });

    it("accepts a matching blue wire/value placement", () => {
      const player = makePlayer({
        hand: [
          makeTile({ id: "b-3", gameValue: 3, sortValue: 3, color: "blue" }),
        ],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(1, player), player, 3, 0);
      expect(error).toBeNull();
    });

    it("rejects placing a setup token on a wire that already has any token", () => {
      const player = makePlayer({
        hand: [
          makeTile({ id: "b-3", gameValue: 3, sortValue: 3, color: "blue" }),
        ],
        infoTokens: [{ value: 3, position: 0, isYellow: false }],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(1, player), player, 3, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "This wire already has an info token",
      });
    });

    it("rejects non-integer and out-of-range values", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-3", gameValue: 3, sortValue: 3, color: "blue" })],
      });

      expect(validateSetupInfoTokenPlacement(stateFor(1, player), player, 0, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(stateFor(1, player), player, 13, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(stateFor(1, player), player, 3.5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
    });

    it("rejects invalid tile index", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-4", gameValue: 4, sortValue: 4, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(1, player), player, 4, 2);
      expect(error).toEqual({
        code: "INVALID_TILE_INDEX",
        message: "Invalid tile index",
      });
    });

    it("rejects non-blue target tiles", () => {
      const yellowPlayer = makePlayer({ hand: [makeYellowTile()] });
      const redPlayer = makePlayer({ hand: [makeRedTile()] });

      expect(validateSetupInfoTokenPlacement(stateFor(1, yellowPlayer), yellowPlayer, 5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
      expect(validateSetupInfoTokenPlacement(stateFor(1, redPlayer), redPlayer, 5, 0)?.code).toBe("MISSION_RULE_VIOLATION");
    });

    it("rejects mismatched value for target blue tile", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-6", gameValue: 6, sortValue: 6, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(1, player), player, 5, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Setup info token value must match the targeted blue wire",
      });
    });

    it("mission 22: allows setup declarations to share numeric copies with copy limits", () => {
      const captain = makePlayer({
        isCaptain: true,
        hand: [makeTile({ id: "c1", gameValue: 2, color: "blue" })],
      });
      const partner = makePlayer({
        id: "partner",
        hand: [makeTile({ id: "p1", gameValue: 5, color: "blue" })],
      });
      const partner2 = makePlayer({
        id: "partner2",
        hand: [makeTile({ id: "p2", gameValue: 6, color: "blue" })],
      });
      const state = makeGameState({
        mission: 22,
        phase: "setup_info_tokens",
        players: [captain, partner, partner2],
      });

      expect(validateSetupInfoTokenPlacement(state, captain, 3, -1)).toBeNull();
      captain.infoTokens.push({ value: 3, position: -1, isYellow: false });

      expect(validateSetupInfoTokenPlacement(state, partner, 3, -1)).toBeNull();
      partner.infoTokens.push({ value: 3, position: -1, isYellow: false });

      const error = validateSetupInfoTokenPlacement(state, partner2, 3, -1);
      expect(error?.code).toBe("MISSION_RULE_VIOLATION");
      expect(error?.message).toBe("Token value is not available on the board");
    });

    it("mission 22: allows two yellow declarations before board copies are exhausted", () => {
      const player = makePlayer({
        isCaptain: true,
        hand: [makeTile({ id: "c1", gameValue: 2, color: "blue" })],
      });
      const state = makeGameState({ mission: 22, phase: "setup_info_tokens", players: [player] });

      expect(validateSetupInfoTokenPlacement(state, player, 0, -1)).toBeNull();
      player.infoTokens.push({ value: 0, position: -1, isYellow: true });

      expect(validateSetupInfoTokenPlacement(state, player, 0, -1)).toBeNull();
      player.infoTokens.push({ value: 0, position: -1, isYellow: true });

      const error = validateSetupInfoTokenPlacement(state, player, 0, -1);
      expect(error?.code).toBe("MISSION_RULE_VIOLATION");
      expect(error?.message).toBe("Token value is not available on the board");
    });

    it("mission 22: rejects selecting a yellow token when none remain on board", () => {
      const captain = makePlayer({
        isCaptain: true,
        hand: [makeTile({ id: "c1", gameValue: 2, color: "blue" })],
        infoTokens: [{ value: 0, position: -1, isYellow: true }],
      });
      const partner = makePlayer({
        hand: [makeTile({ id: "p1", gameValue: 2, color: "blue" })],
        infoTokens: [{ value: 0, position: -1, isYellow: true }],
      });
      const player = makePlayer({
        id: "player",
        hand: [makeTile({ id: "p2", gameValue: 3, color: "blue" })],
      });
      const state = makeGameState({ mission: 22, phase: "setup_info_tokens", players: [captain, partner, player] });

      const error = validateSetupInfoTokenPlacement(state, player, 0, -1);
      expect(error?.code).toBe("MISSION_RULE_VIOLATION");
      expect(error?.message).toBe("Token value is not available on the board");
    });

    it("rejects cut tiles", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-2", gameValue: 2, sortValue: 2, color: "blue", cut: true })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(1, player), player, 2, 0);
      expect(error).toEqual({
        code: "TILE_ALREADY_CUT",
        message: "Cannot place token on a cut wire",
      });
    });

    it("mission 17: captain accepts false setup token on blue wire", () => {
      const captain = makePlayer({
        isCaptain: true,
        hand: [makeTile({ id: "b-6", gameValue: 6, sortValue: 6, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(17, captain), captain, 5, 0);
      expect(error).toBeNull();
    });

    it("mission 17: captain rejects matching setup token on blue wire", () => {
      const captain = makePlayer({
        isCaptain: true,
        hand: [makeTile({ id: "b-6", gameValue: 6, sortValue: 6, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(17, captain), captain, 6, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Captain setup token must be false in mission 17",
      });
    });

    it("mission 17: captain rejects red target wire", () => {
      const captain = makePlayer({
        isCaptain: true,
        hand: [makeRedTile()],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(17, captain), captain, 5, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Captain false setup tokens cannot target red wires",
      });
    });

    it("mission 52: accepts false setup token on blue wire", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-8", gameValue: 8, sortValue: 8, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(52, player), player, 3, 0);
      expect(error).toBeNull();
    });

    it("mission 52: accepts setup token on red wire", () => {
      const player = makePlayer({
        hand: [makeRedTile()],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(52, player), player, 7, 0);
      expect(error).toBeNull();
    });

    it("mission 52: rejects matching setup token on blue wire", () => {
      const player = makePlayer({
        hand: [makeTile({ id: "b-4", gameValue: 4, sortValue: 4, color: "blue" })],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(52, player), player, 4, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Mission 52 setup token must be false",
      });
    });

    it("mission 52: rejects yellow target wire", () => {
      const player = makePlayer({
        hand: [makeYellowTile()],
      });

      const error = validateSetupInfoTokenPlacement(stateFor(52, player), player, 6, 0);
      expect(error).toEqual({
        code: "MISSION_RULE_VIOLATION",
        message: "Mission 52 setup tokens can only target blue or red wires",
      });
    });
  });
});
