# TODO — Implementation Backlog

`GAME_RULES.md` is fully synced to physical card text (missions 1–66, equipment 1–12 + campaign, constraints A–L, challenges 1–10, characters 1–5 + E1–E4, rule stickers A/B/C). This file tracks remaining implementation gaps organized by phase.

---

## Phase 1: Data Parity (`packages/shared`)

### 1.1 Mission title corrections

~20 missions have titles that don't match `GAME_RULES.md`. Correct them:

| # | Current title | Correct title (GAME_RULES.md) |
|---|---|---|
| 23 | Dough Threads | Playing with Wire |
| 36 | Sergio El Mytho | Rhett Herrings |
| 42 | Captain Lazy | Captain Careless |
| 56 | Number Error | Guessing Game |

Audit all 66 mission names against `GAME_RULES.md` and fix every mismatch.

### 1.2 Constraint card catalog (A–L)

`ConstraintCard` type exists in `types.ts` but no card definitions are populated. Define static constraint card definitions with id, name, description, and validation rule for all 12 cards (A through L). Constraints include: even/odd restrictions, value range restrictions, no solo cut, no equipment, far-left/far-right only, double detonator advance, no info token placement, etc.

### 1.3 Challenge card catalog (1–10)

`ChallengeCard` type exists in `types.ts` but no card definitions are populated. Define static challenge card definitions with id, name, description, and completion condition for all 10 cards.

### 1.4 Character card definitions (E1–E4)

Only 5 base characters exist (`double_detector`, `character_2`–`character_5`). Add expert characters E1–E4 with their unique personal equipment types:
- **E1** — General Radar
- **E2** — Walkie-Talkies
- **E3** — Triple Detector
- **E4** — X or Y Ray

Also give characters 2–5 their real names from the rules.

### 1.5 Campaign equipment payload types

Add `UseEquipmentPayload` variants for the 6 campaign equipment cards:
- False Bottom (add 2 equipment cards to pool)
- Single Wire Label (place ×1 token on a wire)
- Emergency Drop (flip all used equipment face-up)
- Fast Pass (solo cut 2 wires without "last remaining" requirement)
- Disintegrator (random info token → cut all matching wires)
- Grappling Hook (take a teammate's wire)

### 1.6 Equipment naming corrections

Align equipment IDs with rule card names:
- `coffee_thermos` → `coffee_mug`
- `double_fond` → `false_bottom`
- `emergency_fund` → correct campaign name
- `single_thread_label` → `single_wire_label`
- `thread_cutter` → correct campaign name
- `grapple` → `grappling_hook`

Audit all equipment IDs/names against `GAME_RULES.md`.

---

## Phase 2: Server Logic Gaps (`packages/server`)

### 2.1 Constraint card enforcement

Hook handler that initializes constraint cards per mission setup and validates player actions against active constraints before execution. Each of the 12 constraint types needs a validation function that can reject or modify actions.

### 2.2 Challenge card system

Hook handler that checks challenge completion conditions after each action and awards rewards (detonator track reduction per mission rules). Needs both condition checking and reward application.

### 2.3 Character E1–E4 abilities

Server-side personal equipment execution for the 4 expert character abilities. These reuse existing equipment card logic but are innate to the character rather than drawn from the equipment pool.

### 2.4 Rule Sticker A/B/C

Setup-time logic for campaign progression:
- **A** (missions 9+): Add False Bottom to equipment pool for missions with yellow wires
- **B** (missions 31+): Allow character replacement from E1–E4 pool
- **C** (missions 55+): Add campaign equipment cards to the draw pool

### 2.5 Campaign equipment execution

Server handlers for the 6 campaign equipment cards:
- **False Bottom** — Add 2 equipment cards to pool
- **Single Wire Label** — Place ×1 token on a wire
- **Emergency Drop** — Flip all used equipment face-up
- **Fast Pass** — Solo cut 2 wires without "last remaining" requirement
- **Disintegrator** — Random info token → cut all matching wires
- **Grappling Hook** — Take a teammate's wire

### 2.6 Missing mission hook conversions

58 missions have string-only `behaviorHooks`; only 20 have typed `hookRules`. Convert the remaining ~38 missions with untyped hooks to typed `hookRules` definitions so the server can enforce them mechanically.

### 2.7 Bot improvements

Current bot supports 6 actions (`dualCut`, `soloCut`, `revealReds`, `simultaneousRedCut`, `chooseNextPlayer`, `designateCutter`). Add:
- `simultaneousFourCut` action
- Equipment usage decisions
- `dualCutDoubleDetector` action
- Challenge card awareness in decision-making

### 2.8 Storage migration

Add `mission22TokenPass` forced action normalization and any other mission-specific state migrations needed for new mechanics.

---

## Phase 3: Client UI Gaps (`packages/client`)

### 3.1 Character selection UI

`selectCharacter` is currently a no-op. Implement character choice screen for missions 31+ (Rule Sticker B) where E1–E4 become available for selection.

### 3.2 Campaign equipment UI

Equipment mode panels for the 6 campaign equipment cards. Each needs a distinct interaction flow (target selection, confirmation, animation).

### 3.3 Nano/Bunker/Oxygen visual components

Replace text-only displays with graphical trackers (progress bars, animated icons, or dial-style indicators).

### 3.4 Number card display

Card-art rendering instead of comma-separated values. Show number cards as styled card components.

### 3.5 Constraint/Challenge card display

Card images or styled card components instead of plain text labels. Show active constraints and challenge progress visually.

### 3.6 Mobile layout

Left dock (mission/equipment/character cards) and sidebar (action log, chat) are hidden on mobile. Implement responsive panels or sheet-style drawers for small screens.

### 3.7 EndScreen component integration

`EndScreen.tsx` exists and is imported in `App.tsx` but is not rendered. Currently `GameBoard.tsx` shows an inline win/loss banner. Wire up the EndScreen component to display when `gameState.phase === "finished"`.

---

## Phase 4: Testing & QA

### 4.1 Constraint card validation tests
Unit tests for all 12 constraint types (A–L) verifying correct action rejection/acceptance.

### 4.2 Challenge card completion tests
Unit tests for all 10 challenge types verifying condition detection and reward application.

### 4.3 Character E1–E4 ability tests
Tests for each expert character's personal equipment ability.

### 4.4 Campaign equipment tests
Tests for all 6 campaign equipment card effects.

### 4.5 Rule sticker integration tests
Tests verifying Rule Stickers A, B, C correctly modify setup at their activation thresholds.

### 4.6 Mission title parity check
Automated test that validates all 66 mission schema names match `GAME_RULES.md` titles exactly.

### 4.7 Hook rule coverage check
Automated test that flags missions with string-only `behaviorHooks` and no corresponding typed `hookRules`.
