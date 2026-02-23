import type { GameState } from "@bomb-busters/shared";

/**
 * Mission 10 rule: in games with 3+ players, the same player cannot act
 * on consecutive turns when at least one alternative active player exists.
 */
export function isRepeatNextPlayerSelectionDisallowed(
  state: GameState,
  previousPlayerId: string | undefined,
  targetPlayerId: string,
): boolean {
  if (state.mission !== 10) return false;
  if (state.players.length <= 2) return false;
  if (!previousPlayerId) return false;
  if (targetPlayerId !== previousPlayerId) return false;

  const hasAlternative = state.players.some(
    (p) => p.id !== previousPlayerId && p.hand.some((t) => !t.cut),
  );
  return hasAlternative;
}
