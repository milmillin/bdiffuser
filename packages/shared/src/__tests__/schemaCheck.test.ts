/**
 * Schema lint/check — validates mission schema completeness and consistency.
 *
 * Run standalone:  pnpm schema:check
 * Run with suite:  pnpm test
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_MISSION_IDS, type MissionId } from "../types";
import { MISSION_SCHEMAS, type PlayerCount } from "../missionSchema";
import { MISSION_IMAGES, EQUIPMENT_DEFS } from "../imageMap";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = path.resolve(__dirname, "../../../client/public/images");

const VALID_PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5];
const allEquipmentIds = new Set(EQUIPMENT_DEFS.map((d) => d.id));
const allUnlockValues = new Set(EQUIPMENT_DEFS.map((d) => d.unlockValue));

// ── 1. Mission ID Completeness ──────────────────────────────

describe("mission ID completeness", () => {
  it("every mission ID has a schema entry", () => {
    const missing = ALL_MISSION_IDS.filter((id) => !MISSION_SCHEMAS[id]);
    expect(missing, `missing schemas for IDs: ${missing.join(", ")}`).toEqual([]);
  });

  it("schema registry has no extra IDs beyond ALL_MISSION_IDS", () => {
    const knownIds = new Set<number>(ALL_MISSION_IDS);
    const extra = Object.keys(MISSION_SCHEMAS)
      .map(Number)
      .filter((id) => !knownIds.has(id));
    expect(extra, `extra schema IDs: ${extra.join(", ")}`).toEqual([]);
  });

  it("every schema has a non-empty name", () => {
    const unnamed = ALL_MISSION_IDS.filter((id) => !MISSION_SCHEMAS[id]?.name?.trim());
    expect(unnamed, `missions without names: ${unnamed.join(", ")}`).toEqual([]);
  });
});

// ── 2. Override Validity by Player Count ─────────────────────

describe("override validity by player count", () => {
  for (const id of ALL_MISSION_IDS) {
    const schema = MISSION_SCHEMAS[id];
    if (!schema?.overrides) continue;

    it(`mission ${id}: override keys are valid player counts`, () => {
      const keys = Object.keys(schema.overrides!).map(Number);
      const invalid = keys.filter(
        (k) => !VALID_PLAYER_COUNTS.includes(k as PlayerCount),
      );
      expect(invalid, `invalid override player counts: ${invalid.join(", ")}`).toEqual([]);
    });

    it(`mission ${id}: overrides do not target disallowed player counts`, () => {
      if (!schema.allowedPlayerCounts) return;
      const allowed = new Set(schema.allowedPlayerCounts);
      const overrideKeys = Object.keys(schema.overrides!).map(Number);
      const disallowed = overrideKeys.filter((k) => !allowed.has(k as PlayerCount));
      expect(
        disallowed,
        `overrides for disallowed player counts: ${disallowed.join(", ")}`,
      ).toEqual([]);
    });
  }
});

// ── 3. Equipment Reference Validity ──────────────────────────

describe("equipment reference validity", () => {
  for (const id of ALL_MISSION_IDS) {
    const schema = MISSION_SCHEMAS[id];
    if (!schema) continue;

    const specs = [
      schema.setup.equipment,
      ...Object.values(schema.overrides ?? {}).map((o) => o.equipment).filter(Boolean),
    ];

    for (const spec of specs) {
      if (!spec) continue;

      if (spec.fixedEquipmentIds) {
        it(`mission ${id}: fixedEquipmentIds reference known equipment`, () => {
          const unknown = spec.fixedEquipmentIds!.filter((eid) => !allEquipmentIds.has(eid));
          expect(unknown, `unknown equipment IDs: ${unknown.join(", ")}`).toEqual([]);
        });
      }

      if (spec.excludedUnlockValues) {
        it(`mission ${id}: excludedUnlockValues reference known unlock values`, () => {
          const unknown = spec.excludedUnlockValues!.filter((v) => !allUnlockValues.has(v));
          expect(unknown, `unknown unlock values: ${unknown.join(", ")}`).toEqual([]);
        });
      }

      if (spec.excludedEquipmentIds) {
        it(`mission ${id}: excludedEquipmentIds reference known equipment`, () => {
          const unknown = spec.excludedEquipmentIds!.filter((eid) => !allEquipmentIds.has(eid));
          expect(unknown, `unknown excluded equipment IDs: ${unknown.join(", ")}`).toEqual([]);
        });
      }
    }
  }
});

// ── 4. Image Asset Consistency ───────────────────────────────

describe("image asset consistency", () => {
  it("MISSION_IMAGES covers all mission IDs", () => {
    const missing = ALL_MISSION_IDS.filter((id) => !MISSION_IMAGES[id]);
    expect(missing, `MISSION_IMAGES missing IDs: ${missing.join(", ")}`).toEqual([]);
  });

  it("MISSION_IMAGES has no extra IDs", () => {
    const knownIds = new Set<number>(ALL_MISSION_IDS);
    const extra = Object.keys(MISSION_IMAGES)
      .map(Number)
      .filter((id) => !knownIds.has(id));
    expect(extra, `extra MISSION_IMAGES IDs: ${extra.join(", ")}`).toEqual([]);
  });

  function expectedExt(_id: MissionId): string {
    return "jpg";
  }

  it("all mission front images exist on disk", () => {
    const missing: number[] = [];
    for (const id of ALL_MISSION_IDS) {
      const file = `mission_${id}.${expectedExt(id)}`;
      if (!fs.existsSync(path.join(IMAGE_DIR, file))) {
        missing.push(id);
      }
    }
    expect(missing, `missing front images for IDs: ${missing.join(", ")}`).toEqual([]);
  });

  it("all mission back images exist on disk", () => {
    const missing: number[] = [];
    for (const id of ALL_MISSION_IDS) {
      const file = `mission_${id}_back.${expectedExt(id)}`;
      if (!fs.existsSync(path.join(IMAGE_DIR, file))) {
        missing.push(id);
      }
    }
    expect(missing, `missing back images for IDs: ${missing.join(", ")}`).toEqual([]);
  });

  it("all equipment images exist on disk", () => {
    const missing: string[] = [];
    for (const def of EQUIPMENT_DEFS) {
      if (!fs.existsSync(path.join(IMAGE_DIR, def.image))) {
        missing.push(`${def.id} (${def.image})`);
      }
    }
    expect(missing, `missing equipment images: ${missing.join(", ")}`).toEqual([]);
  });
});
