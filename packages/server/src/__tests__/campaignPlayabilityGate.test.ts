import { describe, expect, it, vi } from "vitest";
import type {
  GameState,
  MissionId,
  Player,
  PlayerCount,
  WireValue,
} from "@bomb-busters/shared";
import {
  getAvailableInfoTokenChoiceValues,
  MISSION_SCHEMAS,
} from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile, withSeededRandom } from "@bomb-busters/shared/testing";
import {
  executeDualCut,
  executeRevealReds,
  advanceTurn,
  executeSimultaneousFourCut,
  executeSimultaneousRedCut,
  executeSoloCut,
} from "../gameLogic";
import { applyMissionInfoTokenVariant } from "../infoTokenRules";
import {
  applyMission22TokenPassChoice,
  getMission22TokenPassAvailableValues,
} from "../mission22TokenPass";
import {
  applyMission27TokenDraftChoice,
  getMission27TokenDraftAvailableValues,
} from "../mission27TokenDraft";
import {
  applyMission66BunkerChoice,
  applyMission65CardHandoff,
  applyMission61ConstraintReplacement,
  applyMission32ConstraintDecision,
  applyMission29HiddenNumberCardChoice,
  dispatchHooks,
  getMission65BotHandoff,
  getMission66BotChoice,
  getMission32BotDecision,
  mission45PlayerHasCurrentValue,
  mission45PlayerHasOnlyRedWires,
  rotateMission61Constraint,
  resolveMission61AfterConstraintDecision,
  setMission45CaptainChoicePending,
  setMission45PenaltyTokenChoicePending,
  setMission45SelectedCutter,
} from "../missionHooks";
import { buildSimultaneousFourCutTargets } from "../simultaneousFourCutTargets";
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
    }
  | {
      kind: "simultaneousFourCut";
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

function getMission44DepthCost(value: number): number {
  if (value <= 4) return 1;
  if (value <= 8) return 2;
  return 3;
}

function getMission44AvailableOxygen(
  state: GameState,
  mission: MissionId,
  playerId: string,
): number {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return 0;
  const owned = Math.max(0, Math.floor(oxygen.playerOxygen[playerId] ?? 0));
  const reserve = Math.max(0, Math.floor(oxygen.pool));

  if (mission === 49 || mission === 54 || mission === 63) {
    return owned;
  }

  return Math.max(0, owned + reserve);
}

function canActorAffordAnyMission44Cut(state: GameState, actor: Player): boolean {
  const availableOxygen = getMission44AvailableOxygen(state, state.mission, actor.id);
  if (availableOxygen <= 0) return false;

  const availableValues = new Set<number>();
  for (const tile of actor.hand) {
    if (tile.cut || tile.gameValue === "RED" || tile.gameValue === "YELLOW") continue;
    if (typeof tile.gameValue === "number") {
      availableValues.add(tile.gameValue);
    }
  }

  const getMissionCutCost = (value: number): number => {
    if (state.mission === 63 || state.mission === 49) {
      return Math.max(0, Math.floor(value));
    }
    if (state.mission === 54) {
      return getMission44DepthCost(Math.floor(value));
    }
    return getMission44DepthCost(Math.floor(value));
  };

  for (const value of availableValues) {
    if (getMissionCutCost(value) <= availableOxygen) {
      return true;
    }
  }

  return false;
}

describe("mission 54 playability affordance", () => {
  it("uses depth-based oxygen cost instead of value for cut affordability", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "actor-2", gameValue: 2 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "teammate-1", gameValue: 6 })],
    });
    const state = makeGameState({
      mission: 54,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    });

    dispatchHooks(54, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 54 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.actor = 1;

    expect(canActorAffordAnyMission44Cut(state, actor)).toBe(true);
  });
});

