import {
  getMission22PresentValues,
  type GameState,
  type Player,
} from "@bomb-busters/shared";
import { filterStateForPlayer } from "./viewFilter.js";
import { buildSystemPrompt, buildUserMessage } from "./botPrompt.js";
import { callLLM } from "./llmClient.js";
import {
  validateDualCutWithHooks,
  validateSoloCutWithHooks,
  validateRevealRedsWithHooks,
  validateSimultaneousRedCutWithHooks,
  validateSimultaneousFourCutWithHooks,
  getUncutTiles,
} from "./validation.js";
import { isRepeatNextPlayerSelectionDisallowed } from "./turnOrderRules.js";
import {
  requiredSetupInfoTokenCount,
  validateSetupInfoTokenPlacement,
} from "./setupTokenRules.js";
import { applyMissionInfoTokenVariant } from "./infoTokenRules.js";
import {
  buildSimultaneousFourCutTargets,
} from "./simultaneousFourCutTargets.js";

const BOT_NAMES = ["IRIS", "NOVA", "BOLT", "FUSE", "CHIP"];

export function createBotPlayer(id: string, nameIndex: number): Player {
  return {
    id,
    name: BOT_NAMES[nameIndex % BOT_NAMES.length],
    character: null,
    isCaptain: false,
    hand: [],
    standSizes: [0],
    infoTokens: [],
    characterUsed: false,
    connected: true,
    isBot: true,
  };
}

/**
 * Choose the next player index for a forced "captain chooses next player" action.
 * Picks the next clockwise player with uncut tiles; can wrap back to captain.
 * Optionally avoid one specific player unless no other candidate exists.
 */
export function botChooseNextPlayer(
  state: GameState,
  captainId: string,
  excludedPlayerId?: string,
): number | null {
  const captainIndex = state.players.findIndex((p) => p.id === captainId);
  if (captainIndex === -1) return null;

  const playerCount = state.players.length;
  let fallbackIndex: number | null = null;
  for (let i = 1; i <= playerCount; i++) {
    const idx = (captainIndex + i) % playerCount;
    const player = state.players[idx];
    if (!player.hand.some((t) => !t.cut)) continue;
    if (excludedPlayerId && player.id === excludedPlayerId) {
      if (fallbackIndex === null) fallbackIndex = idx;
      continue;
    }
    return idx;
  }

  return fallbackIndex;
}

