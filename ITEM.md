# Image Asset Catalog

All files live in `packages/client/public/images/`.

---

## Wire Tiles

Wire tiles are the core game pieces placed on tile stands. Each value (1-12) has 4 copies. Wires are sorted ascending on stands, with the value visible only to the owner.

| File | Description |
|------|-------------|
| `wire_1.png` .. `wire_12.png` | **Blue wires** numbered 1-12 (front face, value visible) |
| `wire_back.png` | Blue wire **back** (hidden side facing opponents) |
| `wire_red_1-5.png` .. `wire_red_11-5.png` | **Red wires** (bomb!) — decimal `.5` is for sort order only |
| `wire_yellow_1-1.png` .. `wire_yellow_11-1.png` | **Yellow wires** — decimal `.1` is for sort order only; all treated as "YELLOW" in play |

**Count:** 12 blue fronts + 1 blue back + 11 red + 11 yellow = **35 files**

---

## Info Tokens

Arrow-shaped banner tokens placed in front of wires to communicate information. Placed during setup and after failed Dual Cuts.

| File | Description |
|------|-------------|
| `info_1.png` .. `info_12.png` | Numeric info tokens (value 1-12) |
| `info_yellow.png` | Yellow wire info token |
| `info_even.png` | "Even" (2/4/6/8/10/12) — dark green banner |
| `info_odd.png` | "Odd" (1/3/5/7/9/11) — teal banner |
| `info_no.png` | "No" / incorrect — orange banner with X |
| `info_x1.png` | "x1" — pink banner (wire appears once on stand) |
| `info_x2.png` | "x2" — pink banner (wire appears twice on stand) |
| `info_x3.png` | "x3" — dark pink banner (wire appears three times on stand) |

**Count:** 12 numeric + 1 yellow + 2 parity + 1 no + 3 multiplicity = **19 files**

---

## Character Cards

Each player gets a character card with a one-time personal equipment ability. Base characters (1-5) all have **Double Detector**. Expansion characters (e1-e4) have unique abilities and are unlocked from mission 31 onward (Rule Sticker B).

| File | Description | Personal Equipment |
|------|-------------|--------------------|
| `character_1.png` | Captain (cat with hat & walkie-talkie) | Double Detector |
| `character_2.png` | Rabbit (dark, blue eyes) | Double Detector |
| `character_3.png` | Rabbit (white, sunglasses) | Double Detector |
| `character_4.png` | Cat (grey, glasses, briefcase) | Double Detector |
| `character_5.png` | Mouse (brown, glasses, scissors) | Double Detector |
| `character_back.png` | Card back — red dead-battery icon (0%) | — |
| `character_e1.png` | Expansion: Dog (nervous, crowbar) | General Radar |
| `character_e2.png` | Expansion: Mouse (dark, headphones) | Walkie-Talkies |
| `character_e3.png` | Expansion: Bear (red, strong) | Triple Detector |
| `character_e4.png` | Expansion: Rabbit (dark, purple glasses) | X OR Y Ray |

**Availability:** Base characters from mission 1. Expansion characters (e1-e4) from **mission 31+** (Rule Sticker B — non-captain players may swap).

**Count:** 5 base + 1 back + 4 expansion = **10 files**

---

## Equipment Cards

Shared equipment unlocked when 2 wires of the card's value are cut (or special conditions for double-lock and yellow cards). Each is used once per mission unless refreshed.

