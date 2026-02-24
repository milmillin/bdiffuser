import { describe, expect, it } from "vitest";
import type {
  GameState,
  MissionId,
  Player,
  PlayerCount,
  WireValue,
} from "@bomb-busters/shared";
import { MISSION_SCHEMAS } from "@bomb-busters/shared";
import { makePlayer, withSeededRandom } from "@bomb-busters/shared/testing";
import {
  executeDualCut,
  executeRevealReds,
  executeSimultaneousRedCut,
  executeSoloCut,
} from "../gameLogic";
import { applyMissionInfoTokenVariant } from "../infoTokenRules";
import { dispatchHooks } from "../missionHooks";
import { setupGame } from "../setup";
import {
  advanceToNextSetupPlayer,
  allSetupInfoTokensPlaced,
  autoPlaceMission13RandomSetupInfoTokens,
  requiredSetupInfoTokenCount,
  validateSetupInfoTokenPlacement,
} from "../setupTokenRules";
import { isRepeatNextPlayerSelectionDisallowed } from "../turnOrderRules";
import { validateActionWithHooks } from "../validation";

const CAMPAIGN_MISSIONS: MissionId[] = Array.from({ length: 66 - 9 + 1 }, (_, idx) =>
  (9 + idx) as MissionId,
);
const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5];
const MAX_SETUP_STEPS = 200;
const MAX_ACTION_STEPS = 800;

type ChosenAction =
  | {
      kind: "dualCut";
      actorId: string;
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
      actorTileIndex: number;
    }
  | {
      kind: "soloCut";
      actorId: string;
      value: number | "YELLOW";
    }
  | {
      kind: "revealReds";
      actorId: string;
    }
  | {
      kind: "simultaneousRedCut";
      actorId: string;
      targets: Array<{ playerId: string; tileIndex: number }>;
    };

function createPlayers(count: PlayerCount): Player[] {
  return Array.from({ length: count }, (_, idx) =>
    makePlayer({
      id: `p${idx + 1}`,
      name: `P${idx + 1}`,
      isCaptain: idx === 0,
      hand: [],
      infoTokens: [],
      characterUsed: false,
      isBot: false,
      connected: true,
    }),
  );
}

function advanceSetupTurnAndMaybeStart(state: GameState): void {
  if (state.phase !== "setup_info_tokens") return;

  advanceToNextSetupPlayer(state);
  if (allSetupInfoTokensPlaced(state)) {
    state.phase = "playing";
    const captainIndex = state.players.findIndex((player) => player.isCaptain);
    state.currentPlayerIndex = captainIndex >= 0 ? captainIndex : 0;
    state.turnNumber = 1;
  }
}

function pickSetupPlacement(
  state: GameState,
  player: Player,
): { value: number; tileIndex: number } | null {
  // Mission 22: absent-value tokens use tileIndex -1 and value 0-12
  if (state.mission === 22) {
    for (let value = 0; value <= 12; value++) {
      const error = validateSetupInfoTokenPlacement(state, player, value, -1);
      if (!error) {
        return { value, tileIndex: -1 };
      }
    }
    return null;
  }

  for (let tileIndex = 0; tileIndex < player.hand.length; tileIndex++) {
    for (let value = 1; value <= 12; value++) {
      const error = validateSetupInfoTokenPlacement(state, player, value, tileIndex);
      if (!error) {
        return { value, tileIndex };
      }
    }
  }
  return null;
}

function formatValue(value: WireValue): string {
  return typeof value === "number" ? String(value) : value;
}

function summarizeUncutByPlayer(state: Readonly<GameState>): string {
  return state.players
    .map((player) => {
      const values = player.hand
        .filter((tile) => !tile.cut)
        .map((tile) => formatValue(tile.gameValue));
      return `${player.id}[${values.join(",")}]`;
    })
    .join(" ");
}

function buildSimultaneousRedCutTargets(
  state: Readonly<GameState>,
): Array<{ playerId: string; tileIndex: number }> | null {
  const requiredColor = state.mission === 48 ? "yellow" : "red";
  const targets: Array<{ playerId: string; tileIndex: number }> = [];

  for (const player of state.players) {
    for (let tileIndex = 0; tileIndex < player.hand.length; tileIndex++) {
      const tile = player.hand[tileIndex];
      if (!tile || tile.cut || tile.color !== requiredColor) continue;
      targets.push({ playerId: player.id, tileIndex });
    }
  }

  return targets.length >= 3 ? targets.slice(0, 3) : null;
}

