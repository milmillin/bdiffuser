import { describe, expect, it } from 'vitest';

import {
  makeBoardState,
  makeCampaignState,
  makeChallengeCard,
  makeChallengeCardState,
  makeGameState,
  makePlayer,
  makeTile,
} from '@bomb-busters/shared/testing';

import { dispatchHooks } from '../missionHooks';

const CHALLENGE_MISSION_ID = 55;

describe('challenge_rewards hook', () => {
  it('setup creates challenge deck and active cards', () => {
    const state = makeGameState({
      mission: CHALLENGE_MISSION_ID,
      players: [makePlayer(), makePlayer({ id: 'player-2', name: 'Bob' })],
      log: [],
    });

    dispatchHooks(CHALLENGE_MISSION_ID, { point: 'setup', state });

    expect(state.campaign?.challenges).toBeDefined();
    expect(state.campaign!.challenges!.active.length).toBe(state.players.length);
    expect(state.campaign!.challenges!.deck.length).toBeGreaterThan(0);
  });

  it('resolve completes matching challenge on successful cut', () => {
    const state = makeGameState({
      mission: CHALLENGE_MISSION_ID,
      players: [
        makePlayer({ id: 'player-1', hand: [makeTile({ gameValue: 5 })] }),
        makePlayer({ id: 'player-2', name: 'Bob' }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 6 }),
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [
            makeChallengeCard({
              id: 'challenge-value-5-0',
              name: 'Challenge 5',
              description: 'Cut value 5',
            }),
          ],
          completed: [],
          deck: [makeChallengeCard({ id: 'challenge-value-3-1', name: 'Challenge 3' })],
        }),
      }),
      log: [],
    });

    dispatchHooks(CHALLENGE_MISSION_ID, {
      point: 'resolve',
      state,
      action: {
        type: 'dualCut',
        actorId: 'player-1',
        targetPlayerId: 'player-2',
        targetTileIndex: 0,
        guessValue: 5,
      },
      cutValue: 5,
      cutSuccess: true,
    });

    expect(state.campaign!.challenges!.completed.length).toBe(1);
    expect(state.campaign!.challenges!.completed[0].id).toBe('challenge-value-5-0');
    expect(state.board.detonatorPosition).toBe(1);
  });

  it('does not complete challenge on failed cut', () => {
    const state = makeGameState({
      mission: CHALLENGE_MISSION_ID,
      players: [
        makePlayer({ id: 'player-1', hand: [makeTile({ gameValue: 5 })] }),
        makePlayer({ id: 'player-2', name: 'Bob' }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 6 }),
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [
            makeChallengeCard({
              id: 'challenge-value-5-0',
              name: 'Challenge 5',
              description: 'Cut value 5',
            }),
          ],
          completed: [],
          deck: [makeChallengeCard({ id: 'challenge-value-3-1', name: 'Challenge 3' })],
        }),
      }),
      log: [],
    });

    dispatchHooks(CHALLENGE_MISSION_ID, {
      point: 'resolve',
      state,
      action: {
        type: 'dualCut',
        actorId: 'player-1',
        targetPlayerId: 'player-2',
        targetTileIndex: 0,
        guessValue: 5,
      },
      cutValue: 5,
      cutSuccess: false,
    });

    expect(state.campaign!.challenges!.completed).toHaveLength(0);
    expect(state.campaign!.challenges!.active).toHaveLength(1);
    expect(state.campaign!.challenges!.active[0].id).toBe('challenge-value-5-0');
    expect(state.campaign!.challenges!.deck).toHaveLength(1);
    expect(state.board.detonatorPosition).toBe(2);
  });

  it('draws new active card from deck after completion', () => {
    const state = makeGameState({
      mission: CHALLENGE_MISSION_ID,
      players: [
        makePlayer({ id: 'player-1', hand: [makeTile({ gameValue: 5 })] }),
        makePlayer({ id: 'player-2', name: 'Bob' }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 6 }),
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          active: [
            makeChallengeCard({
              id: 'challenge-value-5-0',
              name: 'Challenge 5',
              description: 'Cut value 5',
            }),
          ],
          completed: [],
          deck: [
            makeChallengeCard({ id: 'challenge-value-3-1', name: 'Challenge 3' }),
            makeChallengeCard({ id: 'challenge-value-7-2', name: 'Challenge 7' }),
          ],
        }),
      }),
      log: [],
    });

    dispatchHooks(CHALLENGE_MISSION_ID, {
      point: 'resolve',
      state,
      action: {
        type: 'dualCut',
        actorId: 'player-1',
        targetPlayerId: 'player-2',
        targetTileIndex: 0,
        guessValue: 5,
      },
      cutValue: 5,
      cutSuccess: true,
    });

    expect(state.campaign!.challenges!.completed).toHaveLength(1);
    expect(state.campaign!.challenges!.active).toHaveLength(2);
    expect(state.campaign!.challenges!.active[0].id).toBe('challenge-value-3-1');
    expect(state.campaign!.challenges!.active[1].id).toBe('challenge-value-7-2');
    expect(state.campaign!.challenges!.deck).toHaveLength(0);
  });
});
