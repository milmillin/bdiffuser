import { MISSION_SCHEMAS } from "@bomb-busters/shared";
import type { MissionId } from "@bomb-busters/shared";

/**
 * Returns an error string if the mission does not support the given player
 * count, or null when the combination is valid.
 */
export function validateMissionPlayerCount(
  mission: MissionId,
  playerCount: number,
): string | null {
  const schema = MISSION_SCHEMAS[mission];
  if (!schema) return `Unknown mission ${mission}`;

  const allowed = schema.allowedPlayerCounts as readonly number[] | undefined;
  if (allowed && !allowed.includes(playerCount)) {
    const missionName = schema.name ?? `Mission ${mission}`;
    return `${missionName} (Mission ${mission}) requires ${allowed.join(", ")} players, but the room has ${playerCount}`;
  }

  return null;
}
