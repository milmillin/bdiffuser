import type { GameState, InfoToken, Player, WireValue } from "@bomb-busters/shared";

const EVEN_ODD_TOKEN_MISSIONS = new Set<number>([21]);
const COUNT_TOKEN_MISSIONS = new Set<number>([24]);

function isParityTokenMission(state: Readonly<GameState>): boolean {
  return EVEN_ODD_TOKEN_MISSIONS.has(state.mission);
}

function isCountTokenMission(state: Readonly<GameState>): boolean {
  return COUNT_TOKEN_MISSIONS.has(state.mission);
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
 * Apply mission-specific token variants while preserving legacy token shape.
 * Mission 21 converts numeric tokens to even/odd parity tokens.
 * Mission 24 converts numeric/yellow tokens to x1/x2/x3 count hints.
 */
export function applyMissionInfoTokenVariant(
  state: Readonly<GameState>,
  token: InfoToken,
  owner?: Readonly<Player>,
): InfoToken {
  if (token.relation != null) return token;

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
