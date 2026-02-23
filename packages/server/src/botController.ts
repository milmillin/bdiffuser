import type { GameState, Player } from "@bomb-busters/shared";
import { filterStateForPlayer } from "./viewFilter.js";
import { buildSystemPrompt, buildUserMessage } from "./botPrompt.js";
import { callLLM } from "./llmClient.js";
import {
  validateDualCut,
  validateSoloCut,
  validateRevealReds,
  getUncutTiles,
} from "./validation.js";

const BOT_NAMES = ["IRIS", "NOVA", "BOLT", "FUSE", "CHIP"];

export function createBotPlayer(id: string, nameIndex: number): Player {
  return {
    id,
    name: BOT_NAMES[nameIndex % BOT_NAMES.length],
    character: null,
    isCaptain: false,
    hand: [],
    infoTokens: [],
    characterUsed: false,
    connected: true,
    isBot: true,
  };
}

/** Auto-place info token during setup. Picks the blue tile whose value appears most often in hand. */
export function botPlaceInfoToken(state: GameState, botId: string): void {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot || bot.infoTokens.length > 0) return;

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

  bot.infoTokens.push({
    value: bestValue,
    position: target.index,
    isYellow: false,
  });
}

export type BotAction =
  | {
      action: "dualCut";
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
    }
  | { action: "soloCut"; value: number | "YELLOW" }
  | { action: "revealReds" };

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
  const filtered = filterStateForPlayer(state, botId);
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(filtered, chatContext || undefined);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await callLLM(apiKey, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ]);

      const reasoning = typeof result.reasoning === "string" ? result.reasoning : null;
      console.log(`Bot ${botId} LLM response keys: ${Object.keys(result).join(", ")}, reasoning: ${reasoning ? `"${reasoning.slice(0, 80)}"` : "null"}`);
      const parsed = parseLLMAction(result);
      if (parsed) {
        const error = validateBotAction(state, botId, parsed);
        if (!error) return { action: parsed, reasoning };
        console.log(`Bot action validation failed (attempt ${attempt + 1}): ${error}`);
      } else {
        console.log(`Bot action parse failed (attempt ${attempt + 1}):`, result);
      }
    } catch (e) {
      console.log(`Bot LLM call failed (attempt ${attempt + 1}):`, e);
    }
  }

  // Fallback heuristic
  return { action: getFallbackAction(state, botId), reasoning: null };
}

function parseLLMAction(
  result: Record<string, unknown>,
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

  return null;
}

function validateBotAction(
  state: GameState,
  botId: string,
  action: BotAction,
): string | null {
  switch (action.action) {
    case "dualCut":
      return validateDualCut(
        state,
        botId,
        action.targetPlayerId,
        action.targetTileIndex,
        action.guessValue,
      );
    case "soloCut":
      return validateSoloCut(state, botId, action.value);
    case "revealReds":
      return validateRevealReds(state, botId);
  }
}

function getFallbackAction(state: GameState, botId: string): BotAction {
  const bot = state.players.find((p) => p.id === botId)!;
  const uncutTiles = getUncutTiles(bot);

  // 1. revealReds if all remaining tiles are red
  if (uncutTiles.length > 0 && uncutTiles.every((t) => t.color === "red")) {
    return { action: "revealReds" };
  }

  // 2. soloCut if holding all copies of any value
  for (const tile of uncutTiles) {
    if (tile.color !== "blue") continue;
    const value = tile.gameValue as number;
    const err = validateSoloCut(state, botId, value);
    if (!err) {
      return { action: "soloCut", value };
    }
  }

  // 3. dualCut on a random opponent tile
  const opponents = state.players.filter((p) => p.id !== botId);
  const botValues = new Set(
    uncutTiles
      .filter((t) => t.color === "blue")
      .map((t) => t.gameValue as number),
  );

  // Prefer tiles with info tokens (known safe values)
  for (const opp of opponents) {
    for (const token of opp.infoTokens) {
      const tile = opp.hand[token.position];
      if (!tile || tile.cut) continue;
      const guessValue = token.isYellow ? ("YELLOW" as const) : token.value;
      if (
        typeof guessValue === "number"
          ? botValues.has(guessValue)
          : uncutTiles.some((t) => t.gameValue === "YELLOW")
      ) {
        const err = validateDualCut(
          state,
          botId,
          opp.id,
          token.position,
          guessValue,
        );
        if (!err) {
          return {
            action: "dualCut",
            targetPlayerId: opp.id,
            targetTileIndex: token.position,
            guessValue,
          };
        }
      }
    }
  }

  // Last resort: pick a random opponent tile and guess a value the bot holds
  for (const opp of opponents) {
    for (let i = 0; i < opp.hand.length; i++) {
      if (opp.hand[i].cut) continue;
      for (const value of botValues) {
        const err = validateDualCut(state, botId, opp.id, i, value);
        if (!err) {
          return {
            action: "dualCut",
            targetPlayerId: opp.id,
            targetTileIndex: i,
            guessValue: value,
          };
        }
      }
    }
  }

  // Absolute last resort (shouldn't happen) — pick first valid anything
  return {
    action: "dualCut",
    targetPlayerId: opponents[0]?.id ?? "",
    targetTileIndex: 0,
    guessValue: 1,
  };
}
