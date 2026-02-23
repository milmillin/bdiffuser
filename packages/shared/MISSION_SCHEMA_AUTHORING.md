# Mission Schema Authoring Guide

This document defines how to safely add or update entries in `packages/shared/src/missionSchema.ts`.

## Scope

Use this guide when changing:
- setup fields (`blue`, `red`, `yellow`, `equipment`)
- player-count overrides
- allowed player counts
- behavior hook wiring
- source references and notes

## Schema Invariants

1. Every mission ID in `ALL_MISSION_IDS` must exist in `MISSION_SCHEMAS`.
2. `overrides` must only use valid player counts (`2 | 3 | 4 | 5`).
3. Equipment references must resolve to known equipment IDs/values.
4. Image/source references must match expected mission asset naming.
5. Mission rules that affect runtime behavior must have deterministic handling.

## Authoring Workflow

1. Edit mission entries in `packages/shared/src/missionSchema.ts`.
2. Keep `sourceRef` aligned with mission card front/back and `GAME_RULES.md` section.
3. If a rule is ambiguous, document it in `packages/shared/AMBIGUITY_TRIAGE.md`.
4. For resolved machine rules, prefer typed `hookRules` over string-only behavior.
5. For dynamic runtime behavior, ensure server hooks/validation exist for referenced rules.

## Setup Modeling Rules

- `blue` should use `blueRange(min, max)` matching mission card values.
- `red`/`yellow` should use:
  - `none()` for absent color
  - `exact(n)` for fixed count draw
  - `outOf(keep, draw)` for "keep X out of Y"
  - `fixed([...])` for fixed explicit values
- `equipment.mode`:
  - `none`: no equipment
  - `default`: base pool draw
  - `fixed_pool`: restricted pool by ID list
- Use `excludedEquipmentIds` when unlock values are ambiguous/non-unique.

## Player Count Semantics

- Use `allowedPlayerCounts` only when a mission is explicitly impossible at some counts.
- Use `overrides` for setup deltas by player count.
- Avoid redundant overrides that match base setup exactly.

## Hook Semantics

- `behaviorHooks` are string descriptors for procedural mission logic.
- `hookRules` are typed, machine-readable rule definitions and should be preferred when available.
- Unknown hook kinds:
  - dev/test: fail fast
  - production: safe fallback + telemetry/logging

## Minimal Example

```ts
setMission(99 as MissionId, {
  name: "Example Mission",
  setup: {
    ...defaultSetup(),
    red: exact(2),
    yellow: none(),
    equipment: { mode: "default", excludedUnlockValues: [11] },
  },
  overrides: {
    2: { red: exact(3) },
  },
  allowedPlayerCounts: [2, 3, 4, 5],
  behaviorHooks: ["example_rule"],
  sourceRef: buildSourceRef(99 as MissionId),
});
```

## Validation Checklist

Run all three before merging schema changes:

```bash
pnpm schema:check
pnpm mission:test
pnpm -r typecheck
```

Recommended full pass:

```bash
pnpm test
```

## Review Checklist

- Mission card setup matches schema for all allowed player counts.
- Overrides are intentional and non-redundant.
- Equipment exclusion method is correct (`unlockValue` vs explicit equipment ID).
- Hook behavior has corresponding server implementation/tests.
- `sourceRef` and ambiguity tracking are up to date.
