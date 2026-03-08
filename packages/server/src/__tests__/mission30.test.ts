import { describe, expect, it } from "vitest";
import { makeGameState, makePlayer, makeTile, makeYellowTile } from "@bomb-busters/shared/testing";
import {
  canMission30PassTurn,
  executeMission30CutRemainingYellows,
  handleMission30CueEnd,
  handleMission30Deadline,
  handleMission30TurnAdvanced,
  initializeMission30Setup,
  startMission30Gameplay,
  validateMission30Action,
} from "../mission30";

function makeMission30State() {
  return makeGameState({
    mission: 30,
    phase: "playing",
    players: [
      makePlayer({
        id: "actor",
        name: "Actor",
        hand: [
          makeTile({ id: "a1", gameValue: 2, color: "blue" }),
          makeYellowTile({ id: "a2" }),
        ],
      }),
      makePlayer({
        id: "teammate",
        name: "Teammate",
        hand: [
          makeTile({ id: "t1", gameValue: 5, color: "blue" }),
          makeYellowTile({ id: "t2" }),
        ],
      }),
    ],
    currentPlayerIndex: 0,
    missionAudio: {
      audioFile: "mission_30",
      status: "paused",
      positionMs: 0,
      syncedAtMs: 0,
      durationMs: 769_080,
    },
  });
}

describe("Mission 30 scripted mission", () => {
  it("initializes scripted state with a dedicated 12-card number deck", () => {
    const state = makeMission30State();

    initializeMission30Setup(state);

    expect(state.campaign?.mission30).toMatchObject({
      phase: "briefing_locked",
      mode: "instruction",
      currentClipId: "briefing",
      mimeMode: false,
      yellowCountsRevealed: false,
    });
    expect(state.campaign?.numberCards?.deck).toHaveLength(12);
    expect(state.campaign?.numberCards?.visible).toEqual([]);
    expect(state.campaign?.numberCards?.discard).toEqual([]);
  });

  it("locks actions during the briefing and reopens standard play in the prologue", () => {
    const state = makeMission30State();
    initializeMission30Setup(state);
    startMission30Gameplay(state, 0);

    expect(validateMission30Action(state, {
      type: "soloCut",
      actorId: "actor",
      value: 2,
    })).toBe("Mission 30: listen to the current instruction before acting.");

    handleMission30CueEnd(state, 60_000);

    expect(state.campaign?.mission30).toMatchObject({
      phase: "prologue_free_play",
      mode: "action",
      currentClipId: "prologue",
    });
    expect(validateMission30Action(state, {
      type: "soloCut",
      actorId: "actor",
      value: 2,
    })).toBeNull();
  });

  it("auto-advances from prologue playback into the first target instruction", () => {
    const state = makeMission30State();
    initializeMission30Setup(state);
    startMission30Gameplay(state, 0);

    handleMission30CueEnd(state, 60_000);

    expect(state.campaign?.mission30).toMatchObject({
      phase: "prologue_free_play",
      mode: "action",
      currentClipId: "prologue",
    });

    const result = handleMission30Deadline(
      state,
      state.campaign?.mission30?.hardDeadlineMs ?? 0,
    );

    expect(result).toBeNull();
    expect(state.campaign?.mission30).toMatchObject({
      phase: "round_a1",
      mode: "instruction",
      currentClipId: "roundA1Instruction",
    });
  });

  it("advances the detonator exactly once on a missed A/B short round", () => {
    const state = makeMission30State();
    initializeMission30Setup(state);
    state.campaign!.numberCards!.deck = [{ id: "target-4", value: 4, faceUp: false }];
    startMission30Gameplay(state, 0);

    handleMission30CueEnd(state, 60_000);
    handleMission30CueEnd(state, 120_000);
    handleMission30CueEnd(state, 140_000);

    expect(state.campaign?.mission30?.phase).toBe("round_a1");
    expect(state.campaign?.mission30?.mode).toBe("action");
    expect(state.campaign?.mission30?.currentTargetValue).toBe(4);

    const result = handleMission30Deadline(
      state,
      state.campaign?.mission30?.hardDeadlineMs ?? 0,
    );

    expect(result).toBeNull();
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.campaign?.mission30).toMatchObject({
      phase: "round_a2",
      mode: "instruction",
      currentClipId: "roundA2Instruction",
    });
  });

  it("rejects illegal triple-lock targets and only allows pass when the actor has no legal move", () => {
    const state = makeMission30State();
    initializeMission30Setup(state);
    state.campaign!.mission30 = {
      phase: "triple_lock",
      mode: "action",
      currentClipId: "tripleLockBed",
      visibleTargetValues: [5, 6, 7],
      mimeMode: true,
      yellowCountsRevealed: true,
    };

    expect(validateMission30Action(state, {
      type: "dualCut",
      actorId: "actor",
      targetPlayerId: "teammate",
      targetTileIndex: 0,
      guessValue: 2,
    })).toBe("Mission 30: only the three visible target values may be cut right now.");
    expect(canMission30PassTurn(state, state.players[0]!)).toBe(true);

    state.players[0]!.hand[0]!.gameValue = 5;

    expect(canMission30PassTurn(state, state.players[0]!)).toBe(false);
  });

  it("fails yellow sweep unless the active player holds every remaining yellow", () => {
    const failingState = makeMission30State();
    initializeMission30Setup(failingState);
    failingState.campaign!.mission30 = {
      phase: "yellow_sweep",
      mode: "action",
      currentClipId: "yellowSweepInstruction",
      mimeMode: true,
      yellowCountsRevealed: true,
    };

    expect(
      executeMission30CutRemainingYellows(failingState, "actor", 200_000),
    ).toMatchObject({
      ok: true,
      result: "loss_detonator",
    });

    const successState = makeMission30State();
    initializeMission30Setup(successState);
    successState.players[1]!.hand[1]!.cut = true;
    successState.campaign!.mission30 = {
      phase: "yellow_sweep",
      mode: "action",
      currentClipId: "yellowSweepInstruction",
      mimeMode: true,
      yellowCountsRevealed: true,
    };

    expect(
      executeMission30CutRemainingYellows(successState, "actor", 200_000),
    ).toMatchObject({
      ok: true,
      result: null,
      tilesCut: 1,
    });
    expect(successState.players[0]!.hand[1]!.cut).toBe(true);
    expect(successState.campaign?.mission30).toMatchObject({
      phase: "final_cleanup",
      mode: "instruction",
      currentClipId: "finalCleanupInstruction",
    });
  });

  it("wins during final cleanup as soon as all remaining non-red wires are cut", () => {
    const state = makeMission30State();
    initializeMission30Setup(state);
    state.players[0]!.hand[0]!.cut = true;
    state.players[0]!.hand[1]!.cut = true;
    state.players[1]!.hand[0]!.cut = true;
    state.players[1]!.hand[1]!.cut = true;
    state.campaign!.mission30 = {
      phase: "final_cleanup",
      mode: "action",
      currentClipId: "finalCleanupBed",
      visibleDeadlineMs: 20_000,
      hardDeadlineMs: 25_000,
      mimeMode: false,
      yellowCountsRevealed: true,
    };

    handleMission30TurnAdvanced(state, 10_000);

    expect(state.phase).toBe("finished");
    expect(state.result).toBe("win");
    expect(state.campaign?.mission30?.phase).toBe("completed");
  });
});
