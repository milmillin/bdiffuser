import { defaultSetup, exact, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerMidCampaignMissions(setMission: MissionSetter): void {
  setMission(17, {
    name: "Sergio El Mytho",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
    },
    overrides: {
      2: { red: exact(3) },
    },
    behaviorHooks: ["mission_17_false_info_tokens", "mission_17_sergio_equipment_restriction"],
  });

  setMission(18, {
    name: "BAT-helping hand",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "fixed_pool", fixedEquipmentIds: ["general_radar"] },
    },
    overrides: {
      2: { red: exact(3) },
    },
    behaviorHooks: ["mission_18_forced_general_radar_flow"],
    notes: ["FAQ: Active player designates only WHO cuts, not which wire or stand. Next turn goes to player on active player's left."],
  });

  setMission(19, {
    name: "In the Belly of the Beast",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: outOf(2, 3),
    },
    behaviorHooks: ["mission_19_audio_prompt"],
  });

  setMission(20, {
    name: "The Big Bad Wolf",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [2] },
    },
    overrides: {
      2: {
        red: outOf(2, 3),
        yellow: exact(4),
      },
    },
    behaviorHooks: ["mission_20_x_marked_unsorted_wires"],
  });

  setMission(21, {
    name: "Kouign Amann Mortal",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 2),
    },
    overrides: {
      2: { red: exact(2) },
    },
    behaviorHooks: ["mission_21_even_odd_tokens"],
  });

  setMission(22, {
    name: "None of That in My House!",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: exact(4),
    },
    behaviorHooks: ["mission_22_absent_value_tokens", "mission_22_yellow_trigger_token_pass"],
  });

  setMission(23, {
    name: "Mission in Sevenans",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      equipment: { mode: "none" },
    },
    overrides: {
      2: { red: outOf(2, 3) },
    },
    behaviorHooks: ["mission_23_hidden_equipment_pile", "mission_23_simultaneous_four_of_value_action"],
    hookRules: [
      { kind: "hidden_equipment_pile", pileSize: 7 },
    ],
  });

  setMission(24, {
    name: "The Count Is Good!",
    setup: {
      ...defaultSetup(),
      red: exact(2),
    },
    overrides: {
      2: { red: exact(3) },
    },
    behaviorHooks: ["mission_24_count_tokens_x1_x2_x3"],
    notes: ["FAQ: If Walkie-Talkies are used on a wire with an x1/x2/x3 info token, that token is discarded."],
  });
}
