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
7. Phase 4 - Card OCR refresh + `GAME_RULES.md` sync

## Milestones

- [x] M1: Missions 1-12 fully playable with schema parity and tests.
- [x] M2: Missions 13-35 fully playable with schema parity and tests.
- [x] M3: Missions 36-66 fully playable with schema parity and tests.

### Milestone Task Mapping

- [x] M1 requires: Phase 0A + 0B + 0C complete, plus Phase 1 Core rules for missions 1-12, plus Phase 2 filtering/UI/bot support for features used by missions 1-12, plus Phase 3 M1 test gate.
- [x] M2 requires: M1 complete, plus remaining Phase 1 Advanced rules for missions 13-35, plus Phase 2 support for those mechanics, plus Phase 3 M2 test gate.
- [x] M3 requires: M2 complete, plus final Phase 1 Advanced rules for missions 36-66, plus Phase 2 support for those mechanics, plus Phase 3 M3 test gate.

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

- [x] Verify every mission setup field in `packages/shared/src/missionSchema.ts` against mission card assets (1-66).
  - Verification report: `packages/shared/MISSION_SCHEMA_VERIFICATION.md` (66/66 OK).
  - D1/D2 resolved by campaign-equipment modeling:
    - Mission 41 now excludes `double_fond` by equipment ID (keeps base Rewinder available).
    - Mission 57 now excludes `disintegrator` by equipment ID (keeps base X/Y Ray available).
- [x] Build ambiguity triage list for approximations currently represented in schema:
  - Scope: missions 9-66.
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
- [x] Implement support for:
  - Sequence/priority restrictions used in missions 1-12
  - [x] Mission 9 face-A sequence-priority gating (left→middle→right unlock flow)
  - [x] Forced action: captain chooses next player (mission 10 dynamic turn order)
  - [x] Mission 10 no-consecutive-turn enforcement (3+ players; 2-player exception)
  - [x] Remaining forced-pass states used in missions 1-12
  - [x] Mission-specific forbidden targets/values used in missions 1-12
  - [x] Mission 11 reveal restriction: hidden red-like value can only be revealed when it is all remaining in hand

#### Game Logic Layer (mission-aware)

- [x] Implement mission-aware action resolvers for special actions used in missions 1-12.
- [x] Implement mission-specific failure outcomes used in missions 1-12.
  - [x] Mission 11 hidden blue-as-red parity: successful cut of hidden value explodes immediately (`loss_red_wire`)
  - [x] Mission 11 hidden blue-as-red parity: wrong dual-cut guess on hidden value also explodes (`loss_red_wire`)
  - [x] Mission 10 timer enforcement: `timerDeadline` on GameState, Durable Object alarm-based timeout → `loss_timer` result.
  - [x] Mission 10 2-player timer override: 12-minute setup timer
- [x] Make win/loss checks mission-aware for mission patterns used in missions 1-12.

#### Equipment Runtime Parity

- [x] Implement full shared-equipment use/effects required by missions 1-12.
- [x] Implement mission-specific equipment exclusions/replacements needed by missions 1-12.
  - [x] Mission 11 setup replacement for equipment matching hidden red-like value
  - [x] Mission 12 per-equipment number-card secondary lock enforcement
  - [x] Mission 12 secondary lock metadata clears when requirement is satisfied

#### Token System Parity

- [x] Implement token variants required by missions 1-12.
- [x] Implement mission-specific setup token flows required by missions 1-12.
  - [x] Mission 11 (2-player) setup override: captain skips info-token placement
  - [x] Setup info-token legality enforcement (own blue wire + matching value + valid index)

### Advanced Rules (P1, expands to M2/M3)

#### Validation Layer (mission-aware)

- [x] Implement support for simultaneous multi-wire cuts.
- [x] Implement remaining mission-specific forbidden targets/values for M2/M3 mechanics.
  - [x] Mission 13 detector-target restrictions:
    - [x] Personal Double Detector rejects red/yellow targets.
    - [x] Triple/Super/X-or-Y detector equipment paths reject non-blue targets.
  - [x] Mission 27: no character cards (all personal Double Detector abilities disabled at setup).
  - [x] Mission 28 captain-lazy restrictions:
    - [x] Setup clears captain character card (no personal equipment in this mission).
    - [x] Captain cannot use personal Double Detector ability.
    - [x] Captain cannot activate equipment cards.
  - [x] Mission 20 X-wire target restrictions:
    - [x] Personal Double Detector cannot target X-marked wires.
    - [x] Equipment targeting paths reject X-marked wire targets.