function pickAction(state: GameState, actor: Player): ChosenAction | null {
  const actorValueToTileIndex = new Map<number | "YELLOW", number>();
  for (let i = 0; i < actor.hand.length; i++) {
    const tile = actor.hand[i];
    if (tile.cut || tile.gameValue === "RED") continue;
    if (!actorValueToTileIndex.has(tile.gameValue)) {
      actorValueToTileIndex.set(tile.gameValue, i);
    }
  }

  for (const target of state.players) {
    if (target.id === actor.id) continue;
    for (let targetTileIndex = 0; targetTileIndex < target.hand.length; targetTileIndex++) {
      const targetTile = target.hand[targetTileIndex];
      if (targetTile.cut || targetTile.gameValue === "RED") continue;

      const actorTileIndex = actorValueToTileIndex.get(targetTile.gameValue);
      if (actorTileIndex == null) continue;

      const guessValue = targetTile.gameValue;
      const error = validateActionWithHooks(state, {
        type: "dualCut",
        actorId: actor.id,
        targetPlayerId: target.id,
        targetTileIndex,
        guessValue,
      });
      if (!error) {
        return {
          kind: "dualCut",
          actorId: actor.id,
          targetPlayerId: target.id,
          targetTileIndex,
          guessValue,
          actorTileIndex,
        };
      }
    }
  }

  // Fallback path: the rules explicitly allow intentional incorrect
  // dual-cut declarations, so if no "safe" dual/solo/reveal action exists,
  // try any server-legal dual cut to keep playability simulations moving.
  for (const [guessValue, actorTileIndex] of actorValueToTileIndex) {
    for (const target of state.players) {
      if (target.id === actor.id) continue;
      for (let targetTileIndex = 0; targetTileIndex < target.hand.length; targetTileIndex++) {
        const targetTile = target.hand[targetTileIndex];
        if (targetTile.cut) continue;

        const error = validateActionWithHooks(state, {
          type: "dualCut",
          actorId: actor.id,
          targetPlayerId: target.id,
          targetTileIndex,
          guessValue,
        });
        if (!error) {
          return {
            kind: "dualCut",
            actorId: actor.id,
            targetPlayerId: target.id,
            targetTileIndex,
            guessValue,
            actorTileIndex,
          };
        }
      }
    }
  }

  const seenSoloValues = new Set<number | "YELLOW">();
  for (const tile of actor.hand) {
    if (tile.cut || tile.gameValue === "RED") continue;
    if (seenSoloValues.has(tile.gameValue)) continue;
    seenSoloValues.add(tile.gameValue);

    const error = validateActionWithHooks(state, {
      type: "soloCut",
      actorId: actor.id,
      value: tile.gameValue,
    });
    if (!error) {
      return {
        kind: "soloCut",
        actorId: actor.id,
        value: tile.gameValue,
      };
    }
  }

  const revealError = validateActionWithHooks(state, {
    type: "revealReds",
    actorId: actor.id,
  });
  if (!revealError) {
    return { kind: "revealReds", actorId: actor.id };
  }

  const simultaneousRedTargets = buildSimultaneousRedCutTargets(state);
  if (simultaneousRedTargets) {
    const simultaneousRedError = validateActionWithHooks(state, {
      type: "simultaneousRedCut",
      actorId: actor.id,
      targets: simultaneousRedTargets,
    });
    if (!simultaneousRedError) {
      return {
        kind: "simultaneousRedCut",
        actorId: actor.id,
        targets: simultaneousRedTargets,
      };
    }
  }

  return null;
}

function resolveForcedAction(state: GameState): boolean {
  const forced = state.pendingForcedAction;
  if (!forced) return false;

  if (forced.kind === "designateCutter") {
    // Pick a target: prefer players with radar "yes", then any with uncut tiles
    const designatorIndex = state.players.findIndex((p) => p.id === forced.designatorId);
    const playerCount = state.players.length;
    let targetIndex: number | null = null;

    // First pass: player with radar yes
    for (let i = 1; i <= playerCount; i++) {
      const idx = (designatorIndex + i) % playerCount;
      const player = state.players[idx];
      if (!player.hand.some((t) => !t.cut)) continue;
      if (forced.radarResults[player.id]) {
        targetIndex = idx;
        break;
      }
    }

    // Second pass: any player with uncut tiles
    if (targetIndex === null) {
      for (let i = 1; i <= playerCount; i++) {
        const idx = (designatorIndex + i) % playerCount;
        const player = state.players[idx];
        if (!player.hand.some((t) => !t.cut)) continue;
        targetIndex = idx;
        break;
      }
    }

    if (targetIndex === null) {
      throw new Error(
        `Mission ${state.mission}: designateCutter has no valid target (turn=${state.turnNumber})`,
      );
    }

    state.campaign ??= {};
    state.campaign.mission18DesignatorIndex = designatorIndex;
    state.currentPlayerIndex = targetIndex;
    state.pendingForcedAction = undefined;
    return true;
  }

  if (forced.kind === "mission22TokenPass") {
    // Auto-resolve: each chooser passes a random numeric value
    const recipientIndex = (forced.currentChooserIndex + 1) % state.players.length;
    const recipient = state.players[recipientIndex];
    const value = Math.floor(Math.random() * 12) + 1;
    recipient.infoTokens.push({ value, position: -1, isYellow: false });

    const nextCompleted = forced.completedCount + 1;
    if (nextCompleted >= forced.passingOrder.length) {
      state.pendingForcedAction = undefined;
    } else {
      const nextChooserIndex = forced.passingOrder[nextCompleted];
      state.pendingForcedAction = {
        ...forced,
        currentChooserIndex: nextChooserIndex,
        currentChooserId: state.players[nextChooserIndex].id,
        completedCount: nextCompleted,
      };
    }
    return true;
  }

  if (forced.kind !== "chooseNextPlayer") return false;

  const candidates = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.hand.some((tile) => !tile.cut))
    .filter(
      ({ player }) =>
        !isRepeatNextPlayerSelectionDisallowed(
          state,
          forced.lastPlayerId,
          player.id,
        ),
    );

  const choice = candidates[0];
  if (!choice) {
    throw new Error(
      `Mission ${state.mission}: forced action has no valid target (turn=${state.turnNumber})`,
    );
  }

  state.pendingForcedAction = undefined;
  state.currentPlayerIndex = choice.index;
  return true;
}

