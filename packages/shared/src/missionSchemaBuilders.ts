import { RED_WIRE_SORT_VALUES, YELLOW_WIRE_SORT_VALUES } from "./constants.js";
import type {
  BlueWireSpec,
  MissionDifficulty,
  MissionSetupSpec,
  MissionSourceRef,
  WirePoolSpec,
} from "./missionSchemaTypes.js";
import type { MissionId } from "./types.js";

export const PLAYER_COUNTS = [2, 3, 4, 5] as const;

export const redAll = [...RED_WIRE_SORT_VALUES];
export const redUpTo9_5 = RED_WIRE_SORT_VALUES.filter((v) => v <= 9.5);
export const yellowAll = [...YELLOW_WIRE_SORT_VALUES];
export const yellowUpTo7_1 = YELLOW_WIRE_SORT_VALUES.filter((v) => v <= 7.1);

export const none = (): WirePoolSpec => ({ kind: "none" });
export const exact = (count: number, candidates?: readonly number[]): WirePoolSpec => ({
  kind: "exact",
  count,
  ...(candidates ? { candidates } : {}),
});
export const outOf = (keep: number, draw: number, candidates?: readonly number[]): WirePoolSpec => ({
  kind: "out_of",
  keep,
  draw,
  ...(candidates ? { candidates } : {}),
});
export const fixed = (values: readonly number[]): WirePoolSpec => ({ kind: "fixed", values });
export const exactSameValue = (count: number, candidates?: readonly number[]): WirePoolSpec => ({
  kind: "exact_same_value",
  count,
  ...(candidates ? { candidates } : {}),
});

export const blueRange = (minValue: number, maxValue: number): BlueWireSpec => ({
  minValue,
  maxValue,
});

export const defaultSetup = (): MissionSetupSpec => ({
  blue: blueRange(1, 12),
  red: none(),
  yellow: none(),
  equipment: { mode: "default" },
});

export function defaultDifficulty(id: MissionId): MissionDifficulty {
  if (id <= 3) return "novice";
  if (id <= 7) return "intermediate";
  if (id === 8) return "expert";
  return "campaign";
}

function missionImageExt(_id: MissionId): string {
  return "jpg";
}

export function buildSourceRef(id: MissionId): MissionSourceRef {
  const ext = missionImageExt(id);
  return {
    cardImage: `mission_${id}.${ext}`,
    cardImageBack: `mission_${id}_back.${ext}`,
    rulesSection: `### Mission ${id}`,
  };
}
