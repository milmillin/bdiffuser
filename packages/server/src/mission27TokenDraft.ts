import {
  INFO_TOKEN_VALUES,
  TOTAL_INFO_TOKENS,
  YELLOW_INFO_TOKENS,
} from "@bomb-busters/shared";
import type {
  ForcedAction,
  GameState,
  InfoToken,
  Mission27TokenDraftBoardState,
} from "@bomb-busters/shared";
import { applyMissionInfoTokenVariant, pushInfoToken } from "./infoTokenRules.js";

const NUMERIC_TOKEN_COPIES =
  (TOTAL_INFO_TOKENS - YELLOW_INFO_TOKENS) / INFO_TOKEN_VALUES.length;

function normalizeNumericDraftTokenValue(token: Readonly<InfoToken>): number | null {
  if (token.isYellow) return null;
  if (token.relation != null || token.singleWire || token.countHint != null || token.parity != null) {
    return null;
  }
  if (!Number.isInteger(token.value) || token.value < 1 || token.value > 12) return null;
  return token.value;
}

function isYellowDraftToken(token: Readonly<InfoToken>): boolean {
  if (!token.isYellow) return false;
  if (token.relation != null || token.singleWire || token.countHint != null || token.parity != null) {
    return false;
  }
  return true;
}

function collectMission27TokenDraftSupplyFromPlayers(
  state: Readonly<GameState>,
): { numericTokens: number[]; yellowTokens: number } {
  const usedNumericCounts = new Map<number, number>();
  let usedYellowTokens = 0;

  for (const player of state.players) {
    for (const token of player.infoTokens) {
      if (isYellowDraftToken(token)) {
        usedYellowTokens += 1;
        continue;
      }

      const numericValue = normalizeNumericDraftTokenValue(token);
      if (numericValue == null) continue;
      usedNumericCounts.set(
        numericValue,
        (usedNumericCounts.get(numericValue) ?? 0) + 1,
      );
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

export function buildMission27TokenDraftBoard(
  state: Readonly<GameState>,
  drawCount = state.players.length,
  rng: () => number = Math.random,
): Mission27TokenDraftBoardState {
  if (!Number.isInteger(drawCount) || drawCount <= 0) {
    return { numericTokens: [], yellowTokens: 0 };
  }

  const available = collectMission27TokenDraftSupplyFromPlayers(state);
  const drawPool: number[] = [
    ...available.numericTokens,
    ...Array.from({ length: available.yellowTokens }, () => 0),
  ];
  const draft: Mission27TokenDraftBoardState = { numericTokens: [], yellowTokens: 0 };

  for (let i = 0; i < drawCount && drawPool.length > 0; i++) {
    const rawIndex = Math.floor(rng() * drawPool.length);
    const drawIndex = Math.min(Math.max(rawIndex, 0), drawPool.length - 1);
    const [drawn] = drawPool.splice(drawIndex, 1);
    if (drawn === 0) draft.yellowTokens += 1;
    else draft.numericTokens.push(drawn);
  }

  return draft;
}

export function getMission27TokenDraftAvailableValues(
  state: Readonly<GameState>,
): number[] {
  const board = state.campaign?.mission27TokenDraftBoard;
  if (!board) return [];

  const values = new Set<number>();
  for (const value of board.numericTokens) values.add(value);
  if (board.yellowTokens > 0) values.add(0);
  return Array.from(values).sort((a, b) => a - b);
}

export function applyMission27TokenDraftChoice(
  state: GameState,
  forced: Extract<ForcedAction, { kind: "mission27TokenDraft" }>,
  value: number,
  tileIndex?: number,
): { ok: true; chooserIndex: number; updatedChooserToken: InfoToken } | { ok: false; message: string } {
  const board = state.campaign?.mission27TokenDraftBoard;
  if (!board) {
    return { ok: false, message: "Mission 27 token draft is not available" };
  }

  const chooserIndex = state.players.findIndex((player) => player.id === forced.currentChooserId);
  if (chooserIndex < 0) {
    return { ok: false, message: "Invalid mission 27 token draft chooser" };
  }
  const chooser = state.players[chooserIndex];
  if (!chooser) {
    return { ok: false, message: "Invalid mission 27 token draft chooser" };
  }

  const isYellow = value === 0;
  let sourceToken: { value: number; isYellow: boolean };
  let numericBoardIndex = -1;
  if (isYellow) {
    if (board.yellowTokens <= 0) {
      return { ok: false, message: "Token value is not available in the draft line" };
    }
    sourceToken = { value: 0, isYellow: true };
  } else {
    if (!Number.isInteger(value) || value < 1 || value > 12) {
      return { ok: false, message: "Token value is not available in the draft line" };
    }
    numericBoardIndex = board.numericTokens.indexOf(value);
    if (numericBoardIndex < 0) {
      return { ok: false, message: "Token value is not available in the draft line" };
    }
    sourceToken = { value, isYellow: false };
  }

  const matchingIndices = chooser.hand
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => {
      if (tile.cut) return false;
      if (sourceToken.isYellow) return tile.color === "yellow";
      return typeof tile.gameValue === "number" && tile.gameValue === sourceToken.value;
    })
    .map(({ index }) => index);

  let position = -1;
  if (matchingIndices.length === 1) {
    position = matchingIndices[0];
  } else if (matchingIndices.length >= 2) {
    if (tileIndex == null) {
      // Backward compatibility for older clients that don't send tileIndex.
      position = matchingIndices[0];
    } else if (!matchingIndices.includes(tileIndex)) {
      return { ok: false, message: "Invalid mission 27 token placement choice" };
    } else {
      position = tileIndex;
    }
  }

  // Consume the draft token only after placement resolution is validated.
  if (sourceToken.isYellow) {
    board.yellowTokens -= 1;
  } else {
    board.numericTokens.splice(numericBoardIndex, 1);
  }

  const token = applyMissionInfoTokenVariant(state, {
    value: sourceToken.value,
    position,
    isYellow: sourceToken.isYellow,
  }, chooser);
  if (token.position < 0) {
    token.position = -1;
  }
  pushInfoToken(chooser, token);

  return { ok: true, chooserIndex, updatedChooserToken: token };
}
