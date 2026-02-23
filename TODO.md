# TODO - Mission Schema Rollout Backlog

This file tracks all remaining work after introducing the central mission schema and setup integration.

## What Is Already Done
- [x] Central mission schema scaffold exists in `packages/shared/src/missionSchema.ts`.
- [x] `MissionId` is expanded to full campaign coverage (1-66).
- [x] Server setup reads resolved mission setup (`setup.ts`).
- [x] Lobby mission picker supports full mission list.
- [x] Shared/server/client typecheck passes on current baseline.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

## Execution Order (Must Follow)
1. Phase 0A - Prerequisites (test harness + validation tooling)
2. Phase 0B - Mission data correctness (schema/source parity)
3. Phase 0C - Runtime foundations (state model + hook dispatcher)
4. Phase 1 - Rules implementation (validation/game logic/equipment/tokens)
5. Phase 2 - Product integration (UI/bot/view filtering)
6. Phase 3 - QA hardening + rollout + cleanup

## Milestones
- [ ] M1: Missions 1-12 fully playable with schema parity and tests.
- [ ] M2: Missions 13-35 fully playable with schema parity and tests.
- [ ] M3: Missions 36-66 (+31/32/35) fully playable with schema parity and tests.

### Milestone Task Mapping
- [ ] M1 requires: Phase 0A + 0B + 0C complete, plus Phase 1 Core rules for missions 1-12, plus Phase 2 filtering/UI/bot support for features used by missions 1-12, plus Phase 3 M1 test gate.
- [ ] M2 requires: M1 complete, plus remaining Phase 1 Advanced rules for missions 13-35, plus Phase 2 support for those mechanics, plus Phase 3 M2 test gate.
- [ ] M3 requires: M2 complete, plus final Phase 1 Advanced rules for missions 36-66 (+31/32/35), plus Phase 2 support for those mechanics, plus Phase 3 M3 test gate.

## Phase 0A - Prerequisites (P0)
Dependency: none (first execution phase).

### Test Infrastructure (Unblocks all later validation work)
- [x] Add unit test framework for shared/server logic (Vitest recommended).
- [x] Add deterministic test helpers (seeded RNG, fixed tile/card setup builders).
- [x] Add scripts and CI wiring for mission schema + mission logic tests.
- [x] Add a fast smoke command that runs on every commit.

### Schema Tooling
- [x] Add schema lint/check script validating:
  - Mission ID completeness
  - Override validity by player count
  - Equipment reference validity
  - Image asset consistency
- [x] Fail CI when schema completeness/consistency checks fail.

## Phase 0B - Mission Data Correctness (P0)
Dependency: starts after Phase 0A.

### Mission Setup Parity
- [x] Verify every mission setup field in `packages/shared/src/missionSchema.ts` against mission card assets (1-66 + 31/32/35).
  - Verification report: `packages/shared/MISSION_SCHEMA_VERIFICATION.md` (66/66 OK).
  - D1/D2 resolved by campaign-equipment modeling:
    - Mission 41 now excludes `double_fond` by equipment ID (keeps base Rewinder available).
    - Mission 57 now excludes `disintegrator` by equipment ID (keeps base X/Y Ray available).
- [x] Build ambiguity triage list for approximations currently represented in schema:
  - Scope: missions 9-66 + supplementals 31/32/35.
  - Scope: all non-generic behavior hook definitions currently listed in schema.
  - Output: one tracked row per ambiguity (`missionId`, rule, options, default interpretation, owner, status).
  - Artifact: `packages/shared/AMBIGUITY_TRIAGE.md` (63 rows: 56 open, 0 blocked, 7 resolved).
- [x] Resolve all triaged ambiguities into exact machine-readable rules; no unresolved `open` rows remain for milestone scope being shipped. (M1 scope: 4/4 resolved — missions 10, 11, 12. 56 open rows remain for M2/M3.)
- [x] Add `sourceRef` metadata per mission (card image + `GAME_RULES.md` section reference).
- [x] Add tracking table for unresolved rule ambiguities (owner + decision + date).

