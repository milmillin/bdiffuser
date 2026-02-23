import type { GameState, InfoToken } from "@bomb-busters/shared";

const EVEN_ODD_TOKEN_MISSIONS = new Set<number>([21]);

function isParityTokenMission(state: Readonly<GameState>): boolean {
  return EVEN_ODD_TOKEN_MISSIONS.has(state.mission);
}

function tokenParity(value: number): "even" | "odd" {
  return value % 2 === 0 ? "even" : "odd";
}

/**
 * Apply mission-specific token variants while preserving legacy token shape.
 * Mission 21 converts numeric tokens to even/odd parity tokens.
 */
export function applyMissionInfoTokenVariant(
  state: Readonly<GameState>,
  token: InfoToken,
): InfoToken {
  if (!isParityTokenMission(state)) return token;
  if (token.isYellow || token.relation != null) return token;
  if (!Number.isInteger(token.value) || token.value < 1 || token.value > 12) {
    return token;
  }

  return {
    ...token,
    value: 0,
    parity: tokenParity(token.value),
  };
}

export function describeInfoToken(token: Readonly<InfoToken>): string {
  if (token.relation === "eq") return "=";
  if (token.relation === "neq") return "!=";
  if (token.isYellow) return "YELLOW";
  if (token.parity === "even") return "EVEN";
  if (token.parity === "odd") return "ODD";
  return String(token.value);
}
