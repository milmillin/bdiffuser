# Mission Schema Verification Report

**Date:** 2026-02-23
**Scope:** All setup fields in `packages/shared/src/missionSchema.ts` for missions 1-66 + supplementals 31/32/35.
**Sources:** `GAME_RULES.md` (primary), mission card images in `packages/client/public/images/` (spot-check ~25 cards).
**Fields verified:** `name`, `difficulty`, `setup.blue`, `setup.red`, `setup.yellow`, `setup.equipment`, `overrides`, `allowedPlayerCounts`, `behaviorHooks` presence.

---

## Verification Summary

| Result | Count |
|--------|-------|
| Missions verified correct | 66 |
| Missions with discrepancies | 0 |
| Total missions | 66 |

---

## Resolved Discrepancies (Historical)

### D1: Mission 41 — Wrong equipment exclusion

**Previous schema (before fix):**
```ts
equipment: { mode: "default", excludedUnlockValues: [6] },
```

**Current schema:**
```ts
equipment: {
  mode: "default",
  includeCampaignEquipment: true,
  excludedEquipmentIds: ["double_fond"],
},
```

**GAME_RULES.md (Mission 41):**
> "If Equipment `6` (Double Bottom) is drawn, replace it."

**Resolution (2026-02-23):**
- Added campaign equipment definitions to `EQUIPMENT_DEFS`.
- Added ID-based exclusion support (`excludedEquipmentIds`) in `MissionEquipmentSpec`.
- Mission 41 now excludes `double_fond` by ID, while base Equipment 6 (`rewinder`) remains eligible.

### D2: Mission 57 — Wrong equipment exclusion

**Previous schema (before fix):**
```ts
equipment: { mode: "default", excludedUnlockValues: [10] },
```

**Current schema:**
```ts
equipment: {
  mode: "default",
  includeCampaignEquipment: true,
  excludedEquipmentIds: ["disintegrator"],
},
```

**GAME_RULES.md (Mission 57):**
> "Replace Equipment `10-10` (Disintegrator) if drawn."

**Resolution (2026-02-23):**
- Added campaign equipment definitions to `EQUIPMENT_DEFS`.
- Added ID-based exclusion support (`excludedEquipmentIds`) in `MissionEquipmentSpec`.
- Mission 57 now excludes `disintegrator` by ID, while base Equipment 10 (`x_or_y_ray`) remains eligible.

---

## Per-Mission Verification Detail

Legend:
- `blue(N,M)` = blueRange(N, M)
- `red:none/exact(N)/outOf(K,D)/fixed(all)` = WirePoolSpec
- `yellow:none/exact(N)/outOf(K,D)/fixed([...])` = WirePoolSpec
- `eq:none/default/fixed_pool` = equipment mode; `excl:[N]` = excludedUnlockValues; `exclId:[...]` = excludedEquipmentIds; `camp` = includeCampaignEquipment
- `ov{P: ...}` = player-count override
- `apc:[...]` = allowedPlayerCounts restriction

### Missions 1-8 (Training)

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 1 | Training, Day 1 | 1-6 | none | none | none | — | OK |
| 2 | Training, Day 2 | 1-8 | none | exact(2, <=7.1) | none | — | OK |
| 3 | Training, Day 3 | 1-10 | exact(1, <=9.5) | none | default excl:[11,12] | — | OK |
| 4 | A Sense of Priorities | 1-12 | exact(1) | exact(2) | default | 2p: y=exact(4) | OK |
| 5 | First Day in the Field | 1-12 | exact(1) | outOf(2,3) | default | 2p: r=exact(2), y=outOf(2,3) | OK |
| 6 | Under Pressure | 1-12 | exact(1) | exact(4) | default | 2p: r=exact(2), y=exact(4) | OK |
| 7 | Completing the Training | 1-12 | outOf(1,2) | none | default | 2p: r=outOf(1,3) | OK |
| 8 | Final Exam | 1-12 | outOf(1,2) | outOf(2,3) | default | 2p: r=outOf(1,3), y=exact(4) | OK |

