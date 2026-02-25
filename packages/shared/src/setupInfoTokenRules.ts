import {
  NO_SETUP_TOKEN_MISSIONS,
  TWO_PLAYER_CAPTAIN_SKIP_MISSIONS,
} from "./constants.js";
import type { CampaignState, WireValue } from "./types.js";

const MISSION_22_POSSIBLE_VALUES = 13;

type Mission22HandTile = {
  cut: boolean;
  gameValue?: WireValue;
};

function countMission22AbsentValues(
  hand: readonly Mission22HandTile[],
): number {
  return MISSION_22_POSSIBLE_VALUES - getMission22PresentValues(hand).size;
}

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

  // Mission 22: every player places 2 absent-value setup tokens.
  if (mission === 22) {
    return 2;
  }

  // Mission 52: every player places 2 false setup tokens.
  if (mission === 52) {
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

export function getMission22PresentValues(
  hand: readonly Mission22HandTile[],
): Set<number | "YELLOW"> {
  const present = new Set<number | "YELLOW">();
  for (const tile of hand) {
    if (tile.cut) continue;
    if (tile.gameValue === "YELLOW") {
      present.add("YELLOW");
    } else if (typeof tile.gameValue === "number") {
      present.add(tile.gameValue);
    }
  }
  return present;
}

export function requiresSetupInfoTokenForMission(
  mission: number,
  playerCount: number,
  isCaptain: boolean,
): boolean {
  return requiredSetupInfoTokenCountForMission(mission, playerCount, isCaptain) > 0;
}

export function requiredSetupInfoTokenCountForMissionAndHand(
  mission: number,
  playerCount: number,
  isCaptain: boolean,
  hand: readonly Mission22HandTile[],
  campaign?: Pick<CampaignState, "falseInfoTokenMode" | "falseTokenMode">,
): number {
  const base = requiredSetupInfoTokenCountForMission(
    mission,
    playerCount,
    isCaptain,
  );

  if (campaign?.falseTokenMode === true) {
    return 2;
  }

  if (campaign?.falseInfoTokenMode === true) {
    return isCaptain ? 2 : base;
  }

  if (mission === 22) {
    return Math.min(base, countMission22AbsentValues(hand));
  }

  return base;
}