type Mission57RoundState = {
  playersSeenInRound: Set<string>;
  roundHadPlayableAction: boolean;
};

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
  actorId: string,
): Array<{ playerId: string; tileIndex: number }> | null {
  const requiredColor = state.mission === 48 || state.mission === 41
    ? "yellow"
    : "red";
  const requiredTargetCount = state.mission === 41 ? 1 : 3;
  const targets: Array<{ playerId: string; tileIndex: number }> = [];

  for (const player of state.players) {
    if (state.mission === 41 && player.id === actorId) continue;
    for (let tileIndex = 0; tileIndex < player.hand.length; tileIndex++) {
      const tile = player.hand[tileIndex];
      if (!tile || tile.cut || tile.color !== requiredColor) continue;
      targets.push({ playerId: player.id, tileIndex });
    }
  }

  return targets.length >= requiredTargetCount ? targets.slice(0, requiredTargetCount) : null;
}

function pickAction(state: GameState, actor: Player): ChosenAction | null {
  const simultaneousFourTargets = buildSimultaneousFourCutTargets(state);
  if (simultaneousFourTargets) {
    const simultaneousFourError = validateActionWithHooks(state, {
      type: "simultaneousFourCut",
      actorId: actor.id,
      targets: simultaneousFourTargets,
    });
    if (!simultaneousFourError) {
      return {
        kind: "simultaneousFourCut",
        actorId: actor.id,
        targets: simultaneousFourTargets,
      };
    }
  }

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

  // Fallback path: intentionally incorrect guesses are legal in some dual-cut missions.
  // In those cases, try all numeric guesses against all actor-owned numeric wires.
  const actorTileIndexes = [...new Set(actorValueToTileIndex.values())];
  const shouldTryAllNumericGuesses = [32, 35, 44, 46, 47, 49, 54, 63].includes(state.mission);
  const fallbackGuessValues: Array<number | "YELLOW"> = shouldTryAllNumericGuesses
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : [...actorValueToTileIndex.keys()].filter((value): value is number => typeof value === "number");

  if (
    actor.hand.some((t) => !t.cut && t.gameValue === "YELLOW") &&
    !fallbackGuessValues.includes("YELLOW" as number | "YELLOW")
  ) {
    fallbackGuessValues.push("YELLOW");
  }

  if (state.mission === 59 && state.campaign?.mission59Nano) {
    const currentLineValue = state.campaign.numberCards?.visible?.[
      state.campaign.mission59Nano.position
    ]?.value;
    if (typeof currentLineValue === "number") {
      const mission59ActorTileIndexes = actorTileIndexes.length > 0
        ? actorTileIndexes
        : actor.hand
          .map((_, index) => index)
          .filter((index) => !actor.hand[index].cut);
      for (const actorTileIndex of mission59ActorTileIndexes) {
        for (const target of state.players) {
          if (target.id === actor.id) continue;
          for (let targetTileIndex = 0; targetTileIndex < target.hand.length; targetTileIndex++) {
            const targetTile = target.hand[targetTileIndex];
            if (targetTile.cut) continue;
            const mission59TileError = validateActionWithHooks(state, {
              type: "dualCut",
              actorId: actor.id,
              targetPlayerId: target.id,
              targetTileIndex,
              guessValue: currentLineValue,
            });
            if (!mission59TileError) {
              return {
                kind: "dualCut",
                actorId: actor.id,
                targetPlayerId: target.id,
                targetTileIndex,
                guessValue: currentLineValue,
                actorTileIndex,
              };
            }
          }
        }
      }
    }
  }

  for (const guessValue of fallbackGuessValues) {
    for (const actorTileIndex of actorTileIndexes) {
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

  const simultaneousRedTargets = buildSimultaneousRedCutTargets(state, actor.id);
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

  if (forced.kind === "designateCutter" || forced.kind === "mission51DesignateCutter") {
    const designatorId =
      forced.kind === "designateCutter" ? forced.designatorId : forced.sirId;
    const designatorIndex = state.players.findIndex((p) => p.id === designatorId);
    const playerCount = state.players.length;
    let targetIndex: number | null = null;
    const playerHasTargetValue = (player: GameState["players"][number]): boolean =>
      player.hand.some(
        (tile) =>
          !tile.cut
          && typeof tile.gameValue === "number"
          && tile.gameValue === forced.value,
      );

    // First pass: player who actually has the required value.
    for (let i = 0; i < playerCount; i++) {
      const idx = (designatorIndex + i) % playerCount;
      const player = state.players[idx];
      if (!player.hand.some((t) => !t.cut)) continue;
      if (
        (forced.kind === "designateCutter" && forced.radarResults[player.id])
        || forced.kind === "mission51DesignateCutter"
      ) {
        if (!playerHasTargetValue(player)) continue;
        targetIndex = idx;
        break;
      }
    }

    // Second pass: any player with uncut tiles
    if (targetIndex === null) {
      for (let i = 0; i < playerCount; i++) {
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

    const target = state.players[targetIndex];
    if (forced.kind === "designateCutter") {
      state.campaign ??= {};
      state.campaign.mission18DesignatorIndex = designatorIndex;
      state.currentPlayerIndex = targetIndex;
      state.pendingForcedAction = undefined;
      return true;
    }

    const targetHasValue = playerHasTargetValue(target);
    if (targetHasValue) {
      state.campaign ??= {};
      state.campaign.mission51SirIndex = designatorIndex;
      state.currentPlayerIndex = targetIndex;
      state.pendingForcedAction = undefined;
      return true;
    }

    const targetUncutTiles = target.hand.filter((tile) => !tile.cut);
    if (
      targetUncutTiles.length > 0
      && targetUncutTiles.every((tile) => tile.color === "red")
    ) {
      state.result = "loss_red_wire";
      state.phase = "finished";
      state.pendingForcedAction = undefined;
      return true;
    }

    state.pendingForcedAction = {
      kind: "mission51PenaltyTokenChoice",
      targetPlayerId: target.id,
      sirId: designatorId,
      value: forced.value,
    };
    return true;
  }

  if (forced.kind === "mission51PenaltyTokenChoice") {
    const player = state.players.find((candidate) => candidate.id === forced.targetPlayerId);
    if (!player) return false;

    const availableValues = getAvailableInfoTokenChoiceValues(state.players).filter(
      (value) => value >= 1 && value <= 12,
    );
    const value =
      availableValues.includes(forced.value) ? forced.value : availableValues[0];
    if (value == null) {
      state.pendingForcedAction = undefined;
      return true;
    }

    player.infoTokens.push({ value, position: -1, isYellow: false });
    state.pendingForcedAction = undefined;
    state.board.detonatorPosition += 1;
    if (state.board.detonatorPosition >= state.board.detonatorMax) {
      state.result = "loss_detonator";
      state.phase = "finished";
      return true;
    }

    advanceTurn(state);
    return true;
  }

  if (forced.kind === "mission22TokenPass") {
    // Auto-resolve: each chooser passes a random available board value.
    const availableValues = getMission22TokenPassAvailableValues(state);
    if (availableValues.length === 0) {
      return false;
    }

    const value = availableValues[Math.floor(Math.random() * availableValues.length)];
    const applyResult = applyMission22TokenPassChoice(state, forced, value);
    if (!applyResult.ok) return false;

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

  if (forced.kind === "mission27TokenDraft") {
    const availableValues = getMission27TokenDraftAvailableValues(state);
    if (availableValues.length === 0) {
      state.pendingForcedAction = undefined;
      return true;
    }

    const value = availableValues[Math.floor(Math.random() * availableValues.length)];
    const applyResult = applyMission27TokenDraftChoice(state, forced, value);
    if (!applyResult.ok) return false;

    const nextCompleted = forced.completedCount + 1;
    const remainingValues = getMission27TokenDraftAvailableValues(state);
    if (nextCompleted >= forced.draftOrder.length || remainingValues.length === 0) {
      state.pendingForcedAction = undefined;
    } else {
      const nextChooserIndex = forced.draftOrder[nextCompleted];
      state.pendingForcedAction = {
        ...forced,
        currentChooserIndex: nextChooserIndex,
        currentChooserId: state.players[nextChooserIndex].id,
        completedCount: nextCompleted,
      };
    }
    return true;
  }

  if (forced.kind === "mission29HiddenNumberCard") {
    const chooserHand = state.campaign?.numberCards?.playerHands?.[forced.chooserId] ?? [];
    if (chooserHand.length === 0) {
      throw new Error(
        `Mission ${state.mission}: mission29HiddenNumberCard chooser ` +
        `${forced.chooserId} has no Number cards (turn=${state.turnNumber})`,
      );
    }

    const cardIndex = Math.floor(Math.random() * chooserHand.length);
    const applyResult = applyMission29HiddenNumberCardChoice(
      state,
      forced.chooserId,
      cardIndex,
    );
    if (!applyResult.ok) {
      throw new Error(
        `Mission ${state.mission}: mission29HiddenNumberCard choice failed ` +
        `for ${forced.chooserId}: ${applyResult.message ?? "unknown error"}`,
      );
    }
    return true;
  }

  if (forced.kind === "mission65CardHandoff") {
    const choice = getMission65BotHandoff(state);
    if (!choice) {
      throw new Error(
        `Mission ${state.mission}: mission65CardHandoff had no legal transfer ` +
        `for ${forced.actorId} (turn=${state.turnNumber})`,
      );
    }

    const applyResult = applyMission65CardHandoff(
      state,
      forced.actorId,
      choice.cardId,
      choice.recipientPlayerId,
    );
    if (!applyResult.ok) {
      throw new Error(
        `Mission ${state.mission}: mission65CardHandoff failed ` +
        `for ${forced.actorId}: ${applyResult.message ?? "unknown error"}`,
      );
    }
    return true;
  }

  if (forced.kind === "mission46SevensCut") {
    const targets: Array<{ playerId: string; tileIndex: number }> = [];
    for (const player of state.players) {
      for (let i = 0; i < player.hand.length; i++) {
        const tile = player.hand[i];
        const isSeven = tile.color === "yellow"
          ? Math.abs(tile.sortValue - 7.1) < 0.01
          : tile.gameValue === 7;
        if (tile.cut || !isSeven) continue;
        targets.push({ playerId: player.id, tileIndex: i });
      }
    }

    const error = validateActionWithHooks(state, {
      type: "simultaneousFourCut",
      actorId: forced.playerId,
      targets,
    });
    if (error) {
      if (state.mission === 46) {
        state.phase = "finished";
        state.result = "loss_red_wire";
        state.pendingForcedAction = undefined;
        state.campaign ??= {};
        state.campaign.mission46PendingSevensPlayerId = undefined;
        return true;
      }
      throw new Error(
        `Mission ${state.mission}: mission46SevensCut forced action invalid ` +
        `for ${forced.playerId}: ${error.code} ${error.message}`,
      );
    }

    executeSimultaneousFourCut(state, forced.playerId, targets);
    return true;
  }

  if (forced.kind === "mission61ConstraintRotate") {
    rotateMission61Constraint(state, "clockwise");
    state.pendingForcedAction = undefined;
    resolveMission61AfterConstraintDecision(state, forced.previousPlayerId);
    return true;
  }

  if (forced.kind === "mission45VolunteerWindow") {
    const matchingVolunteer = state.players.find((player) =>
      player.hand.some((tile) => !tile.cut) &&
      mission45PlayerHasCurrentValue(state, player.id),
    );
    if (matchingVolunteer) {
      if (!setMission45SelectedCutter(state, matchingVolunteer.id)) {
        return false;
      }
      state.currentPlayerIndex = state.players.findIndex((player) => player.id === matchingVolunteer.id);
      return true;
    }

    const redOnlyVolunteer = state.players.find((player) =>
      player.hand.some((tile) => !tile.cut) &&
      mission45PlayerHasOnlyRedWires(state, player.id),
    );
    if (redOnlyVolunteer) {
      executeRevealReds(state, redOnlyVolunteer.id);
      return true;
    }

    return setMission45CaptainChoicePending(state);
  }

  if (forced.kind === "mission45CaptainChoice") {
    const target =
      state.players.find((player) =>
        player.hand.some((tile) => !tile.cut) &&
        mission45PlayerHasCurrentValue(state, player.id),
      ) ?? state.players.find((player) => player.hand.some((tile) => !tile.cut));
    if (!target) return false;

    if (mission45PlayerHasCurrentValue(state, target.id)) {
      if (!setMission45SelectedCutter(state, target.id)) {
        return false;
      }
      state.currentPlayerIndex = state.players.findIndex((player) => player.id === target.id);
      return true;
    }

    state.board.detonatorPosition += 1;
    if (state.board.detonatorPosition >= state.board.detonatorMax) {
      state.result = "loss_detonator";
      state.phase = "finished";
      state.pendingForcedAction = undefined;
      return true;
    }

    if (!setMission45PenaltyTokenChoicePending(state, target.id)) {
      return false;
    }
    state.currentPlayerIndex = state.players.findIndex((player) => player.id === target.id);
    return true;
  }

  if (forced.kind === "mission45PenaltyTokenChoice") {
    const actor = state.players.find((player) => player.id === forced.playerId);
    if (!actor) return false;

    const availableValues = getAvailableInfoTokenChoiceValues(state.players);
    const value = availableValues[0];
    if (value == null) return false;

    actor.infoTokens.push(applyMissionInfoTokenVariant(state, {
      value,
      position: -1,
      isYellow: value === 0,
    }, actor));
    if (state.campaign?.mission45Turn) {
      delete state.campaign.mission45Turn.penaltyPlayerId;
    }
    state.pendingForcedAction = undefined;
    advanceTurn(state);
    return true;
  }

  if (forced.kind === "mission32ConstraintDecision") {
    const result = applyMission32ConstraintDecision(
      state,
      forced.captainId,
      getMission32BotDecision(state),
    );
    if (!result.ok) {
      throw new Error(
        `Mission ${state.mission}: mission32ConstraintDecision failed ` +
        `for ${forced.captainId}: ${result.message ?? "unknown error"}`,
      );
    }
    return true;
  }

  if (forced.kind === "mission66BunkerChoice") {
    const choice = getMission66BotChoice(state);
    if (!choice) {
      throw new Error(
        `Mission ${state.mission}: mission66BunkerChoice had no legal option ` +
        `for ${forced.actorId}`,
      );
    }
    const result = applyMission66BunkerChoice(state, forced.actorId, choice);
    if (!result.ok) {
      throw new Error(
        `Mission ${state.mission}: mission66BunkerChoice failed ` +
        `for ${forced.actorId}: ${result.message ?? "unknown error"}`,
      );
    }
    if (state.result == null && !state.pendingForcedAction) {
      advanceTurn(state);
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
  const mission57RoundState: Mission57RoundState | null = missionId === 57
    ? {
      playersSeenInRound: new Set(),
      roundHadPlayableAction: false,
    }
    : null;

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

      if (mission57RoundState) {
        mission57RoundState.playersSeenInRound.add(actor.id);
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
        if (
          [44, 49, 54, 63].includes(missionId) &&
          !canActorAffordAnyMission44Cut(state, actor)
        ) {
          state.board.detonatorPosition += 1;
          if (state.board.detonatorPosition >= state.board.detonatorMax) {
            state.result = "loss_detonator";
            state.phase = "finished";
            break;
          }
          advanceTurn(state);
          continue;
        }

        if (mission57RoundState) {
          const allPlayersSeenThisRound =
            mission57RoundState.playersSeenInRound.size >= state.players.length;
          if (
            allPlayersSeenThisRound &&
            !mission57RoundState.roundHadPlayableAction
          ) {
            state.phase = "finished";
            state.result = "loss_detonator";
            break;
          }
          if (allPlayersSeenThisRound) {
            mission57RoundState.playersSeenInRound.clear();
          }
          advanceTurn(state);
          continue;
        }

        if (missionId === 61) {
          const replaced = applyMission61ConstraintReplacement(state, actor.id);
          if (replaced.ok) {
            continue;
          }
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
      } else if (action.kind === "simultaneousFourCut") {
        executeSimultaneousFourCut(state, action.actorId, action.targets);
      } else if (action.kind === "simultaneousRedCut") {
        executeSimultaneousRedCut(state, action.actorId, action.targets);
      } else {
        executeRevealReds(state, action.actorId);
      }

      if (mission57RoundState) {
        mission57RoundState.roundHadPlayableAction = true;
        const allPlayersSeenThisRound =
          mission57RoundState.playersSeenInRound.size >= state.players.length;
        if (allPlayersSeenThisRound) {
          mission57RoundState.playersSeenInRound.clear();
          mission57RoundState.roundHadPlayableAction = false;
        }
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

describe("buildSimultaneousRedCutTargets", () => {
  it("returns exactly one uncut teammate tripwire for mission 41", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", color: "blue", gameValue: 4 }),
        makeTile({ id: "a2", color: "yellow", gameValue: "YELLOW" }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t1", color: "yellow", gameValue: "YELLOW" }),
        makeTile({ id: "t2", color: "yellow", gameValue: "YELLOW", cut: true }),
      ],
    });

    const targets = buildSimultaneousRedCutTargets({
      mission: 41,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    } as GameState, "actor");

    expect(targets).toEqual([{ playerId: "teammate", tileIndex: 0 }]);
  });

  it("does not select actor tripwires for mission 41 targets", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a2", color: "yellow", gameValue: "YELLOW" })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 4 })],
    });

    const targets = buildSimultaneousRedCutTargets({
      mission: 41,
      players: [actor, teammate],
      currentPlayerIndex: 0,
    } as GameState, "actor");

    expect(targets).toBeNull();
  });
});

describe("mission 22 token-pass auto-resolution", () => {
  it("can pass a yellow token when random value is 0", () => {
    const bot = makePlayer({
      id: "bot",
      name: "Bot",
      isBot: true,
      isCaptain: true,
    });
    const recipient = makePlayer({
      id: "recipient",
      name: "Recipient",
      hand: [
        makeTile({ id: "recipient-tile", color: "yellow", gameValue: "YELLOW", sortValue: 1.1 }),
      ],
    });

    const state = makeGameState({
      mission: 22,
      phase: "playing",
      players: [bot, recipient],
      pendingForcedAction: {
        kind: "mission22TokenPass",
        currentChooserIndex: 0,
        currentChooserId: "bot",
        passingOrder: [0, 1],
        completedCount: 0,
      },
    });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const resolved = resolveForcedAction(state);
    randomSpy.mockRestore();

    expect(resolved).toBe(true);
    if (state.pendingForcedAction?.kind === "mission22TokenPass") {
      expect(state.pendingForcedAction.currentChooserId).toBe("recipient");
    }
    expect(recipient.infoTokens).toEqual([
      { value: 0, position: 0, isYellow: true },
    ]);
  });
});

describe("campaign end-to-end playability gate", () => {
  for (const missionId of CAMPAIGN_MISSIONS) {
    const schema = MISSION_SCHEMAS[missionId];
    const allowedPlayerCounts = schema.allowedPlayerCounts ?? PLAYER_COUNTS;

    for (const playerCount of allowedPlayerCounts) {
      const testFn = missionId === 30 ? it.skip : it;
      testFn(`mission ${missionId} (${playerCount} players) reaches terminal state`, () => {
        const finalState = runMissionSimulation(missionId, playerCount);
        expect(finalState.phase).toBe("finished");
        expect(finalState.result).not.toBeNull();
      });
    }
  }
});
