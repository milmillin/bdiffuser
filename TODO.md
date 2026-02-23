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
7. Phase 4 - `GAME_RULES.md` card-text sync

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

## Phase 4 - GAME_RULES.md Card-Text Sync (P0)

Dependency: starts after refreshed card image artifacts are available.

### Card-by-card `GAME_RULES.md` Updates (one row = one card)

Use Codex to read source card images directly and update `GAME_RULES.md` only. Do not store OCR outputs or intermediate extraction artifacts in the repo. Don't search the web. The information should only be referenced from the cards and general game rules. For mission cards, read both front and back side of the cards.

#### Mission Cards (66)

- [x] `mission_1`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (no changes needed — existing text already matched card images).
- [x] `mission_2`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (changed: card title `TRAINING, 1st day` → `TRAINING, Day 2`, lesson subtitle reworded, yellow wire setup phrasing tightened, yellow cut rules rewritten to match card text — board marker/pawn and yellow-info-token sentences removed).
- [x] `mission_3`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: card title/lesson wording and setup + back-rule text aligned to the mission card).
- [x] `mission_4`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title updated to mission-4 front text: "TRAINING: First Day in the Field (Time to put theory into practice!)`; wording already aligned to back rule text.`).
- [x] `mission_5`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title fixed to TRAINING: Second Day in the Field, subtitle added, and back rule aligned to 2-out-of-3 yellow constraints + reminder line.`).
- [x] `mission_6`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: source cards match current text in `GAME_RULES.md`; no update needed).
- [x] `mission_7`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — front/back text already matches current GAME_RULES.md entry`).
- [x] `mission_8`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — existing text already matches source card images (front/back).`).
- [x] `mission_9`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: card title updated to `A Sense of Priorities`; setup/rule wording confirmed unchanged).
- [x] `mission_10`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matched existing GAME_RULES.md entry`).
- [x] `mission_11`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matches existing GAME_RULES.md entry`).
- [x] `mission_12`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: no changes needed; source front/back setup and rules text already matches `GAME_RULES.md`).
- [x] `mission_13`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back already matched existing entry in GAME_RULES.md`).
- [x] `mission_14`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matches the existing GAME_RULES.md entry`).
- [x] `mission_15`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back match current GAME_RULES.md mission 15 entry; no changes needed`).
- [x] `mission_16`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source card text already matches current GAME_RULES.md entry`).
- [x] `mission_17`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matched existing GAME_RULES.md entry`).
- [x] `mission_18`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: no changes needed; card text already matches current `GAME_RULES.md`).
- [x] `mission_19`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to In the Belly of the Beast; setup and rule text confirmed against front/back source images.`).
- [x] `mission_20`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to The Big Bad Wolf; setup and rule text confirmed against front/back source images.`).
- [x] `mission_21`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title updated to "Death by Haggis"; setup/back-rule wording aligned to source images.`).
- [x] `mission_22`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to \`Negative Impressions\`; setup and back-rule text confirmed against front/back source images.`).
- [x] `mission_23`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matches existing GAME_RULES.md entry.`).
- [x] `mission_24`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back text already matches existing GAME_RULES.md entry.`).
- [x] `mission_25`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back verified; existing GAME_RULES.md mission 25 entry already matches source card text`).
- [x] `mission_26`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes made to text for mission 26 setup/rules; front confirms setup wording and equipment replacement behavior. Back image is the even-number marker reference only.`).
- [x] `mission_27`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Verified front/back text matches current GAME_RULES.md; no changes needed.`).
- [x] `mission_28`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — front/back text matches existing `GAME_RULES.md` entry.`).
- [x] `mission_29`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — front/back verified against source images; existing `GAME_RULES.md` mission_29 entry already matches.`).
- [x] `mission_30`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: front/back text verified; setup/rules updated for speed-mission flow and failure/success behavior from OCR-cleaned mission text).
- [x] `mission_31`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to "With One Hand Tied (Behind My Back...)"; front/back setup/rules confirmed against source images; no setup/mission-rule text changes needed.`).
- [x] `mission_32`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: no changes needed; existing text already matched front/back after verification).
- [x] `mission_33`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source/front-back text already matches existing GAME_RULES.md entry for mission_33`).
- [x] `mission_34`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back already matches the existing `GAME_RULES.md` entry.`).
- [x] `mission_35`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed; source front/back text already matches existing GAME_RULES.md entry. Verified title as "No Ties, Single Thread" after OCR cleanup.`).
- [x] `mission_36`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — front/back OCR matches existing text in GAME_RULES.md`).
- [x] `mission_37`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed; OCR-cleaned front/back text matches existing GAME_RULES entry.`).
- [x] `mission_38`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back matched existing GAME_RULES.md entry.`).
- [x] `mission_39`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back OCR checked against source images; no updates needed.`).
- [x] `mission_40`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: no changes needed; source front/back text and rule flow already match `GAME_RULES.md`.)
- [x] `mission_41`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back confirmed, and mission text already matches `GAME_RULES.md` (front and marker-style back).`).
- [x] `mission_42`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back aligned to source: setup is red 1/3 + four yellow wires; back clarifies pre-play show-setup, mission sound playback, and success/open-box wording.`).
- [x] `mission_43`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back verified and card title corrected to \`Nano the Robot\`; mission win condition wording normalized to card phrasing`).
- [x] `mission_44`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: front/back text was re-checked and `GAME_RULES.md` mission-44 copy updated for exact communication rule and setup/flow wording cleanup).
- [x] `mission_45`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title normalized to 'My Thread, My Battle!'; front/back setup/rule text confirmed.`).
- [x] `mission_46`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to "Secret Agent"; all setup/back text confirmed from front/back images.`).
- [x] `mission_47`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed; source front/back verified and matches existing GAME_RULES.md text.`).
- [x] `mission_48`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back OCR confirmed for title/setup/rules text and 2-player override; wording already matches current `GAME_RULES.md` entry`).
- [x] `mission_49`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to "Message in a Bottle"; setup and rule text now matches source cards and FAQ text removed.`).
- [x] `mission_50`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to \"The Blackest Sea\"; setup/rules text confirmed against front/back source images.`).
- [x] `mission_51`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back verified; updated mission 51 wording to match card phrasing for title and boss/turn flow`).
- [x] `mission_52`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back setup+rule wording confirmed; card title corrected to "Dirty Double-crossers"`).
- [x] `mission_53`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back verified; card title aligned to source text and setup/rule mechanics already match GAME_RULES.md`).
- [x] `mission_54`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back OCR checked and matched existing GAME_RULES.md mission-54 text; no update needed`).
- [x] `mission_55`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed; mission text already matches front/back source images for setup, 2-player override, and challenge-reward behavior.`).
- [x] `mission_56`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Done: card front/back OCR matched cleanly; title corrected to The Rebel Sons and setup/rule text aligned to card wording in GAME_RULES.md`).
- [x] `mission_57`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Verified front/back OCR against source images; no text changes required, `GAME_RULES.md` already matched.`).
- [x] `mission_58`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back card text already matches existing GAME_RULES.md entry`).
- [x] `mission_59`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Front/back OCR verified from source images; existing GAME_RULES.md text already matches, no changes needed.`).
- [x] `mission_60`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — front/back OCR matched cleanly against existing text in GAME_RULES.md`).
- [x] `mission_61`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back OCR verified cleanly; no text changes needed — existing GAME_RULES.md entry already matched.`).
- [x] `mission_62`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to \`Armageddon Roulette\`; setup/rule wording confirmed with front/back OCR and aligned where needed.`).
- [x] `mission_63`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No changes needed — source front/back verified cleanly and matches existing GAME_RULES.md entry.`).
- [x] `mission_64`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `No update needed — setup/rules already match clean source card text from OCR verification`).
- [x] `mission_65`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `no changes needed; source front/back text matches existing GAME_RULES.md mission-65 entry`).
- [x] `mission_66`: verify corresponding setup/rules text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to \`The Final Countdown\`; ACTION-constraint square wording aligned from "hatched" to "striped" using source OCR.`).