/** Auto-place info token during setup. Picks the blue tile whose value appears most often in hand. */
export function botPlaceInfoToken(state: GameState, botId: string): void {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot) return;

  const requiredTokenCount = requiredSetupInfoTokenCount(state, bot);
  if (bot.infoTokens.length >= requiredTokenCount) return;

  // Mission 22: absent-value tokens placed next to stand (tileIndex -1).
  if (state.phase === "setup_info_tokens" && state.mission === 22) {
    const presentValues = getMission22PresentValues(bot.hand);
    const placedAbsent = new Set(
      bot.infoTokens
        .filter((t) => t.position === -1)
        .map((t) => (t.isYellow ? "YELLOW" : t.value)),
    );

    // Try numeric 1-12 first, then yellow (0)
    for (let v = 1; v <= 12; v++) {
      if (presentValues.has(v) || placedAbsent.has(v)) continue;
      const error = validateSetupInfoTokenPlacement(state, bot, v, -1);
      if (error) continue;
      bot.infoTokens.push(applyMissionInfoTokenVariant(state, {
        value: v,
        position: -1,
        isYellow: false,
      }, bot));
      return;
    }
    // Yellow absent
    if (!presentValues.has("YELLOW") && !placedAbsent.has("YELLOW")) {
      const error = validateSetupInfoTokenPlacement(state, bot, 0, -1);
      if (!error) {
        bot.infoTokens.push(applyMissionInfoTokenVariant(state, {
          value: 0,
          position: -1,
          isYellow: true,
        }, bot));
        return;
      }
    }
    return;
  }

  const campaignFalseInfoTokenMode =
    state.campaign?.falseInfoTokenMode === true;
  const campaignFalseTokenMode =
    state.campaign?.falseTokenMode === true;

  // Missions with false setup tokens (mission 52 for all players,
  // mission 17 for captain only) need non-matching numeric values.
  const requiresFalseSetupToken =
    state.phase === "setup_info_tokens" &&
    (campaignFalseTokenMode ||
      (campaignFalseInfoTokenMode && bot.isCaptain) ||
      state.mission === 52 ||
      (state.mission === 17 && bot.isCaptain));
  if (requiresFalseSetupToken) {
    const existingPositions = new Set(bot.infoTokens.map((t) => t.position));
    const tryPlace = (): boolean => {
      for (let tileIndex = 0; tileIndex < bot.hand.length; tileIndex++) {
        if (existingPositions.has(tileIndex)) continue;
        for (let value = 1; value <= 12; value++) {
          const error = validateSetupInfoTokenPlacement(state, bot, value, tileIndex);
          if (error) continue;
          bot.infoTokens.push(applyMissionInfoTokenVariant(state, {
            value,
            position: tileIndex,
            isYellow: false,
          }, bot));
          existingPositions.add(tileIndex);
          return true;
        }
      }
      return false;
    };

    if (tryPlace()) return;
    return;
  }

  const uncutBlue = bot.hand
    .map((tile, index) => ({ tile, index }))
    .filter((t) => !t.tile.cut && t.tile.color === "blue");

  if (uncutBlue.length === 0) return;

  // Count how many times each blue value appears in the bot's hand
  const valueCounts = new Map<number, number>();
  for (const { tile } of uncutBlue) {
    const v = tile.gameValue as number;
    valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
  }

  // Pick the value with highest count, then pick the first tile with that value
  let bestValue = 0;
  let bestCount = 0;
  for (const [value, count] of valueCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  }

  const target = uncutBlue.find(
    (t) => (t.tile.gameValue as number) === bestValue,
  );
  if (!target) return;

  bot.infoTokens.push(applyMissionInfoTokenVariant(state, {
    value: bestValue,
    position: state.mission === 50 ? -1 : target.index,
    isYellow: false,
  }, bot));
}

export type BotAction =
  | {
      action: "dualCut";
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
    }
  | { action: "soloCut"; value: number | "YELLOW" }
  | { action: "revealReds" }
  | { action: "simultaneousRedCut"; targets: Array<{ playerId: string; tileIndex: number }> }
  | { action: "simultaneousFourCut" }
  | {
      action: "useEquipment";
      equipmentId: string;
      payload: Record<string, unknown>;
    }
  | {
      action: "dualCutDoubleDetector";
      targetPlayerId: string;
      tileIndex1: number;
      tileIndex2: number;
      guessValue: number;
    }
  | { action: "chooseNextPlayer"; targetPlayerId: string }
  | { action: "designateCutter"; targetPlayerId: string }
  | { action: "mission61ConstraintRotate"; direction: "clockwise" | "counter_clockwise" | "skip" }
  | { action: "mission36SequencePosition"; side: "left" | "right" };

export interface BotActionResult {
  action: BotAction;
  reasoning: string | null;
}

const MAX_RETRIES = 2;

