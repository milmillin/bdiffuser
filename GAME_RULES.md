# Bomb Busters - Complete Rules Reference (from `BombBusters_rules_EN-web.pdf`)

This document is a comprehensive, structured rewrite of the English rulebook PDF (`v1.0`, US edition 2024), intended as an implementation/reference spec.

## Table of Contents

- [Quick Play Summary](#quick-play-summary)
- [Part I: Overview & Components](#part-i-overview--components)
  - [Game Overview](#game-overview)
  - [Components](#components)
  - [Mission Structure and Progression](#mission-structure-and-progression)
  - [Rule Priority](#rule-priority)
- [Part II: Setup](#part-ii-setup)
  - [Setup (Full Sequence)](#setup-full-sequence)
  - [Shared Information and Hidden Information](#shared-information-and-hidden-information)
- [Part III: Gameplay — Actions & Rules](#part-iii-gameplay--actions--rules)
  - [Turn Order and Required Action](#turn-order-and-required-action)
  - [Dual Cut Action](#dual-cut-action)
  - [Solo Cut Action](#solo-cut-action)
  - [Reveal Your Red Wires Action](#reveal-your-red-wires-action)
  - [Yellow Wire Rules](#yellow-wire-rules)
  - [Red Wire Rules](#red-wire-rules)
  - [Validation Tokens](#validation-tokens)
- [Part IV: Equipment & Characters](#part-iv-equipment--characters)
  - [Equipment Cards (Shared Equipment)](#equipment-cards-shared-equipment)
  - [Character Cards (Personal Equipment)](#character-cards-personal-equipment)
- [Part V: End of Mission & Clarifications](#part-v-end-of-mission--clarifications)
  - [End of Mission](#end-of-mission)
  - [Clarifications](#clarifications)
- [Part VI: Mission Cards (1–66)](#part-vi-mission-cards-166)
- [Part VII: Reference Cards](#part-vii-reference-cards)
  - [Constraint Cards](#constraint-cards)
  - [Challenge Cards](#challenge-cards)
- [Rulebook Notes and Non-Gameplay References](#rulebook-notes-and-non-gameplay-references)
- [Source](#source)

---

## Quick Play Summary

Setup summary:

- Choose mission, assign Captain, choose characters.
- Build mission wire pool per mission instructions.
- Deal/sort wires into stand(s).
- Set detonator by player count.
- Set available equipment (count = players) as initially locked.
- Each player places one non-yellow info token on one of their own blue wires.

Turn summary:

- Do exactly one: Dual Cut, Solo Cut, or Reveal Your Red Wires.
- Resolve success/failure fully (cut/reveal, info-token placement, detonator movement, loss checks).

Win/Loss summary:

- Win when all stands are empty.
- Lose on red-triggered explosion or detonator skull/end.

---

## Part I: Overview & Components

### Game Overview

`Bomb Busters` is a fully cooperative game.

- Players: 2-5.
- Team role: each player is a bomb disposal expert.
- Mission goal: defuse the mission bomb together.
- Immediate-loss risks:
  - A red wire is cut in a way that causes explosion.
  - The detonator dial advances to the skull/end space.

The game is mission-based and difficulty increases over missions. Mission cards may introduce additional rules that are not in the base rulebook.

### Components

Core components listed in the rulebook:

- 1 board with detonator dial.
- 70 wire tiles total:
  - 48 blue wires: values `1` to `12`, 4 copies each.
  - 11 red wires: `1.5` to `11.5`.
  - 11 yellow wires: `1.1` to `11.1`.
- 12 equipment cards.
- 5 character cards.
- 8 large mission cards (training progression).
- 26 info tokens (including 2 yellow info tokens).
- 12 validation tokens.
- 7 markers (4 yellow, 3 red).
- 1 `=` token.
- 1 `!=` token.
- 5 tile stands.
- 8 resealable bags.
- 5 surprise boxes (opened later in campaign).
- 1 Bomb Busters standee (used in mission 66).
- 1 rules booklet.

### Mission Structure and Progression

- Training missions are grouped as:
  - Novice: missions 1-3.
  - Intermediate: missions 4-7.
  - Expert: mission 8.
- Missions do not strictly require sequential play, but the rulebook strongly recommends progressing through all of them to learn systems.
- After completing mission 8, open the first surprise box (missions 9-19).

Mission cards are two-sided:

- Front: setup instructions.
- Back: special mission rule(s), which can override or extend base rules.

### Rule Priority

When mission-card special rules conflict with base rules, mission-card instructions take precedence for that mission.

---

## Part II: Setup

### Setup (Full Sequence)

1. Choose a mission card.
2. Choose a Captain:
   - First mission: random.
   - Later missions: Captain passes left each new mission.
3. Character cards:
   - Captain takes the Captain character card.
   - Other players choose a character card and place it face up.
4. Reveal mission information:
   - Captain reads mission card instructions aloud.
   - Place mission card near the board so all players can see special rules.
5. Distribute tile stands by player count:
   - 2 players: Captain 2 stands, other player 2 stands.
   - 3 players: Captain 2 stands, others 1 stand each.
   - 4 players: Captain 1 stand, others 1 each.
   - 5 players: Captain 1 stand, others 1 each.
6. Build mission wire pool:
   - Include blue wires per mission instruction (base note: missions 1-3 may be exceptions).
   - Randomly draw required red and yellow wires specified by mission.
   - Mark board number slots for red/yellow values in play using markers:
     - Known values: marker blank side up (question mark hidden).
     - Partially known values (`1 out of 2`, `1 out of 3`, `2 out of 3`):
       - Reveal candidate wires.
       - Place `?` markers on all candidate values.
       - Randomly include only instructed quantity in the actual wire pool.
       - Set the non-used candidate(s) out of play without revealing which one(s) were excluded.
   - Shuffle all wires in play face down.
7. Deal wires:
   - Deal all wires face down as evenly as possible across stands.
   - Some stands can receive one more tile than others.
8. Build each hand:
   - Each player places dealt wires in stand(s) facing only them.
   - Sort each stand left-to-right in ascending order.
   - If a player has 2 stands, both stands together are a single hand for rules purposes.
9. Board setup:
   - Set detonator dial to the section matching player count.
   - Place available equipment cards:
     - Number of equipment cards equals number of players.
     - Place these cards in the equipment area, initially unusable.
   - Place info tokens and validation tokens in their board supply spaces.
10. Initial info token placement:
   - Starting with Captain and going clockwise, each player places exactly 1 info token.
   - Token must point to one of that player's own blue wires with matching value.
   - Yellow info token cannot be used during setup.
   - A player with 2 stands still places only 1 info token total.

### Shared Information and Hidden Information

- Your own hand: fully known to you.
- Teammates' uncut wires: hidden from you.
- Cut wires: public (face up in front of the corresponding stand).
- Info tokens on stands: public hints.
- Board markers indicate which red/yellow values are known or only possible (`?`) depending on mission setup.

---

## Part III: Gameplay — Actions & Rules

### Turn Order and Required Action

- Turn order is clockwise, starting with the Captain.
- On your turn, you must choose exactly one action:
  - Dual Cut
  - Solo Cut
  - Reveal Your Red Wires

### Dual Cut Action

#### Declaration

The active player:

- Selects a specific teammate wire.
- States a value guess for that wire.
- Must have at least one uncut wire of the announced value in their own hand.

#### Success

If guessed value matches target wire:

- Teammate reveals/cuts that chosen wire (face up, in front of their stand, preserving slot context).
- Active player reveals/cuts one identical wire from their own hand.

#### Failure

If guessed value does not match:

- If target wire is red: immediate explosion -> mission failure.
- If target wire is blue or yellow:
  - Advance detonator dial by 1.
  - If dial reaches skull/end -> mission failure.
  - Teammate places an info token at the targeted wire to reveal true value.

Additional note:

- The active player does not reveal where their intended matching wire was in their own hand on failure.

> **FAQ:** You may intentionally announce an incorrect number during Dual Cut (e.g. to avoid pointing at a red wire or to signal information to teammates), but the announced value must still be one you currently have uncut in your own hand.

### Solo Cut Action

You may perform Solo Cut only when all remaining copies of a value that are still in the game are in your own hand.

- Allowed batch sizes:
  - 4 of a value (full set still uncut), or
  - 2 of a value (when the other pair has already been cut).
- You cut/reveal those matching wire(s) and place them face up in front of your stand.
- No teammate target is needed for Solo Cut.

> **FAQ:** Solo Cut can use wires from both of a player's stands, as long as those are the only remaining copies of that value in the game.

> **FAQ:** You cannot Solo Cut 3-of-a-kind. Wires are always cut as 2 or 4-of-a-kind. If you hold 3 copies, you must wait for one to be cut via Dual Cut first.

### Reveal Your Red Wires Action

This action is legal only if every remaining uncut wire in your hand is red.

- You reveal those red wires face up in front of your stand.

### Yellow Wire Rules

Yellow wires follow special value logic:

- During setup sorting only, yellow wire printed decimals (`x.1`) determine order.
- During gameplay, all yellow wires are treated as one shared value: `YELLOW`.

Cutting yellow wires:

- Dual Cut: active player must state `yellow` when targeting a teammate yellow wire and hold yellow in their own hand.
- Correct yellow call: both yellow wires are cut.
- Incorrect target (when calling yellow):
  - Advance detonator by 1.
  - Place the yellow info token to reveal true value on targeted wire.
- Solo Cut with yellow is allowed only if one player holds all remaining yellow wires still in the game.

### Red Wire Rules

- Red wires represent bomb risk.
- If rules call for red-triggered explosion (for example failed Dual Cut on targeted red), mission immediately fails.
- During gameplay value logic, red wires are treated as shared `RED` category (quick-reference reminder), even though printed decimals are used for setup sorting.

### Validation Tokens

- When all four blue wires of the same number have been cut, place one validation token on that board number.
- This is a public memory aid only (state reminder).

---

## Part IV: Equipment & Characters

### Equipment Cards (Shared Equipment)

#### Availability

- Only the equipment cards selected during setup (count = player count) are available in that mission.
- A card becomes usable once two wires of the card's trigger value have been cut.
- To show activation, slide/reveal the card to show green checkmark state.

#### Usage Limits

- Each equipment card is one-time use.
- After use, flip facedown.
- Most equipment can be used by anyone at almost any time (including outside active turn) unless card text says otherwise.
- Multiple equipment cards can be chained in sequence.

#### Combination Note

- X-ray or Y-ray equipment can be combined with Double/Triple/Super Detector style effects (as noted in rulebook).

#### Standard Equipment Card Reference (1-12)

Card text extracted from equipment cards `1` through `12`:

- Equipment `1` (`Label ≠`)
  - Timing: can be used at any time.
  - Effect: put the ≠ token in front of 2 adjacent wires of different values.
  - 1 of the 2 can already be cut.
  - Reminder: any 2 yellow wires or any 2 red wires are always considered identical. Therefore, they cannot be "different".
- Equipment `2` (`Walkie-Talkies`)
  - Timing: can be used at any time.
  - Effect: swap 2 wires:
    1. Take 1 of your uncut wires and put it facedown in front of a teammate.
    2. That teammate does the same to you.
    3. Each player takes their new wire and places it on their tile stand.
  - If a bomb disposal expert has 2 tile stands, they put the new wire in the stand they took the wire from.
  - Any uncut wire can be swapped (even red/yellow).
  - Everyone sees where swapped wires come from and end up.
  > **FAQ:** If the swapped wire has an info token, the token follows the wire to its new stand. Players cannot communicate or request a specific value during the swap, and cannot direct a 2-stand player which stand to use.
- Equipment `3` (`Triple Detector`)
  - Timing: to use on your turn.
  - Effect: during a Dual Cut action, you can state a value (but not a yellow one) and point to 3 wires on a teammate's tile stand.
  - This equipment works like the "Double Detector," but with 3 wires.
  > **FAQ:** Success means at least one of the 3 wires matches the announced value; the teammate cuts one matching wire without revealing whether multiple matched. Failure means none match; the teammate places an info token on one of the 3 wires (their choice).
- Equipment `4` (`Post-it`)
  - Timing: can be used at any time.
  - Effect: put 1 info token in front of 1 of your blue wires.
- Equipment `5` (`Super Detector`)
  - Timing: to use on your turn.
  - Effect: during a Dual Cut action, you can state a value (but not yellow) and point at your teammate's whole tile stand.
  - This equipment works like the "Double Detector," but with all wires in a tile stand.
  > **FAQ:** Same success/failure rules as Triple Detector: success if at least one wire matches; teammate cuts one matching wire without revealing if multiple match. Failure: teammate places info token on one wire of the stand (their choice).
- Equipment `6` (`Rewinder`)
  - Timing: can be used at any time.
  - Effect: move the detonator dial back 1 space.
- Equipment `7` (`Emergency Batteries`)
  - Timing: can be used at any time.
  - Effect: choose 1 or 2 character cards which have already been used and flip them faceup. Their personal equipment is once again usable this mission.
- Equipment `8` (`General Radar`)
  - Timing: can be used at any time.
  - Effect: state a number between 1 and 12. All bomb disposal experts (including you) say "Yes!" if they have 1 or more uncut blue wires of that value on their stand.
  - If a bomb disposal expert has 2 tile stands, they answer separately for each stand.
  > **FAQ:** Only reveal yes/no, not location or quantity. YELLOW and RED wires have no numeric value — a 7.5 red wire does NOT count as "7".
- Equipment `9` (`Stabilizer`)
  - Timing: to use at the start of your turn.
  - Effect: flip it facedown before a Dual Cut action. During your turn:
    - If the action fails, the detonator dial does not move.
    - If a red wire is cut, the bomb does not explode.
    - If you pointed to a wrong wire, your teammate still puts an info token (number or yellow) in front of their hand.
  > **FAQ:** If the chosen wire is RED, do not place an info token.
- Equipment `10` (`X or Y Ray`)
  - Timing: to use on your turn.
  - Effect: during a Dual Cut action, you can state 2 values when pointing at 1 wire (including yellow wires).
  - You must have both values in your hand.
  > **FAQ:** Success if the wire matches either announced value; both that wire and your matching wire are revealed. The two announced values need not be consecutive.
- Equipment `11` (`Coffee Mug`)
  - Timing: to use on your turn.
  - Effect: skip your turn and choose who the next active bomb disposal expert will be (without consulting teammates).
  - The game then continues clockwise from the chosen bomb disposal expert.
- Equipment `12` (`Label =`)
  - Timing: can be used at any time.
  - Effect: put the = token in front of 2 of your adjacent wires of the same value.
  - 1 of the 2 can already be cut.
  - Any 2 yellow wires or any 2 red wires are considered identical.

#### Additional Equipment Card Assets (Campaign/Later Missions)

Additional card text extracted from later-mission equipment cards:

- Yellow equipment - `False Bottom`
  - Timing: instant effect.
  - Effect: take 2 Equipment cards and put them in the game with the others.
  - Depending on the wire values already cut, it is possible for these cards to be used immediately.
- Equipment `22` (`Single Wire Label`)
  - Timing: can be used at any time.
  - Effect: put a x1 token in front of 1 of your blue wires (either cut or uncut).
  - This shows the indicated value is represented only once on the tile stand (cut wires included).
- Equipment `33` (`Emergency Drop`)
  - Timing: instant effect.
  - Effect: immediately flip all used Equipment cards faceup. They can now be used again during this mission.
- Equipment `99` (`Fast Pass Card`)
  - Timing: to use on your turn.
  - Effect: you can do a Solo Cut action to cut 2 identical wires — even if they are not the last remaining wires of that value.
- Equipment `10-10` (`Disintegrator`)
  - Timing: instant effect.
  - Effect: take a random info token from the supply. Reveal the number (1-12). All bomb disposal experts cut any remaining wires they have matching this value.
- Equipment `11-11` (`Grappling Hook`)
  - Timing: can be used at any time.
  - Effect: point at a teammate's wire, take it without revealing it, and put it in order in your hand.
  - Everyone sees where this wire comes from and ends up.
  > **FAQ:** If the receiving player has 2 stands, they choose which stand to place the wire on.

#### Equipment Back Art

- Equipment back card art has no rules text.

### Character Cards (Personal Equipment)

- Each player's character has one personal equipment power usable once per mission.
- After use, flip character card facedown.

#### Base Characters (1-5)

- Character `1` (Captain): personal equipment is Double Detector.
- Character `2`: personal equipment is Double Detector.
- Character `3`: personal equipment is Double Detector.
- Character `4`: personal equipment is Double Detector.
- Character `5`: personal equipment is Double Detector.

#### New Characters (E1-E4, available from Mission 31+, see Rule Sticker B)

- Character `E1`: personal equipment is General Radar (see Equipment `8`).
- Character `E2`: personal equipment is Walkie-Talkies (see Equipment `2`).
- Character `E3`: personal equipment is Triple Detector (see Equipment `3`).
- Character `E4`: personal equipment is X or Y Ray (see Equipment `10`).

#### Double Detector Rules

- **Double Detector** (once per mission):
  - During Dual Cut, active player declares one value and points to 2 wires in one teammate stand (instead of 1).
  - Success if either pointed wire matches declared value.
    - If both are matches, teammate chooses which of those wires is cut and does not reveal extra detail.
  - Failure if neither matches:
    - Detonator advances 1.
    - Teammate places 1 info token on one of the two pointed wires (teammate chooses).
    - If exactly one of the two pointed wires was red, bomb does not explode from this failure handling; teammate places info token on the non-red wire per rule text.

> **FAQ:** The 2 designated wires need not be adjacent (but logically they often are). Both wires must be on the same stand (cannot span 2 stands of one player). If both designated wires are red, the bomb explodes. If only one is red, the bomb explodes only if the player chooses to reveal the red one; proper play is to place the info token on the non-red wire. You cannot announce YELLOW (or RED) with Double Detector — only values 1-12.

---

## Part V: End of Mission & Clarifications

### End of Mission

Mission success:

- All players' tile stands are empty.

Mission failure:

- Red-wire explosion condition occurs, or
- Detonator reaches skull/end space.

After failure:

- Change Captain and replay/restart mission.

### Clarifications

#### No More Wires

If a player has no wires left:

- Their turns are skipped.
- Remaining players continue clockwise until mission resolves.

#### Communication Limits

Forbidden:

- Talking about your own wire identities.
- Hinting/implying exact values in hand.
- Recounting private remembered wire info from earlier turns.
- Sharing detailed guesses/assumptions aloud about hidden wire identities.

Allowed:

- Discussing general tactics.
- Discussing timing/use of equipment.
- Reminding teammates about available powers or mission special rules.

#### Mistake (Wrong Value Announced)

> **FAQ:** A wrong guess on the teammate's targeted wire is allowed, provided the announced value is one you have uncut in your own hand.
>
> **FAQ:** Announcing a value you do not have in hand is not a legal Dual Cut declaration.

#### Info Token Shortage

> **FAQ:** If the needed info token is unavailable (both copies are in use), take one that is no longer useful (e.g. its wire has already been cut). If none can be repurposed, say the value aloud and point — teammates must remember.

---

## Part VI: Mission Cards (1–66)

Normalization note:

- Card text uses mixed wording ("thread", "wire", "Minesweeper"). This section normalizes terms to `wire` and `player` while preserving rule meaning.

### Mission 1

- Card title: `TRAINING, Day 1` (`Lesson 1: How to cut a wire`)
- Setup:
  - `x24` wires: only use wires numbered `1` to `6`.
  - Do not put equipment cards on the board. None are available for this mission.
  - Default rules for all future missions (these instructions will not be repeated):
    - Set the detonator dial to match the number of players.
    - Each player takes 1 character card. You may use your Double Detector once per game.
    - Starting with the Captain and going clockwise, each player puts 1 info token of their choice in front of their tile stand, pointing to 1 of their blue wires that matches the token's value.
    - Finally, flip over the mission card and place it at the bottom-left corner of the board, where everyone can read the mission rules on the card.
- Mission rule (back):
  - On their turn, a player must cut wires by doing either:
  - **Dual Cut:** Cut 2 matching wires, 1 from a teammate and 1 of their own. First, point to a teammate's wire and state the value (e.g. `"This wire is a 9"`).
    - If correct, the action succeeds: the 2 wire tiles are revealed and placed faceup in front of their respective tile stands, without shifting position left or right.
    - If incorrect, the action fails:
      1. The detonator dial advances 1 space. (If the dial ever reaches the skull, the bomb explodes and the mission ends in failure.)
      2. Their teammate puts 1 info token in front of the chosen wire to show its true value.
      - The active player must never reveal which wire in their hand they planned to cut.
  - **Solo Cut:** The player has all the remaining wires of the same value in their hand, either:
    - Cut all 4 wires of a single value, or
    - If 2 wires of a value have already been cut, the remaining 2 wires of that value.
    - Reveal and place all these wires faceup in front of their tile stands, without shifting position.

### Mission 2

- Card title: `TRAINING, Day 2` (`Lesson 2: How to cut a YELLOW wire`)
- Setup:
  - `x32` wires: numbers `1` to `8` only.
  - `x2` yellow wires: draw two at random using yellow wires from value `1.1` to `7.1`.
  - Do not put equipment cards on the board.
  - Reminder: You cannot use the yellow info token during setup.
- Mission rule (back):
  - On their turn, a player must cut wires by doing either:
  - **Dual Cut:** Cut 2 identical wires (1 from a teammate and 1 of their own).
  - **Solo Cut:** Cut and reveal all the remaining wires of the same value in their hand.
  - **New: Cut Yellow Wires!**
    - Yellow wires are cut the same way as blue wires (Dual Cut or Solo Cut).
    - During cutting, yellow wires are considered to have the same value.
    - To cut a yellow wire, the active player must first have one in their hand, then point to a teammate's wire and state, `"This wire is yellow."` Take the same steps as before, according to whether the action succeeds or fails.
    - Note: If ever a yellow wire is cut by mistake during the game, use a yellow info token to indicate its value.

### Mission 3

- Card title: `TRAINING, Day 3` (`Lesson 3: How (NOT!) to cut a RED wire`)
- Setup:
  - `x40` wires: numbers `1` to `10` only.
  - `x1` red wire: draw 1 at random using red wires from value `1.5` to `9.5`.
  - From this mission forward: randomly deal a number of equipment cards on the board equal to the number of players.
  - If Equipment `2` (Walkies-Talkies) or `12` (Label =) is drawn, discard it and replace it with a new card.
- Mission rule (back):
  - **New: RED Wires.** What happens if you cut a RED wire? The bomb immediately explodes, and the mission ends in failure!
  - **New action: Reveal RED Wires.** If a bomb disposal expert has only RED wires remaining in hand at the start of their turn, they must reveal them. Afterwards, they will not take any more actions that mission, but their teammates continue. This is the only way to reveal RED wires without setting off the bomb.
  - **New: Equipment Cards.**
    - Equipment is not usable at the start of a mission.
    - Cut 2 wires that match the value displayed on an equipment card to bring it into play; slide the card up in its slot to show it is now usable.
    - Equipment can only be used once. After using it, flip the card facedown.
  - Reminder: As soon as you feel ready to pass the test with your team, move on to mission #8!

### Mission 4

- Card title: `TRAINING: First Day in the Field` (`Time to put theory into practice!`)
- Setup:
  - `x48` (all) blue wires.
  - `x1` red wire.
  - `x2` yellow wires.
  - From this mission forward, you will play with all of the blue wires.
  - 2-player override: `x48` blue, `x1` red, `x4` yellow.
- Mission rule (back):
  - This mission utilizes everything you have learned so far. Some things to remember:
    - Equipment becomes usable after first cutting 2 wires that match the value shown on the card.
    - There are 2 yellow wires that must be cut together (or, if playing with 2 players, there are a total of 4, to be cut 2 by 2).
    - There is 1 red wire that must be avoided and not cut during the mission. It must be revealed only when it is the last wire left in a player's hand.
  - Reminder: As soon as you feel ready to pass the test with your team, move on to mission #8!

### Mission 5

- Card title: `TRAINING: Second Day in the Field` (`This is a minefield, not the yellow brick road...`)
- Setup:
  - `x1` red wire.
  - `x2 out of 3` yellow wires.
  - Before dealing tiles:
    - Randomly draw 3 yellow wire tiles.
    - In the 3 board spaces matching the values shown on the yellow wire tiles, put the 3 yellow markers with the question mark (`?`) side faceup.
    - Shuffle the 3 yellow wire tiles facedown, add 2 of them facedown to the pile of blue tiles, then place the third yellow tile out of play, without revealing it.
  - 2-player override: `x2` red, `x2 out of 3` yellow.
- Mission rule (back):
  - **New: "2 out of 3".** 2 yellow wires have to be cut together, but those 2 wires could have 3 possible values.
  - Reminder: As soon as you feel ready to pass the test with your team, move on to mission #8!

### Mission 6

- Card title: `TRAINING: Third Day in the Field` (`What is bold, yellow, and ready for a new action? 4 YELLOW wires that must be cut!`)
- Setup:
  - `x1` red wire.
  - `x4` yellow wires.
  - 2-player override: `x2` red, `x4` yellow.
- Mission rule (back):
  - **New: 4 Yellow Wires.** The 4 yellow wires are considered to be of the value "yellow." Therefore, they can be cut like any other 4 wires of matching value:
    - Most often, they will be cut 2 at a time by doing a Dual Cut.
    - Occasionally, they can be cut by doing a Solo Cut, but only if a player has all remaining yellow wires in play — either all 4 yellow, or the last 2 yellow after the first 2 have already been cut.
  - Reminder: As soon as you feel ready to pass the test with your team, move on to mission #8!

### Mission 7

- Card title: `TRAINING: Last Day of Class` (`Looks like you're seeing double! Are you RED-y?`)
- Setup:
  - `x1 out of 2` red wire.
  - Before dealing tiles:
    - Draw 2 red wire tiles at random.
    - In the 2 board spaces matching the values shown on the red wire tiles, put the 2 red markers with the question mark (`?`) side faceup.
    - Shuffle the 2 red wire tiles facedown, add 1 of them to the pile of blue tiles and place the remaining red tile out of play, without revealing either.
  - 2-player override: `x1 out of 3` red.
- Mission rule (back):
  - **New: "1 out of 2".** There is only one red wire in play, but that wire could have 2 possible values (or 3 possible values with 2 players).

### Mission 8

- Card title: `FINAL EXAM` (`Today is the big day! Your extensive bomb disposal training missions have led you here. Are you ready to face the fuse and pass the Final Exam?`)
- Setup:
  - `x1 out of 2` red wire.
  - `x2 out of 3` yellow wires.
  - 2-player override: `x1 out of 3` red, `x4` yellow.
- Mission rule (back):
  - No special rules: apply everything you have learned so far, and good luck!
  - Failure: Luckily, it was a fake bomb...study some more and retake the test!
  - Success: Well done! You are now official members of the BOMB BUSTERS brigade! Open the box titled "Missions 9-19."

Baseline assumption used in this section:

- Where a front card does not redefine blue wire count, it continues to use all `48` blue wires from mission 4 onward.

### Mission 9

- Card title: `A Sense of Priorities` (`Today's bomb comes with unusual instructions: a formidable mad scientist has tinkered with the device, and several of its wires must be cut in a specific order. Just remember your training and everything will be OK!`)
- Setup:
  - `x1` red wire.
  - `x2` yellow wires.
  - Shuffle the Number cards, draw 3 of them, and set them faceup in a line on the table. Place the Sequence card (side A) above the leftmost card.
  - 2-player override: `x2` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Some of the wires must be cut in order:
    - You cannot cut any **b** wires until you have cut at least 2 **a** wires.
    - You cannot cut **c** wires until you have cut at least 2 **a** wires and 2 **b** wires.
    - The rest of the wires (all except those on the three Number cards) may be cut in any order.
  - Once 2 **a** wires have been cut, flip the **a** card facedown and shift the Sequence card to the next Number card. Do the same after 2 **b** wires have been cut.

> **FAQ:** If a player only has sequence-blocked wires left (i.e. they can only cut values that are not yet unlocked), the bomb explodes.

### Mission 10

- Card title: `A Rough Patch` (`Another exciting day in the life of a bomb disposal expert. Unfortunately, today's going to be tough—someone forgot to pick up coffee and now everyone's feeling the pressure. Keep up the team spirit, work together, and then remember to buy coffee before the next mission!`)
- Setup:
  - `x1` red wire.
  - `x4` yellow wires.
  - Prepare a 15-minute timer.
  - If Equipment `11` (Coffee Mug) is drawn, discard it and replace it with a new card.
  - 2-player override: 12 min.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Once setup is complete, start the timer: you must defuse the bomb before time runs out!
  - For this mission, you do not play in clockwise order. Instead, you may take turns in any order you like. Once a bomb disposal expert says `"Snip!"`, they become the active player and take a turn.
  - Important: Wait until the end of the active player's turn before saying `"Snip!"` Don't panic, you are all on the same team!
  - Note: the same bomb disposal expert cannot take 2 consecutive turns in a row (except when playing with 2 players).

> **FAQ:** The same player cannot play several rounds in a row, except in 2-player games or when they are the last player with wires remaining.

### Mission 11

- Card title: `Blue on Red, Looks Like We Are Dead` (`"You're asking me to cut the blue wire, Captain, but remember: I'm colorblind."`)
- Setup:
  - `x2` yellow wires.
  - Draw a random Number card and set it faceup on the back of this mission card.
  - 2-player override: `x4` yellow. During setup, the Captain does not put an info token in front of their tile stand.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Treat the 4 wires matching the value of the Number card below like RED wires:
    - Cutting a wire with this value will detonate the bomb, ending the mission in failure.
    - To reveal these wires on your turn, they must be the only wire or wires remaining in your hand. (This is the exact same process as when revealing red wires.)

### Mission 12

- Card title: `Wrapped in Red Tape` (`"A 27BStroke6 form? Never heard of it. Uh oh, what do you mean we can't check out any bomb disposal equipment without that form? What do we do now?!"`)
- Setup:
  - `x1` red wire.
  - `x4` yellow wires.
  - Place 1 Number card faceup on each Equipment card in play. Be sure to leave the equipment numbers visible along the top edge.
  - 2-player override: `x2` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - For an Equipment card to become usable, you must cut two pairs of wires: in addition to cutting the 2 wires whose value is shown on the Equipment card itself, you must also cut 2 wires whose value matches the faceup Number card placed on it.
  - After cutting a pair of wires matching a faceup Number card that covers an Equipment card, discard that Number card.

> **FAQ:** Cutting 2 wires of a value unlocks BOTH the corresponding equipment card AND the corresponding Number card lock (if any). Both conditions are checked simultaneously.

### Mission 13

- Card title: `Red Alert!` (`The formidable mad scientist strikes again! Ever since you foiled his earlier plans, he's been seeing red...so much so that his latest destructive device is stuffed with a total of 3 RED wires. RED ALERT!`)
- Setup:
  - `x3` red wires.
  - Do not shuffle the 3 red wires with the other wires. Deal one to each player facedown, starting with the Captain and continuing clockwise. (With 2 bomb disposal experts, the Captain receives 2 and puts 1 on each tile stand.) Then, deal out blue wires as usual.
  - Instead of choosing their info token, everyone takes 1 at random and places it in front of their tile stand pointing at a matching tile, as usual. If they don't have a wire matching the value of the token, set it faceup next to their hand. If a yellow info token is drawn, return it to the supply and draw a replacement info token.
  - 2-player override: during setup, the Captain does not put an info token in front of their tile stand.
- Mission rule (back):
  - On their turn, a bomb disposal expert can do a new action:
  - **Special action for this mission:** Cut the 3 red wires at the same time. The bomb disposal expert must indicate the 3 red wires among all the wires that have not been cut yet.
    - If at least 1 of the wires is not red: the bomb explodes!
    - With 4-5 bomb disposal experts, the action is possible even for a bomb disposal expert with no red wires in hand.
    - Note: If a bomb disposal expert has only red wires in their hand, they must perform this special action, and cannot take a Reveal Red Wires action.

> **FAQ:** You cannot use Equipment or Personal Equipment to cut RED wires in this mission. RED and YELLOW wires have no numeric value, so detectors (Double Detector, Triple Detector, Super Detector) cannot target them.

### Mission 14

- Card title: `High-Risk Bomb Disposal Expert (aka. NOOB)` (`We all remember having sweaty palms during our first mission: it was a real challenge. So let's make sure to help the rookie. If possible, leave the easy cuts to them...as always, the slightest error could prove fatal!`)
- Setup:
  - `x2` red wires.
  - `x2 out of 3` yellow wires.
  - Shuffle the character cards facedown and deal 1 to each player. Everyone reveals their card. The player with the Captain card will be referred to as "the rookie" during this mission.
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - If the rookie fails when attempting a Dual Cut action, the bomb immediately explodes.
  - Note: The rookie cannot use Equipment `9` (Stabilizer).

### Mission 15

- Card title: `Mission in НОВОСИБИРСК` (`(Don't worry, we can't pronounce it either...) Due to a shipping mixup, these new tool boxes are labeled in Russian (which is terrible because we all learned either French or Spanish in High School). Get ready to be surprised every time you grab a tool!`)
- Setup:
  - `x1 out of 3` red wire.
  - Shuffle and draw the standard number of Equipment cards, but set them facedown on the board, without looking at them.
  - Shuffle and put the deck of 12 Number cards facedown next to the board, then flip over the top card.
  - 2-player override: `x2 out of 3` red.
- Mission rule (back):
  - When all 4 wires matching the visible Number card have been cut, flip over 1 Equipment card. It is immediately usable regardless of its number, so slide it up. Then flip over the next Number card, etc.
  - If a Number card is ever revealed but the 4 matching wires have already been cut, discard and replace that Number card (without gaining any equipment).

### Mission 16

- Card title: `Time to Reprioritize (Is this déjà vu?)` (`Days blur into the next, and sometimes it feels like living in the moment...but it's the same exact moment. Do we blame it on science or a certain mad scientist?`)
- Setup:
  - `x1` red wire.
  - `x2 out of 3` yellow wires.
  - Shuffle the Number cards, draw 3 of them, and put them faceup in a line on the table. Put the Sequence card (side B) above the leftmost card.
  - 2-player override: `x2` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Some of the wires must be cut in order:
    - You cannot cut the **b** wires until you have cut all 4 **a** wires.
    - You cannot cut the **c** wires until you have cut all 4 **a** wires and all 4 **b** wires.
    - The rest of the wires (all except those on the three Number cards) may be cut in any order.
  - Once all 4 **a** wires have been cut, flip the **a** card facedown and shift the Sequence card to the next Number card. Do the same after all 4 **b** wires have been cut.

### Mission 17

- Card title: `Rhett Herrings` (`The truth? You can't handle the truth!`)
- Setup:
  - `x2 out of 3` red wires.
  - Shuffle the character cards and deal 1 facedown to each player. Each player reveals their card. The player with the Captain card will be referred to as "Rhett Herrings" during this mission.
  - Instead of putting 1 info token in front of their hand at the start of the mission, Rhett Herrings will choose and place 2. These info tokens must be fake, meaning the two token values must not match the 2 wires they point to. They also cannot be placed in front of a red wire.
  - 2-player override: `x3` red.
- Mission rule (back):
  - All of Rhett Herrings' info tokens in this mission are fake. When they put an info token in front of their hand, it means "this wire does not match this value."
  - When a Dual Cut in Rhett's hand is a failure, Rhett places an info token matching the stated value in front of the chosen wire (which, of course, is false information because the stated value did not result in a successful cut).
  - Rhett cannot use Equipment cards, but can participate in the effects of Equipment `2` (Walkies-Talkies) and `8` (General Radar).

### Mission 18

- Card title: `BAT-Helping-Hand` (`For this mission, there is no Equipment! Luckily our favorite vigilante and cowled crusader has loaned us his hi-tech BAT-RADAR.`)
- Setup:
  - `x2` red wires.
  - Shuffle and put the deck of 12 Number cards facedown.
  - Put Equipment `8` (General Radar) faceup on the board, but do not put any other Equipment cards on the board.
  - During setup, do not put any info tokens in front of tile stands.
  - 2-player override: `x3` red.
- Mission rule (back):
  - For this mission, the General Radar is always usable. On their turn, the active bomb disposal expert:
    1. Reveals the top Number card of the deck.
    2. Uses Equipment `8` (General Radar) on the value of the Number card.
    3. Indicates who (including themselves) must carry out a cut action with this value's wires.
  - When the deck is empty, shuffle the Number cards to create a new deck.
  - A Number card is discarded as soon as the 4 corresponding wires have been cut.
  - If a bomb disposal expert has only red wires in their hand at the beginning of their turn, they must do the Reveal Red Wires action.
  - Reminder: As with all missions, players cannot ask about what responses were given for the radar in previous rounds, so make sure you pay attention!

> **FAQ:** The active player designates only WHO cuts, not which wire or which stand. The next turn goes to the player on the active player's left (not the designated player's left).

### Mission 19

- Card title: `In the Belly of the Beast` (`After tremendous effort, you have tracked the mad scientist to his secret base of operations—a remote and ominous cave where he has concocted all of his devious plans. There's no telling what you will find inside, but there is only one way to find out...`)
- Setup:
  - `x1` red wire.
  - `x2 out of 3` yellow wires.
  - Mobile device/app required for sound file.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - You stand at the cave entrance, prepared to meet your fate. Play the sound file Mission 19.
  - Failure: But wait! Maybe there's another grotto on the horizon? Play the sound file again and don't make the same mistakes twice!
  - Success: Great job! After defusing the bomb, you locate a safe filled with stacks of formulae and secret plans and the authorities are already hot on his tail. New adventures await your team of bomb disposal experts — open the "Missions 20-30" box.

### Mission 20

- Card title: `The Big Bad Wolf` (`The latest reports reveal that a new serial bomber has appeared, with a nefarious nickname; but who's afraid of The Big Bad Wolf? Not you! Not you!`)
- Setup:
  - `x2` red wires.
  - `x2` yellow wires.
  - The last wire dealt to each tile stand is not sorted in ascending order, but is put on the far right end of the stand (regardless of its value). Put an X token in front to indicate this wire.
  - If Equipment `2` (Walkies-Talkies) is drawn, discard it and replace it with a new card.
  - 2-player override: `x2 out of 3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - There are no special rules: play as usual, and remember that X tokens point to wires that are not in order.
  - Use of equipment:
    - Equipment cards cannot be used on X wires.
    - X wires ignore all equipment, even personal equipment, Super Detector (`5`) and General Radar (`8`).

### Mission 21

- Card title: `Death by Haggis` (`The term "Flavor Bomb" has taken on a new meaning. For the first time in recorded history, we have a bomb hidden in a haggis! The dish might be a bit odd, but keep an even keel and everyone will make it out in one piece.`)
- Setup:
  - `x1 out of 2` red wire.
  - Replace all info tokens with even/odd tokens. (Return info tokens to the box.)
  - During setup, instead of putting an info token in front of the tile stand, put 1 even/odd token. The information you're sharing is no longer the wire number, but whether the wire is odd or even.
  - 2-player override: `x2` red.
- Mission rule (back):
  - For the whole mission, always use even/odd tokens instead of info tokens (1-12). This applies during setup, when an action fails, and with Equipment `4` (Post-it).

### Mission 22

- Card title: `Negative Impressions` (`"Once you eliminate the impossible, whatever remains, no matter how improbable, must be the truth." —Sherlock Holmes`)
- Setup:
  - `x1` red wire.
  - `x4` yellow wires.
  - Instead of choosing an info token as usual, each player takes 2 tokens of values they do not have in their hand and puts them next to their tile stand.
  - Taking a yellow token is allowed.
  - The bomb disposal experts with 2 tile stands choose and put 2 tokens: 1 beside each tile stand.
  - If a bomb disposal expert has fewer than 2 values missing from their hand, they place fewer tokens (either 1 or 0).
  - 2-player override: `x3` red.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - As soon as the first 2 yellow wires are cut, each bomb disposal expert (starting with the Captain and going clockwise) chooses 1 info token from the board and gives it to the player on their left. Each player puts the token they received in front of their hand correctly (or, if they do not have a wire matching that value, puts the token next to their tile stand).

### Mission 23

- Card title: `Defusing in Fordwich` (`(381 inhabitants, 64 miles from London) Not all dangerous missions take place in major cities. This time, you have traveled to the beautiful burgh of Fordwich, Britain's smallest town. Unfortunately, the airline lost your luggage but there's no time to waste—get to work immediately...without your equipment!`)
- Setup:
  - `x1 out of 3` red wire.
  - Do not take any Equipment cards during setup, but instead create a deck of 7 random Equipment cards and place it facedown on the board.
  - Select a Number card at random and place it faceup next to the mission card.
  - 2-player override: `x2 out of 3` red.
- Mission rule (back):
  - The 4 wires whose value matches the faceup Number card must be cut at the same time.
  - **Special action for this mission:** Identify all 4 wires matching the Number card value (without using equipment or the Double Detector).
    - If the action succeeds, the wires are cut.
    - If the action does not succeed, the bomb explodes!
  - If this mission's special action has not yet been accomplished successfully: at the end of each round (before the Captain's turn) discard the top card of the equipment deck.
  - Once the special action has been done: all cards remaining in the Equipment deck are placed faceup on the board, and all are immediately usable (no matter which wires still need to be cut).

### Mission 24

- Card title: `Tally Ho!` (`We are counting on you to carefully count the wires. Hurry! The final countdown is coming soon...`)
- Setup:
  - `x2` red wires.
  - Replace the info tokens with the x1, x2, x3, and x4 tokens. These tokens will be used for this entire mission (setup and during the game).
  - These tokens show that the indicated value is present once, twice, three, or four times on that tile stand (including any already cut wires). The x2, x3, and x4 can be placed on any wire of that value.
  - These tokens cannot be placed in front of red wires.
  - 2-player override: `x3` red.
- Mission rule (back):
  - For the whole mission, always use x1, x2, x3, x4 tokens instead of info tokens (1-12). This applies during setup, when an action fails, and with Equipment `4` (Post-it).
  - With Equipment `4` (Post-it), a token can be placed in front of a cut wire.

> **FAQ:** If Walkie-Talkies (Equipment `2`) are used on a wire that has an x1/x2/x3/x4 info token, that token is discarded.

### Mission 25

- Card title: `The Better to Hear You with...` (`Large ears or not, you know the Big Bad Wolf is always listening—anything you say aloud may prove fatal during this mission. Shhhh! You have been warned...`)
- Setup:
  - `x2` red wires.
  - 2-player override: `x3` red.
- Mission rule (back):
  - Bomb disposal experts cannot speak or say a wire number aloud. Instead, they must imply it in creative ways, including: spelling it, making noises, holding up a number of fingers, saying "the number of days in a week," acting out charades, etc.
  - If a bomb disposal expert forgets this rule and says a number aloud, the detonator advances 1 space! Watch your tongue!

### Mission 26

- Card title: `Speaking of the Wolf...` (`You have captured the attention of the Big Bad Wolf, which means you are in trouble! His latest challenge is unlike any you have faced yet. It will take expert teamwork if you hope to survive this mission...`)
- Setup:
  - `x2` red wires.
  - Put all the Number cards faceup on the table (cards 1 through 12).
  - If Equipment `10` (X-or-Y Ray) is drawn, discard it and replace it with a new card.
  - 2-player override: `x3` red.
- Mission rule (back):
  - On their turn, a bomb disposal expert must first flip 1 of the remaining faceup Number cards of their choice. Then they must do a cut (Dual Cut or Solo Cut) on wires matching that number.
  - As the mission progresses, each expert will have fewer options as more Number cards get flipped facedown.
  - If, on their turn, no numbers are visible, flip all Number cards faceup and continue.
  - When all 4 wires of a number have been cut, remove the matching Number card from the game.
  - If an active bomb disposal expert has no wires in hand matching the remaining visible numbers, they skip their turn, but the detonator dial does not advance. Otherwise, they must do an action to cut wires matching a visible number.

### Mission 27

- Card title: `Playing with Wire` (`This gray putty is a modelling material known as plasticine in certain parts of the world. But this is no time for word games—because whatever these wires are connected to is highly explosive!`)
- Setup:
  - `x1` red wire.
  - `x4` yellow wires.
  - Deal the character cards as usual to determine the Captain, then flip all the character cards over — there are no Double Detectors available this mission!
  - If Equipment `7` (Emergency Batteries) is drawn, discard it and replace it with a new card.
  - 2-player override: during setup, the Captain does not put an info token in front of their tile stand.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - As soon as the first 2 yellow wires are cut:
    1. Randomly take the same number of info tokens as there are bomb disposal experts and put them faceup in a line.
    2. Starting first with the Captain then continuing clockwise, each bomb disposal expert chooses 1 of these tokens and puts it in front of their hand correctly (or, if they do not have a wire matching that value, sets the token next to their tile stand, faceup and visible).

### Mission 28

- Card title: `Captain Careless` (`Captain Careless is not the sharpest tool in the shed. They forgot their tools at home and—YES, actually left them sitting by the door at home—and, if they make even the slightest mistake: it's game over, man!`)
- Setup:
  - `x2` red wires.
  - `x4` yellow wires.
  - After the character cards have been dealt, the Captain (who all players must refer to as "Captain Careless" during this mission) returns their character card to the box. Captain Careless does not have their Double Detector. (It's at home, remember?)
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Captain Careless cannot use any available Equipment cards or personal equipment.
  - If Captain Careless does a Dual Cut that fails, the bomb immediately explodes.
  - Captain Careless can participate in the effects of Equipment `2` (Walkies-Talkies) and `8` (General Radar).

### Mission 29

- Card title: `Guessing Game` (`Pay attention: it's time for some proper prognostication!`)
- Setup:
  - `x3` red wires.
  - Shuffle and deal 2 Number cards facedown to each player (3 cards to the player on the Captain's right), then put the rest facedown in a deck on the table. Each player picks up their cards discreetly.
  - 2-player override: during setup, the Captain does not put an info token in front of their tile stand.
- Mission rule (back):
  - At the start of a player's turn:
    1. The player to the right of the active bomb disposal expert puts 1 of their Number cards facedown on the table.
    2. The active bomb disposal expert plays their turn as usual.
    3. Next, the facedown Number card is revealed. If the active bomb disposal expert had just cut wires matching this value, the detonator dial advances 1 space.
    4. The active bomb disposal expert picks up the revealed Number card.
  - As soon as 4 wires of the same value have been cut, the matching Number card is discarded.
  - As soon as a player has only 1 card left, they draw 1 card at a time from the deck until they draw a card with a number whose wires have not already been cut.
  - When only 1 value is left to cut, the last Number card is immediately discarded.

> **FAQ:** Multiple clarifications for Mission 29:
> - Detector multi-wire (e.g. Triple Detector): only the wire actually cut can trigger the detonator advance from the Number card — other designated wires do not count.
> - If a player's hand is empty (no wires), they place their Number cards face down under the draw pile.
> - If the right-hand neighbor has no Number cards, the next player to the right plays a Number card instead.
> - Coffee Thermos (Equipment `11`): skip step 2 (the Number card reveal), take the Number card, and if selecting your left neighbor as next player, that neighbor plays a Number card for their turn.

### Mission 30

- Card title: `Speed Mission!` (`The Big Bad Wolf is back and is as dangerous as ever. Buckle up—he has a fast and furious mission for you!`)
- Setup:
  - `x1 out of 2` red wire.
  - `x4` yellow wires.
  - Shuffle the 12 Number cards facedown and create a deck by placing it near the board.
  - Mobile device/app required for sound file.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
- Mission rule (back):
  - Before the first turn, play the sound file Mission 30.
  - Failure: Boom! You have earned a free second chance. Play the sound clip again and speed up!
  - Success: Congratulations! The police caught up to the Big Bad Wolf and arrested him, with enough evidence to lock him away for many years — he won't be blowing down walls any time soon. Your adventure continues: open the "Missions 31-42" box!

### Mission 31

- Card title: `With One Hand Tied Behind My Back...` (`Some constraints we choose, others we don't...but eventually, we break free from limitations and reach our true potential!`)
- Setup:
  - `x2 out of 3` red wires.
  - Put the 5 Constraint cards A to E faceup on the table. Before taking info tokens, starting with the Captain and going clockwise, each player chooses 1 card and puts it faceup in front of them.
  - With fewer than 5 bomb disposal experts, the extra Constraint cards are discarded.
  - 2-player override: we advise against choosing both A+B or both C+D.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - Each player must apply their constraint.
  - When a bomb disposal expert cannot apply their constraint at the start of their turn, they flip the card facedown and continue playing as usual for the rest of the game.

> **FAQ:** Once a constraint card is flipped, the player plays normally even if they later recover a matching wire via Walkie-Talkies (Equipment `2`).

### Mission 32

- Card title: `Pranks-A-Plenty` (`You have met some bad apples in your time, but this creepy Clown has got to be the scariest. It's enough to make you coulrophobic (look it up)! But the joke's on you—either adapt to his confounding logic every round or BOOM.`)
- Setup:
  - `x2` red wires.
  - Shuffle the 12 Constraint cards facedown and create a deck by placing it near the board. Then, flip the top card faceup.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - All the bomb disposal experts must apply the visible constraint.
  - At the start of each player's turn, the Captain can, after consulting with the other bomb disposal experts, replace the visible Constraint card with a new card from the top of the deck.
  - If an active bomb disposal expert cannot play due to the constraint, they say so and skip their turn (the detonator dial does not advance).
  - The constraints do not apply to the Reveal Your Red Wires action.

> **FAQ:** If the Restraint card pile is empty, players continue without any restraint.

### Mission 33

- Card title: `What Happens in Vegas...` (`One clown is never enough—now G. Clowney and his 11 friends have attached a bomb to the casino safe! Will this be Game On or Game Over?`)
- Setup:
  - `x2 out of 3` red wires.
  - Replace all info tokens with even/odd tokens. (Return info tokens to the box.)
  - During setup, instead of putting an info token in front of the tile stand, put 1 even/odd token. The information you're sharing is no longer the wire number, but whether the wire is odd or even.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - For the whole mission, always use even/odd tokens instead of info tokens (1-12). This applies during setup, when an action fails, you make a mistake, and with Equipment `4` (Post-it).

### Mission 34

- Card title: `The Weakest Link` (`If you follow the chain of command, you will eventually find it, but how can you tell? It could even be you!`)
- Setup:
  - `x1` red wire.
  - Once you've decided who has the role of Captain, shuffle the character cards (making sure the Captain card is included), and deal 1 to each player facedown. Thus, the first player will not necessarily end up with the "Captain" card.
  - Shuffle Constraint cards A to E and deal 1 facedown to each player. Do not look at any remaining cards.
  - Each bomb disposal expert secretly looks at their 2 cards. Whoever holds the "Captain" card is now the weakest link, but they must not let anyone know. Instead, only the weakest link must apply their constraint (the other players will examine their cards but will not apply their constraints).
  - 2-player override: MISSION IMPOSSIBLE! This mission cannot be played with only 2 bomb disposal experts.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - While character cards are hidden, the bomb disposal experts have no personal equipment.
  - **The weakest link:**
    - Must apply their Constraint card every turn without discussing or revealing it.
    - If they cannot play on their turn because of the constraint:
      - The detonator dial advances 2 spaces.
      - All bomb disposal experts discard their Constraint and character cards.
  - **The other bomb disposal experts:**
    - Play as usual, ignoring their Constraint card.
    - At the start of their turn, they can point out the weakest link and guess their constraint card by describing it (without consulting the others):
      - If their guess is wrong (either about the identity of the weakest link and/or the constraint): the detonator dial advances 1 space.
      - If their guess is right (about both the identity and the constraint): all character cards are flipped faceup and all Constraint cards are discarded. The game continues and all personal equipment is immediately usable.

### Mission 35

- Card title: `No Link, Single Wire` (`This lonely wire is hardwired!`)
- Setup:
  - `x2 out of 3` red wires.
  - `x4` yellow wires.
  - Before shuffling the red and yellow wires into the blue wires, give each bomb disposal expert 1 blue wire facedown per tile stand. This wire is not sorted in ascending order, but is put on the far right end of the stand (regardless of its value). Put a token X in front to indicate this wire. You can then shuffle the other wires and deal them as usual.
  - If Equipment `2` (Walkies-Talkies) is drawn, discard it and replace it with a new card.
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The wires indicated by the X tokens can be cut in the normal way (by a Dual or Solo Cut), but only after all 4 yellow wires have been cut.
  - Use of equipment:
    - Equipment cards cannot be used on X wires.
    - X wires ignore all equipment, including personal equipment, Super Detector (`5`) and General Radar (`8`).

### Mission 36

- Card title: `Panic under the Palm Trees` (`Welcome to Bora Bora. It's paradise...but not today! Today there will be no cannonballing into the pool...`)
- Setup:
  - `x1 out of 3` red wire.
  - `x2` yellow wires.
  - Shuffle the Number cards and deal 5 of them to the table in a faceup line. Do not reorder them.
  - The Captain chooses (without consulting) to put the Sequence card (side A) at either end, with the arrow pointing toward the line.
  - 2-player override: `x2 out of 3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - Wires with values matching any visible Number cards must be cut in the order shown by the arrow on the Sequence card. Each time a bomb disposal expert cuts 2 wires of the number adjacent to the Sequence card, they remove this Number card and can choose (without consulting the others) to put the Sequence card at either end of the line of cards.
  - Wires with values not matching the visible Number cards can be cut at any time.

### Mission 37

- Card title: `Joker's Gone Wild` (`He is either screwy or has a loose wire—every time you make progress, he moves the goalposts! This clown is really getting on your nerves.`)
- Setup:
  - `x2` red wires.
  - Shuffle the 12 Constraint cards facedown and create a deck by placing it near the board. Flip the first card faceup.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - All the bomb disposal experts must apply the visible constraint on their turn.
  - Each time 4 wires of a value have been cut, replace the visible Constraint card with the top card of the deck.
  - If an active bomb disposal expert cannot play due to the constraint, they say so and skip their turn (the detonator dial does not advance). But, if none of the bomb disposal experts can play during a whole round, the detonator dial advances 1 space, and the constraint is replaced.
  - Once the deck is empty, there are no more constraints used during the mission.
  - The constraints do not apply to the Reveal Your Red Wires action.

### Mission 38

- Card title: `Knit a Wire, Purl a Wire...` (`The Captain has a special mission and nobody else can help. One special wire will need a crafty Captain's touch!`)
- Setup:
  - `x2` red wires.
  - When wires are dealt, the Captain flips 1 of their wires around without looking at it, and places it at the far right end of their tile stand. (Its value will face their teammates, and it will likely be out of order.)
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The Captain is the only bomb disposal expert who can cut the flipped-around wire. They must cut it themselves using a regular cut action, but without using equipment or a Double Detector. If that cut action fails, the bomb explodes.
  - No other bomb disposal expert can cut the Captain's flipped-around wire. If a bomb disposal expert has no other possibilities than to cut the Captain's flipped-around wire, they must skip their turn and the detonator moves forward a space.

> **FAQ:** If the Captain's upside-down wire is RED, they reveal it when all their remaining uncut wires are RED (via the normal "Reveal Your Red Wires" action).

### Mission 39

- Card title: `The 4 Noble Wires` (`According to Dr. Strangewire, cutting the correct 4 wires at just the right time will reveal invaluable information!`)
- Setup:
  - `x2 out of 3` red wires.
  - `x4` yellow wires.
  - Do not put the Equipment cards on the board.
  - Put any Number card faceup on the first "equipment space" on the board.
  - Randomly take 8 Number cards facedown and create a deck by placing it near the board.
  - Instead of choosing their info token, everyone takes 1 at random and puts it in a correct place in front of their tile stand (or, if they don't have a wire matching the value of the info token, put it beside their hand). If a yellow info token is drawn, return it to the supply and draw a replacement info token.
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The 4 wires whose value matches the faceup Number card must be cut at the same time.
  - **Special action for this mission:** Indicate and cut the 4 wires matching the Number card value (without using personal equipment), even if you don't have any of these wires in your hand. If you fail, the bomb will explode!
  - Until this mission's special action has been done, at the end of each round, before the Captain's turn, discard the top card of the Number deck.
  - After the special action has been done, equally deal all remaining Number cards left in the deck facedown among the bomb disposal experts, starting with the Captain and going clockwise. Then, each bomb disposal expert puts 1 info token matching a value from Number cards they received near their tile stand. If they have no more info tokens of this value, they ignore it.

> **FAQ:** If a player is dealt a Number card for a value not in their hand or no longer in the game, ignore it (no info token placed).

### Mission 40

- Card title: `Hard to Die (A Christmas Tale)` (`You visited Fox Plaza tower to celebrate with the team for Christmas...but things have gotten out of control. It's hard to communicate when you are stuck in an air duct trying to defuse a hostage taker's bomb. Welcome to the party, pal!`)
- Setup:
  - `x3` red wires.
  - Replace the info tokens with the x1, x2, x3, and x4 tokens. (Return info tokens to the box.)
  - During setup, instead of putting an info token in front of the tile stand, put a x1, x2, x3, or x4 token.
  - These tokens show that the indicated value is present once, twice, three, or four times on that tile stand (including any already cut wires). The x2, x3, and x4 can be placed on any wire of that value.
  - 2-player override: during setup, the Captain does not put an info token in front of their tile stand.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - For the whole mission, always use x1, x2, x3, x4 tokens instead of info tokens (1-12). This applies during setup, when an action fails, and with Equipment `4` (Post-it).
  - With Equipment `4` (Post-it), a token can be placed in front of a cut wire.

### Mission 41

- Card title: `Latin Bombshell` (`"Para bailar la Bamba...", which means "Shoot, another bomb" in Spanish (well, not really...something is always lost in translation). This bomb is a hot one, so keep a cool head!`)
- Setup:
  - `x1 out of 3` red wire.
  - Yellow wires: number equal to player count (max 4).
  - Do not shuffle the yellow wires with the other wires. They are tripwires: deal 1 facedown to each bomb disposal expert. (With 5 bomb disposal experts, do not give a yellow wire to the Captain.)
  - Set the detonator dial to the space indicated on the card.
  - Instead of choosing their info token, everyone takes 1 at random and puts it in a correct place in front of their tile stand (or, if they don't have a wire matching the value of the info token, put it beside their hand).
  - If the False Bottom equipment is drawn, discard it and replace it with a new card.
  - 2-player override: `x2 out of 3` red, `x2` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The yellow wires (called tripwires) are not cut in the regular way: they are cut one by one.
  - **Special action for this mission:** On their turn, a bomb disposal expert can point out 1 of their teammates' tripwires (yellow wires).
    - If the action succeeds, the yellow wire that was identified is revealed, and the detonator dial moves back 1 space.
    - If the action fails, 1 info token is put there, and the detonator dial advances 1 space!
  - If a bomb disposal expert has only their own tripwire (yellow wire) in their hand (and any red wire), they skip their turn.

> **FAQ:** If the special designated Iberian (yellow) wire is RED, the bomb explodes.

### Mission 42

- Card title: `Time to Run Away and Join The Circus...` (`When you received the Joker's invitation, you should have guessed it would be to a spectacle. One thing's for certain: nothing has prepared you for the mayhem you will experience in this mission!`)
- Setup:
  - `x1 out of 3` red wire.
  - `x4` yellow wires.
  - Mobile device/app required for sound file.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - Make sure you have some space around your table and let the show begin! Before the first round, play the sound file Mission 42.
  - Failure: The show got a lukewarm reception... time to stop clowning around. The show must go on (again)!
  - Success: You pulled off that performance in style! But be careful, because the next villain you face might not have a sense of humor: open the "Missions 43-54" box.

### Mission 43

- Card title: `Nano the Robot` (`Welcome to the future! Nano is the cutting edge of bomb disposal technology, but we are not certain whether it is helping or making things more difficult...`)
- Setup:
  - `x3` red wires.
  - Put Nano the Robot on the board on space "1."
  - When wires are dealt, deal some facedown to Nano without looking at them:
    - 2 players: 5 wires.
    - 3-4 players: 4 wires.
    - 5 players: 3 wires.
  - 2-player override: during setup, the Captain randomly draws their info token.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - At the end of a bomb disposal expert's turn, Nano advances 1 space. When it gets to space "12," it turns around, and its next move goes to 11, etc.
  - When an active bomb disposal expert cuts wires matching the number of Nano's current space, they take a wire from the robot and, without showing it, put it in the correct order in their hand (if they have 2 tile stands, they choose which stand receives the new wire).
  - To defuse the bomb and win, all wires must be cut (or red wires revealed), even Nano's.
  - Equipment `11` (Coffee Mug) does not prevent Nano from advancing along the board.

### Mission 44

- Card title: `Underwater Pressure` (`Rabbit the Red is an infamous pirate with a particular penchant for explosives. You are certain you will face him on a future mission. It is time to learn how to use oxygen tanks...and manage the pressure of cutting wires while diving deep underwater!`)
- Setup:
  - `x1 out of 3` red wire.
  - Put 2 Oxygen tokens per bomb disposal expert on the Reserve zone found on the back of this card. (For example: put 6 tokens for a 3-player mission.)
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - To do a cut action, a bomb disposal expert must first take from the reserve a number of Oxygen tokens matching the appropriate depth: wires 1-4 = 1 token; wires 5-8 = 2 tokens; wires 9-12 = 3 tokens.
  - At the start of the Captain's turn, return all oxygen tokens to the reserve.
  - If a bomb disposal expert cannot play because they do not have enough Oxygen tokens, they skip their turn, and the detonator dial advances 1 space.
  - Communication: Since you are under water, you cannot speak. One sign is allowed: give a thumbs up if you need more oxygen.


### Mission 45

- Card title: `Seeking Volunteers` (`The fate of a bomb disposal expert rests in the skill of your hands—and those of your teammates. Are you feeling confident? The time to speak up is now!`)
- Setup:
  - `x2` red wires.
  - Shuffle the 12 Number cards facedown and create a deck by placing it near the board.
  - If Equipment `10` (X or Y Ray) or `11` (Coffee Mug) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The bomb disposal experts don't play in typical clockwise turn order:
    - Each turn, the Captain reveals 1 Number card.
    - The first player (including the Captain) to say "Snip!" must cut this value.
  - As soon as 4 wires of the same value are cut, discard the matching Number card. When the deck is empty, shuffle the remaining Number cards to create a new deck.
  - If a bomb disposal expert says "Snip!" but does not have the correct value, or says anything else (for example "I don't want to do it"), the detonator dial advances 1 space.
  - If nobody volunteers to "Snip!," the Captain picks a player (or themselves). If this player does not have the correct value wire, they choose 1 info token to put in front of their tile stand, and the detonator dial advances 1 space.
  - At any time, a player with only red wires in their hand can say "Snip!" to do the Reveal Your Red Wires action.

### Mission 46

- Card title: `Secret Agent` (`"The name is Bomb, James Bomb Jr."`)
- Setup:
  - `x4` yellow wires (use the tokens numbered: `5.1` / `6.1` / `7.1` / `8.1`).
  - If Equipment `7` (Emergency Batteries) is drawn, discard it and replace it with a new card.
  - 2-player override: during setup, the Captain does not put an info token in front of their tile stand.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - All the 7 wires (ahem, 007 wires) must be cut last.
  - **Special action for this mission:** When a bomb disposal expert has only 7s left in their hand at the start of their turn, they must cut all (4) 7-wires at the same time. If the action fails, the bomb will explode.
  - If a "7" wire is accidentally found earlier in the mission, it is handled as a usual failed action (info token placed in front of tile stand and detonator dial advances 1 space).

### Mission 47

- Card title: `Calculate the Odds` (`No one would have predicted that a bomb disposal expert would need skills in basic math, but here we are!`)
- Setup:
  - `x2 out of 3` red wires.
  - Put the 12 Number cards faceup on the table in 2 rows.
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - To cut a wire, a bomb disposal expert must choose 2 available Number cards, add or subtract them to determine a wire to cut, then discard them.
    - Examples: 3 and 9 to cut a (3 + 9 =) 12. 10 and 3 to cut a (10 - 3 =) 7.
  - When no more cards are available, take all 12 cards and spread them out again.
  - If a bomb disposal expert cannot (or does not want to play), advance the detonator dial 1 space.

### Mission 48

- Card title: `Lethal Wires 3` (`"We go on 3." "Wait! When we go on 3, do we GO ON 3 or do we count to 3 and then go?"`)
- Setup:
  - `x2` red wires.
  - `x3` yellow wires.
  - Do not shuffle the 3 yellow wires in with the rest. Instead, deal them out clockwise and facedown, one to each bomb disposal expert starting with the Captain. (With 2 bomb disposal experts, the Captain receives 2 and puts 1 on each tile stand.) Then deal the other wires as usual.
  - 2-player override: `x3` red, `x3` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - The yellow wires are not cut as usual.
  - **Special action for this mission:** Cut the 3 yellow wires at the same time. With 4-5 bomb disposal experts, the action is possible even for a bomb disposal expert who does not have a yellow wire in their hand.
  - If the action fails, all the indicated wires receive an info token, but the detonator dial advances only 1 space.

### Mission 49

- Card title: `Message in a Bottle` (`Rabbit the Red may be a pirate, but he yo-ho-never shares his bottles of rum with anyone. Bomb disposal experts have no choice—you must all share your bottles...of oxygen...wisely!`)
- Setup:
  - `x2` red wires.
  - Distribute Oxygen tokens visibly out in front of you:
    - 2 bomb disposal experts: 7 tokens each.
    - 3 bomb disposal experts: 6 tokens each.
    - 4 bomb disposal experts: 5 tokens each.
    - 5 bomb disposal experts: 4 tokens each.
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - To perform a cut action, a bomb disposal expert must first give a teammate as many Oxygen tokens as the wire value they want to cut. (Example: to try to cut a "5" wire, you must give 5 Oxygen tokens to a single teammate, not necessarily to the person whose wires you are going to cut.)
  - If a bomb disposal expert cannot play because they do not have enough Oxygen tokens, they skip their turn, and the detonator dial advances 1 space.
  - Communication: Since you are under water, you cannot speak. One sign is allowed: give a thumbs up if you need more oxygen.

### Mission 50

- Card title: `The Blackest Sea` (`You should have guessed that Rabbit the Red would strike again, this time at midnight in the middle of the ocean! He has hijacked your ship and turned off the power. Can you remember where everything is, even while the lights are off?`)
- Setup:
  - `x2` red wires.
  - `x2` yellow wires.
  - Return all Validation tokens (green) and red/yellow markers to the box. You will not use them during this mission.
  - Everyone should examine the red and yellow wires in play before shuffling them in with the blue ones.
  - Instead of putting their selected info token in front of their hand, everyone first points with their finger to the relevant wire, then puts the token beside their hand. Yes, you are going to have to remember all of this information!
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - If a cut action fails, instead of putting the info token directly in front of the chosen wire, put it next to the tile stand.
  - It goes without saying that the bomb disposal experts cannot share information they each memorized.
  - All equipment is otherwise used normally.

### Mission 51

- Card title: `It's Your (Un)Lucky Day!` (`Sometimes skill and good training isn't enough...like today. You must trust your gut instincts to guide you!`)
- Setup:
  - `x1` red wire.
  - Shuffle the 12 Number cards facedown and create a deck by placing it near the board.
  - Move the detonator dial back 1 space (as if an extra bomb disposal expert was playing).
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x2` red. During setup, the Captain does not put an info token.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - On their turn, the active bomb disposal expert becomes "Sir" or "Ma'am."
    1. They flip over the top Number card.
    2. Without consulting anyone else, they choose who must do a cut action with this value's wires (even themselves).
    3. The chosen player must say: "Yes, Sir!" or "Yes, Ma'am!" and do the cut action.
  - Then the player to the left of Sir/Ma'am will become the new Sir/Ma'am, etc.
  - If the chosen bomb disposal expert does not have the value, they choose 1 info token to put in front of their tile stand, and the detonator dial advances 1 space.
  - As soon as 4 wires of the same value are cut, discard the Number card. When the deck is empty, shuffle the Number cards to create a new deck.
  - If a bomb disposal expert has only red wires in their hand at the beginning of their turn, they do the Reveal Your Red Wires action.

### Mission 52

- Card title: `Dirty Double-crossers` (`Stress is really wearing down the team and everyone is on their guard. Nobody knows who to trust and it seems that the truth is nowhere to be found!`)
- Setup:
  - `x3` red wires.
  - If Equipment `1` (≠ Label) or `12` (= Label) is drawn, discard it and replace it with a new card.
  - Instead of putting only 1 info token in front of their tile stand, each bomb disposal expert puts 2. These tokens must be false: the 2 values must not match the wires they point at. The indicated wires can be blue or red.
  - 2-player override: `x3` red, `x4` yellow.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - All the info tokens in this mission are false. When you put an info token in front of your tile stand, it means "this wire does not match this value."
  - When a bomb disposal expert's Dual Cut action fails, the owner of the indicated wire puts an info token matching the stated value in front of their tile stand (which, of course, is false information as the action was not successful).

### Mission 53

- Card title: `Nano Nano` (`The Fourth(?) Law of Robotics: Sometimes a robot will buck convention and do whatever it wants.`)
- Setup:
  - `x2` red wires.
  - Put Nano just before the "1" space on the board.
  - The detonator dial is not used for this mission.
  - If Equipment `6` (Rewinder) or `9` (Stabilizer) is drawn, discard it and replace it with a new card.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - At the end of a bomb disposal expert's turn, Nano moves as follows:
    - If a cut action succeeds: +1 space.
    - If a cut action succeeds and the wires' value matches the number of Nano's current space: -1 space.
    - If a cut action fails: +2 spaces.
  - Beware, if Nano reaches space 12, Kaboom — the bomb explodes!

### Mission 54

- Card title: `The Attack of Rabbit the Red` (`A pirate attack, one nuclear submarine, multiple breaches, and a bomb...sounds like a typical day for a highly-trained team of bomb disposal experts!`)
- Setup:
  - `x11` red wires. Do not shuffle the 11 red wires with the others. Put them in a facedown pile on the back of this card.
  - Distribute Oxygen tokens visibly out in front of you:
    - 2 bomb disposal experts: 9 tokens each.
    - 3 bomb disposal experts: 6 tokens each.
    - 4 bomb disposal experts: 3 tokens each.
    - 5 bomb disposal experts: 2 tokens each.
  - Leave the rest of the tokens in the middle of the table as the reserve.
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - Mobile device/app required for sound file.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
- Mission rule (back):
  - To do a cut action, a bomb disposal expert must first spend a number of Oxygen tokens matching the depth (returning them to the Oxygen reserve in the middle of the table): wires 1-4 = 1 token; wires 5-8 = 2 tokens; wires 9-12 = 3 tokens.
  - If a player cannot play because they do not have enough Oxygen tokens at the start of their turn, they skip their turn, and the detonator dial advances 1 space.
  - Each time a Validation (green) token is put on the board, each bomb disposal expert takes 1 Oxygen token.
  - Play the sound file Mission 54 before starting the first round.
  - If you get out of this tin can alive, open the "Missions 55-66" box.

> **FAQ:** If a player has insufficient oxygen, they skip and the detonator advances +1. But if you CAN play, you MUST play.

### Mission 55

- Card title: `Doctor Nope's Challenge` (`"Okay, Bomb Busters, it is time you faced a worthy adversary! Just say Nope!"`)
- Setup:
  - `x2` red wires.
  - Draw Challenge cards equal to the number of bomb disposal experts and put them faceup on the table.
  - Set the detonator dial to the space indicated on the card.
  - 2-player override: `x2 out of 3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - When a challenge is completed, discard it and move the detonator dial back 1 space.
  - A Challenge card shows a condition: the challenge is successful if this condition is fulfilled. It may apply to only 1 bomb disposal expert (e.g. the arrangement of wires on a tile stand), or to the whole team (e.g. describing a sequence of wires to cut).

### Mission 56

- Card title: `Tripwires` (`They will send you haywire.`)
- Setup:
  - `x2 out of 3` red wires.
  - When wires are dealt, each player flips 1 of their wires around without looking at it, and places it at the far right end of their tile stand. Only your teammates will know its value, and it will most likely not be in the proper order.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Each bomb disposal expert must cut their flipped-around wire themselves using a regular cut action, but without using equipment or a Double Detector. If that cut action fails, the bomb explodes!
  - A bomb disposal expert can (by choice or by necessity) do the Dual Cut action with a teammate's flipped-around wire, but if they do, the detonator dial advances 1 space.

### Mission 57

- Card title: `An Impossible Mission` (`Someone named Ethan has sent you a message: "I am on vacation. Your mission, if you choose to accept it, is to save the world...again. Have fun and good luck!" ...THIS MESSAGE WILL SELF DESTRUCT IN... 10...9...8...7...6...5...4...3...2...1...BOOM!`)
- Setup:
  - `x1` red wire.
  - Put all the Number cards faceup on the table and pair each one with a random faceup Constraint card.
  - If Equipment `10` (Disintegrator) is drawn, discard it and replace it with a new card.
  - 2-player override: `x2` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Each time you put a Validation token on the board, put the matching Constraint card (associated with its paired number) on the board. Put it on top of the previous Constraint card, if one is already there. At any time, there can only be one active Constraint card.
  - All bomb disposal experts must apply this constraint when taking a turn.
  - If an active bomb disposal expert cannot play due to the constraint, they say so and skip their turn (the detonator dial does not move). But, if none of the bomb disposal experts can play during a whole round, the bomb explodes!
  - Constraints do not apply to the Reveal Your Red Wires action.

### Mission 58

- Card title: `Double and/or Nothing` (`It's hard to defuse a bomb without information. Luckily, your friend Mike Gyver has joined you for the day, and has pockets full of gum, paper clips, and other odds and ends that will keep your Double Detectors running!`)
- Setup:
  - `x2` red wires.
  - Return all the info tokens to the box. You will not use any of them for this mission.
  - If Equipment `4` (Post-it) or `7` (Emergency Batteries) is drawn, discard it and replace it with a new card.
  - Do not use new characters — make sure everyone has a Double Detector as their personal equipment.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Even if a cut action fails, do not give any information about the indicated wire.
  - However, there is good news — each bomb disposal expert can use their Double Detector every turn! For this mission, your Double Detectors are always available and will never run out of power.

### Mission 59

- Card title: `Nano to the Rescue` (`Working with a robot felt strange at first, but after a few outings Nano has proven to be an important member of the team. Let's go Nano, it's time for another mission!`)
- Setup:
  - `x2 out of 3` red wires.
  - Put the 12 Number cards faceup in a line in random order on the table.
  - Put Nano the Robot on card 7, facing the direction of the line that has the most cards.
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - To do a cut action, the active bomb disposal expert must do the following:
    1. Either leave Nano in its current space, or move Nano forward to a Number card matching 1 of the values in their hand. (You cannot move Nano backwards!)
    2. Do a cut action using the value where Nano currently is.
    3. Choose which direction on the number line Nano should face (rotate it around 180° or leave it in its current facing).
  - If the bomb disposal expert cannot do a cut action with the available values (the cards below and in front of Nano), they skip their turn, advance the detonator dial 1 space, and rotate Nano 180°.
  - When 4 wires of a value have been cut, flip the matching Number card facedown.
  - Equipment `11` (Coffee Mug) skips a whole turn.

### Mission 60

- Card title: `Yep, it's Doctor Nope!` (`"The world is divided in two—those who shake the foundation of the planet, and the rest who snip tiny wires." Pay no attention to Doctor Nope's ranting—there's a bomb to dispose of!`)
- Setup:
  - `x2 out of 3` red wires.
  - Draw Challenge cards equal to the number of bomb disposal experts and put them faceup on the table.
  - Set the detonator dial to the space indicated on the card.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - When a challenge is completed, discard it and move the detonator dial back 1 space.
  - A Challenge card shows a condition: the challenge is successful if this condition is fulfilled. It may apply to only 1 bomb disposal expert (e.g. the arrangement of wires on a tile stand), or to the whole team (e.g. describing a sequence of wires to cut).

### Mission 61

- Card title: `Sharing is Caring` (`You don't have to face your challenges alone...you can always share your problems with your team!`)
- Setup:
  - `x1` red wire.
  - Each player receives a random Constraint card from A to E and puts it faceup in front of them.
  - With 2 bomb disposal experts, put 2 additional Constraint cards from A to E faceup on the table: one to the Captain's left, and the other to the Captain's right.
  - With 3 bomb disposal experts, put 1 additional Constraint card from A to E faceup on the table, to the Captain's left.
  - 2-player override: `x2` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Each player must apply their constraint. If they cannot apply theirs, they skip their turn (the detonator dial does not move). But beware, if none of the bomb disposal experts can play for a whole round, the bomb explodes!
  - On each round, before the Captain's turn, the bomb disposal experts consult with each other and decide if they want to shift Constraint cards around the table in one direction. If they say yes, they can then choose how to rotate the cards: clockwise or counter-clockwise.
  - A bomb disposal expert can discard their Constraint card at any time and replace it with another that they select at random (from F to L), but by doing so must advance the detonator dial 1 space.
  - The constraints do not apply to the Reveal Your Red Wires action.

### Mission 62

- Card title: `Armageddon Roulette` (`Bruce Wallace and his team must place a bomb on an incoming meteorite before it hits Earth. But wouldn't you know it, one of the rookies bumped into the bomb during training, and now it's armed! You must dispose of the bomb quickly to save the future saviors of the planet!`)
- Setup:
  - `x2` red wires.
  - Draw Number cards equal to the number of bomb disposal experts and put them faceup on the table.
  - Set the detonator dial to the space indicated on the card.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Each time 4 wires whose value matches a faceup Number card are cut, move back the detonator dial 1 space.

### Mission 63

- Card title: `It is Positively Titanic` (`What a strange name for a huge ship that promises never to sink. An even stranger idea is that someone has placed a bomb in the hull! Put on your wetsuits, manage your oxygen, and become kings of the world!`)
- Setup:
  - `x2` red wires.
  - The Captain takes Oxygen tokens:
    - 2 bomb disposal experts: 14.
    - 3 bomb disposal experts: 18.
    - 4 bomb disposal experts: 24.
    - 5 bomb disposal experts: 30.
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: `x3` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - To do a cut action, a bomb disposal expert must put as many Oxygen tokens in the reserve as the value of the indicated wires. (For example: to attempt to cut 5-value wires, 5 tokens must go to the reserve.)
  - At the end of their turn, the active bomb disposal expert gives all remaining Oxygen tokens to the player on their left.
  - After each round, the Captain begins their turn by taking all Oxygen tokens from the reserve.
  - If a bomb disposal expert cannot play because they do not have enough Oxygen tokens, they skip their turn, and the detonator dial advances 1 space.
  - Communication: Since you are under water, you cannot speak. One sign is allowed: give a thumbs up if you need more oxygen.

> **FAQ:** You must play if you have enough oxygen. You cannot voluntarily skip your turn.

### Mission 64

- Card title: `Return of the Tripwires` (`And this time they are ultra-sensitive!`)
- Setup:
  - `x1` red wire.
  - When wires are dealt, each player flips 2 of their wires around (so that its value is facing their teammates), without looking at them. Following their teammates' instructions, each player moves the lower value to the far left side of their tile stand, and the higher value to the far right side.
  - 2-player override: `x2` red.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - Each bomb disposal expert must cut their flipped-around wires themselves using a regular cut action, but without using equipment, or a Double Detector. If that cut action fails, the bomb explodes!
  - A bomb disposal expert can (by choice or by necessity) do the Dual Cut action with a teammate's flipped-around wire, but if they do, the detonator dial advances 1 space.

> **FAQ:** With 2 stands, only 2 wires total are flipped. The lowest-value upside-down wire goes to the far-left of the 1st stand, and the highest-value goes to the far-right of the 2nd stand.

### Mission 65

- Card title: `Hand-Me-Downs` (`"Hey, can I have your number?"`)
- Setup:
  - `x3` red wires.
  - Shuffle then deal out the Number cards, as equally as possible. All bomb disposal experts should keep their Number cards faceup and visible in front of them. (With 5 players, the Captain and player to their left will each have 3 cards, while the others have 2 cards each.)
  - If Equipment `10` (X or Y Ray) is drawn, discard it and replace it with a new card.
  - Do not use the new character whose personal equipment is the X or Y Ray.
  - 2-player override: MISSION IMPOSSIBLE! This mission cannot be played with 2 bomb disposal experts.
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - To do a cut action, a bomb disposal expert must try to cut a value matching 1 of their Number cards.
  - If the active bomb disposal expert does not have a wire in their hand matching any of their numbers, they skip their turn, and the detonator advances 1 space.
  - In all cases, at the end of their turn, the active bomb disposal expert must choose which 1 of their Number cards to give to a teammate.
  - When 4 wires of a value have been cut, flip the Number card facedown. This means you will have some cards faceup in front of you (numbers that you can give to other players), and some cards facedown (numbers that have all been cut).
  - Equipment `11` (Coffee Mug) lets you skip your turn.

### Mission 66

- Card title: `The Final Countdown` (`Your helicopter has nearly arrived at Doctor Nope's secret bunker. It is time for one last, epic showdown! You've trained for this... are you ready? Are you sure?!`)
- Setup:
  - `x2` red wires.
  - `x2` yellow wires.
  - Place the Bunker card near the board.
  - Place the Bomb Busters standee in the helicopter space.
  - Shuffle Constraint cards A to E and randomly put 4 faceup, adjacent to each side of the Bunker card. Put the fifth card faceup as the "ACTION" Constraint.
  - Mobile device/app required for sound file.
  - Rule Sticker A applies: shuffle False Bottom equipment into the pile (available when 2 yellow wires are cut).
  - Rule Sticker B applies: non-captain players may replace their character with a new one (see corresponding equipment card).
  - Rule Sticker C applies: shuffle new equipment into the pile (requires 4 wires of same value cut to use).
- Mission rule (back):
  - When a bomb disposal expert does a cut action (successful or not), they must then choose to move the Bomb Busters standee toward a constraint they met during their cut. (Example: Wire 10 cut = move the Bomb Busters standee toward either card (A) "EVEN" or card (D) "7 to 12".)
  - Cut yellow wires only when you're told to do so.
  - A wall cannot be crossed. If all possible moves encounter a wall, the standee stays where it is.
  - In a striped space, doing a cut that meets the "ACTION" constraint will allow you to do an ACTION (which will be explained to you during the mission).
  - If you cut 4 wires with a Solo Cut action, this is equivalent to making 2 separate cuts of the number concerned (i.e. making 2 moves and/or actions, each corresponding to a constraint of the number cut).
  - Striped icon: you must do a cut meeting the "ACTION" constraint that succeeds (and you don't move).
  - Cards icon: flip the card over to change floors, and put the standee on the staircase space. Keep the orientation "N".
  - Saw icon: advance detonator dial 1 space.
  - Before the first round, play the sound file Mission 66.

> **FAQ:** The standee must move after every cut (success or failure). On hash-marked squares, you must perform a SUCCESSFUL cut matching the ACTION constraint to trigger the action; regardless of success, do not move on hash squares.

---

## Part VII: Reference Cards

### Constraint Cards

- **Constraint A:** You must cut only even wires.
- **Constraint B:** You must cut only odd wires.
- **Constraint C:** You must cut only wires 1 to 6.
- **Constraint D:** You must cut only wires 7 to 12.
- **Constraint E:** You must cut only wires 4 to 9.
- **Constraint F:** You cannot cut wires 4 to 9.
- **Constraint G:** You CANNOT use Equipment cards or your own personal equipment.
- **Constraint H:** If your cut or a cut in your hand fails, do not place an Info token (and do not reveal the value). You cannot cut a wire indicated by an Info token. P.S. Equipment `4` (Post-it) cannot be used.
- **Constraint I:** You cannot cut the far-right wire (highest number) on teammates' tile stands.
- **Constraint J:** You cannot cut the far-left wire (lowest number) on teammates' tile stands.
- **Constraint K:** You cannot do a Solo Cut action.
- **Constraint L:** If the cut fails, the detonator dial advances 2 spaces (instead of 1).

### Challenge Cards

- **Challenge 1:** Instead of their action, a bomb disposal expert cuts a teammate's wire, saying "It is RED." If that wire is not RED, the bomb explodes!
- **Challenge 2:** 4 bomb disposal experts consecutively cut EVEN numbers.
- **Challenge 3:** Uncut wires on a tile stand consist of 2-wire pairs (separated by cut wires).
- **Challenge 4:** The sum of the first 3 Validation tokens used equals 18.
- **Challenge 5:** 2 bomb disposal experts consecutively perform the SOLO Cut action.
- **Challenge 6:** On a single tile stand, at least 5 uncut wires have been isolated (the adjacent wires have been cut).
- **Challenge 7:** 3 bomb disposal experts consecutively cut sequential values (either up or down). Examples: 8-9-10 or 5-4-3.
- **Challenge 8:** The first 2 Validation tokens are put on these numbers. Put 2 faceup Number cards HERE.
- **Challenge 9:** A tile stand has only uncut ODD wires (a minimum of 6 wires). Ignore RED and YELLOW wires.
- **Challenge 10:** On a single tile stand, at least 7 wires have been cut, but the 2 wires on each end have not been cut yet.

---

## Rulebook Notes and Non-Gameplay References

- Some mission cards include a QR code that points to an audio file.
  - Fallback URL in rulebook: `www.pegasusna.com/bombbusters-en`
- Audio credits URL in footer: `www.pegasusna.com/bombbusters-audiocredits-en`
- Rulebook wording inconsistency to be aware of:
  - Character equipment is described as usable "once per mission" in the character rules section.
  - Quick reference says "once per game."
  - For campaign play, the detailed character-rules wording ("once per mission") is typically interpreted as authoritative unless a mission says otherwise.

---

## Source

- Upstream URL: `https://tesera.ru/images/items/2386644/BombBusters_rules_EN-web.pdf`
- Rulebook edition in document footer: US edition 2024, version `v1.0`.
- FAQ source: Bomb Busters FAQ (July 11, 2025).
- Sound-missions audio credits: `www.pegasusna.com/bombbusters-audiocredits-en`
