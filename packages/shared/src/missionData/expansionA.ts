import { defaultSetup, exact, fixed, none, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerExpansionAMissions(setMission: MissionSetter): void {
  setMission(41, {
    name: "Bomba latina",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: exact(4),
      equipment: {
        mode: "default",
        includeCampaignEquipment: true,
        excludedEquipmentIds: ["double_fond"],
      },
    },
    overrides: {
      2: { red: outOf(2, 3), yellow: exact(2) },
      3: { yellow: exact(3) },
      5: { yellow: exact(4) },
    },
    behaviorHooks: ["mission_41_iberian_yellow_mode"],
    notes: ["FAQ: If the special designated Iberian (yellow) wire is RED, the bomb explodes."],
  });

  setMission(42, {
    name: "What Is This Circus?",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: exact(4),
    },
    behaviorHooks: ["mission_42_audio_prompt"],
  });

  setMission(43, {
    name: "Nano and Robot",
    setup: {
      ...defaultSetup(),
      red: exact(3),
    },
    behaviorHooks: ["mission_43_nano_track_and_hidden_wire_pool"],
  });

  setMission(44, {
    name: "Underwater Pressure",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    behaviorHooks: ["mission_44_oxygen_cost_and_no_talking"],
    notes: [
      "FAQ: Stabilizer can pretend-cut zone 1 when everything is already cut.",
      "FAQ: Skip to save oxygen (detonator +1). Stabilizer can negate detonator movement when passing.",
    ],
  });

  setMission(45, {
    name: "My Thread, My Battle!",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [10, 11] },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_45_squeak_number_challenge"],
  });

  setMission(46, {
    name: "Agent 007",
    setup: {
      ...defaultSetup(),
      red: none(),
      yellow: fixed([5.1, 6.1, 7.1, 8.1]),
      equipment: { mode: "default", excludedUnlockValues: [7] },
    },
    behaviorHooks: ["mission_46_sevens_must_be_last"],
  });

  setMission(47, {
    name: "L'addition SVP!",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_47_add_subtract_number_cards"],
  });

  setMission(48, {
    name: "3-wire Plan",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(3),
    },
    overrides: { 2: { red: exact(3), yellow: exact(3) } },
    behaviorHooks: ["mission_48_simultaneous_three_yellow"],
  });
}