export async function getBotAction(
  state: GameState,
  botId: string,
  apiKey: string,
  chatContext: string,
): Promise<BotActionResult> {
  // Mission-specific forced actions: handle deterministically and bypass LLM.
  const forcedDesignateCutterAction = getForcedDesignateCutterAction(state, botId);
  if (forcedDesignateCutterAction) {
    return { action: forcedDesignateCutterAction, reasoning: null };
  }

  const forcedChooseAction = getForcedChooseNextAction(state, botId);
  if (forcedChooseAction) {
    return { action: forcedChooseAction, reasoning: null };
  }

  const forcedMission46Action = getForcedMission46SevensCutAction(state, botId);
  if (forcedMission46Action) {
    return { action: forcedMission46Action, reasoning: null };
  }

  const forcedMission61Action = getForcedMission61ConstraintRotateAction(state, botId);
  if (forcedMission61Action) {
    return { action: forcedMission61Action, reasoning: null };
  }

  const forcedMission36Action = getForcedMission36SequencePositionAction(state, botId);
  if (forcedMission36Action) {
    return { action: forcedMission36Action, reasoning: null };
  }

  const filtered = filterStateForPlayer(state, botId);
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(filtered, chatContext || undefined);

  let lastReasoning: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await callLLM(apiKey, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ]);

      const reasoning = typeof result.reasoning === "string" ? result.reasoning : null;
      if (reasoning) lastReasoning = reasoning;
      console.log(`Bot ${botId} LLM response keys: ${Object.keys(result).join(", ")}, reasoning: ${reasoning ? `"${reasoning.slice(0, 80)}"` : "null"}`);

      // Some models return an array — unwrap to find the action object
      const actionObj = extractActionObject(result);
      const parsed = parseLLMAction(state, actionObj, botId);
      if (parsed) {
        const error = validateBotAction(state, botId, parsed);
        if (!error) return { action: parsed, reasoning: lastReasoning };
        console.log(`Bot action validation failed (attempt ${attempt + 1}): ${error}`);
      } else {
        console.log(`Bot action parse failed (attempt ${attempt + 1}):`, JSON.stringify(result));
      }
    } catch (e) {
      console.log(`Bot LLM call failed (attempt ${attempt + 1}):`, e);
    }
  }

  // Fallback heuristic — still include reasoning from LLM if we got any
  return { action: getFallbackAction(state, botId), reasoning: lastReasoning };
}

/** If the LLM returned an array, find the first element with an `action` key. */
function extractActionObject(
  result: Record<string, unknown>,
): Record<string, unknown> {
  // Already a proper action object
  if (typeof result.action === "string") return result;

  // Array-like: keys are "0", "1", … — scan values for an object with `action`
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === "object" && "action" in (val as Record<string, unknown>)) {
      return val as Record<string, unknown>;
    }
  }

  return result;
}

function parseLLMAction(
  state: GameState,
  result: Record<string, unknown>,
  actorId: string,
): BotAction | null {
  const action = result.action as string;

  if (action === "dualCut") {
    const targetPlayerId = result.targetPlayerId as string;
    const targetTileIndex = result.targetTileIndex as number;
    let guessValue = result.guessValue as number | string;
    if (guessValue === "YELLOW") {
      return {
        action: "dualCut",
        targetPlayerId,
        targetTileIndex,
        guessValue: "YELLOW",
      };
    }
    guessValue = Number(guessValue);
    if (!Number.isFinite(guessValue)) return null;
    return { action: "dualCut", targetPlayerId, targetTileIndex, guessValue };
  }

  if (action === "soloCut") {
    let value = result.value as number | string;
    if (value === "YELLOW") {
      return { action: "soloCut", value: "YELLOW" };
    }
    value = Number(value);
    if (!Number.isFinite(value)) return null;
    return { action: "soloCut", value };
  }

  if (action === "revealReds") {
    return { action: "revealReds" };
  }

  if (action === "simultaneousRedCut") {
    const rawTargets = result.targets;
    const parsedTargets =
      Array.isArray(rawTargets) &&
      rawTargets.every(
        (t) =>
          t &&
          typeof t === "object" &&
          typeof (t as Record<string, unknown>).playerId === "string" &&
          Number.isInteger((t as Record<string, unknown>).tileIndex),
      )
        ? rawTargets.map((t) => ({
            playerId: (t as { playerId: string }).playerId,
            tileIndex: Number((t as { tileIndex: number }).tileIndex),
          }))
        : null;

    const targets =
      parsedTargets ?? buildSimultaneousRedCutValidationTargets(state, actorId);
    if (!targets) return null;
    return { action: "simultaneousRedCut", targets };
  }

  if (action === "simultaneousFourCut") {
    return { action: "simultaneousFourCut" };
  }

  if (action === "useEquipment") {
    const equipmentId = result.equipmentId as string;
    if (!equipmentId) return null;
    const rawPayload = result.payload;
    const payload =
      rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
        ? (rawPayload as Record<string, unknown>)
        : {};
    return { action: "useEquipment", equipmentId, payload };
  }

  if (action === "dualCutDoubleDetector") {
    const targetPlayerId = result.targetPlayerId as string;
    const tileIndex1 = Number(result.tileIndex1);
    const tileIndex2 = Number(result.tileIndex2);
    const guessValue = Number(result.guessValue);
    if (!targetPlayerId) return null;
    if (!Number.isFinite(tileIndex1) || !Number.isFinite(tileIndex2)) return null;
    if (!Number.isFinite(guessValue)) return null;
    return {
      action: "dualCutDoubleDetector",
      targetPlayerId,
      tileIndex1,
      tileIndex2,
      guessValue,
    };
  }

  if (action === "chooseNextPlayer") {
    const targetPlayerId = result.targetPlayerId as string;
    if (!targetPlayerId) return null;
    return { action: "chooseNextPlayer", targetPlayerId };
  }

  if (action === "designateCutter") {
    const targetPlayerId = result.targetPlayerId as string;
    if (!targetPlayerId) return null;
    return { action: "designateCutter", targetPlayerId };
  }

  if (action === "mission61ConstraintRotate") {
    const direction = result.direction as string;
    if (
      direction !== "clockwise" &&
      direction !== "counter_clockwise" &&
      direction !== "skip"
    ) return null;
    return { action: "mission61ConstraintRotate", direction };
  }

  if (action === "mission36SequencePosition") {
    const side = result.side as string;
    if (side !== "left" && side !== "right") return null;
    return { action: "mission36SequencePosition", side };
  }

  return null;
}