function runMissionSimulation(missionId: MissionId, playerCount: PlayerCount): GameState {
  const seed = missionId * 10_000 + playerCount * 101;

  return withSeededRandom(seed, () => {
    const players = createPlayers(playerCount);
    const { board, players: dealtPlayers } = setupGame(players, missionId);
    const captainIndex = dealtPlayers.findIndex((player) => player.isCaptain);

    const state: GameState = {
      phase: "setup_info_tokens",
      roomId: `test-${missionId}-${playerCount}`,
      players: dealtPlayers,
      board,
      currentPlayerIndex: captainIndex >= 0 ? captainIndex : 0,
      turnNumber: 0,
      mission: missionId,
      result: null,
      log: [],
      chat: [],
    };

    dispatchHooks(missionId, { point: "setup", state });
    autoPlaceMission13RandomSetupInfoTokens(state);
    advanceSetupTurnAndMaybeStart(state);

    let setupSteps = 0;
    while (state.phase === "setup_info_tokens") {
      setupSteps++;
      if (setupSteps > MAX_SETUP_STEPS) {
        throw new Error(
          `Mission ${missionId}: setup exceeded ${MAX_SETUP_STEPS} steps`,
        );
      }

      const player = state.players[state.currentPlayerIndex];
      if (!player) {
        throw new Error(`Mission ${missionId}: missing setup player at index ${state.currentPlayerIndex}`);
      }

      const requiredCount = requiredSetupInfoTokenCount(state, player);
      if (player.infoTokens.length < requiredCount) {
        const placement = pickSetupPlacement(state, player);
        if (!placement) {
          throw new Error(
            `Mission ${missionId}: no legal setup token placement for ${player.id}`,
          );
        }

        const isYellowToken = missionId === 22 && placement.value === 0;
        const token = applyMissionInfoTokenVariant(
          state,
          {
            value: placement.value,
            position: placement.tileIndex,
            isYellow: isYellowToken,
          },
          player,
        );
        player.infoTokens.push(token);
      }

      advanceSetupTurnAndMaybeStart(state);
    }

    if (state.phase !== "playing") {
      throw new Error(
        `Mission ${missionId}: expected phase=playing after setup, got phase=${state.phase}`,
      );
    }

    for (let step = 0; step < MAX_ACTION_STEPS && state.phase === "playing"; step++) {
      if (resolveForcedAction(state)) continue;

      const actor = state.players[state.currentPlayerIndex];
      if (!actor) {
        throw new Error(
          `Mission ${missionId}: missing actor at index ${state.currentPlayerIndex}`,
        );
      }

      const action = pickAction(state, actor);
      if (!action) {
        // Mission 16 FAQ: if a player only has sequence-blocked wires left,
        // the bomb explodes immediately.
        if (missionId === 16) {
          state.phase = "finished";
          state.result = "loss_detonator";
          break;
        }
        throw new Error(
          `Mission ${missionId}: no legal action for ${actor.id} at turn ${state.turnNumber}. ` +
          `Uncut=${summarizeUncutByPlayer(state)}`,
        );
      }

      if (action.kind === "dualCut") {
        executeDualCut(
          state,
          action.actorId,
          action.targetPlayerId,
          action.targetTileIndex,
          action.guessValue,
          action.actorTileIndex,
        );
      } else if (action.kind === "soloCut") {
        executeSoloCut(state, action.actorId, action.value);
      } else if (action.kind === "simultaneousRedCut") {
        executeSimultaneousRedCut(state, action.actorId, action.targets);
      } else {
        executeRevealReds(state, action.actorId);
      }
    }

    if (state.phase === "playing") {
      throw new Error(
        `Mission ${missionId}: did not reach terminal state within ${MAX_ACTION_STEPS} actions`,
      );
    }

    return state;
  });
}

describe("campaign end-to-end playability gate", () => {
  for (const missionId of CAMPAIGN_MISSIONS) {
    const schema = MISSION_SCHEMAS[missionId];
    const allowedPlayerCounts = schema.allowedPlayerCounts ?? PLAYER_COUNTS;

    for (const playerCount of allowedPlayerCounts) {
      it(`mission ${missionId} (${playerCount} players) reaches terminal state`, () => {
        const finalState = runMissionSimulation(missionId, playerCount);
        expect(finalState.phase).toBe("finished");
        expect(finalState.result).not.toBeNull();
      });
    }
  }
});
