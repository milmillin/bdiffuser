/**
 * Mission title parity — asserts that every mission name in the schema registry
 * matches the corresponding card title in GAME_RULES.md.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_MISSION_IDS } from "../types";
import { MISSION_SCHEMAS } from "../missionSchema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_RULES_PATH = path.resolve(__dirname, "../../../../GAME_RULES.md");

function parseCardTitles(): Map<number, string> {
  const content = fs.readFileSync(GAME_RULES_PATH, "utf-8");
  const titles = new Map<number, string>();

  // Pattern: "### Mission <number>" followed eventually by "- Card title: `<title>`"
  const missionBlocks = content.split(/^### Mission /m).slice(1);
  for (const block of missionBlocks) {
    const idMatch = block.match(/^(\d+)/);
    if (!idMatch) continue;
    const id = Number(idMatch[1]);
    const titleMatch = block.match(/- Card title: `([^`]+)`/);
    if (!titleMatch) continue;
    titles.set(id, titleMatch[1]);
  }

  return titles;
}

describe("mission title parity with GAME_RULES.md", () => {
  const cardTitles = parseCardTitles();

  it("GAME_RULES.md has card titles for all 66 missions", () => {
    const missing = ALL_MISSION_IDS.filter((id) => !cardTitles.has(id));
    expect(missing, `GAME_RULES.md missing card titles for: ${missing.join(", ")}`).toEqual([]);
  });

  for (const id of ALL_MISSION_IDS) {
    it(`mission ${id}: schema name matches card title`, () => {
      const schemaName = MISSION_SCHEMAS[id].name;
      const cardTitle = cardTitles.get(id);
      expect(cardTitle).toBeDefined();
      expect(schemaName).toBe(cardTitle);
    });
  }
});