| File | Unlock | Name | Effect | Timing |
|------|--------|------|--------|--------|
| `equipment_1.png` | 1+1 | **Label ≠** | Place ≠ token between 2 adjacent wires of different values | Any time |
| `equipment_2.png` | 2+2 | **Walkie-Talkies** | Swap 1 uncut wire with a teammate | Any time |
| `equipment_3.png` | 3+3 | **Triple Detector** | Dual Cut pointing at 3 wires instead of 1 | Your turn |
| `equipment_4.png` | 4+4 | **Post-It** | Place 1 Info token in front of 1 of your blue wires | Any time |
| `equipment_5.png` | 5+5 | **Super Detector** | Dual Cut pointing at a teammate's whole tile stand | Your turn |
| `equipment_6.png` | 6+6 | **Rewinder** | Move the detonator dial back 1 space | Any time |
| `equipment_7.png` | 7+7 | **Emergency Batteries** | Flip 1-2 used character cards faceup (reuse their ability) | Any time |
| `equipment_8.png` | 8+8 | **General Radar** | Name a value 1-12; everyone says "Yes!" if they hold it | Any time |
| `equipment_9.png` | 9+9 | **Stabilizer** | Activate before Dual Cut — failed cut doesn't advance dial or explode red | Start of turn |
| `equipment_10.png` | 10+10 | **X or Y Ray** | Dual Cut stating 2 values for 1 wire (including yellow) | Your turn |
| `equipment_11.png` | 11+11 | **Coffee Mug** | Skip turn; choose next active player | Your turn |
| `equipment_12.png` | 12+12 | **Label =** | Place = token between 2 adjacent wires of the same value | Any time |
| `equipment_back.png` | — | Card back (screwdriver art) | — | — |

### Double-Lock Equipment (unlocked when all 4 wires of value are cut)

| File | Unlock | Name | Effect | Timing |
|------|--------|------|--------|--------|
| `equipment_22.png` | 2×4 | **Single Wire Label** | Place x1 token on 1 of your blue wires (value appears only once on your stand) | Any time |
| `equipment_33.png` | 3×4 | **Emergency Drop** | Flip all used Equipment cards faceup (reusable this mission) | Instant |
| `equipment_99.png` | 9×4 | **Fast Pass Card** | Solo Cut 2 identical wires even if not the last remaining copies | Your turn |
| `equipment_1010.png` | 10×4 | **Disintegrator** | Draw random Info token; all players cut any wires matching that value | Instant |
| `equipment_1111.png` | 11×4 | **Grappling Hook** | Take a teammate's wire (without revealing it) and add to your hand | Any time |

### Yellow Equipment (unlocked when 2 yellow wires are cut)

| File | Unlock | Name | Effect | Timing |
|------|--------|------|--------|--------|
| `equipment_yellow.png` | Yellow×2 | **False Bottom** | Take 2 Equipment cards and put them into play (may be immediately usable) | Instant |

**Availability:**
- Single-lock (1-12): from **mission 2+** (mission 1 has no equipment)
- Double-lock (22, 33): exact mission varies by mission card
- `equipment_99.png` (Fast Pass): from **mission 9+** (Rule Sticker A era)
- `equipment_1010.png` (Disintegrator): from **mission 9+**
- `equipment_1111.png` (Grappling Hook): from **mission 55+** (Rule Sticker C)
- `equipment_yellow.png` (False Bottom): from **mission 9+** (Rule Sticker A)

**Count:** 12 single-lock + 5 double-lock + 1 yellow + 1 back = **19 files**

---

## Mission Cards

Two-sided cards — front has setup instructions, back has mission rules. Progressive difficulty across 66 missions.

| File | Description |
|------|-------------|
| `mission_1.jpg` .. `mission_66.jpg` | Mission front (setup: wire counts, player requirements, special conditions) |
| `mission_1_back.jpg` .. `mission_66_back.jpg` | Mission back (mission rules: Dual Cut / Solo Cut rules, special mechanics) |

**Difficulty tiers:**
- Missions 1-3: Novice (training)
- Missions 4-7: Intermediate
- Mission 8: Expert
- Missions 9-19: Surprise Box 1 (unlocked after mission 8)
- Missions 20+: Further surprise boxes

**Count:** 66 fronts + 66 backs = **132 files**

---

## Challenge Cards

Red cards that impose special conditions during a mission. Numbered 1-10.

| File | Description |
|------|-------------|
| `challenge_1.png` .. `challenge_10.png` | Individual challenge cards with special rules |
| `challenge_back.png` | Card back — team mascot art (bear, rabbit, mouse in red uniforms) |

