import { describe, expect, it } from "vitest";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { dispatchHooks, applyMission34WeakestLinkGuess } from "../missionHooks";
import { advanceTurn } from "../gameLogic";
import { filterStateForPlayer, filterStateForSpectator } from "../viewFilter";

function makeConstraint(id: "A" | "B" | "C" | "D" | "E") {
  return {
    id,
    name: `Constraint ${id}`,
    description: `Constraint ${id} description`,
    active: true,
  };
}

function makeHiddenMission34State() {
  const weakest = makePlayer({
    id: "weak",
    name: "Weak",
    character: "double_detector",
    hand: [makeTile({ id: "weak-1", color: "blue", gameValue: 1, sortValue: 1 })],
  });
  const guesser = makePlayer({
    id: "guess",
    name: "Guess",
    isCaptain: true,
    character: "character_e1",
    hand: [makeTile({ id: "guess-2", color: "blue", gameValue: 2, sortValue: 2 })],
  });
  const target = makePlayer({
    id: "target",
    name: "Target",
    character: "character_e2",
    hand: [makeTile({ id: "target-3", color: "blue", gameValue: 3, sortValue: 3 })],
  });

  return makeGameState({
    mission: 34,
    phase: "playing",
    players: [weakest, guesser, target],
    currentPlayerIndex: 0,
    turnNumber: 1,
    campaign: {
      mission34Hidden: {
        weakestLinkPlayerId: "weak",
        constraintsByPlayerId: {
          weak: [makeConstraint("A")],
          guess: [makeConstraint("B")],
          target: [makeConstraint("C")],
        },
      },
    },
  });
}

describe("Mission 34 hidden weakest-link flow", () => {
  it("setup creates hidden dealt cards and never enters generic constraint selection", () => {
    const state = makeGameState({
      mission: 34,
      players: [
        makePlayer({ id: "p1", character: "double_detector" }),
        makePlayer({ id: "p2", character: "character_e1" }),
        makePlayer({ id: "p3", character: "character_e2" }),
      ],
      campaign: {},
    });

    dispatchHooks(34, { point: "setup", state });

    expect(state.campaign?.constraintSelection).toBeUndefined();
    expect(state.campaign?.mission34Hidden).toBeDefined();
    expect(Object.keys(state.campaign?.mission34Hidden?.constraintsByPlayerId ?? {})).toHaveLength(3);
  });

  it("enforces the hidden constraint only for the weakest link", () => {
    const state = makeHiddenMission34State();

    const weakestResult = dispatchHooks(34, {
      point: "validate",
      state,
      action: {
        type: "dualCut",
        actorId: "weak",
        targetPlayerId: "target",
        targetTileIndex: 0,
        guessValue: 1,
      },
    });
    expect(weakestResult?.validationError).toBe("Constraint A: You must cut only even wires");

    const guesserResult = dispatchHooks(34, {
      point: "validate",
      state,
      action: {
        type: "dualCut",
        actorId: "guess",
        targetPlayerId: "target",
        targetTileIndex: 0,
        guessValue: 2,
      },
    });
    expect(guesserResult?.validationError).toBeUndefined();
  });

  it("keeps hidden cards on a wrong guess and reveals characters on a correct guess", () => {
    const wrongState = makeHiddenMission34State();
    wrongState.currentPlayerIndex = 1;

    const wrong = applyMission34WeakestLinkGuess(wrongState, "guess", "target", "A");
    expect(wrong).toMatchObject({ ok: true, correct: false });
    expect(wrongState.board.detonatorPosition).toBe(1);
    expect(wrongState.campaign?.mission34Hidden).toBeDefined();

    const correctState = makeHiddenMission34State();
    correctState.currentPlayerIndex = 1;

    const correct = applyMission34WeakestLinkGuess(correctState, "guess", "weak", "A");
    expect(correct).toMatchObject({ ok: true, correct: true });
    expect(correctState.campaign?.mission34Hidden).toBeUndefined();
    expect(correctState.players.map((player) => player.character)).toEqual([
      "double_detector",
      "character_e1",
      "character_e2",
    ]);
  });

  it("adds 2 detonator and discards all hidden cards when the weakest link is stuck", () => {
    const state = makeHiddenMission34State();
    state.currentPlayerIndex = 2;
    state.turnNumber = 5;

    advanceTurn(state);

    expect(state.board.detonatorPosition).toBe(2);
    expect(state.campaign?.mission34Hidden).toBeUndefined();
    expect(state.players.every((player) => player.character === null)).toBe(true);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(7);
  });

  it("hides other players' characters and hidden constraints in filtered views", () => {
    const state = makeHiddenMission34State();

    const weakestView = filterStateForPlayer(state, "weak");
    expect(weakestView.players.find((player) => player.id === "weak")?.character).toBe("double_detector");
    expect(weakestView.players.find((player) => player.id === "guess")?.character).toBeNull();
    expect(Object.keys(weakestView.campaign?.mission34Hidden?.constraintsByPlayerId ?? {})).toEqual(["weak"]);

    const guesserView = filterStateForPlayer(state, "guess");
    expect(guesserView.players.find((player) => player.id === "guess")?.character).toBe("character_e1");
    expect(guesserView.players.find((player) => player.id === "weak")?.character).toBeNull();
    expect(Object.keys(guesserView.campaign?.mission34Hidden?.constraintsByPlayerId ?? {})).toEqual(["guess"]);

    const spectatorView = filterStateForSpectator(state);
    expect(spectatorView.players.every((player) => player.character == null)).toBe(true);
    expect(spectatorView.campaign?.mission34Hidden?.constraintsByPlayerId ?? {}).toEqual({});
  });
});
