import { describe, expect, it } from "vitest";
import { MISSION_SCHEMAS } from "../missionSchema";
import { validateMissionSchemas } from "../missionSchemaValidation";
import type { MissionEquipmentSpec, MissionSetupSpec } from "../missionSchemaTypes";
import type { MissionId } from "../types";

function mergeEquipment(
  base: MissionEquipmentSpec,
  override?: MissionSetupSpec["equipment"],
): MissionEquipmentSpec {
  if (!override) return base;
  return {
    ...base,
    ...override,
  };
}

describe("mission schema validation - yellow uniqueness", () => {
  it("rejects yellow exact_same_value in base setup", () => {
    const schemas = structuredClone(MISSION_SCHEMAS);
    const missionId = 1 as MissionId;
    schemas[missionId].setup.yellow = { kind: "exact_same_value", count: 2 };

    expect(() => validateMissionSchemas(schemas, mergeEquipment)).toThrow(
      `Mission ${missionId}: yellow exact_same_value is not allowed (yellow values must be unique)`,
    );
  });

  it("rejects yellow exact_same_value in overrides", () => {
    const schemas = structuredClone(MISSION_SCHEMAS);
    const missionId = 1 as MissionId;
    schemas[missionId].overrides = {
      ...(schemas[missionId].overrides ?? {}),
      2: {
        ...(schemas[missionId].overrides?.[2] ?? {}),
        yellow: { kind: "exact_same_value", count: 2 },
      },
    };

    expect(() => validateMissionSchemas(schemas, mergeEquipment)).toThrow(
      `Mission ${missionId}: yellow exact_same_value is not allowed (yellow values must be unique)`,
    );
  });

  it("allows red exact_same_value", () => {
    const schemas = structuredClone(MISSION_SCHEMAS);
    const missionId = 1 as MissionId;
    schemas[missionId].setup.red = { kind: "exact_same_value", count: 2 };

    expect(() => validateMissionSchemas(schemas, mergeEquipment)).not.toThrow();
  });

  it("allows yellow exact draws", () => {
    const schemas = structuredClone(MISSION_SCHEMAS);
    const missionId = 1 as MissionId;
    schemas[missionId].setup.yellow = { kind: "exact", count: 4 };

    expect(() => validateMissionSchemas(schemas, mergeEquipment)).not.toThrow();
  });
});
