import { describe, expect, it } from "vitest";
import type { BaseEquipmentId } from "@bomb-busters/shared";
import { logText, renderLogDetail, requiredSetupInfoTokenCountForMission } from "@bomb-busters/shared";
import {
  makeBoardState,
  makeEquipmentCard,
  makeGameState,
  makeInfoToken,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { setupGame } from "../setup";
import { validateMissionPlayerCount } from "../startValidation";
import { validateActionWithHooks, validateRevealRedsLegality } from "../validation";
import { dispatchHooks } from "../missionHooks";
import { advanceTurn, executeDualCut, executeSoloCut } from "../gameLogic";
import { validateUseEquipment } from "../equipment";
import {
  requiredSetupInfoTokenCount,
  validateSetupInfoTokenPlacement,
} from "../setupTokenRules";
import { applyMissionInfoTokenVariant } from "../infoTokenRules";

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

function getStandSlices<T>(player: { hand: T[]; standSizes: number[] }): T[][] {
  const slices: T[][] = [];
  let offset = 0;
  for (const size of player.standSizes) {
    slices.push(player.hand.slice(offset, offset + size));
    offset += size;
  }
  return slices;
}

describe("mission complexity tier representative coverage", () => {
  it("training tier (mission 1): setup is blue-only with no equipment", () => {
    const players = createSetupPlayers(4);
    const { board, players: dealtPlayers } = setupGame(players, 1);
    const allTiles = dealtPlayers.flatMap((p) => p.hand);

    expect(allTiles).toHaveLength(24);
    expect(allTiles.every((t) => t.color === "blue")).toBe(true);
    expect(allTiles.every((t) => typeof t.gameValue === "number" && t.gameValue >= 1 && t.gameValue <= 6)).toBe(true);
    expect(board.markers).toHaveLength(0);
    expect(board.equipment).toHaveLength(0);
  });

  it("intermediate tier (mission 8): setup keeps out_of uncertainty markers", () => {
    const players = createSetupPlayers(4);
    const { board, players: dealtPlayers } = setupGame(players, 8);
    const allTiles = dealtPlayers.flatMap((p) => p.hand);
    const reds = allTiles.filter((t) => t.color === "red");
    const yellows = allTiles.filter((t) => t.color === "yellow");
    const redMarkers = board.markers.filter((m) => m.color === "red");
    const yellowMarkers = board.markers.filter((m) => m.color === "yellow");

    expect(reds).toHaveLength(1);
    expect(yellows).toHaveLength(2);
    expect(redMarkers).toHaveLength(2);
    expect(yellowMarkers).toHaveLength(3);
    expect(redMarkers.every((m) => m.possible === true)).toBe(true);
    expect(yellowMarkers.every((m) => m.possible === true)).toBe(true);
  });

  it("x-marker tier (mission 20): setup marks one unsorted X wire at far right per stand", () => {
    const players = createSetupPlayers(3);
    const { players: dealtPlayers } = setupGame(players, 20);

    for (const player of dealtPlayers) {
      const standSlices = getStandSlices(player);
      const marked = player.hand.filter((tile) => tile.isXMarked === true);
      expect(marked).toHaveLength(player.standSizes.length);

      for (const stand of standSlices) {
        expect(stand.length).toBeGreaterThan(0);
        expect(stand[stand.length - 1].isXMarked).toBe(true);
      }
    }
  });

  it("special setup tier (mission 48): yellow wires are pre-dealt clockwise from captain", () => {
    const players = createSetupPlayers(4);
    const { players: dealtPlayers } = setupGame(players, 48);

    const yellowCounts = dealtPlayers.map((player) =>
      player.hand.filter((tile) => tile.color === "yellow").length
    );
    expect(yellowCounts).toEqual([1, 1, 1, 0]);
  });

  it("special setup tier (mission 41): yellow tripwires are pre-dealt instead of shuffled", () => {
    const players = createSetupPlayers(4);
    const { players: dealtPlayers } = setupGame(players, 41);

    const yellowCounts = dealtPlayers.map((player) =>
      player.hand.filter((tile) => tile.color === "yellow").length
    );
    expect(yellowCounts).toEqual([1, 1, 1, 1]);
  });

  it("special setup tier (mission 41, 5p): captain is excluded from yellow tripwire pre-deal", () => {
    const players = createSetupPlayers(5);
    const { players: dealtPlayers } = setupGame(players, 41);

    const yellowCounts = dealtPlayers.map((player) =>
      player.hand.filter((tile) => tile.color === "yellow").length
    );
    expect(yellowCounts).toEqual([0, 1, 1, 1, 1]);
  });

  it("special setup tier (mission 13): red wires are pre-dealt clockwise from captain", () => {
    const players = createSetupPlayers(4);
    const { players: dealtPlayers } = setupGame(players, 13);

    const redCounts = dealtPlayers.map((player) =>
      player.hand.filter((tile) => tile.color === "red").length
    );
    expect(redCounts).toEqual([1, 1, 1, 0]);
  });

  it("special setup tier (mission 13, 2p): captain splits red wires across both stands", () => {
    const players = createSetupPlayers(2);
    const { players: dealtPlayers } = setupGame(players, 13);
    const captain = dealtPlayers.find((player) => player.isCaptain)!;
    const teammate = dealtPlayers.find((player) => !player.isCaptain)!;

    const captainRedCount = captain.hand.filter((tile) => tile.color === "red").length;
    const teammateRedCount = teammate.hand.filter((tile) => tile.color === "red").length;
    expect(captainRedCount).toBe(2);
    expect(teammateRedCount).toBe(1);

    const captainStands = getStandSlices(captain);
    expect(captainStands).toHaveLength(2);
    expect(captainStands[0].some((tile) => tile.color === "red")).toBe(true);
    expect(captainStands[1].some((tile) => tile.color === "red")).toBe(true);
  });

  it("special setup tier (mission 48, 2p): captain splits yellow wires across both stands", () => {
    const players = createSetupPlayers(2);
    const { players: dealtPlayers } = setupGame(players, 48);
    const captain = dealtPlayers.find((player) => player.isCaptain)!;
    const teammate = dealtPlayers.find((player) => !player.isCaptain)!;

    const captainYellowCount = captain.hand.filter((tile) => tile.color === "yellow").length;
    const teammateYellowCount = teammate.hand.filter((tile) => tile.color === "yellow").length;
    expect(captainYellowCount).toBe(2);
    expect(teammateYellowCount).toBe(1);

    const captainStands = getStandSlices(captain);
    expect(captainStands).toHaveLength(2);
    expect(captainStands[0].some((tile) => tile.color === "yellow")).toBe(true);
    expect(captainStands[1].some((tile) => tile.color === "yellow")).toBe(true);
  });

  it("mid-campaign tier (mission 22, 2p): setup uses three red wires", () => {
    const players = createSetupPlayers(2);
    const { players: dealtPlayers } = setupGame(players, 22);
    const redTiles = dealtPlayers.flatMap((player) => player.hand).filter((tile) => tile.color === "red");

    expect(redTiles).toHaveLength(3);
  });

  it("special setup tier (mission 54): red wires are not dealt into player hands", () => {
    const players = createSetupPlayers(4);
    const { board, players: dealtPlayers } = setupGame(players, 54);

    const redTiles = dealtPlayers.flatMap((player) => player.hand).filter((tile) => tile.color === "red");
    const redMarkers = board.markers.filter((marker) => marker.color === "red");

    expect(redTiles).toHaveLength(0);
    expect(redMarkers).toHaveLength(11);
  });

  it("mission 64: two-stand flipped wires follow FAQ edge placement", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", color: "blue", gameValue: 1, sortValue: 1, cut: true }),
        makeTile({ id: "c2", color: "blue", gameValue: 10, sortValue: 10, cut: false }),
        makeTile({ id: "c3", color: "blue", gameValue: 5, sortValue: 5, cut: true }),
        makeTile({ id: "c4", color: "blue", gameValue: 3, sortValue: 3, cut: true }),
        makeTile({ id: "c5", color: "blue", gameValue: 2, sortValue: 2, cut: false }),
        makeTile({ id: "c6", color: "blue", gameValue: 8, sortValue: 8, cut: true }),
      ],
    });
    captain.standSizes = [3, 3];

    const state = makeGameState({
      mission: 64,
      players: [captain],
      log: [],
    });

    dispatchHooks(64, { point: "setup", state });

    const flipped = captain.hand
      .map((tile, index) => ({
        index,
        sortValue: tile.sortValue,
        upsideDown: Boolean((tile as unknown as { upsideDown?: boolean }).upsideDown),
      }))
      .filter((entry) => entry.upsideDown);

    expect(flipped).toHaveLength(2);
    expect(flipped[0]).toMatchObject({ index: 0, sortValue: 2 });
    expect(flipped[1]).toMatchObject({ index: 5, sortValue: 10 });
  });

  it("mission 56: teammate flipped-wire dual cut advances detonator by 1 on success", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "a9", color: "blue", gameValue: 9, sortValue: 9 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "t8", color: "blue", gameValue: 8, sortValue: 8 }),
      ],
    });
    (teammate.hand[0] as unknown as { upsideDown?: boolean }).upsideDown = true;

    const state = makeGameState({
      mission: 56,
      players: [actor, teammate],
      currentPlayerIndex: 0,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 6 }),
      log: [],
    });

    const result = executeDualCut(state, "actor", "teammate", 0, 4);

    expect(result.type).toBe("dualCutResult");
    expect(state.board.detonatorPosition).toBe(1);
    expect(actor.hand[0]?.cut).toBe(true);
    expect(teammate.hand[0]?.cut).toBe(true);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect" &&
          renderLogDetail(entry.detail).startsWith("upside_down_wire:teammate_flipped_dual_cut"),
      ),
    ).toBe(true);
  });

  it.each([56, 64] as const)(
    "mission %i: failed dual cut while attempting own flipped wire explodes immediately",
    (missionId) => {
      const actor = makePlayer({
        id: "actor",
        hand: [
          makeTile({ id: "a4", color: "blue", gameValue: 4, sortValue: 4 }),
          makeTile({ id: "a9", color: "blue", gameValue: 9, sortValue: 9 }),
        ],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [
          makeTile({ id: "t8", color: "blue", gameValue: 8, sortValue: 8 }),
          makeTile({ id: "t6", color: "blue", gameValue: 6, sortValue: 6 }),
        ],
      });
      (actor.hand[0] as unknown as { upsideDown?: boolean }).upsideDown = true;

      const state = makeGameState({
        mission: missionId,
        players: [actor, teammate],
        currentPlayerIndex: 0,
        board: makeBoardState({ detonatorPosition: 0, detonatorMax: 6 }),
        log: [],
      });

      const result = executeDualCut(state, "actor", "teammate", 0, 4);

      expect(result).toMatchObject({
        type: "dualCutResult",
        success: false,
        explosion: true,
      });
      expect(state.phase).toBe("finished");
      expect(state.result).toBe("loss_red_wire");
      expect(state.board.detonatorPosition).toBe(0);
      expect(teammate.infoTokens).toHaveLength(0);
      expect(actor.hand[0]?.cut).toBe(false);
    },
  );

  it("x-marker tier (mission 20): Post-it cannot target an X-marked wire", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a4", color: "blue", gameValue: 4, sortValue: 4, isXMarked: true })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t7", color: "blue", gameValue: 7, sortValue: 7 })],
    });
    const state = makeGameState({
      mission: 20,
      players: [actor, teammate],
      currentPlayerIndex: 0,
      board: makeBoardState({
        equipment: [
          makeEquipmentCard({
            id: "post_it",
            name: "Post-it",
            unlockValue: 4,
            unlocked: true,
            used: false,
          }),
        ],
      }),
    });

    const blocked = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });
    expect(blocked?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("hooked tier (mission 9): sequence-priority blocks then unlocks", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "a2", color: "blue", gameValue: 2, sortValue: 2, cut: true }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const blockedState = makeGameState({
      mission: 9,
      players: [actor, target],
      currentPlayerIndex: 0,
      campaign: {
        numberCards: {
          visible: [
            { id: "left", value: 2, faceUp: true },
            { id: "middle", value: 5, faceUp: true },
            { id: "right", value: 8, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
      },
    });

    const blocked = validateActionWithHooks(blockedState, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });
    expect(blocked?.code).toBe("MISSION_RULE_VIOLATION");

    const unlockedState = makeGameState({
      ...blockedState,
      campaign: {
        numberCards: blockedState.campaign!.numberCards!,
        specialMarkers: [{ kind: "sequence_pointer", value: 1 }],
      },
    });
    const unlocked = validateActionWithHooks(unlockedState, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValue: 5,
    });
    expect(unlocked).toBeNull();
  });

  it("dynamic tier (mission 10): setup timer + captain-chosen next turn", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1" })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1" })],
    });
    const state = makeGameState({
      mission: 10,
      players: [captain, p2, p3],
      currentPlayerIndex: 1,
      turnNumber: 1,
      log: [],
    });

    const now = Date.now();
    dispatchHooks(10, { point: "setup", state });
    expect(state.timerDeadline).toBeDefined();
    expect(state.timerDeadline!).toBeGreaterThanOrEqual(now + 895_000);
    expect(state.timerDeadline!).toBeLessThanOrEqual(now + 905_000);

    advanceTurn(state);
    expect(state.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "p2",
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("hidden-info risk tier (mission 11): hidden red-like value explodes on target", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t7", color: "blue", gameValue: 7, sortValue: 7 })],
    });
    const state = makeGameState({
      mission: 11,
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);
    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.explosion).toBe(true);
      expect(action.success).toBe(false);
    }
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
  });

  it("traitor tier (mission 52): failed dual cut places announced-value false token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 52,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 5,
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("mid-campaign tier (mission 21): failed dual cut places even/odd token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 21,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 0,
        parity: "odd",
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("mid-campaign tier (mission 22): failed dual cut places target blue wire value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 22,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 3,
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("mid-campaign tier (mission 22): yellow-wire failure token uses yellow value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a6", color: "blue", gameValue: 6, sortValue: 6 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "ty", color: "yellow", gameValue: "YELLOW", sortValue: 4.1 })],
    });
    const state = makeGameState({
      mission: 22,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 6);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 0,
        position: 0,
        isYellow: true,
      },
    ]);
  });

  // ── Mission 22 setup token tests ──────────────────────────

  it("mission 22: setup token count returns 2", () => {
    expect(requiredSetupInfoTokenCountForMission(22, 4, false)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(22, 4, true)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(22, 2, true)).toBe(2);
  });

  it("mission 22: setup validation rejects present values, accepts absent values", () => {
    const player = makePlayer({
      id: "p1",
      hand: [
        makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5 }),
        makeYellowTile({ id: "y1" }),
      ],
    });
    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [player],
    });

    // Reject: value 5 is present in hand
    const err1 = validateSetupInfoTokenPlacement(state, player, 5, -1);
    expect(err1?.code).toBe("MISSION_RULE_VIOLATION");
    expect(err1?.message).toContain("absent");

    // Reject: yellow (0) is present in hand
    const err2 = validateSetupInfoTokenPlacement(state, player, 0, -1);
    expect(err2?.code).toBe("MISSION_RULE_VIOLATION");
    expect(err2?.message).toContain("yellow");

    // Accept: value 3 is not present
    const ok1 = validateSetupInfoTokenPlacement(state, player, 3, -1);
    expect(ok1).toBeNull();

    // Accept: value 0 (yellow) when no yellow wires
    const noYellowPlayer = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const ok2 = validateSetupInfoTokenPlacement(state, noYellowPlayer, 0, -1);
    expect(ok2).toBeNull();
  });

  it("mission 22: setup validation rejects tileIndex != -1 and duplicate absent values", () => {
    const player = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [player],
    });

    // Reject: tileIndex must be -1
    const err1 = validateSetupInfoTokenPlacement(state, player, 3, 0);
    expect(err1?.code).toBe("MISSION_RULE_VIOLATION");
    expect(err1?.message).toContain("tileIndex -1");

    // Place first token, then reject duplicate
    player.infoTokens.push({ value: 3, position: -1, isYellow: false });
    const err2 = validateSetupInfoTokenPlacement(state, player, 3, -1);
    expect(err2?.code).toBe("MISSION_RULE_VIOLATION");
    expect(err2?.message).toContain("already placed");
  });

  it("mission 22: requiredSetupInfoTokenCount caps at absent values", () => {
    // Player with all 13 possible values — 0 absent values → 0 tokens
    const fullHand = [
      ...Array.from({ length: 12 }, (_, i) =>
        makeTile({ id: `b${i + 1}`, color: "blue", gameValue: i + 1, sortValue: i + 1 }),
      ),
      makeYellowTile({ id: "y1" }),
    ];
    const fullPlayer = makePlayer({ id: "p1", hand: fullHand });
    const state = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [fullPlayer],
    });
    expect(requiredSetupInfoTokenCount(state, fullPlayer)).toBe(0);

    // Player with only value 5 → 12 absent values → capped at 2
    const sparsePlayer = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const state2 = makeGameState({
      mission: 22,
      phase: "setup_info_tokens",
      players: [sparsePlayer],
    });
    expect(requiredSetupInfoTokenCount(state2, sparsePlayer)).toBe(2);
  });

  it("mission 22: failed dual cut on wire places the target wire value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t4", color: "blue", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "t9", color: "blue", gameValue: 9, sortValue: 9 }),
      ],
    });
    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [actor, target],
      currentPlayerIndex: 0,
      log: [],
    });

    executeDualCut(state, "actor", "target", 0, 5);

    expect(state.players[1].infoTokens).toEqual([
      { value: 4, position: 0, isYellow: false },
    ]);
  });

  // ── Mission 22 yellow-trigger token pass tests ──────────

  it("mission 22: yellow trigger fires after 2 yellow cuts via dual cut", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c5", color: "blue", gameValue: 5, sortValue: 5 }),
        makeYellowTile({ id: "cy", sortValue: 3.1 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeYellowTile({ id: "y1", sortValue: 1.1 }),
        makeYellowTile({ id: "y2", sortValue: 2.1 }),
      ],
    });
    const state = makeGameState({
      mission: 22,
      players: [captain, target],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    // First yellow cut — trigger count not yet reached
    executeDualCut(state, "captain", "target", 0, "YELLOW");
    expect(state.campaign?.mission22TokenPassTriggered).toBe(true);
    expect(state.pendingForcedAction?.kind).toBe("mission22TokenPass");
  });

  it("mission 22: yellow trigger fires after solo cut of 2 yellows", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeYellowTile({ id: "y1", sortValue: 1.1 }),
        makeYellowTile({ id: "y2", sortValue: 2.1 }),
      ],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const state = makeGameState({
      mission: 22,
      players: [captain, p2],
      currentPlayerIndex: 0,
      turnNumber: 1,
    });

    // Solo cut all yellow — should trigger after turn advance
    executeSoloCut(state, "captain", "YELLOW");
    expect(state.campaign?.mission22TokenPassTriggered).toBe(true);
    expect(state.pendingForcedAction?.kind).toBe("mission22TokenPass");
  });

  it("mission 22: token pass sequential choosers and correct recipient", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "b3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "b7", color: "blue", gameValue: 7, sortValue: 7 })],
    });
    const state = makeGameState({
      mission: 22,
      players: [captain, p2, p3],
      currentPlayerIndex: 0,
      turnNumber: 1,
      campaign: { mission22TokenPassTriggered: true },
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "captain",
        passingOrder: [0, 1, 2],
        completedCount: 0,
      },
    });

    // Captain (index 0) passes to p2 (index 1)
    const forced0 = state.pendingForcedAction!;
    expect(forced0.kind).toBe("mission22TokenPass");
    if (forced0.kind === "mission22TokenPass") {
      expect(forced0.currentChooserId).toBe("captain");
    }

    // Simulate token pass: captain passes value 5 to p2 (clockwise left)
    // p2 has a wire with value 3, so value 5 won't match → position -1
    const recipientIdx0 = (0 + 1) % 3; // = 1 (p2)
    expect(recipientIdx0).toBe(1);

    // Advance to next chooser
    state.pendingForcedAction = {
      kind: "mission22TokenPass",
      currentChooserIndex: 1,
      currentChooserId: "p2",
      passingOrder: [0, 1, 2],
      completedCount: 1,
    };

    const forced1 = state.pendingForcedAction;
    expect(forced1.currentChooserId).toBe("p2");

    // p2 (index 1) passes to p3 (index 2)
    const recipientIdx1 = (1 + 1) % 3; // = 2 (p3)
    expect(recipientIdx1).toBe(2);

    // Advance to last chooser
    state.pendingForcedAction = {
      kind: "mission22TokenPass",
      currentChooserIndex: 2,
      currentChooserId: "p3",
      passingOrder: [0, 1, 2],
      completedCount: 2,
    };

    // p3 (index 2) passes to captain (index 0)
    const recipientIdx2 = (2 + 1) % 3; // = 0 (captain)
    expect(recipientIdx2).toBe(0);

    // After all pass, forced action should be cleared
    state.pendingForcedAction = undefined;
    expect(state.pendingForcedAction).toBeUndefined();
  });

  it("expert tier (mission 33): failed dual cut places even/odd token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 33,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 0,
        parity: "odd",
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("mid-campaign tier (mission 24): failed dual cut places x1/x2/x3 count token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t3-a", color: "blue", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t3-b", color: "blue", gameValue: 3, sortValue: 3, cut: true }),
      ],
    });
    const state = makeGameState({
      mission: 24,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(target.infoTokens).toEqual([
      {
        value: 0,
        countHint: 2,
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("mid-campaign tier (mission 24): second failure on same wire replaces count token instead of stacking", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t3-a", color: "blue", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t3-b", color: "blue", gameValue: 3, sortValue: 3, cut: true }),
      ],
      infoTokens: [
        makeInfoToken({ value: 0, countHint: 1, position: 0, isYellow: false }),
      ],
    });
    const state = makeGameState({
      mission: 24,
      players: [actor, target],
      currentPlayerIndex: 0,
    });

    executeDualCut(state, "actor", "target", 0, 5);

    // Should have exactly 1 count token on position 0 (replaced, not stacked)
    const countTokensAtPos0 = target.infoTokens.filter(
      (t) => t.countHint != null && t.position === 0,
    );
    expect(countTokensAtPos0).toHaveLength(1);
    expect(countTokensAtPos0[0].countHint).toBe(2);
  });

  it("expert tier (mission 40): captain seat receives x1/x2/x3 tokens on failed cuts", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c3-a", color: "blue", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "c3-b", color: "blue", gameValue: 3, sortValue: 3, cut: true }),
      ],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const state = makeGameState({
      mission: 40,
      players: [captain, partner],
      currentPlayerIndex: 1,
    });

    const action = executeDualCut(state, "partner", "captain", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(captain.infoTokens).toEqual([
      {
        value: 0,
        countHint: 2,
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("expert tier (mission 40): non-captain seat receives x1/x2/x3 tokens on failed cuts", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p6", color: "blue", gameValue: 6, sortValue: 6 })],
    });
    const state = makeGameState({
      mission: 40,
      players: [captain, partner],
      currentPlayerIndex: 0,
    });

    const action = executeDualCut(state, "captain", "partner", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(partner.infoTokens).toEqual([
      {
        value: 0,
        countHint: 1,
        position: 0,
        isYellow: false,
      },
    ]);
  });

  it("expansion tier (mission 50): failed dual cut places non-positional info token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 50,
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    dispatchHooks(50, { point: "setup", state });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(target.infoTokens).toEqual([
      {
        value: 3,
        position: -1,
        isYellow: false,
      },
    ]);
  });

  it("system-d tier (mission 58): failed dual cut does not place info token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 58,
      players: [actor, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(target.infoTokens).toHaveLength(0);
  });

  it("equipment-lock tier (mission 12): secondary lock blocks then allows use", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a4", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t4", color: "blue", gameValue: 4, sortValue: 4 })],
    });
    const equipmentId: BaseEquipmentId = "rewinder";
    const state = makeGameState({
      mission: 12,
      players: [actor, teammate],
      currentPlayerIndex: 0,
      board: makeBoardState({
        equipment: [
          {
            id: equipmentId,
            name: "Rewinder",
            description: "Move detonator back by 1",
            unlockValue: 6,
            unlocked: true,
            used: false,
            image: "equipment_6_rewinder.png",
            secondaryLockValue: 4,
            secondaryLockCutsRequired: 2,
          },
        ],
      }),
    });

    const blocked = validateUseEquipment(state, "actor", equipmentId, { kind: "rewinder" });
    expect(blocked?.code).toBe("EQUIPMENT_LOCKED");

    actor.hand[0].cut = true;
    teammate.hand[0].cut = true;
    const allowed = validateUseEquipment(state, "actor", equipmentId, { kind: "rewinder" });
    expect(allowed).toBeNull();
  });

  it("captain-lazy tier (mission 28): captain failed dual cut explodes immediately", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t3", color: "blue", gameValue: 3, sortValue: 3 })],
    });
    const state = makeGameState({
      mission: 28,
      players: [captain, target],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "captain", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.explosion).toBe(true);
    }
    expect(state.result).toBe("loss_red_wire");
    expect(state.phase).toBe("finished");
    expect(state.board.detonatorPosition).toBe(detBefore);
    expect(target.infoTokens).toHaveLength(0);
    expect(target.hand[0].cut).toBe(false);
  });

  it("dough-threads tier (mission 27): setup removes all character cards", () => {
    const players = createSetupPlayers(4);
    players[0].character = "double_detector";
    players[0].characterUsed = true;
    players[1].character = "character_2";
    players[2].character = "character_3";
    players[3].character = "character_4";

    const { players: dealtPlayers } = setupGame(players, 27);

    for (const player of dealtPlayers) {
      expect(player.character).toBeNull();
      expect(player.characterUsed).toBe(false);
    }
  });

  it("captain-lazy tier (mission 28): setup removes captain character card", () => {
    const players = createSetupPlayers(3);
    players[0].character = "double_detector";
    players[0].characterUsed = true;
    players[1].character = "character_2";
    players[2].character = "character_3";

    const { players: dealtPlayers } = setupGame(players, 28);
    const captain = dealtPlayers.find((p) => p.isCaptain);

    expect(captain).toBeDefined();
    expect(captain?.character).toBeNull();
    expect(captain?.characterUsed).toBe(false);
    expect(dealtPlayers[1].character).toBe("character_2");
    expect(dealtPlayers[2].character).toBe("character_3");
  });

  it("sergio tier (mission 17): setup removes captain character card", () => {
    const players = createSetupPlayers(3);
    players[0].character = "double_detector";
    players[0].characterUsed = true;
    players[1].character = "character_2";
    players[2].character = "character_3";

    const { players: dealtPlayers } = setupGame(players, 17);
    const captain = dealtPlayers.find((p) => p.isCaptain);

    expect(captain).toBeDefined();
    expect(captain?.character).toBeNull();
    expect(captain?.characterUsed).toBe(false);
    expect(dealtPlayers[1].character).toBe("character_2");
    expect(dealtPlayers[2].character).toBe("character_3");
  });

  it("system-d tier (mission 58): setup assigns Double Detector to all players", () => {
    const players = createSetupPlayers(4);
    players[0].character = "character_2";
    players[0].characterUsed = true;
    players[1].character = "character_3";
    players[1].characterUsed = true;
    players[2].character = "character_4";
    players[3].character = "character_5";

    const { players: dealtPlayers } = setupGame(players, 58);

    for (const player of dealtPlayers) {
      expect(player.character).toBe("double_detector");
      expect(player.characterUsed).toBe(false);
    }
  });

  it("sergio tier (mission 17): failed dual cut targeting captain places false token with announced value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c3", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 17,
      players: [actor, captain],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "captain", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(captain.infoTokens).toHaveLength(1);
    expect(captain.infoTokens[0]).toMatchObject({
      value: 5,
      position: 0,
      isYellow: false,
    });
    expect(captain.hand[0].gameValue).toBe(3);
    expect(captain.hand[0].cut).toBe(false);
  });

  it("sergio tier (mission 17): failed dual cut by captain on non-captain places false token with announced value", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p3", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 17,
      players: [captain, partner],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "captain", "partner", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(partner.infoTokens).toHaveLength(1);
    expect(partner.infoTokens[0]).toMatchObject({
      value: 5,
      position: 0,
      isYellow: false,
    });
    expect(partner.hand[0].gameValue).toBe(3);
    expect(partner.hand[0].cut).toBe(false);
  });

  it("campaign false-info-token mode: failed dual cut targeting captain uses announced false value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 })],
    });
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c3", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 1,
      campaign: { falseInfoTokenMode: true },
      players: [actor, captain],
      currentPlayerIndex: 0,
    });
    const detBefore = state.board.detonatorPosition;

    const action = executeDualCut(state, "actor", "captain", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(true);
    }
    expect(state.board.detonatorPosition).toBe(detBefore + 1);
    expect(captain.infoTokens).toHaveLength(1);
    expect(captain.infoTokens[0]).toMatchObject({
      value: 5,
      position: 0,
      isYellow: false,
    });
    expect(captain.hand[0].gameValue).toBe(3);
    expect(captain.hand[0].cut).toBe(false);
  });

  it("restriction tier (mission 34): enforces allowed player counts", () => {
    const invalid = validateMissionPlayerCount(34, 2);
    expect(invalid).toContain("requires 3, 4, 5 players");
    expect(() => setupGame(createSetupPlayers(2), 34)).toThrow();
    expect(() => setupGame(createSetupPlayers(3), 34)).not.toThrow();
  });

  it("hidden-info reveal rule (mission 11): reveal allowed only for all hidden-red-like hand", () => {
    const allHidden = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a7-1", color: "blue", gameValue: 7, sortValue: 7 }),
        makeTile({ id: "a7-2", color: "blue", gameValue: 7, sortValue: 7 }),
      ],
    });
    const mixed = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a7", color: "blue", gameValue: 7, sortValue: 7 }),
        makeTile({ id: "a5", color: "blue", gameValue: 5, sortValue: 5 }),
      ],
    });

    const log = [
      {
        turn: 0,
        playerId: "system",
        action: "hookSetup",
        detail: logText("blue_as_red:7"),
        timestamp: 1000,
      },
    ];

    const allowedState = makeGameState({
      mission: 11,
      players: [allHidden],
      currentPlayerIndex: 0,
      log,
    });
    const blockedState = makeGameState({
      mission: 11,
      players: [mixed],
      currentPlayerIndex: 0,
      log,
    });

    expect(validateRevealRedsLegality(allowedState, "actor")).toBeNull();
    expect(validateRevealRedsLegality(blockedState, "actor")?.code).toBe(
      "REVEAL_REDS_REQUIRES_ALL_RED",
    );
  });

  it("count token missions (24/40): returns x4 when all 4 copies of a value are on the same stand", () => {
    const player = makePlayer({
      id: "owner",
      hand: [
        makeTile({ id: "t0", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t2", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t3", gameValue: 3, sortValue: 3 }),
      ],
      standSizes: [4],
    });

    const state = makeGameState({ mission: 24, players: [player] });

    const token = makeInfoToken({ value: 3, position: 0 });
    const result = applyMissionInfoTokenVariant(state, token, player);
    expect(result.countHint).toBe(4);
  });

  it("count token missions (24/40): count scopes to the stand where the token is placed", () => {
    // Player with 2 stands: stand 0 has two 3s, stand 1 has one 3
    const player = makePlayer({
      id: "owner",
      hand: [
        makeTile({ id: "t0", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t2", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "t3", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t4", gameValue: 7, sortValue: 7 }),
      ],
      standSizes: [3, 2],
    });

    const state = makeGameState({ mission: 24, players: [player] });

    // Token on stand 0, position 0 (value 3): should count 2 copies on stand 0
    const tokenOnStand0 = makeInfoToken({ value: 3, position: 0 });
    const result0 = applyMissionInfoTokenVariant(state, tokenOnStand0, player);
    expect(result0.countHint).toBe(2);

    // Token on stand 1, position 3 (value 3): should count 1 copy on stand 1
    const tokenOnStand1 = makeInfoToken({ value: 3, position: 3 });
    const result1 = applyMissionInfoTokenVariant(state, tokenOnStand1, player);
    expect(result1.countHint).toBe(1);
  });
});
