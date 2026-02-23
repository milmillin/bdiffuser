import { describe, it, expect } from "vitest";
import { ALL_MISSION_IDS, MISSION_SCHEMAS } from "@bomb-busters/shared";
import { makeGameState } from "@bomb-busters/shared/testing";
import {
  dispatchHooks,
  getStrictUnknownHooks,
  hasHandler,
  setStrictUnknownHooks,
} from "../missionHooks";

describe("mission hook coverage", () => {
  it("registers a handler for every hook kind referenced by mission hookRules", () => {
    const referencedHookKinds = new Set<string>();

    for (const missionId of ALL_MISSION_IDS) {
      const rules = MISSION_SCHEMAS[missionId].hookRules ?? [];
      for (const rule of rules) {
        referencedHookKinds.add(rule.kind);
      }
    }

    // Safety check so this test cannot pass vacuously.
    expect(referencedHookKinds.size).toBeGreaterThan(0);

    for (const hookKind of referencedHookKinds) {
      expect(hasHandler(hookKind as Parameters<typeof hasHandler>[0])).toBe(true);
    }
  });

  it("does not raise unknown-hook errors in strict mode for setup dispatch", () => {
    const previousStrict = getStrictUnknownHooks();
    setStrictUnknownHooks(true);

    try {
      for (const missionId of ALL_MISSION_IDS) {
        const rules = MISSION_SCHEMAS[missionId].hookRules ?? [];
        if (rules.length === 0) continue;

        const state = makeGameState({ mission: missionId });

        expect(() => {
          dispatchHooks(missionId, { point: "setup", state });
        }).not.toThrow();
      }
    } finally {
      setStrictUnknownHooks(previousStrict);
    }
  });
});
