import { describe, expect, it } from "vitest";
import type { BaseEquipmentId } from "@bomb-busters/shared";
import {
  makeBoardState,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { setupGame } from "../setup";
import { validateMissionPlayerCount } from "../startValidation";
import { validateActionWithHooks, validateRevealRedsLegality } from "../validation";
import { dispatchHooks } from "../missionHooks";
import { advanceTurn, executeDualCut } from "../gameLogic";
import { validateUseEquipment } from "../equipment";

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
          detail: "blue_as_red:7",
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
        detail: "blue_as_red:7",
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
});
