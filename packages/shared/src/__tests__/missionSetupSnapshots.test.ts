import { describe, expect, it } from "vitest";
import { ALL_MISSION_IDS } from "../types";
import { MISSION_SCHEMAS, resolveMissionSetup, type PlayerCount } from "../missionSchema";

const DEFAULT_PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5];

describe("resolved mission setup snapshots", () => {
  it("covers all expected mission IDs", () => {
    expect(ALL_MISSION_IDS).toHaveLength(66);
  });

  for (const missionId of ALL_MISSION_IDS) {
    it(`mission ${missionId}`, () => {
      const schema = MISSION_SCHEMAS[missionId];
      const allowedCounts = schema.allowedPlayerCounts ?? DEFAULT_PLAYER_COUNTS;

      const setupsByPlayerCount = Object.fromEntries(
        allowedCounts.map((playerCount) => {
          const { setup } = resolveMissionSetup(missionId, playerCount);
          return [
            String(playerCount),
            {
              blue: setup.blue,
              red: setup.red,
              yellow: setup.yellow,
              equipment: setup.equipment,
            },
          ];
        }),
      );

      expect({
        missionId,
        name: schema.name,
        setupsByPlayerCount,
      }).toMatchSnapshot();
    });
  }

  it("mission 26 gives 2-player setup 3 reds", () => {
    const { setup } = resolveMissionSetup(26, 2);
    expect(setup.red).toEqual({ kind: "exact", count: 3 });
  });
});