function validateBotAction(
  state: GameState,
  botId: string,
  action: BotAction,
): string | null {
  switch (action.action) {
    case "dualCut":
      return (
        validateDualCutWithHooks(
          state,
          botId,
          action.targetPlayerId,
          action.targetTileIndex,
          action.guessValue,
        )?.message ?? null
      );
    case "soloCut":
      return validateSoloCutWithHooks(state, botId, action.value)?.message ?? null;
    case "revealReds":
      return validateRevealRedsWithHooks(state, botId)?.message ?? null;
    case "simultaneousRedCut":
      return validateSimultaneousRedCutWithHooks(state, botId, action.targets)?.message ?? null;
    case "simultaneousFourCut":
      return validateSimultaneousFourCutForBot(state, botId);
    case "useEquipment":
      return null;
    case "dualCutDoubleDetector":
      return null;
    case "chooseNextPlayer": {
      const forced = state.pendingForcedAction;
      if (!forced || forced.kind !== "chooseNextPlayer") {
        return "No pending choose-next-player action";
      }
      if (forced.captainId !== botId) {
        return "Only the captain can choose the next player";
      }

      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return "Target player not found";
      if (!target.hand.some((t) => !t.cut)) {
        return "Target player has no remaining tiles";
      }

      if (
        isRepeatNextPlayerSelectionDisallowed(
          state,
          forced.lastPlayerId,
          action.targetPlayerId,
        )
      ) {
        return "In this mission, the same player cannot act twice in a row";
      }
      return null;
    }
    case "designateCutter": {
      const forced = state.pendingForcedAction;
      if (!forced || forced.kind !== "designateCutter") {
        return "No pending designate-cutter action";
      }
      if (forced.designatorId !== botId) {
        return "Only the active player can designate who cuts";
      }

      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return "Target player not found";
      if (!target.hand.some((t) => !t.cut)) {
        return "Target player has no remaining tiles";
      }
      return null;
    }
    case "mission61ConstraintRotate": {
      const forced = state.pendingForcedAction;
      if (!forced || forced.kind !== "mission61ConstraintRotate") {
        return "No pending mission61 constraint-rotate action";
      }
      if (forced.captainId !== botId) {
        return "Only the captain can rotate constraints on mission 61";
      }
      return null;
    }
    case "mission36SequencePosition": {
      const forced = state.pendingForcedAction;
      if (!forced || forced.kind !== "mission36SequencePosition") {
        return "No pending mission36 sequence-position action";
      }
      if (forced.captainId !== botId) {
        return "Only the captain can choose the mission 36 sequence side";
      }
      return null;
    }
  }
}

