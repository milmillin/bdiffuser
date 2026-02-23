import {
  NO_SETUP_TOKEN_MISSIONS,
  TWO_PLAYER_CAPTAIN_SKIP_MISSIONS,
} from "./constants.js";

export function requiredSetupInfoTokenCountForMission(
  mission: number,
  playerCount: number,
  isCaptain: boolean,
): number {
  if (NO_SETUP_TOKEN_MISSIONS.has(mission)) {
    return 0;
  }

  // Mission 17: captain places 2 false setup tokens.
  if (mission === 17 && isCaptain) {
    return 2;
  }

  if (
    TWO_PLAYER_CAPTAIN_SKIP_MISSIONS.has(mission) &&
    playerCount === 2 &&
    isCaptain
  ) {
    return 0;
  }

  return 1;
}

export function requiresSetupInfoTokenForMission(
  mission: number,
  playerCount: number,
  isCaptain: boolean,
): boolean {
  return requiredSetupInfoTokenCountForMission(mission, playerCount, isCaptain) > 0;
}