#### Equipment Cards (18)
- [x] `equipment_1`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back OCR checked against source image (no text changes needed); no updates to GAME_RULES.md`).
- [x] `equipment_2`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `No text changes needed; source OCR confirms existing GAME_RULES wording for Talkies-Walkies and swap procedure. OCR artifacts were limited to spacing/character noise and did not alter card meaning.`)
- [x] `equipment_3`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to "Triple Detector"; front image text verified against OCR (no artifacts affecting rule text).`).
- [x] `equipment_4`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front/back clean; no text changes needed`).
- [x] `equipment_5`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `OCR clean for front card image; no text changes needed in `GAME_RULES.md`).
- [x] `equipment_6`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: source card text says `Move the detonator dial back 1 space`).
- [x] `equipment_7`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Front image OCR normalized effect copy to source wording; no mechanical rule change.`).
- [x] `equipment_8`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Front image OCR matched existing card text; no GAME_RULES updates required.`).
- [x] `equipment_9`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: no changes needed; front/back match current source text and existing GAME_RULES.md entry).
- [x] `equipment_10`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `No text changes needed; source front card OCR matched existing card text exactly. Back art has no readable rules text.`).
- [x] `equipment_11`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front image OCR verified; existing GAME_RULES entry aligned, no text changes needed. Back card has no readable rules text.`).
- [x] `equipment_12`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `No text changes needed — OCR-clean source image confirms existing GAME_RULES.md entry for equipment_12`).
- [x] `equipment_22`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: front image OCR confirms text; `GAME_RULES.md` wording updated for card exact wording).
- [x] `equipment_33`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `No text changes needed; source front image OCR confirmed card text already matches current GAME_RULES.md entry.`).
- [x] `equipment_99`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Verified front card OCR; existing `GAME_RULES.md` text for `equipment_99` is already correct; no changes needed.`).
- [x] `equipment_1010`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `OCR-clean front image matches Disintegrator card; GAME_RULES wording updated to mirror "draw random Info token and resolve all matching remaining wires.`).
- [x] `equipment_1111`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Card title corrected to "Grappling Hook"; setup/reminder wording aligned to source image text.`).
- [x] `equipment_yellow`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: front OCR reads `False Bottom`; timing confirmed as `Instant effect`; effect/reminder text aligned to source wording).

#### Challenge Cards (10)
- [x] `challenge_1`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: added dedicated Challenge Card 1 entry describing RED teammate-cut explosion rule).
- [x] `challenge_2`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Added: 4 bomb disposal experts consecutively cut EVEN numbers.`).
- [x] `challenge_3`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Added: Uncut wires on a tile stand consist of 2-wire pairs (separated by cut wires).`).
- [x] `challenge_4`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front text: \"The sum of the first 3 validation tokens used equals 18.\``).
- [x] `challenge_5`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Added Challenge 5 entry: 2 bomb disposal experts consecutively perform the SOLO Cut action.`).
- [x] `challenge_6`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Added challenge card 6 text: single tile stand isolation condition (at least 5 uncut wires, adjacent wires cut).`).
- [x] `challenge_7`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Added challenge card 7 entry: 3 experts consecutively cut sequential values (up or down), e.g. 8-9-10 or 5-4-3.`).
- [x] `challenge_8`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: source front read: "The first 2 Validation tokens are put on these numbers: Put 2 faceup Number cards HERE.").
- [x] `challenge_9`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front OCR verified: add missing odd-wire tile stand condition with explicit values 3,3,5,9; ignore RED and YELLOW wires`).
- [x] `challenge_10`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `On a single tile stand, at least 7 wires have been cut while both end wires remain uncut.`).

#### Constraint Cards (12)
- [x] `constraint_a`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front image OCR reads "You must cut only even wires"; back image has no readable text; GAME_RULES.md constraint section updated with Constraint A entry`).
- [x] `constraint_b`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front image reads "You must cut only ODD wires"; back image has no readable text; GAME_RULES.md constraint section updated with Constraint B entry`).
- [x] `constraint_c`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `front image OCR confirms text as "You must cut only wires 1 to 6."`).
- [x] `constraint_d`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `Add Constraint D entry: "You must cut only wires 7 to 12."`).
- [ ] `constraint_e`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_f`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_g`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_h`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_i`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_j`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_k`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
- [ ] `constraint_l`: verify corresponding text and update `GAME_RULES.md` using Codex-read source images (diff: `TBD`).
## Definition of Done (Campaign Rules Parity)

- [x] All missions have schema-accurate setup for all allowed player counts.
- [x] All hooks referenced in schema are implemented and tested.
- [x] Shared/server/client typecheck and mission test suites pass.
- [x] No mission depends on placeholder behavior hooks.
- [x] Campaign missions are playable end-to-end with parity to mission cards.
