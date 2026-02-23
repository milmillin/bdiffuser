import { BLUE_WIRE_VALUES, RED_WIRE_SORT_VALUES, YELLOW_WIRE_SORT_VALUES } from "./constants.js";
import { EQUIPMENT_DEFS } from "./imageMap.js";
import type {
  BlueWireSpec,
  MissionEquipmentSpec,
  MissionRuleSchema,
  MissionSetupSpec,
  PlayerCount,
  WirePoolSpec,
} from "./missionSchemaTypes.js";
import { ALL_MISSION_IDS, type MissionId } from "./types.js";

type MergeEquipment = (
  base: MissionEquipmentSpec,
  override?: MissionSetupSpec["equipment"],
) => MissionEquipmentSpec;

function validateBlueSpec(missionId: MissionId, spec: BlueWireSpec): void {
  if (!Number.isInteger(spec.minValue) || !Number.isInteger(spec.maxValue)) {
    throw new Error(`Mission ${missionId}: blue range must be integer values`);
  }
  if (spec.minValue < 1 || spec.maxValue > 12 || spec.minValue > spec.maxValue) {
    throw new Error(`Mission ${missionId}: invalid blue range ${spec.minValue}-${spec.maxValue}`);
  }
  if (!BLUE_WIRE_VALUES.includes(spec.minValue as (typeof BLUE_WIRE_VALUES)[number])) {
    throw new Error(`Mission ${missionId}: invalid blue min value ${spec.minValue}`);
  }
  if (!BLUE_WIRE_VALUES.includes(spec.maxValue as (typeof BLUE_WIRE_VALUES)[number])) {
    throw new Error(`Mission ${missionId}: invalid blue max value ${spec.maxValue}`);
  }
}

function validatePoolSpec(missionId: MissionId, color: "red" | "yellow", spec: WirePoolSpec): void {
  const defaultCandidates = color === "red" ? RED_WIRE_SORT_VALUES : YELLOW_WIRE_SORT_VALUES;

  switch (spec.kind) {
    case "none":
      return;
    case "exact": {
      if (!Number.isInteger(spec.count) || spec.count < 0) {
        throw new Error(`Mission ${missionId}: ${color} exact count must be non-negative integer`);
      }
      const candidates = spec.candidates ?? defaultCandidates;
      if (spec.count > candidates.length) {
        throw new Error(
          `Mission ${missionId}: ${color} exact count ${spec.count} exceeds candidates ${candidates.length}`,
        );
      }
      return;
    }
    case "out_of": {
      if (
        !Number.isInteger(spec.keep) ||
        !Number.isInteger(spec.draw) ||
        spec.keep < 0 ||
        spec.draw < 0 ||
        spec.keep > spec.draw
      ) {
        throw new Error(`Mission ${missionId}: invalid ${color} out_of keep/draw`);
      }
      const candidates = spec.candidates ?? defaultCandidates;
      if (spec.draw > candidates.length) {
        throw new Error(
          `Mission ${missionId}: ${color} out_of draw ${spec.draw} exceeds candidates ${candidates.length}`,
        );
      }
      return;
    }
    case "fixed": {
      if (spec.values.length === 0) {
        throw new Error(`Mission ${missionId}: ${color} fixed values cannot be empty`);
      }
      const candidateSet = new Set<number>(defaultCandidates as readonly number[]);
      for (const value of spec.values) {
        if (!candidateSet.has(value)) {
          throw new Error(`Mission ${missionId}: invalid fixed ${color} value ${value}`);
        }
      }
      return;
    }
    case "exact_same_value": {
      if (!Number.isInteger(spec.count) || spec.count < 1) {
        throw new Error(`Mission ${missionId}: ${color} exact_same_value count must be a positive integer`);
      }
      const candidates = spec.candidates ?? defaultCandidates;
      if (candidates.length === 0) {
        throw new Error(`Mission ${missionId}: ${color} exact_same_value has no candidates`);
      }
      return;
    }
  }
}

function validateEquipmentSpec(missionId: MissionId, spec: MissionEquipmentSpec): void {
  const allEquipmentIds = new Set(EQUIPMENT_DEFS.map((d) => d.id));
  const allUnlockValues = new Set(EQUIPMENT_DEFS.map((d) => d.unlockValue));

  if (spec.mode === "fixed_pool") {
    if (!spec.fixedEquipmentIds || spec.fixedEquipmentIds.length === 0) {
      throw new Error(`Mission ${missionId}: fixed_pool requires fixedEquipmentIds`);
    }
    for (const id of spec.fixedEquipmentIds) {
      if (!allEquipmentIds.has(id)) {
        throw new Error(`Mission ${missionId}: unknown fixed equipment id ${id}`);
      }
    }
  }

  if (spec.excludedUnlockValues) {
    for (const value of spec.excludedUnlockValues) {
      if (!allUnlockValues.has(value)) {
        throw new Error(`Mission ${missionId}: unknown equipment unlock value ${value}`);
      }
    }
  }

  if (spec.excludedEquipmentIds) {
    for (const id of spec.excludedEquipmentIds) {
      if (!allEquipmentIds.has(id)) {
        throw new Error(`Mission ${missionId}: unknown excluded equipment id ${id}`);
      }
    }
  }
}

export function validateMissionSchemas(
  schemas: Record<MissionId, MissionRuleSchema>,
  mergeEquipment: MergeEquipment,
): void {
  for (const missionId of ALL_MISSION_IDS) {
    const mission = schemas[missionId];
    if (!mission) {
      throw new Error(`Missing mission schema for mission ${missionId}`);
    }

    validateBlueSpec(missionId, mission.setup.blue);
    validatePoolSpec(missionId, "red", mission.setup.red);
    validatePoolSpec(missionId, "yellow", mission.setup.yellow);
    validateEquipmentSpec(missionId, mission.setup.equipment);

    if (mission.overrides) {
      for (const [count, override] of Object.entries(mission.overrides)) {
        const parsed = Number(count) as PlayerCount;
        if (![2, 3, 4, 5].includes(parsed)) {
          throw new Error(`Mission ${missionId}: unsupported player-count override ${count}`);
        }
        if (override.blue) validateBlueSpec(missionId, override.blue);
        if (override.red) validatePoolSpec(missionId, "red", override.red);
        if (override.yellow) validatePoolSpec(missionId, "yellow", override.yellow);
        if (override.equipment) {
          validateEquipmentSpec(missionId, mergeEquipment(mission.setup.equipment, override.equipment));
        }
      }
    }
  }
}
