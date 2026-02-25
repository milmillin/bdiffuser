import type { GameState } from "@bomb-busters/shared";
import type { WireTile } from "@bomb-busters/shared";
import { isMission46SevenTile } from "./mission46.js";

export interface SimultaneousFourCutTarget {
  playerId: string;
  tileIndex: number;
}

/**
 * Mission 46 has a fixed target value (7). Other missions use the visible Number card.
 */
export function getSimultaneousFourCutTargetValue(
  state: Readonly<GameState>,
): number | null {
  const missionTargetValue =
    state.mission === 46 ? 7 : state.campaign?.numberCards?.visible?.[0]?.value;
  return typeof missionTargetValue === "number" ? missionTargetValue : null;
}

/**
 * Build all uncut targets for the mission's simultaneous-four cut value.
 * Returns null unless exactly four matching targets are present.
 */
export function buildSimultaneousFourCutTargets(
  state: Readonly<GameState>,
): SimultaneousFourCutTarget[] | null {
  const targetValue = getSimultaneousFourCutTargetValue(state);
  if (targetValue == null) return null;

  const targets: SimultaneousFourCutTarget[] = [];
  const isMission46 = state.mission === 46;
  for (const player of state.players) {
    for (let i = 0; i < player.hand.length; i++) {
      const tile = player.hand[i];
      const matchesTarget = isMission46
        ? isMission46SevenTile(tile, state.players.length)
        : tile.gameValue === targetValue;
      if (tile.cut || !matchesTarget) continue;
      targets.push({ playerId: player.id, tileIndex: i });
    }
  }

  return targets.length === 4 ? targets : null;
}
