import { defaultSetup, exact, fixed, none, outOf, redAll } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerExpansionBMissions(setMission: MissionSetter): void {
  setMission(49, {
    name: "Message in a Bottle",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_49_oxygen_transfer_economy"],
    hookRules: [
      {
        kind: "oxygen_progression",
        initialPool: 0,
        perTurnCost: 1,
        initialPlayerOxygen: 4,
        initialPlayerOxygenByPlayerCount: {
          2: 7,
          3: 6,
          4: 5,
          5: 4,
        },
        rotatePlayerOxygen: true,
      },
    ],
    notes: [
      "FAQ: When a player has no wires or reveals RED, remaining oxygen removed from game.",
      "FAQ: Can voluntarily skip to save oxygen (detonator +1).",
    ],
  });

  setMission(50, {
    name: "The Blackest Sea",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(2),
    },
    overrides: { 2: { red: exact(3), yellow: exact(4) } },
    behaviorHooks: ["mission_50_no_markers_memory_mode"],
    hookRules: [{ kind: "no_markers_memory_mode" }],
  });

  setMission(51, {
    name: "It's Your (Un)Lucky Day!",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    overrides: { 2: { red: exact(2) } },
    behaviorHooks: ["mission_51_boss_designates_value"],
    hookRules: [{ kind: "boss_designates_value" }],
  });

  setMission(52, {
    name: "Dirty Double-crossers",
    setup: {
      ...defaultSetup(),
      red: exact(3),
      yellow: none(),
      equipment: { mode: "default", excludedUnlockValues: [1, 12] },
    },
    overrides: { 2: { red: exact(3), yellow: exact(4) } },
    behaviorHooks: ["mission_52_all_tokens_false"],
    hookRules: [{ kind: "false_tokens" }],
  });

  setMission(53, {
    name: "Nano Nano",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [6, 9] },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_53_nano_replaces_detonator"],
    hookRules: [
      { kind: "nano_progression", start: 0, max: 8, advanceOn: "end_turn", advanceBy: 1 },
    ],
  });

  setMission(54, {
    name: "The Attack of Rabbit the Red",
    setup: {
      ...defaultSetup(),
      red: fixed(redAll),
      yellow: none(),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    behaviorHooks: ["mission_54_red_stack_and_oxygen", "mission_54_audio_prompt"],
    hookRules: [
      {
        kind: "oxygen_progression",
        initialPool: 7,
        perTurnCost: 1,
        initialPlayerOxygen: 1,
      },
      { kind: "audio_prompt", audioFile: "mission_54" },
    ],
    notes: ["FAQ: If insufficient oxygen, skip and detonator +1. But if you can play, you must play."],
  });

  setMission(55, {
    name: "Doctor Nope's Challenge",
    setup: {
      ...defaultSetup(),
      red: exact(2),
    },
    overrides: { 2: { red: outOf(2, 3) } },
    behaviorHooks: ["mission_55_challenge_cards_reduce_detonator"],
    hookRules: [
      {
        kind: "challenge_rewards",
        activeCount: 1,
        activeCountMode: "per_player",
        rewardDetonatorReduction: 1,
      },
    ],
  });

  setMission(56, {
    name: "Tripwires",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_56_each_player_upside_down_wire"],
    hookRules: [{ kind: "upside_down_wire", count: 1, selfCutExplodes: false, noEquipmentOnFlipped: false }],
    notes: [
      "FAQ: If flipped wire is RED, reveal via normal 'Reveal Your Red Wires' action.",
      "ERRATUM: Number cards are NOT used in this mission.",
    ],
  });

  setMission(57, {
    name: "An Impossible Mission",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      equipment: {
        mode: "default",
        includeCampaignEquipment: true,
        excludedEquipmentIds: ["disintegrator"],
      },
    },
    overrides: { 2: { red: exact(2) } },
    behaviorHooks: ["mission_57_constraint_per_validated_value"],
    hookRules: [{ kind: "constraint_enforcement", constraintIds: ["A", "B", "C", "D", "E"], scope: "per_player" }],
  });
}