### Missions 9-19

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 9 | The Sense of Priorities | 1-12 | exact(1) | exact(2) | default | 2p: r=exact(2), y=exact(4) | OK |
| 10 | A Bad Quarter of an Hour | 1-12 | exact(1) | exact(4) | default excl:[11] | — | OK |
| 11 | Blue on Red, Nothing Moves | 1-12 | none | exact(2) | default | 2p: y=exact(4) | OK |
| 12 | Equipment out of Reach | 1-12 | exact(1) | exact(4) | default | 2p: r=exact(2), y=exact(4) | OK |
| 13 | Red Alert! | 1-12 | exact(3) | none | default | — | OK |
| 14 | High Risk Mine Clearance | 1-12 | exact(2) | outOf(2,3) | default | 2p: r=exact(3), y=exact(4) | OK |
| 15 | Mission NOVOSIBIRSK CK | 1-12 | outOf(1,3) | none | default | 2p: r=outOf(2,3) | OK |
| 16 | A Story of Common Sense | 1-12 | exact(1) | outOf(2,3) | default | 2p: r=exact(2), y=exact(4) | OK |
| 17 | Sergio El Mytho | 1-12 | outOf(2,3) | none | default | 2p: r=exact(3) | OK |
| 18 | BAT-helping hand | 1-12 | exact(2) | none | fixed_pool:[general_radar] | 2p: r=exact(3) | OK |
| 19 | In the Villain's Lair... | 1-12 | exact(1) | outOf(2,3) | default | — | OK |

### Missions 20-30

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 20 | The Big Bad Wolf | 1-12 | exact(2) | exact(2) | default excl:[2] | 2p: r=outOf(2,3), y=exact(4) | OK |
| 21 | Kouign Amann Mortal | 1-12 | outOf(1,2) | none | default | 2p: r=exact(2) | OK |
| 22 | None of That in My House! | 1-12 | exact(1) | exact(4) | default | — | OK |
| 23 | Mission in Sevenans | 1-12 | outOf(1,3) | none | none | 2p: r=outOf(2,3) | OK |
| 24 | The Count Is Good! | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 25 | It's to Hear You Better... | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 26 | When We Talk About the Wolf... | 1-12 | exact(2) | none | default excl:[10] | — | OK |
| 27 | Dough Threads | 1-12 | exact(1) | exact(4) | default excl:[7] | — | OK |
| 28 | Captain Lazy | 1-12 | exact(2) | exact(4) | default | 2p: r=exact(3), y=exact(4) | OK |
| 29 | Number Error | 1-12 | exact(3) | none | default | — | OK |
| 30 | A Very Speedy Mission! | 1-12 | outOf(1,2) | exact(4) | default | — | OK |

### Missions 31-35 (Supplementals)

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 31 | Everyone Has Their Own Constraints | 1-12 | outOf(2,3) | none | default | — | OK |
| 32 | Prank Attack! | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 33 | Ce qui se passe a Vegas... | 1-12 | outOf(2,3) | none | default | 2p: r=exact(3) | OK |
| 34 | The Weak Link | 1-12 | exact(1) | none | default | apc:[3,4,5] | OK |
| 35 | No Ties, Single Thread | 1-12 | outOf(2,3) | exact(4) | default excl:[2] | 2p: r=exact(3), y=exact(4) | OK |

### Missions 36-42

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 36 | Panic in the Tropics | 1-12 | outOf(1,3) | exact(2) | default | 2p: r=outOf(2,3), y=exact(4) | OK |
| 37 | The Boss of the Farce! | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 38 | One Thread Upside Down... | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 39 | The Doctor's 4 Sons Walk | 1-12 | outOf(2,3) | exact(4) | none | 2p: r=exact(3), y=exact(4) | OK |
| 40 | Christmas Trap | 1-12 | exact(3) | none | default | — | OK |
| 41 | Bomba latina | 1-12 | outOf(1,3) | exact(4) | default camp exclId:[double_fond] | 2p: r=outOf(2,3) y=exact(2); 3p: y=exact(3); 5p: y=exact(4) | OK |
| 42 | What Is This Circus? | 1-12 | outOf(1,3) | exact(4) | default | — | OK |

