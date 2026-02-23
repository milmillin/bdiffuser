import { describe, expect, it } from "vitest";
import {
  MISSION_SCHEMAS,
  resolveMissionSetup,
  type MissionId,
  type PlayerCount,
} from "@bomb-busters/shared";
import { makePlayer } from "@bomb-busters/shared/testing";
import { setupGame } from "../setup";
import { validateMissionPlayerCount } from "../startValidation";

const M1_MISSIONS: MissionId[] = Array.from({ length: 12 }, (_, idx) =>
  (1 + idx) as MissionId,
);
const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5];

function createPlayers(count: PlayerCount) {
  return Array.from({ length: count }, (_, idx) =>
    makePlayer({
      id: `p${idx + 1}`,
      name: `P${idx + 1}`,
      isCaptain: idx === 0,
      hand: [],
      infoTokens: [],
    }),
  );
}

describe("M1 rollout gate", () => {
  for (const missionId of M1_MISSIONS) {
    it(`mission ${missionId} setup passes for allowed player counts`, () => {
      const schema = MISSION_SCHEMAS[missionId];
      const allowedPlayerCounts = schema.allowedPlayerCounts ?? PLAYER_COUNTS;
      const allowedSet = new Set<PlayerCount>(allowedPlayerCounts);

      for (const playerCount of PLAYER_COUNTS) {
        if (allowedSet.has(playerCount)) {
          expect(validateMissionPlayerCount(missionId, playerCount)).toBeNull();
          expect(() => resolveMissionSetup(missionId, playerCount)).not.toThrow();
          expect(() => setupGame(createPlayers(playerCount), missionId)).not.toThrow();
        } else {
          expect(validateMissionPlayerCount(missionId, playerCount)).toContain(
            `Mission ${missionId}`,
          );
          expect(() => setupGame(createPlayers(playerCount), missionId)).toThrow();
        }
      }
    });
  }
});