function getForcedDesignateCutterAction(
  state: GameState,
  botId: string,
): BotAction | null {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "designateCutter") return null;
  if (forced.designatorId !== botId) return null;

  // Prefer players with radar "yes" (has uncut wire of the drawn value)
  const designatorIndex = state.players.findIndex((p) => p.id === botId);
  const playerCount = state.players.length;

  // First pass: find clockwise player with radar yes and uncut tiles
  for (let i = 1; i <= playerCount; i++) {
    const idx = (designatorIndex + i) % playerCount;
    const player = state.players[idx];
    if (!player.hand.some((t) => !t.cut)) continue;
    if (forced.radarResults[player.id]) {
      return { action: "designateCutter", targetPlayerId: player.id };
    }
  }

  // Second pass: any clockwise player with uncut tiles
  for (let i = 1; i <= playerCount; i++) {
    const idx = (designatorIndex + i) % playerCount;
    const player = state.players[idx];
    if (!player.hand.some((t) => !t.cut)) continue;
    return { action: "designateCutter", targetPlayerId: player.id };
  }

  return null;
}

function getForcedChooseNextAction(
  state: GameState,
  botId: string,
): BotAction | null {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "chooseNextPlayer") return null;
  if (forced.captainId !== botId) return null;

  const avoidPrevious =
    state.mission === 10 && state.players.length > 2 && forced.lastPlayerId
      ? forced.lastPlayerId
      : undefined;

  const nextIdx =
    botChooseNextPlayer(state, botId, avoidPrevious) ??
    botChooseNextPlayer(state, botId);
  if (nextIdx == null) return null;

  const target = state.players[nextIdx];
  if (!target) return null;
  return { action: "chooseNextPlayer", targetPlayerId: target.id };
}

function getForcedMission46SevensCutAction(
  state: GameState,
  botId: string,
): BotAction | null {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "mission46SevensCut") return null;
  if (forced.playerId !== botId) return null;

  const targets = buildSimultaneousFourCutTargets(state);
  if (!targets) return null;

  return { action: "simultaneousFourCut" };
}

function getForcedMission61ConstraintRotateAction(
  state: GameState,
  botId: string,
): BotAction | null {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "mission61ConstraintRotate") return null;
  if (forced.captainId !== botId) return null;

  const direction =
    forced.direction === "counter_clockwise"
      ? forced.direction
      : "clockwise";
  return { action: "mission61ConstraintRotate", direction };
}

function getForcedMission36SequencePositionAction(
  state: GameState,
  botId: string,
): BotAction | null {
  const forced = state.pendingForcedAction;
  if (!forced || forced.kind !== "mission36SequencePosition") return null;
  if (forced.captainId !== botId) return null;

  return { action: "mission36SequencePosition", side: "left" };
}

function collectBotGuessValues(
  uncutTiles: ReturnType<typeof getUncutTiles>,
): (number | "YELLOW")[] {
  const numeric = new Set<number>();
  let hasYellow = false;

  for (const tile of uncutTiles) {
    if (tile.gameValue === "YELLOW") {
      hasYellow = true;
      continue;
    }
    if (typeof tile.gameValue === "number") {
      numeric.add(tile.gameValue);
    }
  }

  const values: (number | "YELLOW")[] = [...numeric].sort((a, b) => a - b);
  if (hasYellow) values.push("YELLOW");
  return values;
}

function pickGuessValueFromParity(
  guessValues: readonly (number | "YELLOW")[],
  parity: "even" | "odd",
): number | null {
  for (const guess of guessValues) {
    if (typeof guess !== "number") continue;
    if (parity === "even" && guess % 2 === 0) return guess;
    if (parity === "odd" && guess % 2 === 1) return guess;
  }
  return null;
}

function buildSimultaneousRedCutValidationTargets(
  state: GameState,
  actorId: string,
): Array<{ playerId: string; tileIndex: number }> | null {
  const requiredColor = state.mission === 41 || state.mission === 48
    ? "yellow"
    : state.mission === 13
      ? "red"
      : null;
  const requiredTargetCount = state.mission === 41 ? 1 : 3;
  if (!requiredColor) return null;

  const targets: Array<{ playerId: string; tileIndex: number }> = [];

  for (const player of state.players) {
    if (state.mission === 41 && player.id === actorId) continue;

    for (let i = 0; i < player.hand.length; i++) {
      const tile = player.hand[i];
      if (tile.cut || tile.color !== requiredColor) continue;
      targets.push({ playerId: player.id, tileIndex: i });
    }
  }

  return targets.length >= requiredTargetCount ? targets.slice(0, requiredTargetCount) : null;
}