### Missions 43-54

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 43 | Nano and Robot | 1-12 | exact(3) | none | default | — | OK |
| 44 | Underwater Pressure | 1-12 | outOf(1,3) | none | default excl:[10] | — | OK |
| 45 | My Thread, My Battle! | 1-12 | exact(2) | none | default excl:[10,11] | 2p: r=exact(3) | OK |
| 46 | Agent 007 | 1-12 | none | fixed([5.1,6.1,7.1,8.1]) | default excl:[7] | — | OK |
| 47 | L'addition SVP! | 1-12 | outOf(2,3) | none | default excl:[10] | 2p: r=exact(3) | OK |
| 48 | 3-wire Plan | 1-12 | exact(2) | exact(3) | default | 2p: r=exact(3), y=exact(3) | OK |
| 49 | Bottles in the Sea | 1-12 | exact(2) | none | default excl:[10] | 2p: r=exact(3) | OK |
| 50 | The Black Sea | 1-12 | exact(2) | exact(2) | default | 2p: r=exact(3), y=exact(4) | OK |
| 51 | Unlucky Day | 1-12 | exact(1) | none | default excl:[10] | 2p: r=exact(2) | OK |
| 52 | All Traitors! | 1-12 | exact(3) | none | default excl:[1,12] | 2p: r=exact(3), y=exact(4) | OK |
| 53 | Nano Is Back | 1-12 | exact(2) | none | default excl:[6,9] | 2p: r=exact(3) | OK |
| 54 | The Attack of Red Rabbit | 1-12 | fixed(all 11) | none | default excl:[10] | — | OK |

### Missions 55-66

| # | Name | Blue | Red | Yellow | Equipment | Overrides | Status |
|---|------|------|-----|--------|-----------|-----------|--------|
| 55 | Doctor No's Challenge | 1-12 | exact(2) | none | default | 2p: r=outOf(2,3) | OK |
| 56 | The Rebel Sons | 1-12 | outOf(2,3) | none | default | 2p: r=exact(3) | OK |
| 57 | Mission Impossible | 1-12 | exact(1) | none | default camp exclId:[disintegrator] | 2p: r=exact(2) | OK |
| 58 | System D | 1-12 | exact(2) | none | default excl:[4,7] | 2p: r=exact(3) | OK |
| 59 | Nano to the Rescue | 1-12 | outOf(2,3) | none | default excl:[10] | 2p: r=exact(3) | OK |
| 60 | The Return of Doctor No | 1-12 | outOf(2,3) | none | default | 2p: r=exact(3) | OK |
| 61 | Quiet, We're Filming! | 1-12 | exact(1) | none | default | 2p: r=exact(2) | OK |
| 62 | Armageddon Dumpling | 1-12 | exact(2) | none | default | 2p: r=exact(3) | OK |
| 63 | Titanic II | 1-12 | exact(2) | none | default excl:[10] | 2p: r=exact(3) | OK |
| 64 | The Return of the Rebel Sons! | 1-12 | exact(1) | none | default | 2p: r=exact(2) | OK |
| 65 | Good Thread and Not Good Thread | 1-12 | exact(3) | none | default excl:[10] | apc:[3,4,5] | OK |
| 66 | The Final Boss! | 1-12 | exact(2) | exact(2) | default | — | OK |

---

## Minor Notes (not discrepancies)

1. **Mission 41 override 5p `yellow: exact(4)`**: Redundant — same as base setup default. Harmless but could be removed for clarity.
2. **Difficulty assignment**: `defaultDifficulty()` assigns novice (1-3), intermediate (4-7), expert (8), campaign (9+). This matches GAME_RULES.md Section 3 groupings.
3. **Blue wire range**: All missions 4-66 use `blueRange(1, 12)` (all 48 blue). Missions 1-3 use reduced ranges (1-6, 1-8, 1-10). All verified correct per card images and GAME_RULES.md.
4. **Mission 11 dynamic equipment exclusion**: The mission randomly draws a Number card and replaces any equipment with that matching number. This is a runtime behavior (handled by `behaviorHooks`), not a static exclusion. Schema correctly has no `excludedUnlockValues` for this dynamic rule.
5. **Campaign equipment model is now available**: `EQUIPMENT_DEFS` includes campaign cards (yellow "Double fond", 22, 33, 99, 10-10, 11-11), and mission schema can exclude by specific equipment ID.

---

## Methodology

1. Read `GAME_RULES.md` sections for all 66 missions, extracting: wire counts, equipment exclusions, player-count overrides, player-count restrictions.
2. Read `missionSchema.ts` and compared every `setMission()` call field-by-field against the extracted reference data.
3. Spot-checked ~25 mission card front images (`mission_N.png`) to confirm GAME_RULES.md accuracy: missions 3, 4, 9, 10, 19, 20, 22, 26, 27, 30, 31, 32, 35, 41, 44, 45, 46, 52, 53, 54, 55, 57, 58, 65, 66.
4. Read `constants.ts` for wire value arrays and `imageMap.ts` for `EQUIPMENT_DEFS` to verify equipment unlock values.
5. Cross-referenced `types.ts` to confirm `ALL_MISSION_IDS` covers 1-66.
