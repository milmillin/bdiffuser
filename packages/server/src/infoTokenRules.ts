import type { GameState, InfoToken, Player, WireValue } from "@bomb-busters/shared";

const EVEN_ODD_TOKEN_MISSIONS = new Set<number>([21, 33]);
const COUNT_TOKEN_MISSIONS = new Set<number>([24, 40]);
const ABSENT_VALUE_TOKEN_MISSIONS = new Set<number>([22]);

function isParityTokenMission(state: Readonly<GameState>): boolean {
  return EVEN_ODD_TOKEN_MISSIONS.has(state.mission);
}

function isCountTokenMission(state: Readonly<GameState>): boolean {
  return COUNT_TOKEN_MISSIONS.has(state.mission);
}

function isAbsentValueTokenMission(state: Readonly<GameState>): boolean {
  return ABSENT_VALUE_TOKEN_MISSIONS.has(state.mission);
}

function tokenParity(value: number): "even" | "odd" {
  return value % 2 === 0 ? "even" : "odd";
}

function toCountHint(count: number): 1 | 2 | 3 {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function countValueCopies(owner: Readonly<Player>, value: WireValue): number {
  let count = 0;
  for (const tile of owner.hand) {
    if (tile.gameValue === value) count++;
  }
  return count;
}

/**
 * Map a wire's game value to a numeric value that is NOT present on the tile.
 * Uses a fixed 1↔2 mapping: value 1 → 2, everything else → 1.
 *
 * AMB-022-1: Both "fixed 1/2" and "value + 1 mod 12" strategies eliminate
 * exactly one value from the recipient's perspective, so their information
 * content is equivalent. The fixed mapping keeps the implementation simple
 * and matches the physical game's token supply (only values 1-12 exist).
 */
function toAbsentNumericValue(value: WireValue): number {
  if (typeof value !== "number") return 1;
  return value === 1 ? 2 : 1;
}

/**
 * Apply mission-specific token variants while preserving legacy token shape.
 * Missions 21 and 33 convert numeric tokens to even/odd parity tokens.
 * Missions 24 and 40 convert numeric/yellow tokens to x1/x2/x3 count hints.
 */
export function applyMissionInfoTokenVariant(
  state: Readonly<GameState>,
  token: InfoToken,
  owner?: Readonly<Player>,
): InfoToken {
  if (token.relation != null) return token;

  if (isAbsentValueTokenMission(state)) {
    // Mission 22 absent-value tokens only use variant-style behavior for
    // stand placements. In-play token placements on a wire must keep the true
    // announced value.
    if (token.position >= 0) return token;

    if (!owner) return token;
    const tile = owner.hand[token.position];
    if (!tile) return token;
    return {
      ...token,
      value: toAbsentNumericValue(tile.gameValue),
      isYellow: false,
      parity: undefined,
      countHint: undefined,
    };
  }

  if (isCountTokenMission(state)) {
    if (!owner) return token;
    const tile = owner.hand[token.position];
    if (!tile || tile.color === "red") return token;

    return {
      ...token,
      value: 0,
      isYellow: false,
      parity: undefined,
      countHint: toCountHint(countValueCopies(owner, tile.gameValue)),
    };
  }

  if (isParityTokenMission(state)) {
    if (token.isYellow) return token;
    if (!Number.isInteger(token.value) || token.value < 1 || token.value > 12) {
      return token;
    }

    return {
      ...token,
      value: 0,
      parity: tokenParity(token.value),
      countHint: undefined,
    };
  }

  return token;
}

export function describeInfoToken(token: Readonly<InfoToken>): string {
  if (token.relation === "eq") return "=";
  if (token.relation === "neq") return "!=";
  if (token.countHint != null) return `x${token.countHint}`;
  if (token.isYellow) return "YELLOW";
  if (token.parity === "even") return "EVEN";
  if (token.parity === "odd") return "ODD";
  return String(token.value);
}
