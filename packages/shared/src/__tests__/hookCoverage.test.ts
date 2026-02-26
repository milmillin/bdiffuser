/**
 * Hook coverage check — asserts that every mission with `behaviorHooks`
 * also has `hookRules` defined (non-empty).
 */
import { describe, it, expect } from "vitest";
import { ALL_MISSION_IDS, type MissionId } from "../types";
import {
  MISSION_SCHEMAS,
  hasXMarkedWireTalkiesRestriction,
} from "../missionSchema";

describe("hook coverage", () => {
  it("every mission with behaviorHooks has hookRules", () => {
    const missing: number[] = [];

    for (const id of ALL_MISSION_IDS) {
      const schema = MISSION_SCHEMAS[id];
      if (!schema.behaviorHooks?.length) continue;
      if (!schema.hookRules?.length) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `missions with behaviorHooks but no hookRules: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("no mission has hookRules without behaviorHooks", () => {
    const orphaned: number[] = [];

    for (const id of ALL_MISSION_IDS) {
      const schema = MISSION_SCHEMAS[id];
      if (schema.hookRules?.length && !schema.behaviorHooks?.length) {
        orphaned.push(id);
      }
    }

    expect(
      orphaned,
      `missions with hookRules but no behaviorHooks: ${orphaned.join(", ")}`,
    ).toEqual([]);
  });

  it("mission 20 and 35 mark X-marked wire setup redraw to exclude Talkies-Walkies", () => {
    const hasFlag = (mission: MissionId): boolean => {
      const rules = MISSION_SCHEMAS[mission]?.hookRules ?? [];
      return rules.some(
        (rule) =>
          rule.kind === "x_marked_wire" &&
          rule.excludeWalkieTalkies === true,
      );
    };

    expect(hasFlag(20)).toBe(true);
    expect(hasFlag(35)).toBe(true);
    expect(hasXMarkedWireTalkiesRestriction(20)).toBe(true);
    expect(hasXMarkedWireTalkiesRestriction(35)).toBe(true);
    expect(hasXMarkedWireTalkiesRestriction(1)).toBe(false);
  });
});
