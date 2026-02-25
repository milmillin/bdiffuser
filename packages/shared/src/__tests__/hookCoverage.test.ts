/**
 * Hook coverage check — asserts that every mission with `behaviorHooks`
 * also has `hookRules` defined (non-empty). Mission 36 is the intentional
 * exception (sequence_card_reposition is a variant, not a typed hookRule).
 */
import { describe, it, expect } from "vitest";
import { ALL_MISSION_IDS } from "../types";
import { MISSION_SCHEMAS } from "../missionSchema";

const EXCLUDED_MISSIONS = new Set([36]);

describe("hook coverage", () => {
  it("every mission with behaviorHooks has hookRules (except mission 36)", () => {
    const missing: number[] = [];

    for (const id of ALL_MISSION_IDS) {
      if (EXCLUDED_MISSIONS.has(id)) continue;
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

  it("mission 36 has behaviorHooks but no hookRules (intentional)", () => {
    const schema = MISSION_SCHEMAS[36];
    expect(schema.behaviorHooks?.length).toBeGreaterThan(0);
    expect(schema.hookRules?.length ?? 0).toBe(0);
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

  it("mission 35 marks X-marked wire setup redraw to exclude Talkies-Walkies", () => {
    const hasFlag = MISSION_SCHEMAS[35]?.hookRules?.some(
      (rule) =>
        rule.kind === "x_marked_wire" && rule.excludeWalkieTalkies === true,
    );

    expect(hasFlag).toBe(true);
  });
});
