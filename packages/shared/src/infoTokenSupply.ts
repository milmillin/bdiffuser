import {
  INFO_TOKEN_VALUES,
  TOTAL_INFO_TOKENS,
  YELLOW_INFO_TOKENS,
} from "./constants.js";
import type { InfoToken } from "./types.js";

const NUMERIC_TOKEN_COPIES =
  (TOTAL_INFO_TOKENS - YELLOW_INFO_TOKENS) / INFO_TOKEN_VALUES.length;

type InfoTokenOwnerLike = {
  infoTokens: ReadonlyArray<Pick<InfoToken, "value" | "isYellow">>;
};

/** Remaining info-token supply derived from tokens currently placed on player stands. */
export interface RemainingInfoTokenSupply {
  numericTokens: number[];
  yellowTokens: number;
}

function normalizeNumericTokenValue(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 12) return null;
  return value;
}

export function getRemainingInfoTokenSupply(
  players: ReadonlyArray<InfoTokenOwnerLike>,
): RemainingInfoTokenSupply {
  const usedNumericCounts = new Map<number, number>();
  let usedYellowTokens = 0;

  for (const player of players) {
    for (const token of player.infoTokens) {
      if (token.isYellow) {
        usedYellowTokens += 1;
        continue;
      }

      const normalizedValue = normalizeNumericTokenValue(token.value);
      if (normalizedValue == null) continue;

      usedNumericCounts.set(
        normalizedValue,
        (usedNumericCounts.get(normalizedValue) ?? 0) + 1,
      );
    }
  }

  const numericTokens = INFO_TOKEN_VALUES.flatMap((value) => {
    const usedCount = usedNumericCounts.get(value) ?? 0;
    const availableCount = Math.max(0, NUMERIC_TOKEN_COPIES - usedCount);
    return Array.from({ length: availableCount }, () => value);
  });

  return {
    numericTokens,
    yellowTokens: Math.max(0, YELLOW_INFO_TOKENS - usedYellowTokens),
  };
}

/** Unique token values currently available to choose. `0` represents yellow. */
export function getAvailableInfoTokenChoiceValues(
  players: ReadonlyArray<InfoTokenOwnerLike>,
): number[] {
  const supply = getRemainingInfoTokenSupply(players);
  const values = [...new Set(supply.numericTokens)].sort((a, b) => a - b);
  if (supply.yellowTokens > 0) {
    values.push(0);
  }
  return values;
}
