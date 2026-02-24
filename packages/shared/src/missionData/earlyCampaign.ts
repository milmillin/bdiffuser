import { defaultSetup, exact, none, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerEarlyCampaignMissions(setMission: MissionSetter): void {
  setMission(9, {
    name: "A Sense of Priorities",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: exact(2),
    },
    overrides: {
      2: {
        red: exact(2),
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_9_sequence_priority_face_a"],
    hookRules: [
      { kind: "sequence_priority", cardCount: 3, requiredCuts: 2, variant: "face_a" },
    ],
    notes: ["FAQ: If a player only has sequence-blocked wires left, the bomb explodes."],
  });

  setMission(10, {
    name: "A Rough Patch",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: exact(4),
      equipment: { mode: "default", excludedUnlockValues: [11] },
    },
    behaviorHooks: ["mission_10_timer_and_dynamic_turn_order"],
    hookRules: [
      {
        kind: "timer",
        durationSeconds: 900,
        durationSecondsByPlayerCount: { 2: 720 },
        audioPrompt: true,
      },
      { kind: "dynamic_turn_order", selector: "captain" },
    ],
    notes: ["FAQ: Same player cannot play several rounds in a row (except 2-player or last player with wires)."],
  });

  setMission(11, {
    name: "Blue on Red, Looks Like We Are Dead",
    setup: {
      ...defaultSetup(),
      red: none(),
      yellow: exact(2),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_11_blue_value_treated_as_red"],
    hookRules: [
      { kind: "blue_value_treated_as_red", count: 1, knownToAnyPlayer: false },
    ],
  });

  setMission(12, {
    name: "Wrapped in Red Tape",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: exact(4),
    },
    overrides: {
      2: {
        red: exact(2),
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_12_equipment_double_lock"],
    hookRules: [
      {
        kind: "equipment_double_lock",
        requiredCuts: 2,
        secondaryLockSource: "number_card",
        secondaryRequiredCuts: 2,
      },
    ],
    notes: ["FAQ: Cutting 2 wires of a value unlocks BOTH the equipment card AND the Number card lock simultaneously."],
  });

  setMission(13, {
    name: "Red Alert!",
    setup: {
      ...defaultSetup(),
      red: exact(3),
      yellow: none(),
    },
    behaviorHooks: ["mission_13_simultaneous_red_cut_action", "mission_13_random_info_token_setup"],
    hookRules: [{ kind: "random_setup_info_tokens" }],
    notes: ["FAQ: Cannot use Equipment or Personal Equipment to cut RED wires. RED/YELLOW have no numeric value — detectors cannot target them."],
  });

  setMission(14, {
    name: "High-Risk Bomb Disposal Expert (aka. NOOB)",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: outOf(2, 3),
    },
    overrides: {
      2: {
        red: exact(3),
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_14_intern_failure_explodes"],
    hookRules: [
      { kind: "intern_failure_explodes", forbiddenEquipment: ["stabilizer"] },
    ],
  });

  setMission(15, {
    name: "Mission in \u041D\u041E\u0412\u041E\u0421\u0418\u0411\u0418\u0420\u0421\u041A",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: none(),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        red: outOf(2, 3),
      },
    },
    behaviorHooks: ["mission_15_number_deck_equipment_reveal"],
    hookRules: [
      { kind: "number_deck_equipment_reveal" },
    ],
  });

  setMission(16, {
    name: "Time to Reprioritize (Is this d\u00e9j\u00e0 vu?)",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: outOf(2, 3),
    },
    overrides: {
      2: {
        red: exact(2),
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_16_sequence_priority_face_b"],
    hookRules: [
      { kind: "sequence_priority", cardCount: 3, requiredCuts: 4, variant: "face_b" },
    ],
    notes: ["FAQ: If a player only has sequence-blocked wires left, the bomb explodes."],
  });
}
