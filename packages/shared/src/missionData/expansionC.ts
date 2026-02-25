import { defaultSetup, exact, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerExpansionCMissions(setMission: MissionSetter): void {
  setMission(58, {
    name: "Double and/or Nothing",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default" },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_58_no_info_tokens_unlimited_double_detector"],
    hookRules: [{ kind: "no_info_unlimited_dd" }],
  });

  setMission(59, {
    name: "Nano to the Rescue",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
      equipment: { mode: "default" },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_59_nano_navigation_values"],
    hookRules: [
      {
        kind: "nano_progression",
        start: 0,
        max: 8,
        advanceOn: "successful_cut",
        advanceBy: 1,
        movement: "value_parity",
      },
    ],
  });

  setMission(60, {
    name: "Yep, it's Doctor Nope!",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_60_challenge_cards_reduce_detonator"],
    hookRules: [
      {
        kind: "challenge_rewards",
        activeCount: 1,
        activeCountMode: "per_player",
        rewardDetonatorReduction: 1,
      },
    ],
  });

  setMission(61, {
    name: "Sharing is Caring",
    setup: {
      ...defaultSetup(),
      red: exact(1),
    },
    overrides: { 2: { red: exact(2) } },
    behaviorHooks: ["mission_61_rotating_constraints"],
    hookRules: [{ kind: "constraint_enforcement", constraintIds: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], scope: "global" }],
  });

  setMission(62, {
    name: "Armageddon Roulette",
    setup: {
      ...defaultSetup(),
      red: exact(2),
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_62_number_card_completions_reduce_detonator"],
    hookRules: [{ kind: "number_card_completions" }],
  });

  setMission(63, {
    name: "It is Positively Titanic",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_63_rotating_oxygen_pool"],
    hookRules: [
      {
        kind: "oxygen_progression",
        initialPool: 0,
        perTurnCost: 1,
        initialPlayerOxygen: 0,
        consumeOnCut: true,
        cutCostMode: "value",
      },
    ],
    notes: ["FAQ: Must play if you have enough oxygen. Cannot voluntarily skip."],
  });

  setMission(64, {
    name: "Return of the Tripwires",
    setup: {
      ...defaultSetup(),
      red: exact(1),
    },
    overrides: { 2: { red: exact(2) } },
    behaviorHooks: ["mission_64_two_upside_down_wires_each"],
    hookRules: [{ kind: "upside_down_wire", count: 2, selfCutExplodes: true, noEquipmentOnFlipped: true }],
    notes: ["FAQ: With 2 stands, only 2 wires total flipped. Lowest goes far-left of 1st stand, highest goes far-right of 2nd stand."],
  });

  setMission(65, {
    name: "Hand-Me-Downs",
    setup: {
      ...defaultSetup(),
      red: exact(3),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    allowedPlayerCounts: [3, 4, 5],
    behaviorHooks: ["mission_65_personal_number_cards"],
    hookRules: [{ kind: "personal_number_cards" }],
  });

  setMission(66, {
    name: "The Final Countdown",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(2),
    },
    behaviorHooks: ["mission_66_bunker_flow", "mission_66_audio_prompt"],
    hookRules: [
      { kind: "bunker_flow", start: 0, max: 10, advanceBy: 1, actionCycleLength: 4 },
      { kind: "audio_prompt", audioFile: "mission_66" },
    ],
    notes: ["FAQ: Standee must move after every cut. On hash squares, must perform successful cut matching ACTION constraint to trigger action."],
  });
}