Examples:
- **#1:** A player cuts a teammate's wire declaring "It is RED." If wrong, bomb explodes.
- **#5:** 2 bomb disposal experts must consecutively perform Solo Cut.
- **#10:** On a single tile stand, 7+ wires cut but the 2 end wires remain uncut.

**Count:** 10 challenges + 1 back = **11 files**

---

## Constraint Cards

Purple cards that restrict what players can do during a mission. Lettered A-L.

| File | ID | Rule |
|------|----|------|
| `constraint_a.png` | A | You must cut only **EVEN** wires |
| `constraint_b.png` | B | You must cut only **ODD** wires |
| `constraint_c.png` | C | You must cut only wires **1 to 6** |
| `constraint_d.png` | D | You must cut only wires **7 to 12** |
| `constraint_e.png` | E | You must cut only wires **4 to 9** |
| `constraint_f.png` | F | You **CANNOT** cut wires **4 to 9** |
| `constraint_g.png` | G | You **CANNOT** use Equipment cards or your own personal equipment |
| `constraint_h.png` | H | Failed cuts don't place Info tokens; you cannot cut a wire indicated by an Info token |
| `constraint_i.png` | I | You **CANNOT** cut the **far-right wire** (highest number) on teammates' tile stands |
| `constraint_j.png` | J | You **CANNOT** cut the **far-left wire** (lowest number) on teammates' tile stands |
| `constraint_k.png` | K | You **CANNOT** do a Solo Cut action |
| `constraint_l.png` | L | If the cut **FAILS**, advance the detonator dial **2 spaces** (instead of 1) |
| `constraint_back.png` | — | Card back — blindfolded rabbit with wire cutters |

**Count:** 12 constraints + 1 back = **13 files**

---

## Cutter Tiles

Visual reference tiles showing how many wires are needed for a Solo Cut.

| File | Description |
|------|-------------|
| `cutter_a.png` | Wire cutters with **2 wires** — Solo Cut requires 2 remaining copies |
| `cutter_b.png` | Wire cutters with **4 wires** — Solo Cut requires all 4 remaining copies |

**Count:** **2 files**

---

## Number Tiles

Teal numbered tiles used on the game board (likely for validation track or wire value markers).

| File | Description |
|------|-------------|
| `number_1.png` .. `number_12.png` | Number tiles 1-12 (teal background with wire art) |
| `number_back.png` | Number tile back (teal with wire art, no number) |

**Count:** 12 numbers + 1 back = **13 files**

---

## Bunker Card

Two-sided card used in certain missions.

| File | Description |
|------|-------------|
| `bunker_front.png` | Front — split blue/yellow zones with skull, key, helicopter, stairs icons |
| `bunker_back.png` | Back — grey zone with traps, laser beam, and clown icon |

**Count:** **2 files**

---

## Rule Stickers

Sticker instructions applied to the rulebook at campaign milestones, unlocking new content.

| File | Milestone | Unlocks |
|------|-----------|---------|
| `rule_sticker_a.png` | **Mission 9+** | **False Bottom** equipment — shuffled into Equipment pile for missions with yellow wires; available when 2 yellow wires are cut |
| `rule_sticker_b.png` | **Mission 31+** | **4 new characters** (e1-e4) — non-captain players can replace their character card with one of the new ones |
| `rule_sticker_c.png` | **Mission 55+** | **Grappling Hook** equipment — shuffled into Equipment pile; requires all 4 wires of a value cut to unlock |

**Count:** **3 files**

---

## Summary

| Category | Files | Format |
|----------|-------|--------|
| Wire Tiles | 35 | PNG |
| Info Tokens | 19 | PNG |
| Character Cards | 10 | PNG |
| Equipment Cards | 19 | PNG |
| Mission Cards | 132 | JPG |
| Challenge Cards | 11 | PNG |
| Constraint Cards | 13 | PNG |
| Cutter Tiles | 2 | PNG |
| Number Tiles | 13 | PNG |
| Bunker Card | 2 | PNG |
| Rule Stickers | 3 | PNG |
| **Total** | **259** | |