### Runtime Guardrails
- [x] Enforce `allowedPlayerCounts` in lobby mission picker (disable impossible missions).
- [x] Surface mission availability errors in UI before `startGame`.
- [x] Keep server-side hard validation for mission/player-count mismatch with clear error messages.

## Phase 0C - Runtime Foundations (P0)
Dependency: starts after Phase 0B baseline parity is established for target milestone scope.

### Mission Hook Runtime
- [x] Implement mission behavior hook dispatcher in server runtime (setup, validation, action resolution, end-turn).
- [x] Define deterministic hook execution ordering.
- [x] Add hook tracing/logging for state transitions.
- [x] In development/test: hard-fail on unknown hook names.
- [x] In production: safe fallback + telemetry event for unknown hooks.

### Shared State Expansion
- [x] Extend shared game state for campaign objects:
  - Number cards (deck/discard/visible/hidden)
  - Constraint cards (global + per-player active constraints)
  - Challenge cards
  - Oxygen economy (pool + ownership)
  - Nano/Bunker trackers
  - Special markers (`X`, sequence/action pointers)
- [x] Define visibility model for each new object (public/owner-only/hidden).
- [x] Add storage migration-safe defaults for rooms with old state shape.

### Dependency Notes
- Hook Categories and mission-specific rule logic are blocked by Mission Hook Runtime.
- Equipment/token mission logic is blocked by Shared State Expansion.

## Phase 1 - Rules Implementation (P0/P1)
Dependency: blocked by Phase 0C.

### Core Rules (P0, required for M1)

#### Validation Layer (mission-aware)
- [x] Move mission-sensitive legality checks to hook-aware validation.
- [x] Add action legality reason codes for UI and bots.
- [ ] Implement support for:
  - Sequence/priority restrictions used in missions 1-12
  - [x] Mission 9 face-A sequence-priority gating (left→middle→right unlock flow)
  - [x] Forced action: captain chooses next player (mission 10 dynamic turn order)
  - [x] Mission 10 no-consecutive-turn enforcement (3+ players; 2-player exception)
  - [x] Remaining forced-pass states used in missions 1-12
  - [x] Mission-specific forbidden targets/values used in missions 1-12
  - [x] Mission 11 reveal restriction: hidden red-like value can only be revealed when it is all remaining in hand

#### Game Logic Layer (mission-aware)
- [ ] Implement mission-aware action resolvers for special actions used in missions 1-12.
- [ ] Implement mission-specific failure outcomes used in missions 1-12.
  - [x] Mission 11 hidden blue-as-red parity: successful cut of hidden value explodes immediately (`loss_red_wire`)
  - [x] Mission 11 hidden blue-as-red parity: wrong dual-cut guess on hidden value also explodes (`loss_red_wire`)
  - [x] Mission 10 timer enforcement: `timerDeadline` on GameState, Durable Object alarm-based timeout → `loss_timer` result.
  - [x] Mission 10 2-player timer override: 12-minute setup timer
- [ ] Make win/loss checks mission-aware for mission patterns used in missions 1-12.

#### Equipment Runtime Parity
- [ ] Implement full shared-equipment use/effects required by missions 1-12.
- [ ] Implement mission-specific equipment exclusions/replacements needed by missions 1-12.
  - [x] Mission 11 setup replacement for equipment matching hidden red-like value
  - [x] Mission 12 per-equipment number-card secondary lock enforcement
  - [x] Mission 12 secondary lock metadata clears when requirement is satisfied

#### Token System Parity
- [ ] Implement token variants required by missions 1-12.
- [~] Implement mission-specific setup token flows required by missions 1-12.
  - [x] Mission 11 (2-player) setup override: captain skips info-token placement
  - [x] Setup info-token legality enforcement (own blue wire + matching value + valid index)

### Advanced Rules (P1, expands to M2/M3)

#### Validation Layer (mission-aware)
- [ ] Implement support for simultaneous multi-wire cuts.
- [ ] Implement remaining mission-specific forbidden targets/values for M2/M3 mechanics.

#### Game Logic Layer (mission-aware)
- [ ] Implement mission-specific progression systems (Nano, oxygen, challenge rewards, bunker flow).
- [ ] Implement remaining alternate failure outcomes for M2/M3 mechanics.