#### Game Logic Layer (mission-aware)

- [x] Implement mission-specific progression systems (Nano, oxygen, challenge rewards, bunker flow).
- [x] Implement remaining alternate failure outcomes for M2/M3 mechanics.
  - [x] Mission 28: failed Dual Cut by captain now explodes immediately.
  - [x] Mission 25: speaking wire numbers (`1`-`12`) in chat advances detonator.
  - [x] Mission 20 setup: mark one unsorted far-right `X` wire per player.
  - [x] Mission 52: failed Dual Cut now places the announced-value token on the targeted wire (false-information rule).

#### Equipment Runtime Parity

- [x] Implement special equipment modes (face-down equipment, forced equipment pools, deck/pile modes).
  - [x] Mission 15: face-down equipment with Number-deck progression unlock flow.
    - [x] Added hook rule `number_deck_equipment_reveal` and Mission 15 hook wiring.
    - [x] Mission 15 setup now initializes a Number deck (1 visible + hidden draw pile) and marks equipment face-down.
    - [x] Mission 15 resolve now reveals one equipment card when current Number value reaches 4 cuts, then advances/skips Number cards per card rules.
    - [x] Client view filter now redacts locked face-down equipment details until revealed.
  - [x] Mission 23: hidden equipment pile setup mode.
    - [x] Added hook rule `hidden_equipment_pile` and Mission 23 hook wiring.
    - [x] Mission 23 setup now creates a face-down pile of 7 random base equipment cards (replacing normal setup draw).
- [x] Implement remaining campaign equipment behavior variants.
  - [x] Mission 17: Sergio (captain) cannot activate equipment cards.
    - [x] Setup clears Sergio/captain character card (no personal equipment).
    - [x] Enforced mission-aware equipment validation rule (`MISSION_RULE_VIOLATION`) for mission 17 captain actor.
    - [x] Enforced mission-aware validation rule blocking Sergio from Double Detector personal equipment.
    - [x] Failed Dual Cut targeting Sergio now places a false token with the announced value.
    - [x] Failed Double Detector targeting Sergio now also places a false token with the announced value.
    - [x] Added coverage that non-captains can still use equipment effects that involve the captain (Talkies-Walkies).
  - [x] Mission 58: Double Detector is unlimited-use.
    - [x] Validation now allows reuse even when `characterUsed` is already set in mission 58.
    - [x] Resolver no longer consumes `characterUsed` when mission 58 is active.
    - [x] Added validation/execution tests for mission-58 unlimited-use behavior.

#### Token System Parity

- [x] Implement token variants:
  - Standard numeric
  - [x] Even/Odd
  - [x] `x1/x2/x3`
  - [x] False-information
  - [x] Absent-value
  - [x] No-token missions
  - [x] Mission 21 even/odd token mode for setup placements, failed-cut token placement, and Post-it token placement.
  - [x] Mission 58 no-token mode:
    - [x] Setup token count is zero for all players.
    - [x] Failed Dual Cut / Double Detector attempts no longer place info tokens.
    - [x] Token-placing equipment (Post-it, Label cards) is blocked.
- [x] Implement mission-specific token placement legality.
  - [x] Mission 52 setup token legality:
    - [x] Setup tokens may target only blue/red wires.
    - [x] Setup tokens on blue wires must be false (non-matching value).
  - [x] Mission 40 alternating token legality:
    - [x] 2-player setup captain skip is enforced for setup token requirements.
    - [x] Alternating seat token variants are enforced for setup/failure/Post-it placements (`x1/x2/x3` vs even/odd).
    - [x] Post-it cut-wire exception is limited to alternating `x1/x2/x3` seats only.
