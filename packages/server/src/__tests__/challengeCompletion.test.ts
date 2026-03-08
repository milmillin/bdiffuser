import { describe, expect, it } from 'vitest';

import {
  makeBoardState,
  makeCampaignState,
  makeChallengeCard,
  makeChallengeCardState,
  makeGameState,
  makePlayer,
  makeRedTile,
  makeTile,
} from '@bomb-busters/shared/testing';

import { executeChallengeRedCut } from '../gameLogic';
import {
  applyMissionChallengeTurnEvent,
  dispatchHooks,
  recordMissionChallengeValidation,
} from '../missionHooks';

describe('challenge_cards hook', () => {
  it('setup creates a unique real challenge deck and starts one step from loss', () => {
    const state = makeGameState({
      mission: 55,
      players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' }), makePlayer({ id: 'p3' })],
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 4 }),
      log: [],
    });

    dispatchHooks(55, { point: 'setup', state });

    const active = state.campaign?.challenges?.active ?? [];
    const deck = state.campaign?.challenges?.deck ?? [];
    const ids = [...active, ...deck].map((card) => card.id);

    expect(active).toHaveLength(3);
    expect(deck).toHaveLength(7);
    expect(new Set(ids).size).toBe(10);
    expect(state.board.detonatorPosition).toBe(3);
  });

  it('challenge 1 completes via challengeRedCut and does not refill', () => {
    const state = makeGameState({
      mission: 55,
      players: [
        makePlayer({ id: 'p1', hand: [makeTile({ gameValue: 4 })] }),
        makePlayer({ id: 'p2', hand: [makeRedTile({ id: 'red-4', sortValue: 4.5 })] }),
      ],
      board: makeBoardState({ detonatorPosition: 3, detonatorMax: 5 }),
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '1', name: 'Cut a Red Wire' })],
          completed: [],
          deck: [makeChallengeCard({ id: '2', name: '4 Consecutive Even Cuts' })],
        }),
      }),
      log: [],
    });

    const action = executeChallengeRedCut(state, 'p1', 'p2', 0);

    expect(action).toMatchObject({
      type: 'challengeRedCutResult',
      success: true,
      targetId: 'p2',
      targetTileIndex: 0,
    });
    expect(state.campaign?.challenges?.completed.map((card) => card.id)).toEqual(['1']);
    expect(state.campaign?.challenges?.active).toHaveLength(0);
    expect(state.campaign?.challenges?.deck).toHaveLength(1);
    expect(state.board.detonatorPosition).toBe(2);
  });

  it('challenge 4 uses the first three validation placements only', () => {
    const state = makeGameState({
      mission: 55,
      players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })],
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '4', name: 'Validation Sum 18' })],
          completed: [],
          deck: [],
        }),
      }),
      log: [],
    });

    recordMissionChallengeValidation(state, 5, 3, 4);
    recordMissionChallengeValidation(state, 6, 3, 4);
    recordMissionChallengeValidation(state, 8, 3, 4);
    recordMissionChallengeValidation(state, 7, 3, 4);
    applyMissionChallengeTurnEvent(state, 'p1', { actionType: 'soloCut', cutValue: 7 });

    expect(state.campaign?.challenges?.completed).toHaveLength(0);
    expect(state.campaign?.challenges?.active).toHaveLength(1);
  });

  it('challenge 8 uses its attached target values in order and does not refill', () => {
    const state = makeGameState({
      mission: 60,
      players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 4 }),
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '8', name: 'First 2 Validations Match', targetValues: [2, 9] })],
          completed: [],
          deck: [makeChallengeCard({ id: '3', name: '2-Wire Pairs' })],
        }),
      }),
      log: [],
    });

    recordMissionChallengeValidation(state, 2, 3, 4);
    recordMissionChallengeValidation(state, 9, 3, 4);
    applyMissionChallengeTurnEvent(state, 'p1', { actionType: 'dualCut', cutValue: 9 });

    expect(state.campaign?.challenges?.completed.map((card) => card.id)).toEqual(['8']);
    expect(state.campaign?.challenges?.active).toHaveLength(0);
    expect(state.campaign?.challenges?.deck).toHaveLength(1);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it('board-state challenges complete from the actual stand layout', () => {
    const state = makeGameState({
      mission: 55,
      players: [
        makePlayer({
          id: 'p1',
          hand: [
            makeTile({ id: 'a', gameValue: 1, cut: false }),
            makeTile({ id: 'b', gameValue: 2, cut: false }),
            makeTile({ id: 'c', gameValue: 3, cut: true }),
            makeTile({ id: 'd', gameValue: 4, cut: false }),
            makeTile({ id: 'e', gameValue: 5, cut: false }),
          ],
        }),
        makePlayer({ id: 'p2' }),
      ],
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '3', name: '2-Wire Pairs' })],
          completed: [],
          deck: [],
        }),
      }),
      log: [],
    });

    applyMissionChallengeTurnEvent(state, 'p1', { actionType: 'revealReds' });

    expect(state.campaign?.challenges?.completed.map((card) => card.id)).toEqual(['3']);
    expect(state.campaign?.challenges?.active).toHaveLength(0);
  });

  it('challenge 9 only counts blue odd wires and ignores other colors', () => {
    const state = makeGameState({
      mission: 55,
      players: [
        makePlayer({
          id: 'p1',
          hand: [
            makeTile({ id: 'b1', gameValue: 1, color: 'blue', cut: false }),
            makeTile({ id: 'b3', gameValue: 3, color: 'blue', cut: false }),
            makeTile({ id: 'b5', gameValue: 5, color: 'blue', cut: false }),
            makeTile({ id: 'b7', gameValue: 7, color: 'blue', cut: false }),
            makeTile({ id: 'b9', gameValue: 9, color: 'blue', cut: false }),
            makeTile({ id: 'b11', gameValue: 11, color: 'blue', cut: false }),
            makeTile({ id: 'y2', gameValue: 2, color: 'yellow', cut: false }),
            makeRedTile({ id: 'r', sortValue: 12.5 }),
          ],
        }),
      ],
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '9', name: 'All Odd Blue Stand' })],
          completed: [],
          deck: [],
        }),
      }),
      log: [],
    });

    applyMissionChallengeTurnEvent(state, 'p1', { actionType: 'revealReds' });

    expect(state.campaign?.challenges?.completed.map((card) => card.id)).toEqual(['9']);
  });

  it('challenge 10 only requires the actual end wires to remain uncut', () => {
    const state = makeGameState({
      mission: 60,
      players: [
        makePlayer({
          id: 'p1',
          hand: [
            makeTile({ id: 'left-end', gameValue: 1, cut: false }),
            makeTile({ id: 'mid-1', gameValue: 2, cut: true }),
            makeTile({ id: 'mid-2', gameValue: 3, cut: true }),
            makeTile({ id: 'mid-3', gameValue: 4, cut: true }),
            makeTile({ id: 'mid-4', gameValue: 5, cut: true }),
            makeTile({ id: 'mid-5', gameValue: 6, cut: true }),
            makeTile({ id: 'mid-6', gameValue: 7, cut: true }),
            makeTile({ id: 'mid-7', gameValue: 8, cut: true }),
            makeTile({ id: 'near-right', gameValue: 9, cut: false }),
            makeTile({ id: 'right-end', gameValue: 10, cut: false }),
          ],
        }),
      ],
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [makeChallengeCard({ id: '10', name: 'Seven Cut, Ends Uncut' })],
          completed: [],
          deck: [],
        }),
      }),
      log: [],
    });

    applyMissionChallengeTurnEvent(state, 'p1', { actionType: 'revealReds' });

    expect(state.campaign?.challenges?.completed.map((card) => card.id)).toEqual(['10']);
  });
});
