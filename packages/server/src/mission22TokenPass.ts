import {
  INFO_TOKEN_VALUES,
  TOTAL_INFO_TOKENS,
  YELLOW_INFO_TOKENS,
} from "@bomb-busters/shared";
import type { ForcedAction, GameState, InfoToken } from "@bomb-busters/shared";
import { applyMissionInfoTokenVariant } from "./infoTokenRules.js";

const NUMERIC_TOKEN_COPIES =
  (TOTAL_INFO_TOKENS - YELLOW_INFO_TOKENS) / INFO_TOKEN_VALUES.length;

function normalizeMission22NumericToken(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 12) return null;
  return value;
}

function collectMission22TokenPassBoardFromPlayers(
  state: GameState,
): { numericTokens: number[]; yellowTokens: number } {
  const usedNumericCounts = new Map<number, number>();
  let usedYellowTokens = 0;

  for (const player of state.players) {
    for (const token of player.infoTokens) {
      if (token.position !== -1) continue;
      if (token.isYellow) {
        usedYellowTokens += 1;
      } else {
        const normalizedValue = normalizeMission22NumericToken(token.value);
        if (normalizedValue === null) continue;
        usedNumericCounts.set(
          normalizedValue,
          (usedNumericCounts.get(normalizedValue) ?? 0) + 1,
        );
      }
    }
  }

  const numericTokens = INFO_TOKEN_VALUES.flatMap((value) => {
    const usedCount = usedNumericCounts.get(value) ?? 0;
    const availableCount = Math.max(0, NUMERIC_TOKEN_COPIES - usedCount);
    return Array.from({ length: availableCount }, () => value);
  });
  const yellowTokens = Math.max(0, YELLOW_INFO_TOKENS - usedYellowTokens);

  return { numericTokens, yellowTokens };
}

function isBoardValueSafe(value: number): value is number {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function countNumericTokensByValue(tokens: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function boardHasExtraCopies(
  cached: { numericTokens: number[]; yellowTokens: number },
  derived: { numericTokens: number[]; yellowTokens: number },
): boolean {
  const cachedCounts = countNumericTokensByValue(cached.numericTokens);
  const derivedCounts = countNumericTokensByValue(derived.numericTokens);

  if (cached.yellowTokens > derived.yellowTokens) return true;

  for (const [value, count] of cachedCounts) {
    if (count > (derivedCounts.get(value) ?? 0)) return true;
  }

  return false;
}

function boardHasMissingCopies(
  cached: { numericTokens: number[]; yellowTokens: number },
  derived: { numericTokens: number[]; yellowTokens: number },
): boolean {
  if (cached.yellowTokens < derived.yellowTokens) {
    return true;
  }

  const cachedCounts = countNumericTokensByValue(cached.numericTokens);
  const derivedCounts = countNumericTokensByValue(derived.numericTokens);

  const allValues = new Set<number>([
    ...cachedCounts.keys(),
    ...derivedCounts.keys(),
  ]);

  for (const value of allValues) {
    if ((cachedCounts.get(value) ?? 0) < (derivedCounts.get(value) ?? 0)) {
      return true;
    }
  }

  return false;
}

export function getMission22TokenPassBoardState(
  state: GameState,
): { numericTokens: number[]; yellowTokens: number } {
  state.campaign ??= {};
  const existingBoard = state.campaign.mission22TokenPassBoard;
  const board = collectMission22TokenPassBoardFromPlayers(state);
  const isActiveTokenPass = state.pendingForcedAction?.kind === "mission22TokenPass";
  if (
    state.phase !== "setup_info_tokens"
    && existingBoard
    && Array.isArray(existingBoard.numericTokens)
    && existingBoard.numericTokens.every(isBoardValueSafe)
    && Number.isInteger(existingBoard.yellowTokens)
    && existingBoard.yellowTokens >= 0
    && !boardHasExtraCopies(existingBoard, board)
    && (isActiveTokenPass || !boardHasMissingCopies(existingBoard, board))
  ) {
    return existingBoard;
  }

  state.campaign.mission22TokenPassBoard = board;
  return board;
}

export function getMission22TokenPassAvailableValues(
  state: GameState,
): number[] {
  const board = getMission22TokenPassBoardState(state);
  const values = new Set<number>();
  for (const value of board.numericTokens) values.add(value);
  if (board.yellowTokens > 0) values.add(0);
  return Array.from(values).sort((a, b) => a - b);
}

export function applyMission22TokenPassChoice(
  state: GameState,
  forced: Extract<ForcedAction, { kind: "mission22TokenPass" }>,
  value: number,
): { ok: true; recipientIndex: number; updatedRecipientToken: InfoToken } | { ok: false; message: string } {
  const isYellow = value === 0;
  const chooserIndex = forced.currentChooserIndex;
  const playerCount = state.players.length;
  const recipientIndex = (chooserIndex + 1) % playerCount;
  const recipient = state.players[recipientIndex];
  if (!recipient) {
    return { ok: false, message: "Invalid mission 22 token pass recipient" };
  }

  const board = getMission22TokenPassBoardState(state);
  let sourceToken: { value: number; isYellow: boolean };
  if (isYellow) {
    if (board.yellowTokens <= 0) {
      return { ok: false, message: "Token value is not available on the board" };
    }
    board.yellowTokens -= 1;
    sourceToken = { value: 0, isYellow: true };
  } else {
    const sourceValue = normalizeMission22NumericToken(value);
    if (sourceValue == null) {
      return { ok: false, message: "Token value is not available on the board" };
    }
    const tokenIndex = board.numericTokens.indexOf(sourceValue);
    if (tokenIndex === -1) {
      return { ok: false, message: "Token value is not available on the board" };
    }
    board.numericTokens.splice(tokenIndex, 1);
    sourceToken = { value: sourceValue, isYellow: false };
  }

  const sourceValue = sourceToken.value;
  const sourceIsYellow = sourceToken.isYellow;
  let position = -1;
  if (sourceIsYellow) {
    const yellowIdx = recipient.hand.findIndex((t) => !t.cut && t.color === "yellow");
    if (yellowIdx !== -1) position = yellowIdx;
  } else {
    const wireIdx = recipient.hand.findIndex(
      (t) => !t.cut && typeof t.gameValue === "number" && t.gameValue === sourceValue,
    );
    if (wireIdx !== -1) position = wireIdx;
  }

  const token = applyMissionInfoTokenVariant(state, {
    value: sourceValue,
    position,
    isYellow: sourceIsYellow,
  }, recipient);
  // Prevent tokens that weren't placed from being reused later in the same pass chain.
  // Mission 22 requires each chooser to consume one board token per turn.
  if (token.position < 0) {
    token.position = -2;
  }
  recipient.infoTokens.push(token);

  return { ok: true, recipientIndex, updatedRecipientToken: token };
}
