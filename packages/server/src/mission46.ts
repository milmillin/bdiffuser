import type { WireTile } from "@bomb-busters/shared";
import { resolveMissionSetup } from "@bomb-busters/shared";

const MISSION_46_ID = 46;
const MISSION_46_MATCH_EPSILON = 0.01;

const MISSION_46_SEVEN_SORT_VALUES_BY_PLAYER_COUNT = new Map<number, number[]>();

function mission46SevensSortValues(playerCount: number): readonly number[] {
  const cached = MISSION_46_SEVEN_SORT_VALUES_BY_PLAYER_COUNT.get(playerCount);
  if (cached) return cached;

  let values = [7.1];
  if (playerCount >= 2 && playerCount <= 5) {
    const { setup } = resolveMissionSetup(
      MISSION_46_ID,
      playerCount as 2 | 3 | 4 | 5,
    );
    if (setup.yellow.kind === "fixed") {
      values = [...setup.yellow.values];
    }
  }

  MISSION_46_SEVEN_SORT_VALUES_BY_PLAYER_COUNT.set(playerCount, values);
  return values;
}

export function isMission46SevenTile(
  tile: WireTile,
  playerCount: number,
): boolean {
  if (tile.color !== "yellow") return false;

  return mission46SevensSortValues(playerCount).some(
    (value) =>
      Math.abs(tile.sortValue - value) < MISSION_46_MATCH_EPSILON,
  );
}
