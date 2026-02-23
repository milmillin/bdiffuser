import {
  blueRange,
  exact,
  none,
  outOf,
  redUpTo9_5,
  yellowUpTo7_1,
} from "../missionSchemaBuilders.js";
import type { MissionRuleSchema } from "../missionSchemaTypes.js";
import type { MissionId } from "../types.js";

type MissionSetter = (id: MissionId, patch: Omit<Partial<MissionRuleSchema>, "id">) => void;

export function registerTrainingMissions(setMission: MissionSetter): void {
  setMission(1, {
    name: "Training, Day 1",
    setup: {
      blue: blueRange(1, 6),
      red: none(),
      yellow: none(),
      equipment: { mode: "none" },
    },
  });

  setMission(2, {
    name: "Training, Day 2",
    setup: {
      blue: blueRange(1, 8),
      red: none(),
      yellow: exact(2, yellowUpTo7_1),
      equipment: { mode: "none" },
    },
  });

  setMission(3, {
    name: "Training, Day 3",
    setup: {
      blue: blueRange(1, 10),
      red: exact(1, redUpTo9_5),
      yellow: none(),
      equipment: { mode: "default", excludedUnlockValues: [11, 12] },
    },
  });

  setMission(4, {
    name: "A Sense of Priorities",
    setup: {
      blue: blueRange(1, 12),
      red: exact(1),
      yellow: exact(2),
      equipment: { mode: "default" },
    },
    overrides: {
      2: { yellow: exact(4) },
    },
  });

  setMission(5, {
    name: "First Day in the Field",
    setup: {
      blue: blueRange(1, 12),
      red: exact(1),
      yellow: outOf(2, 3),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        red: exact(2),
        yellow: outOf(2, 3),
      },
    },
  });

  setMission(6, {
    name: "Under Pressure",
    setup: {
      blue: blueRange(1, 12),
      red: exact(1),
      yellow: exact(4),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        red: exact(2),
        yellow: exact(4),
      },
    },
  });

  setMission(7, {
    name: "Completing the Training",
    setup: {
      blue: blueRange(1, 12),
      red: outOf(1, 2),
      yellow: none(),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        red: outOf(1, 3),
      },
    },
  });

  setMission(8, {
    name: "Final Exam",
    setup: {
      blue: blueRange(1, 12),
      red: outOf(1, 2),
      yellow: outOf(2, 3),
      equipment: { mode: "default" },
    },
    overrides: {
      2: {
        red: outOf(1, 3),
        yellow: exact(4),
      },
    },
  });
}
