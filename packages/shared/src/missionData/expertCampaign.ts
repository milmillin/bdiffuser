import { defaultSetup, exact, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerExpertCampaignMissions(setMission: MissionSetter): void {
  setMission(33, {
    name: "What Happens in Vegas...",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_33_even_odd_tokens"],
    hookRules: [{ kind: "even_odd_tokens" }],
  });

  setMission(34, {
    name: "The Weakest Link",
    setup: {
      ...defaultSetup(),
      red: exact(1),
    },
    allowedPlayerCounts: [3, 4, 5],
    behaviorHooks: ["mission_34_hidden_weak_link_and_constraints"],
    hookRules: [{ kind: "constraint_enforcement", constraintIds: ["A", "B", "C", "D", "E"], scope: "per_player" }],
  });

  setMission(35, {
    name: "No Link, Single Wire",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
      yellow: exact(4),
      equipment: { mode: "default", excludedUnlockValues: [2] },
    },
    overrides: {
      2: { red: exact(3), yellow: exact(4) },
    },
    behaviorHooks: ["mission_35_x_marked_blue_wires"],
    hookRules: [{ kind: "x_marked_wire" }],
  });

  setMission(36, {
    name: "Panic under the Palm Trees",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 3),
      yellow: exact(2),
    },
    overrides: {
      2: { red: outOf(2, 3), yellow: exact(4) },
    },
    behaviorHooks: ["mission_36_sequence_card_reposition"],
  });

  setMission(37, {
    name: "Joker's Gone Wild",
    setup: { ...defaultSetup(), red: exact(2) },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_37_rolling_constraint"],
    hookRules: [{ kind: "constraint_enforcement", constraintIds: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], scope: "global" }],
  });

  setMission(38, {
    name: "Knit a Wire, Purl a Wire...",
    setup: { ...defaultSetup(), red: exact(2) },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_38_captain_upside_down_wire"],
    hookRules: [{ kind: "upside_down_wire", count: 1, selfCutExplodes: true, noEquipmentOnFlipped: true }],
    notes: ["FAQ: If Captain's upside-down wire is RED, reveal via normal 'Reveal Your Red Wires' action."],
  });

  setMission(39, {
    name: "The 4 Noble Wires",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
      yellow: exact(4),
      equipment: { mode: "none" },
    },
    overrides: {
      2: { red: exact(3), yellow: exact(4) },
    },
    behaviorHooks: ["mission_39_no_equipment_simultaneous_four"],
    hookRules: [
      { kind: "simultaneous_multi_cut", color: "yellow", count: 4 },
      { kind: "random_setup_info_tokens" },
    ],
    notes: ["FAQ: If dealt a Number card for a value not in hand or no longer in the game, ignore it."],
  });

  setMission(40, {
    name: "Hard to Die (A Christmas Tale)",
    setup: {
      ...defaultSetup(),
      red: exact(3),
    },
    behaviorHooks: ["mission_40_alternating_token_types"],
    hookRules: [{ kind: "count_tokens" }],
  });
}