- [x] Implement remaining mission-specific setup token flows (random draw, captain skip, multi-token placement).
  - [x] Mission 13 random setup-token draw flow:
    - [x] Setup now auto-places one random valid info token for each required player.
    - [x] 2-player captain skip remains enforced during random setup flow.
  - [x] Mission 17 captain false setup-token flow:
    - [x] Captain now requires 2 setup tokens (instead of 1).
    - [x] Captain setup token placement enforces false-value semantics and bans red-wire targets.
  - [x] Mission 46 captain skip setup-token flow (2-player):
    - [x] 2-player captain now requires 0 setup tokens in mission 46.
    - [x] Added shared/server setup-token requirement coverage for mission 46.
  - [x] Mission 52 two-token setup flow (all players place 2 setup tokens; bot auto-setup places until requirement is met).

## Phase 2 - Product Integration (P1)

Dependency: blocked by Phase 1 Core for M1 and Phase 1 Advanced for M2/M3.

### View Filtering and Persistence

- [x] Update `viewFilter.ts` for all new mission objects and visibility semantics.
  - [x] Mission 11 hidden blue-as-red setup value stays server-only in filtered log
  - [x] Mission-driven client fields preserved: `pendingForcedAction`, `timerDeadline`
  - [x] Added coverage for constraints, oxygen ownership map, bunker tracker, number-card visibility, and all special marker kinds
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

- [x] Add UI surfaces for mission objects (cards, constraints, oxygen, Nano/Bunker, markers).
- [x] Add action-panel variants for mission-specific actions.
  - [x] Mission 9 action panel sequence gate (active value/progress + block invalid dual/solo submits)
  - [x] Mission 11 reveal-action hinting (blocked/ready guidance without hidden-value leak)
  - [x] Mission 12 equipment buttons show secondary-lock progress and disable until satisfied
- [x] Show active mission constraints/reminders in turn UI.
  - [x] Mission 10 live timer countdown in header (`timerDeadline`)
  - [x] Mission 9 sequence-priority hint panel (cards + active pointer)
  - [x] Mission 12 equipment secondary-lock progress panel
  - [x] Turn constraint reminder panel for active global + current-player constraints
- [x] Support captain UI for mission-10 `chooseNextPlayer` forced action (ChooseNextPlayerPanel).
- [x] Support non-clockwise turn indicators and remaining forced-action states.
  - [x] Mission 10 dynamic-turn indicator + previous-player context in turn UI
  - [x] Forced-action captain identity surfaced in dynamic/waiting UI
  - [x] Fallback waiting banner for unsupported future forced-action kinds
- [x] Support mission-specific token placement interactions.
  - [x] Mission 11 (2-player) captain setup-token skip reflected in client setup interaction and messaging

## Phase 3 - QA Hardening, Rollout, and Cleanup (P1/P2)

Dependency: starts once each milestone’s Phase 1+2 scope is complete.

### Test Coverage

- [x] Add schema validation tests for all mission IDs + overrides.
- [x] Add resolved setup snapshots per mission.
- [x] Add representative setup/validation/game-logic tests per mission complexity tier.
- [x] Keep `pnpm mission:test` for campaign smoke and expand scenarios.

### Rollout by Milestone

- [x] Ship M1 (missions 1-12) only when all M1 tests pass.
- [x] Ship M2 (missions 13-35) only when all M2 tests pass.
- [x] Ship M3 (missions 36-66) only when all M3 tests pass.

### Maintainability

- [x] Split `missionSchema.ts` into modular files by domain or mission tier.
  - [x] Extracted schema type/hook definitions into `missionSchemaTypes.ts`
  - [x] Extracted schema validation helpers into `missionSchemaValidation.ts`
  - [x] Extracted wire-pool utility helpers into `missionSchemaUtils.ts`
  - [x] Extracted mission builder DSL/helpers into `missionSchemaBuilders.ts`
  - [x] Extracted training-tier mission registrations (missions 1-8) into `missionData/training.ts`
  - [x] Extracted early-campaign mission registrations (missions 9-16) into `missionData/earlyCampaign.ts`
  - [x] Extracted mid-campaign mission registrations (missions 17-24) into `missionData/midCampaign.ts`
  - [x] Extracted late-campaign mission registrations (missions 25-32) into `missionData/lateCampaign.ts`
  - [x] Extracted expert-campaign mission registrations (missions 33-40) into `missionData/expertCampaign.ts`
  - [x] Extracted expansion-A mission registrations (missions 41-48) into `missionData/expansionA.ts`
  - [x] Extracted expansion-B mission registrations (missions 49-57) into `missionData/expansionB.ts`
  - [x] Extracted expansion-C mission registrations (missions 58-66) into `missionData/expansionC.ts`
