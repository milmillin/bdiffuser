import { defaultSetup, exact, outOf } from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerLateCampaignMissions(setMission: MissionSetter): void {
  setMission(25, {
    name: "It's to Hear You Better...",
    setup: { ...defaultSetup(), red: exact(2) },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_25_no_spoken_numbers"],
  });

  setMission(26, {
    name: "When We Talk About the Wolf...",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      equipment: { mode: "default", excludedUnlockValues: [10] },
    },
    behaviorHooks: ["mission_26_visible_number_card_gate"],
  });

  setMission(27, {
    name: "Dough Threads",
    setup: {
      ...defaultSetup(),
      red: exact(1),
      yellow: exact(4),
      equipment: { mode: "default", excludedUnlockValues: [7] },
    },
    behaviorHooks: ["mission_27_no_character_cards", "mission_27_yellow_trigger_random_token_draft"],
  });

  setMission(28, {
    name: "Captain Lazy",
    setup: {
      ...defaultSetup(),
      red: exact(2),
      yellow: exact(4),
    },
    overrides: { 2: { red: exact(3), yellow: exact(4) } },
    behaviorHooks: ["mission_28_captain_lazy_constraints"],
  });

  setMission(29, {
    name: "Number Error",
    setup: {
      ...defaultSetup(),
      red: exact(3),
    },
    behaviorHooks: ["mission_29_hidden_number_card_penalty"],
    notes: [
      "FAQ: Detector multi-wire — only the cut wire triggers detonator advance from the Number card.",
      "FAQ: Empty hand — place Number cards face down under the draw pile.",
      "FAQ: Empty right neighbor — next player clockwise plays a Number card instead.",
      "FAQ: Coffee Thermos — skip Number card reveal; if designating left neighbor, that neighbor plays a Number card.",
    ],
  });

  setMission(30, {
    name: "A Very Speedy Mission!",
    setup: {
      ...defaultSetup(),
      red: outOf(1, 2),
      yellow: exact(4),
    },
    behaviorHooks: ["mission_30_audio_prompt"],
  });

  setMission(31, {
    name: "Everyone Has Their Own Constraints",
    setup: {
      ...defaultSetup(),
      red: outOf(2, 3),
    },
    behaviorHooks: ["mission_31_personal_constraints_a_to_e"],
    notes: ["FAQ: Once constraint card is flipped, player plays normally even if they later recover a matching wire via Walkie-Talkies."],
  });

  setMission(32, {
    name: "Prank Attack!",
    setup: {
      ...defaultSetup(),
      red: exact(2),
    },
    overrides: { 2: { red: exact(3) } },
    behaviorHooks: ["mission_32_global_constraint_stack"],
    notes: ["FAQ: If the Restraint card pile is empty, players continue without any restraint."],
  });
}