function validateSimultaneousFourCutForBot(
  state: GameState,
  botId: string,
): string | null {
  const targets = buildSimultaneousFourCutTargets(state);
  if (!targets) {
    return "Not enough uncut tiles for simultaneousFourCut";
  }
  return validateSimultaneousFourCutWithHooks(state, botId, targets)?.message ?? null;
}

function getFallbackAction(state: GameState, botId: string): BotAction {
  const forcedDesignateCutterAction = getForcedDesignateCutterAction(state, botId);
  if (forcedDesignateCutterAction) {
    return forcedDesignateCutterAction;
  }

  const forcedChooseAction = getForcedChooseNextAction(state, botId);
  if (forcedChooseAction) {
    return forcedChooseAction;
  }

  const forcedMission46Action = getForcedMission46SevensCutAction(state, botId);
  if (forcedMission46Action) {
    return forcedMission46Action;
  }

  const forcedMission61Action = getForcedMission61ConstraintRotateAction(state, botId);
  if (forcedMission61Action) {
    return forcedMission61Action;
  }

  const forcedMission36Action = getForcedMission36SequencePositionAction(state, botId);
  if (forcedMission36Action) {
    return forcedMission36Action;
  }

  const bot = state.players.find((p) => p.id === botId)!;
  const uncutTiles = getUncutTiles(bot);
  const guessValues = collectBotGuessValues(uncutTiles);

  // 1. revealReds when legal (supports mission-specific reveal constraints).
  if (!validateRevealRedsWithHooks(state, botId)) {
    return { action: "revealReds" };
  }

  // 1b. simultaneousRedCut when legal (mission 13/48 special action).
  const simultaneousRedTargets = buildSimultaneousRedCutValidationTargets(state, botId);
  if (
    simultaneousRedTargets &&
    !validateSimultaneousRedCutWithHooks(state, botId, simultaneousRedTargets)
  ) {
    return { action: "simultaneousRedCut", targets: simultaneousRedTargets };
  }

  // 1c. simultaneousFourCut when legal.
  if (!validateSimultaneousFourCutForBot(state, botId)) {
    return { action: "simultaneousFourCut" };
  }

  // 2. soloCut for any legal value the bot holds.
  for (const value of guessValues) {
    if (!validateSoloCutWithHooks(state, botId, value)) {
      return { action: "soloCut", value };
    }
  }

  const opponents = state.players.filter((p) => p.id !== botId);

  // 3. Prefer opponent info-token targets when a legal hook-aware dual cut exists.
  for (const opp of opponents) {
    for (const token of opp.infoTokens) {
      const tile = opp.hand[token.position];
      if (!tile || tile.cut) continue;

      const guessValue = token.isYellow
        ? ("YELLOW" as const)
        : token.parity
          ? pickGuessValueFromParity(guessValues, token.parity)
          : token.countHint != null
            ? null
          : token.value;
      if (guessValue == null) continue;
      if (
        typeof guessValue === "number"
          ? !guessValues.includes(guessValue)
          : !guessValues.includes("YELLOW")
      ) {
        continue;
      }

      if (
        !validateDualCutWithHooks(
          state,
          botId,
          opp.id,
          token.position,
          guessValue,
        )
      ) {
        return {
          action: "dualCut",
          targetPlayerId: opp.id,
          targetTileIndex: token.position,
          guessValue,
        };
      }
    }
  }

  // 4. Scan all opponent tiles + bot guess values for first legal dual cut.
  for (const opp of opponents) {
    for (let i = 0; i < opp.hand.length; i++) {
      if (opp.hand[i].cut) continue;
      for (const guessValue of guessValues) {
        if (!validateDualCutWithHooks(state, botId, opp.id, i, guessValue)) {
          return {
            action: "dualCut",
            targetPlayerId: opp.id,
            targetTileIndex: i,
            guessValue,
          };
        }
      }
    }
  }

  // 5. Last-resort deterministic action shape (should be unreachable in valid states).
  return {
    action: "dualCut",
    targetPlayerId: opponents[0]?.id ?? "",
    targetTileIndex: 0,
    guessValue: 1,
  };
}