- [x] Add schema authoring docs with examples and invariants.
- [x] Add generated mission summary docs for human review.
  - [x] Added generator script `scripts/generate-mission-summary.mjs`
  - [x] Added generated artifact `packages/shared/MISSION_SUMMARY_GENERATED.md`
- [x] Add telemetry dashboard for mission failure reasons.
  - [x] Emit structured `mission_failure` telemetry events from server loss paths.
  - [x] Add server tests for mission-failure telemetry emission paths.
  - [x] Add aggregation/persistence for mission-failure telemetry counters.
    - [x] Added migration-safe `failureCounters` to room snapshot persistence
    - [x] Increment counters on new mission failures in player/bot/timer flows
  - [x] Expose mission-failure telemetry via an endpoint/dashboard surface.
    - [x] Added room HTTP endpoint `.../telemetry/failure-counters`

## Phase 4 - Card OCR Refresh + GAME_RULES Sync (P0)

Dependency: starts after refreshed card image artifacts are available.

### Task Set A - Refresh OCR Text Extractions with LLM (one row = one card)

#### Mission Cards (66)
- [x] `mission_1` (`mission_1.jpg` + `mission_1_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [x] `mission_2` (`mission_2.jpg` + `mission_2_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_3` (`mission_3.jpg` + `mission_3_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_4` (`mission_4.jpg` + `mission_4_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_5` (`mission_5.jpg` + `mission_5_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_6` (`mission_6.jpg` + `mission_6_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_7` (`mission_7.jpg` + `mission_7_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_8` (`mission_8.jpg` + `mission_8_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_9` (`mission_9.jpg` + `mission_9_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_10` (`mission_10.jpg` + `mission_10_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_11` (`mission_11.jpg` + `mission_11_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_12` (`mission_12.jpg` + `mission_12_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_13` (`mission_13.jpg` + `mission_13_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_14` (`mission_14.jpg` + `mission_14_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_15` (`mission_15.jpg` + `mission_15_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_16` (`mission_16.jpg` + `mission_16_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_17` (`mission_17.jpg` + `mission_17_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_18` (`mission_18.jpg` + `mission_18_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_19` (`mission_19.jpg` + `mission_19_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_20` (`mission_20.jpg` + `mission_20_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_21` (`mission_21.jpg` + `mission_21_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_22` (`mission_22.jpg` + `mission_22_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_23` (`mission_23.jpg` + `mission_23_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_24` (`mission_24.jpg` + `mission_24_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_25` (`mission_25.jpg` + `mission_25_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_26` (`mission_26.jpg` + `mission_26_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_27` (`mission_27.jpg` + `mission_27_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_28` (`mission_28.jpg` + `mission_28_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_29` (`mission_29.jpg` + `mission_29_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_30` (`mission_30.jpg` + `mission_30_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_31` (`mission_31.jpg` + `mission_31_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_32` (`mission_32.jpg` + `mission_32_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_33` (`mission_33.jpg` + `mission_33_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_34` (`mission_34.jpg` + `mission_34_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_35` (`mission_35.jpg` + `mission_35_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_36` (`mission_36.jpg` + `mission_36_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_37` (`mission_37.jpg` + `mission_37_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_38` (`mission_38.jpg` + `mission_38_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_39` (`mission_39.jpg` + `mission_39_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_40` (`mission_40.jpg` + `mission_40_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_41` (`mission_41.jpg` + `mission_41_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_42` (`mission_42.jpg` + `mission_42_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_43` (`mission_43.jpg` + `mission_43_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_44` (`mission_44.jpg` + `mission_44_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_45` (`mission_45.jpg` + `mission_45_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_46` (`mission_46.jpg` + `mission_46_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_47` (`mission_47.jpg` + `mission_47_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_48` (`mission_48.jpg` + `mission_48_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_49` (`mission_49.jpg` + `mission_49_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_50` (`mission_50.jpg` + `mission_50_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_51` (`mission_51.jpg` + `mission_51_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_52` (`mission_52.jpg` + `mission_52_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_53` (`mission_53.jpg` + `mission_53_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_54` (`mission_54.jpg` + `mission_54_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_55` (`mission_55.jpg` + `mission_55_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_56` (`mission_56.jpg` + `mission_56_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_57` (`mission_57.jpg` + `mission_57_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_58` (`mission_58.jpg` + `mission_58_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_59` (`mission_59.jpg` + `mission_59_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_60` (`mission_60.jpg` + `mission_60_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_61` (`mission_61.jpg` + `mission_61_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_62` (`mission_62.jpg` + `mission_62_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_63` (`mission_63.jpg` + `mission_63_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_64` (`mission_64.jpg` + `mission_64_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_65` (`mission_65.jpg` + `mission_65_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `mission_66` (`mission_66.jpg` + `mission_66_back.jpg`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.

#### Equipment Cards (18)
- [ ] `equipment_1` (`equipment_1.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_2` (`equipment_2.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_3` (`equipment_3.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_4` (`equipment_4.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_5` (`equipment_5.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_6` (`equipment_6.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_7` (`equipment_7.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_8` (`equipment_8.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_9` (`equipment_9.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_10` (`equipment_10.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_11` (`equipment_11.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_12` (`equipment_12.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_22` (`equipment_22.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_33` (`equipment_33.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_99` (`equipment_99.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_1010` (`equipment_1010.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_1111` (`equipment_1111.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `equipment_yellow` (`equipment_yellow.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.

#### Challenge Cards (10)
- [ ] `challenge_1` (`challenge_1.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_2` (`challenge_2.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_3` (`challenge_3.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_4` (`challenge_4.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_5` (`challenge_5.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_6` (`challenge_6.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_7` (`challenge_7.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_8` (`challenge_8.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_9` (`challenge_9.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `challenge_10` (`challenge_10.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.

#### Constraint Cards (12)
- [ ] `constraint_a` (`constraint_a.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_b` (`constraint_b.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_c` (`constraint_c.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_d` (`constraint_d.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_e` (`constraint_e.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_f` (`constraint_f.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_g` (`constraint_g.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_h` (`constraint_h.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_i` (`constraint_i.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_j` (`constraint_j.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_k` (`constraint_k.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.
- [ ] `constraint_l` (`constraint_l.png`): regenerate LLM OCR extraction from updated artifacts and store normalized text output.

### Task Set B - Verify and Update `GAME_RULES.md` from New OCR (one row = one card)

Each row must include both the pre-existing text and the replacement text copied from OCR normalization before marking done.

#### Mission Cards (66)
- [ ] `mission_1`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_2`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_3`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_4`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_5`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_6`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_7`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_8`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_9`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_10`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_11`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_12`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_13`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_14`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_15`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_16`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_17`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_18`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_19`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_20`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_21`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_22`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_23`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_24`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_25`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_26`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_27`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_28`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_29`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_30`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_31`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_32`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_33`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_34`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_35`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_36`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_37`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_38`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_39`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_40`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_41`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_42`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_43`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_44`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_45`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_46`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_47`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_48`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_49`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_50`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_51`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_52`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_53`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_54`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_55`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_56`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_57`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_58`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_59`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_60`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_61`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_62`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_63`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_64`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_65`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `mission_66`: verify corresponding setup/rules text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).

#### Equipment Cards (18)
- [ ] `equipment_1`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_2`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_3`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_4`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_5`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_6`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_7`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_8`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_9`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_10`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_11`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_12`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_22`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_33`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_99`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_1010`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_1111`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `equipment_yellow`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).

#### Challenge Cards (10)
- [ ] `challenge_1`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_2`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_3`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_4`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_5`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_6`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_7`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_8`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_9`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `challenge_10`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).

#### Constraint Cards (12)
- [ ] `constraint_a`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_b`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_c`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_d`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_e`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_f`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_g`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_h`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_i`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_j`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_k`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
- [ ] `constraint_l`: verify corresponding text in `GAME_RULES.md` and update as needed (old content: `TBD`; new content: `TBD`).
## Definition of Done (Campaign Rules Parity)

- [x] All missions have schema-accurate setup for all allowed player counts.
- [x] All hooks referenced in schema are implemented and tested.
- [x] Shared/server/client typecheck and mission test suites pass.
- [x] No mission depends on placeholder behavior hooks.
- [x] Campaign missions are playable end-to-end with parity to mission cards.