#### Equipment Runtime Parity
- [ ] Implement special equipment modes (face-down equipment, forced equipment pools, deck/pile modes).
- [ ] Implement remaining campaign equipment behavior variants.

#### Token System Parity
- [ ] Implement token variants:
  - Standard numeric
  - Even/Odd
  - `x1/x2/x3`
  - False-information
  - Absent-value
  - No-token missions
- [ ] Implement mission-specific token placement legality.
- [ ] Implement remaining mission-specific setup token flows (random draw, captain skip, multi-token placement).

## Phase 2 - Product Integration (P1)
Dependency: blocked by Phase 1 Core for M1 and Phase 1 Advanced for M2/M3.

### View Filtering and Persistence
- [~] Update `viewFilter.ts` for all new mission objects and visibility semantics.
  - [x] Mission 11 hidden blue-as-red setup value stays server-only in filtered log
  - [x] Mission-driven client fields preserved: `pendingForcedAction`, `timerDeadline`
- [x] Verify room persistence/restore across all mission object types.
  - [x] Persist/restore mission-10 `pendingForcedAction` (+ `lastPlayerId`) via storage migration
  - [x] Storage migration tests cover campaign object restore: number cards, constraints, challenges, oxygen, nano/bunker trackers, special markers, and timer deadline

### Bot Integration
- [x] Extend bot action schema for mission-specific actions beyond `dualCut/soloCut/revealReds`.
- [x] Extend bot prompt with mission objects (cards/constraints/oxygen/trackers).
  - [x] Added mission context to bot prompt: timer, pending forced action, visible number cards, sequence pointer, equipment secondary-lock progress
  - [x] Added mission-object summaries: constraints, challenges, oxygen economy, nano/bunker trackers, and special markers
- [x] Add bot fallback strategy for not-yet-implemented hooks.

### Client UI
- [ ] Add UI surfaces for mission objects (cards, constraints, oxygen, Nano/Bunker, markers).
- [ ] Add action-panel variants for mission-specific actions.
  - [x] Mission 12 equipment buttons show secondary-lock progress and disable until satisfied
- [~] Show active mission constraints/reminders in turn UI.
  - [x] Mission 10 live timer countdown in header (`timerDeadline`)
  - [x] Mission 9 sequence-priority hint panel (cards + active pointer)
  - [x] Mission 12 equipment secondary-lock progress panel
- [x] Support captain UI for mission-10 `chooseNextPlayer` forced action (ChooseNextPlayerPanel).
- [~] Support non-clockwise turn indicators and remaining forced-action states.
  - [x] Mission 10 dynamic-turn indicator + previous-player context in turn UI
- [ ] Support mission-specific token placement interactions.

## Phase 3 - QA Hardening, Rollout, and Cleanup (P1/P2)
Dependency: starts once each milestone’s Phase 1+2 scope is complete.

### Test Coverage
- [x] Add schema validation tests for all mission IDs + overrides.
- [x] Add resolved setup snapshots per mission.
- [x] Add representative setup/validation/game-logic tests per mission complexity tier.
- [x] Keep `pnpm mission:test` for campaign smoke and expand scenarios.

### Rollout by Milestone
- [ ] Ship M1 (missions 1-12) only when all M1 tests pass.
- [ ] Ship M2 (missions 13-35) only when all M2 tests pass.
- [ ] Ship M3 (missions 36-66 + 31/32/35) only when all M3 tests pass.

### Maintainability
- [ ] Split `missionSchema.ts` into modular files by domain or mission tier.
- [ ] Add schema authoring docs with examples and invariants.
- [ ] Add generated mission summary docs for human review.
- [ ] Add telemetry dashboard for mission failure reasons.

## Definition of Done (Campaign Rules Parity)
- [ ] All missions have schema-accurate setup for all allowed player counts.
- [ ] All hooks referenced in schema are implemented and tested.
- [ ] Shared/server/client typecheck and mission test suites pass.
- [ ] No mission depends on placeholder behavior hooks.
- [ ] Campaign missions are playable end-to-end with parity to mission cards.
