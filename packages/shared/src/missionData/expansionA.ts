import { defaultSetup, exact, fixed, none, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerExpansionAMissions(setMission: MissionSetter): void {
  setMission(41, {
    name: "Latin Bombshell",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: exact(4),
      equipment: {
        mode: "default",
        includeCampaignEquipment: true,
      },
    },
    overrides: {
      2: { red: outOf(2, 3), yellow: exact(2) },
      3: { yellow: exact(3) },
      5: { yellow: exact(4) },
    },
    behaviorHooks: ["mission_41_iberian_yellow_mode"],
    hookRules: [{ kind: "iberian_yellow_mode" }],
    notes: ["FAQ: If the special designated Iberian (yellow) wire is RED, the bomb explodes."],
  });

  setMission(42, {
    name: "Time to Run Away and Join The Circus...",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: exact(4),
    },
    behaviorHooks: ["mission_42_audio_prompt"],
    hookRules: [{ kind: "audio_prompt", audioFile: "mission_42" }],
  });

  setMission(43, {
    name: "Nano the Robot",
    setup: {
      ...defaultSetup(),
      red: exact(3),
    },
    behaviorHooks: ["mission_43_nano_track_and_hidden_wire_pool"],
    hookRules: [
      { kind: "mission43_nano_robot" },
      { kind: "random_setup_info_tokens", captainOnly: true },
    ],
  });

  setMission(44, {
    name: "Underwater Pressure",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      equipment: { mode: "default" },
    },
    behaviorHooks: ["mission_44_oxygen_cost_and_no_talking"],
    hookRules: [
      {
        kind: "oxygen_progression",
        initialPool: 4,
        perTurnCost: 1,
        consumeOnCut: true,
        cutCostMode: "depth",
        initialPoolByPlayerCount: {
          2: 4,
          3: 6,
          4: 8,
          5: 10,
        },
      },
    ],
    notes: [
      "FAQ: Stabilizer can pretend-cut zone 1 when everything is already cut.",
      "FAQ: Skip to save oxygen (detonator +1). Stabilizer can negate detonator movement when passing.",
    ],
  });

  setMission(45, {
    name: "Seeking Volunteers",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default" },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_45_squeak_number_challenge"],
    hookRules: [{ kind: "squeak_number_challenge" }],
  });

  setMission(46, {
    name: "Secret Agent",
    setup: {
      ...defaultSetup(),
      red: none(),
      yellow: fixed([5.1, 6.1, 7.1, 8.1]),
      equipment: { mode: "default" },
    },
    behaviorHooks: ["mission_46_sevens_must_be_last"],
    hookRules: [{ kind: "sevens_last" }],
  });

  setMission(47, {
    name: "Calculate the Odds",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
      equipment: { mode: "default" },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_47_add_subtract_number_cards"],
    hookRules: [{ kind: "add_subtract_number_cards" }],
  });

  setMission(48, {
    name: "Lethal Wires 3",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(3),
    },
    overrides: { 2: { red: exact(3), yellow: exact(3) } },
    behaviorHooks: ["mission_48_simultaneous_three_yellow"],
    hookRules: [
      { kind: "simultaneous_multi_cut", color: "yellow", count: 3 },
    ],
  });
}
