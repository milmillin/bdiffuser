import { describe, expect, it } from "vitest";
import {
  requiredSetupInfoTokenCountForMission,
  requiredSetupInfoTokenCountForMissionAndHand,
  requiresSetupInfoTokenForMission,
} from "../setupInfoTokenRules.js";

describe("setupInfoTokenRules", () => {
  it("requires no setup token for all players in mission 18", () => {
    expect(requiredSetupInfoTokenCountForMission(18, 2, true)).toBe(0);
    expect(requiredSetupInfoTokenCountForMission(18, 2, false)).toBe(0);
    expect(requiredSetupInfoTokenCountForMission(18, 3, true)).toBe(0);
  });

  it("requires no setup token for all players in mission 58", () => {
    expect(requiredSetupInfoTokenCountForMission(58, 2, true)).toBe(0);
    expect(requiredSetupInfoTokenCountForMission(58, 2, false)).toBe(0);
    expect(requiredSetupInfoTokenCountForMission(58, 4, false)).toBe(0);
  });

  it("requires 2 setup tokens for captain in mission 17", () => {
    expect(requiredSetupInfoTokenCountForMission(17, 2, true)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(17, 5, true)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(17, 3, false)).toBe(1);
  });

  it("requires 2 setup tokens for all players in mission 52", () => {
    expect(requiredSetupInfoTokenCountForMission(52, 2, true)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(52, 2, false)).toBe(2);
    expect(requiredSetupInfoTokenCountForMission(52, 5, false)).toBe(2);
  });

  it.each([11, 13, 27, 29, 40, 46, 51] as const)(
    "requires no setup token for 2-player captain in mission %i",
    (mission) => {
      expect(requiredSetupInfoTokenCountForMission(mission, 2, true)).toBe(0);
      expect(requiredSetupInfoTokenCountForMission(mission, 2, false)).toBe(1);
    },
  );

  it.each([11, 13, 27, 29, 40, 46, 51] as const)(
    "still requires setup token for 3-player captain in mission %i",
    (mission) => {
      expect(requiredSetupInfoTokenCountForMission(mission, 3, true)).toBe(1);
    },
  );

  it("defaults to requiring setup token on missions without overrides", () => {
    expect(requiredSetupInfoTokenCountForMission(1, 2, true)).toBe(1);
    expect(requiresSetupInfoTokenForMission(1, 4, false)).toBe(true);
  });

  it("caps mission 22 setup token count by absent values in hand", () => {
    const fullHand = [
      ...Array.from({ length: 12 }, (_, value) => ({
        gameValue: value + 1,
        cut: false,
      })),
      { gameValue: "YELLOW" as const, cut: false },
    ];

    const sparseHand = [{ gameValue: 4, cut: false }];

    const mixedHand = [
      { gameValue: 3, cut: false },
      { gameValue: "YELLOW" as const, cut: false },
      { gameValue: 12, cut: true },
    ];

    expect(
      requiredSetupInfoTokenCountForMissionAndHand(
        22,
        4,
        true,
        fullHand,
      ),
    ).toBe(0);
    expect(
      requiredSetupInfoTokenCountForMissionAndHand(
        22,
        4,
        false,
        sparseHand,
      ),
    ).toBe(2);
    expect(
      requiredSetupInfoTokenCountForMissionAndHand(
        22,
        4,
        false,
        mixedHand,
      ),
    ).toBe(2);
  });
});
