import { ALL_MISSION_IDS, type MissionId } from "./types.js";
import {
  MISSION_SCHEMAS,
  type MissionDifficulty,
  describeWirePoolSpec,
} from "./missionSchema.js";

export interface MissionDefinition {
  id: MissionId;
  name: string;
  difficulty: MissionDifficulty;
  /** Human-readable setup summary. Mission-specific runtime behavior may add more rules. */
  specialRules: string;
  /** Image file for front of mission card */
  imageFront: string;
  /** Image file for back (special rules) of mission card */
  imageBack?: string;
}

function missionImageFilename(id: MissionId, back = false): string {
  return back ? `mission_${id}_back.jpg` : `mission_${id}.jpg`;
}

export const MISSIONS: Record<MissionId, MissionDefinition> = Object.fromEntries(
  ALL_MISSION_IDS.map((id) => {
    const schema = MISSION_SCHEMAS[id];
    const setupSummary = [
      `blue ${schema.setup.blue.minValue}-${schema.setup.blue.maxValue}`,
      `red ${describeWirePoolSpec(schema.setup.red)}`,
      `yellow ${describeWirePoolSpec(schema.setup.yellow)}`,
      `equipment ${schema.setup.equipment.mode}`,
    ].join(", ");

    const specialRules = schema.behaviorHooks?.length
      ? `${setupSummary}; behavior: ${schema.behaviorHooks.join(", ")}`
      : setupSummary;

    return [
      id,
      {
        id,
        name: schema.name,
        difficulty: schema.difficulty,
        specialRules,
        imageFront: missionImageFilename(id),
        imageBack: missionImageFilename(id, true),
      } satisfies MissionDefinition,
    ];
  }),
) as Record<MissionId, MissionDefinition>;
