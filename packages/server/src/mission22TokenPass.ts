import { INFO_TOKEN_VALUES, YELLOW_INFO_TOKENS } from "@bomb-busters/shared";
import type { ForcedAction, GameState, InfoToken } from "@bomb-busters/shared";
import { applyMissionInfoTokenVariant } from "./infoTokenRules.js";

function normalizeMission22NumericToken(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 12) return null;
  return value;
}

function collectMission22TokenPassBoardFromPlayers(
  state: GameState,
): { numericTokens: number[]; yellowTokens: number } {
  const usedNumericValues = new Set<number>();
  let usedYellowTokens = 0;

  for (const player of state.players) {
    for (const token of player.infoTokens) {
      if (token.position !== -1) continue;
      if (token.isYellow) {
        usedYellowTokens += 1;
      } else {
        const normalizedValue = normalizeMission22NumericToken(token.value);
        if (normalizedValue !== null) {
          usedNumericValues.add(normalizedValue);
        }
      }
    }
  }

  const numericTokens = INFO_TOKEN_VALUES.filter((value) => !usedNumericValues.has(value));
  const yellowTokens = Math.max(0, YELLOW_INFO_TOKENS - usedYellowTokens);

  return { numericTokens, yellowTokens };
}

function isBoardValueSafe(value: number): value is number {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

export function getMission22TokenPassBoardState(
  state: GameState,
): { numericTokens: number[]; yellowTokens: number } {
  state.campaign ??= {};
  const existingBoard = state.campaign.mission22TokenPassBoard;
  if (
    existingBoard
    && Array.isArray(existingBoard.numericTokens)
    && existingBoard.numericTokens.every(isBoardValueSafe)
    && Number.isInteger(existingBoard.yellowTokens)
    && existingBoard.yellowTokens >= 0
  ) {
    return existingBoard;
  }

  const board = collectMission22TokenPassBoardFromPlayers(state);
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
  let sourceToken: { value: number; isYellow: boolean } | null = null;
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

  let sourcePlayerIndex = -1;
  let sourceTokenIndex = -1;
  if (sourceToken != null) {
    for (let playerIndex = 0; playerIndex < state.players.length; playerIndex++) {
      const player = state.players[playerIndex];
      for (let tokenIndex = 0; tokenIndex < player.infoTokens.length; tokenIndex++) {
        const token = player.infoTokens[tokenIndex];
        if (token.position !== -1) continue;
        if (
          sourceToken.isYellow
            ? token.isYellow
            : (!token.isYellow && token.value === sourceToken.value)
        ) {
          sourcePlayerIndex = playerIndex;
          sourceTokenIndex = tokenIndex;
          break;
        }
      }
      if (sourcePlayerIndex !== -1) break;
    }
  }

  if (sourcePlayerIndex !== -1 && sourceTokenIndex !== -1) {
    state.players[sourcePlayerIndex].infoTokens.splice(sourceTokenIndex, 1);
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
