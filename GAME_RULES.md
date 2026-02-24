# Bomb Busters - Complete Rules Reference (from `BombBusters_rules_EN-web.pdf`)

This document is a comprehensive, structured rewrite of the English rulebook PDF (`v1.0`, US edition 2024), intended as an implementation/reference spec.

## 1. Game Overview

`Bomb Busters` is a fully cooperative game.

- Players: 2-5.
- Team role: each player is a bomb disposal expert.
- Mission goal: defuse the mission bomb together.
- Immediate-loss risks:
  - A red wire is cut in a way that causes explosion.
  - The detonator dial advances to the skull/end space.

The game is mission-based and difficulty increases over missions. Mission cards may introduce additional rules that are not in the base rulebook.

## 2. Components

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

## 3. Mission Structure and Progression

- Training missions are grouped as:
  - Novice: missions 1-3.
  - Intermediate: missions 4-7.
  - Expert: mission 8.
- Missions do not strictly require sequential play, but the rulebook strongly recommends progressing through all of them to learn systems.
- After completing mission 8, open the first surprise box (missions 9-19).

Mission cards are two-sided:

- Front: setup instructions.
- Back: special mission rule(s), which can override or extend base rules.

## 4. Setup (Full Sequence)

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

## 5. Shared Information and Hidden Information

- Your own hand: fully known to you.
- Teammates' uncut wires: hidden from you.
- Cut wires: public (face up in front of the corresponding stand).
- Info tokens on stands: public hints.
- Board markers indicate which red/yellow values are known or only possible (`?`) depending on mission setup.

## 6. Turn Order and Required Action

- Turn order is clockwise, starting with the Captain.
- On your turn, you must choose exactly one action:
  - Dual Cut
  - Solo Cut
  - Reveal Your Red Wires

## 7. Dual Cut Action

### 7.1 Declaration

The active player:

- Selects a specific teammate wire.
- States a value guess for that wire.
- Must also have an identical wire in their own hand to complete a successful dual cut.

### 7.2 Success

If guessed value matches target wire:

- Teammate reveals/cuts that chosen wire (face up, in front of their stand, preserving slot context).
- Active player reveals/cuts one identical wire from their own hand.

### 7.3 Failure

If guessed value does not match:

- If target wire is red: immediate explosion -> mission failure.
- If target wire is blue or yellow:
  - Advance detonator dial by 1.
  - If dial reaches skull/end -> mission failure.
  - Teammate places an info token at the targeted wire to reveal true value.

Additional note:

- The active player does not reveal where their intended matching wire was in their own hand on failure.

> **FAQ:** You may intentionally announce an incorrect number during Dual Cut (e.g. to avoid pointing at a red wire or to signal information to teammates).

## 8. Solo Cut Action

You may perform Solo Cut only when all remaining copies of a value that are still in the game are in your own hand.

- Allowed batch sizes:
  - 4 of a value (full set still uncut), or
  - 2 of a value (when the other pair has already been cut).
- You cut/reveal those matching wire(s) and place them face up in front of your stand.
- No teammate target is needed for Solo Cut.

> **FAQ:** Solo Cut can use wires from both of a player's stands, as long as those are the only remaining copies of that value in the game.

> **FAQ:** You cannot Solo Cut 3-of-a-kind. Wires are always cut as 2 or 4-of-a-kind. If you hold 3 copies, you must wait for one to be cut via Dual Cut first.

## 9. Reveal Your Red Wires Action

This action is legal only if every remaining uncut wire in your hand is red.

- You reveal those red wires face up in front of your stand.

## 10. Yellow Wire Rules

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

## 11. Red Wire Rules

- Red wires represent bomb risk.
- If rules call for red-triggered explosion (for example failed Dual Cut on targeted red), mission immediately fails.
- During gameplay value logic, red wires are treated as shared `RED` category (quick-reference reminder), even though printed decimals are used for setup sorting.

## 12. Validation Tokens

- When all four blue wires of the same number have been cut, place one validation token on that board number.
- This is a public memory aid only (state reminder).

## 13. Equipment Cards (Shared Equipment)

### 13.1 Availability

- Only the equipment cards selected during setup (count = player count) are available in that mission.
- A card becomes usable once two wires of the card's trigger value have been cut.
- To show activation, slide/reveal the card to show green checkmark state.

### 13.2 Usage Limits

- Each equipment card is one-time use.
- After use, flip facedown.
- Most equipment can be used by anyone at almost any time (including outside active turn) unless card text says otherwise.
- Multiple equipment cards can be chained in sequence.

### 13.3 Combination Note

- X-ray or Y-ray equipment can be combined with Double/Triple/Super Detector style effects (as noted in rulebook).

### 13.4 Standard Equipment Card Reference (1-12)

Card text extracted from equipment cards `1` through `12`:

- Equipment `1` (`Label !=`)
  - Timing: can be used at any time.
  - Effect: place the `!=` token in front of 2 adjacent wires of different values.
  - Card reminders:
    - One of the 2 wires may already be cut.
    - Two yellow wires or two red wires are considered identical, so they are not `different` for this effect.
- Equipment `2` (`Talkies-walkies`)
  - Timing: can be used at any time.
  - Effect: swap 2 wires.
    - You take one of your uncut wires and place it face down in front of a teammate.
    - Teammate does the same.
    - Each player then takes the new wire and files it into their own hand.
  - Card reminders:
    - Any uncut wire color can be exchanged (including yellow and red).
    - Everyone sees where these wires are taken and replaced.
  > **FAQ:** If the swapped wire has an info token, the token follows the wire to its new stand. Players cannot communicate or request a specific value during the swap, and cannot direct a 2-stand player which stand to use.
- Equipment `3` (`Triple Detector`)
  - Timing: to be used in turn.
  - Effect: during a Dual Cut action, announce one value (not yellow) and designate 3 wires from a teammate's stand.
  - Card reminder: this works like Double Detector 2000, but with 3 wires.
  > **FAQ:** Success means at least one of the 3 wires matches the announced value; the teammate cuts one matching wire without revealing whether multiple matched. Failure means none match; the teammate places an info token on one of the 3 wires (their choice).
- Equipment `4` (`Post-it`)
  - Timing: can be used at any time.
  - Effect: place an Info token in front of one of your blue wires.
- Equipment `5` (`Super detector`)
  - Timing: to be used in turn.
  - Effect: during a Dual Cut action, announce one value (not yellow) and designate an entire stand of a teammate.
  - Card reminder: this works like Double Detector 2000, but with all wires in that stand.
  > **FAQ:** Same success/failure rules as Triple Detector: success if at least one wire matches; teammate cuts one matching wire without revealing if multiple match. Failure: teammate places info token on one wire of the stand (their choice).
- Equipment `6` (`Rewinder`)
  - Timing: can be used at any time.
  - Effect: move the detonator dial back 1 space.
- Equipment `7` (`Emergency Batteries`)
  - Timing: can be used at any time.
  - Effect: choose one or two used Character cards and flip them face up; their personal equipment is once again usable this mission.
- Equipment `8` (`General Radar`)
  - Timing: can be used at any time.
  - Effect: announce a number (`1`-`12`); all players (including you) answer `yes` if they have at least one uncut blue wire of that value.
  - Card reminder: if a player has 2 stands, they answer for each stand.
  > **FAQ:** Only reveal yes/no, not location or quantity. YELLOW and RED wires have no numeric value — a 7.5 red wire does NOT count as "7".
- Equipment `9` (`Stabilizer`)
  - Timing: to be used at the start of your turn.
  - Effect: use before a Dual Cut. For that turn, if your Dual Cut fails:
    - The detonator does not advance.
    - The bomb does not explode (including red-wire failure case).
  - Card reminder: if a wrong wire was designated, the targeted player still places the usual Info token (number or yellow).
  > **FAQ:** If the chosen wire is RED, do not place an info token.
- Equipment `10` (`X or Y ray`)
  - Timing: to be used in turn.
  - Effect: during a Dual Cut action, by designating one wire you may announce 2 possible values (yellow included).
  - Card reminder: you must have both announced values in your own hand.
  > **FAQ:** Success if the wire matches either announced value; both that wire and your matching wire are revealed. The two announced values need not be consecutive.
- Equipment `11` (`Coffee thermos`)
  - Timing: to be used in turn.
  - Effect: pass your turn and choose the next active Minesweeper (without consultation).
  - Card reminder: play continues clockwise from the designated Minesweeper.
- Equipment `12` (`Label =`)
  - Timing: can be used at any time.
  - Effect: place the `=` token in front of 2 adjacent wires of the same value.
  - Card reminders:
    - One of the 2 wires may already be cut.
    - Two yellow wires or two red wires are considered identical for this effect.

### 13.5 Additional Equipment Card Assets (Campaign/Later Missions)

Additional card text extracted from later-mission equipment cards:

- Yellow equipment - `False Bottom`
  - Timing: Instant effect.
  - Effect: Take 2 Equipment cards and put them in the game with the others.
  - Card reminder: Depending on the wire values already cut; it is possible for these cards to be used immediately.
- Equipment `22` (`Single thread label`)
  - Timing: can be used at any time.
  - Effect: place a token right in front of one of your blue wires (cut or not).
  - Card reminder: it indicates that this value appears only once on the support (wires already cut included).
- Equipment `33` (`Emergency fund`)
  - Timing: immediate effect.
  - Effect: return already-used Equipment cards immediately; they become available again for this mission.
- Equipment `99` (`Thread cutter card`)
  - Timing: to use in turn.
  - Effect: when performing a Solo Cut action, cut 2 identical wires even if they are not the last remaining ones of that value.
- Equipment `10-10` (`Disintegrator`)
  - Timing: immediate effect.
  - Effect: take a random Info token from the supply, reveal its number (`1`-`12`), and all bomb disposal experts cut any remaining wires matching that value.
- Equipment `11-11` (`Grappling Hook`)
  - Timing: can be used at any time.
  - Effect: point at a teammate's wire, take it without revealing it, and put it in your hand.
  - Card reminder: everyone sees where the wire is taken from and where it is placed.
  > **FAQ:** If the receiving player has 2 stands, they choose which stand to place the wire on.

### 13.6 Equipment Back Art

- Equipment back card art has no rules text.

## 14. Character Cards (Personal Equipment)

- Each player's character has one personal equipment power usable once per mission.
- After use, flip character card facedown.

Rulebook-explicit character ability in base text:

- **Double Detector** (once per mission):
  - During Dual Cut, active player declares one value and points to 2 wires in one teammate stand (instead of 1).
  - Success if either pointed wire matches declared value.
    - If both are matches, teammate chooses which of those wires is cut and does not reveal extra detail.
  - Failure if neither matches:
    - Detonator advances 1.
    - Teammate places 1 info token on one of the two pointed wires (teammate chooses).
    - If exactly one of the two pointed wires was red, bomb does not explode from this failure handling; teammate places info token on the non-red wire per rule text.

> **FAQ:** The 2 designated wires need not be adjacent (but logically they often are). Both wires must be on the same stand (cannot span 2 stands of one player). If both designated wires are red, the bomb explodes. If only one is red, the bomb explodes only if the player chooses to reveal the red one; proper play is to place the info token on the non-red wire. You cannot announce YELLOW (or RED) with Double Detector — only values 1-12.

## 15. End of Mission

Mission success:

- All players' tile stands are empty.

Mission failure:

- Red-wire explosion condition occurs, or
- Detonator reaches skull/end space.

After failure:

- Change Captain and replay/restart mission.

## 16. Clarifications

### 16.1 No More Wires

If a player has no wires left:

- Their turns are skipped.
- Remaining players continue clockwise until mission resolves.

### 16.2 Communication Limits

Forbidden:

- Talking about your own wire identities.
- Hinting/implying exact values in hand.
- Recounting private remembered wire info from earlier turns.
- Sharing detailed guesses/assumptions aloud about hidden wire identities.

Allowed:

- Discussing general tactics.
- Discussing timing/use of equipment.
- Reminding teammates about available powers or mission special rules.

### 16.3 Mistake (Wrong Value Announced)

> **FAQ:** If a player mistakenly announces a value that is not in their hand during a Dual Cut, cut another wire the player does have, AND advance the detonator 1 notch.

### 16.4 Info Token Shortage

> **FAQ:** If the needed info token is unavailable (both copies are in use), take one that is no longer useful (e.g. its wire has already been cut). If none can be repurposed, say the value aloud and point — teammates must remember.

## 17. Rule Priority

When mission-card special rules conflict with base rules, mission-card instructions take precedence for that mission.

## 18. Quick Play Summary

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

## 19. Rulebook Notes and Non-Gameplay References

- Some mission cards include a QR code that points to an audio file.
  - Fallback URL in rulebook: `www.pegasusna.com/bombbusters-en`
- Audio credits URL in footer: `www.pegasusna.com/bombbusters-audiocredits-en`
- Rulebook wording inconsistency to be aware of:
  - Character equipment is described as usable "once per mission" in the character rules section.
  - Quick reference says "once per game."
  - For campaign play, the detailed character-rules wording ("once per mission") is typically interpreted as authoritative unless a mission says otherwise.

## 20. Mission Cards 1-66

Normalization note:

- Card text uses mixed wording ("thread", "wire", "Minesweeper"). This section normalizes terms to `wire` and `player` while preserving rule meaning.

### Mission 1

- Card title: `TRAINING, 1st day` (`Lesson 1: How to cut a wire?`)
- Setup:
  - Use `24` blue wires only: values `1` to `6` (4 copies each).
  - Do not place equipment cards.
  - Still do standard setup items listed on the card:
    - Set detonator by player count.
    - Each player takes a character card.
    - Starting with Captain, each player places one info token on one of their own blue wires with matching value.
- Mission rule (back):
  - On turn, use either `Dual Cut` or `Solo Cut`.
  - Dual Cut failure:
    - Detonator advances one space.
    - Targeted teammate places info token showing true value of targeted wire.
    - Active player does not reveal which own wire they intended to match.
  - Solo Cut:
    - Cut all remaining wires of one value in your hand.
    - Either all `4`, or the remaining `2` if the other `2` were already cut.

### Mission 2

- Card title: `TRAINING, Day 2` (`Lesson 2: How to cut a YELLOW wire`)
- Setup:
  - Use `32` blue wires: values `1` to `8` only.
  - Add `2` yellow wires drawn at random from values `1.1` to `7.1`.
  - Do not place equipment cards.
- Mission rule (back):
  - On turn, use either `Dual Cut` or `Solo Cut`.
  - Yellow wires are introduced:
    - Yellow wires are cut like blue (Dual or Solo).
    - During a yellow cut, all yellow wires are treated as the same value.
    - To cut a yellow wire, the active player must first have a yellow wire, then point to a teammate’s wire and state, `"This wire is yellow"`.
    - If a yellow wire is ever cut by mistake, use the Yellow Info token `A` to show its value.

### Mission 3

- Card title: `TRAINING, Day 3` (`Lesson 3: How (NOT!) to cut a RED wire`)
- Setup:
  - Use `40` blue wires: values `1` to `10` only.
  - Add `1` red wire, drawn from values `1.5` to `9.5`.
  - Place equipment cards by player count (randomly drawn).
  - If equipment `2` (`Walkies-Talkies`) or `12` (`Label =`) is drawn, discard it and replace it with a new card.
- Mission rule (back):
  - `RED` wires are introduced:
    - If a `RED` wire is ever cut, the bomb explodes immediately and the mission ends in failure.
  - New action `Reveal Your Red Wires`:
    - If a player starts their turn with only `RED` wires remaining in hand, they must reveal them.
    - That player's work is finished; teammates continue.
  - Equipment introduced:
    - Equipment is not usable at game start.
    - Becomes usable once 2 wires of matching equipment value are cut.
    - Each equipment card can be used once.

### Mission 4

- Card title: `TRAINING: First Day in the Field` (`Time to put theory into practice!`)
- Setup:
  - From this mission onward, always include all `48` blue wires.
  - Add `1` red wire.
  - Add `2` yellow wires.
  - 2-player override shown on card:
    - `48` blue, `1` red, `4` yellow.
- Mission rule (back):
  - Consolidation mission of learned systems:
    - Equipment unlocks when 2 matching-value wires are cut.
    - Yellow wires are cut together (2-player game uses 4 yellows, cut in pairs).
    - Red wire must not be cut; it is revealed when it is the only wire left in a player's hand.

### Mission 5

- Card title: `TRAINING: Second Day in the Field` (`This is a minefield, not the yellow brick road....`)
- Setup:
  - Additional special wires on card:
    - `1` red wire.
    - `2 out of 3` yellow wires.
  - `2 out of 3` yellow procedure:
    - Take 3 yellow tiles.
    - Place 3 `?` markers on matching yellow values.
    - Shuffle these 3 yellow tiles face down, add 2 to the game, set 1 aside unrevealed.
- 2-player override shown on card:
  - `2` red wires.
  - `2 out of 3` yellow wires.
  - Inherits mission 4 baseline of all `48` blue wires.
- Mission rule (back):
  - `2 out of 3` yellow rule:
    - `2` yellow wires must be cut together.
    - Those `2` yellow wires are one of `3` possible values.
  - Reminder:
    - As soon as you feel ready to pass the test with your team, move on to mission `#8`.

### Mission 6

- Card title: `TRAINING: 3rd day of training`
- Setup:
  - Additional special wires on card:
    - `1` red wire.
    - `4` yellow wires.
  - 2-player override shown on card:
    - `2` red wires.
    - `4` yellow wires.
  - Inherits mission 4 baseline of all `48` blue wires.
- Mission rule (back):
  - `4` yellow wires are all the same value.
  - Usually cut by pairs with Dual Cut.
  - Solo Cut may cut yellow by `2` or `4` if one player holds all remaining yellow wires in play.

### Mission 7

- Card title: `TRAINING: last day of training`
- Setup:
  - Red setup is `1 out of 2`.
  - Procedure on card:
    - Take 2 red tiles.
    - Place `?` markers on those 2 possible red values.
    - Shuffle and include 1 red tile in play; set the other aside unrevealed.
  - 2-player override shown on card:
    - `1 out of 3` red.
  - Inherits mission 4 baseline of all `48` blue wires.
- Mission rule (back):
  - Confirms `1 out of 2` red uncertainty:
    - Exactly 1 red in play.
    - Its value is known among 2 possibilities (among 3 possibilities with 2 players).

### Mission 8

- Card title: `FINAL EXAM`
- Setup:
  - Red setup: `1 out of 2`.
  - Yellow setup: `2 out of 3`.
  - 2-player override shown on card:
    - Red: `1 out of 3`.
    - Yellow: `4` yellow wires.
  - Inherits mission 4 baseline of all `48` blue wires.
- Mission rule (back):
  - No special mission rule; apply everything learned in training.
  - Campaign progression note:
    - On success, open the `Missions 9 to 19` box.

Baseline assumption used in this section:

- Where a front card does not redefine blue wire count, it continues to use all `48` blue wires from mission 4 onward.

### Mission 9

- Card title: `A sense of priorities`
- Setup:
  - Add `1` red wire and `2` yellow wires.
  - Shuffle Number cards, draw `3`, place face up in a row.
  - Place the Sequence card `face A` on top of the left Number card.
  - 2-player override shown on card:
    - `2` red wires, `4` yellow wires.
- Mission rule (back), sequence priority (`face A`):
  - Do not cut wires matching the middle or right Number cards until at least `2` wires of the left Number card value are cut.
  - Do not cut wires matching the right Number card until at least `2` wires of the middle Number card value are cut.
  - Other values can be cut at any time.
  - After `2` wires of the left value are cut, flip/remove the left Number card and shift the Sequence marker; then repeat for the next step.

> **FAQ:** If a player only has sequence-blocked wires left (i.e. they can only cut values that are not yet unlocked), the bomb explodes.

### Mission 10

- Card title: `A bad quarter of an hour`
- Setup:
  - Add `1` red wire and `4` yellow wires.
  - Prepare a `15` minute timer.
  - If Equipment `11` is drawn, replace it.
  - 2-player override shown on card:
    - Timer is `12` minutes.
- Mission rule (back):
  - Start timer after setup; mission must be defused within time limit.
  - Turn order is no longer clockwise; any player may call to become active and take next turn.
  - New turn may only be called after current active player's turn fully ends.
  - Same player cannot take consecutive turns (except in 2-player games).

> **FAQ:** The same player cannot play several rounds in a row, except in 2-player games or when they are the last player with wires remaining.

### Mission 11

- Card title: `Blue on red, nothing moves`
- Setup:
  - Add `2` yellow wires.
  - Draw one Number card at random and place it face up on this mission card (back side reference area).
  - If equipment with that same number is drawn, replace it.
  - 2-player override shown on card:
    - `4` yellow wires.
    - Captain does not place an info token during setup.
- Mission rule (back):
  - All `4` blue wires of the drawn Number card value are treated exactly as red wires for this mission.
  - Cutting one of that value explodes the bomb.
  - These wires may only be safely revealed when, at the start of your turn, your remaining hand contains only that value.

### Mission 12

- Card title: `Equipment out of reach`
- Setup:
  - Add `1` red wire and `4` yellow wires.
  - Place one face-up Number card on each equipment card in play (equipment number remains visible).
  - 2-player override shown on card:
    - `2` red wires, `4` yellow wires.
- Mission rule (back):
  - To use an equipment card, both conditions are required:
    - Cut `2` wires of the equipment's own value (normal unlock condition), and
    - Cut `2` wires of the Number card value placed on that equipment.
  - Order does not matter.
  - Special handling for `Double Bottom Equipment`:
    - When it introduces 2 new equipment cards, place Number cards on both.
    - Remove those Number-card locks immediately if their condition is already met; otherwise remove later when satisfied.

> **FAQ:** Cutting 2 wires of a value unlocks BOTH the corresponding equipment card AND the corresponding Number card lock (if any). Both conditions are checked simultaneously.

### Mission 13

- Card title: `Red alert!`
- Setup:
  - Add `3` red wires.
  - Before dealing blue wires:
    - Distribute the 3 red wires face down clockwise starting with Captain.
    - In 2-player game, Captain gets 2 reds and places 1 on each stand.
  - Info token setup is changed:
    - Each player draws an info token at random (replace yellow token if drawn) and places it correctly in front of their stand.
  - 2-player override shown on card:
    - Captain does not place an info token during setup.
- Mission rule (back):
  - New special action: cut the 3 red wires simultaneously by designating 3 uncut wires.
  - If at least one designated wire is not red, bomb explodes.
  - In 4-5 player games, this special action may be performed even if acting player has no red wire.
  - If a player has only red wires remaining, they must use this special action.

> **FAQ:** You cannot use Equipment or Personal Equipment to cut RED wires in this mission. RED and YELLOW wires have no numeric value, so detectors (Double Detector, Triple Detector, Super Detector) cannot target them.

### Mission 14

- Card title: `High risk mine clearance`
- Setup:
  - Add `2` red wires.
  - Add `2 out of 3` yellow wires.
  - Shuffle character cards face down and deal one to each player.
  - The player receiving the Captain card is the `Intern` for this mission.
  - 2-player override shown on card:
    - `3` red wires, `4` yellow wires.
- Mission rule (back):
  - If the Intern fails a Dual Cut action, the bomb explodes immediately.
  - Intern cannot use Equipment `9` (`Stabilizator`).

### Mission 15

- Card title: `Mission a NOVOSIBIRSK CK`
- Setup:
  - Add `1 out of 3` red wire.
  - Place equipment cards in play face down (without looking at them).
  - Shuffle all 12 Number cards face down as a stack and reveal the top card.
  - 2-player override shown on card:
    - `2 out of 3` red wires.
- Mission rule (back):
  - When all 4 blue wires of the currently revealed Number card value are cut:
    - Reveal one equipment card; it becomes available immediately regardless of its printed value.
    - Reveal next Number card and continue.
  - If a newly revealed Number card already has all 4 matching wires cut, discard/skip it and reveal the next one (no equipment gained for skipped card).

### Mission 16

- Card title: `A story of common sense`
- Setup:
  - Add `1` red wire.
  - Add `2 out of 3` yellow wires.
  - Shuffle Number cards, draw `3`, place face up in a row.
  - Place the Sequence card `face B` on the left Number card.
  - 2-player override shown on card:
    - `2` red wires, `4` yellow wires.
- Mission rule (back), sequence priority (`face B`):
  - Do not cut wires matching the middle or right Number cards until all `4` wires of the left Number card value are cut.
  - Do not cut wires matching the right Number card until all `4` wires of the middle Number card value are cut.
  - Other values can be cut at any time.
  - After all `4` wires of the left value are cut, flip/remove that Number card and shift the Sequence marker; then repeat for the next step.

### Mission 17

- Card title: `Sergio El Mytho`
- Setup:
  - Red setup: `2 out of 3` red wires.
  - Shuffle character cards face down and deal one to each player; reveal.
  - Player with Captain card is `Sergio el Mytho` for this mission.
  - Sergio returns Captain card to the box (no Double Detector 2000 ability).
  - Instead of placing 1 normal info token, Sergio places `2` info tokens that must be false:
    - Token value must not match the designated wire.
    - Cannot place these false tokens in front of a red wire.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Sergio's info tokens are always false and mean: `this wire is not this value`.
  - If a Dual Cut targeting Sergio fails, Sergio places info token of the announced value in front of targeted wire (also false information).
  - Sergio cannot use equipment cards, but may participate in effects from Equipment `2` (Walkie-Talkies) and `8` (General Radar).

### Mission 18

- Card title: `BAT-helping hand`
- Setup:
  - Add `2` red wires.
  - Shuffle all `12` Number cards face down as a draw pile.
  - Place Equipment `8` (General Radar) face up on board.
  - Do not place any other equipment cards.
  - Do not place info tokens during setup.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - On each turn, active player must:
    - Reveal top Number card.
    - Use Equipment `8` (General Radar) on that value.
    - Designate which player (including self) must perform a cut action on that value.
  - When Number-card draw pile is empty, reshuffle Number cards.
  - Discard a Number card as soon as all 4 matching wires are cut.
  - If a player starts turn with only red wires left, they perform `Reveal Your Red Wires`.
  - Reminder on card: players may not recall/share previous radar answers.

> **FAQ:** The active player designates only WHO cuts, not which wire or which stand. The next turn goes to the player on the active player's left (not the designated player's left).

### Mission 19

- Card title: `In the Belly of the Beast`
- Setup:
  - Add `1` red wire.
  - Add `2 out of 3` yellow wires.
  - Mission includes an external audio-file prompt (QR code/smartphone icon).
- Mission rule (back):
  - Play the mission audio file from the card.
  - Failure text: `But wait! Maybe there's another grotto on the horizon? Play the sound file again and don't make the same mistakes twice!`.
  - Success text: `Great job! ... New adventures await your team of bomb disposal experts—`.
  - On success, open the `Missions 20 to 30` box.

### Mission 20

- Card title: `The Big Bad Wolf`
- Setup:
  - Add `2` red wires.
  - Add `2` yellow wires.
  - Special `X` marker setup:
    - Last wire dealt to each stand is not sorted.
    - It is placed at far right of stand regardless of value.
    - Place an `X` token in front of that wire.
  - If Equipment `2` is drawn, replace it.
  - 2-player override shown on card:
    - Red: `2 out of 3`.
    - Yellow: `4`.
- Mission rule (back):
  - Play normally, except wires marked with `X` are unranked.
  - Equipment cannot be used on `X` wires.
  - `X` wires are ignored by all equipment, including personal equipment, Equipment `5` (Super Detector), and Equipment `8` (General Radar).

### Mission 21

- Card title: `Death by Haggis`
- Setup:
  - Red setup: `1 out of 2`.
  - Replace normal info tokens with even/odd tokens.
  - During setup, each player places an even/odd token instead of a value token.
  - 2-player override shown on card:
    - `2` red wires.
- Mission rule (back):
  - Throughout mission, always use even/odd tokens instead of numeric info tokens.
  - This applies to mistake info placement and to Equipment `4` (Post-it).
  - Red has no numeric value, so it is neither even nor odd.

### Mission 22

- Card title: `Negative Impressions`
- Setup:
  - Add `1` red wire.
  - Add `4` yellow wires.
  - Setup info-token change:
    - Each player chooses `2` token values they do not have and places them next to their stand.
    - Choosing yellow token is allowed.
    - Player with 2 stands places `1` token next to each stand.
    - If a player has fewer than 2 missing values, they place fewer tokens.
- Mission rule (back):
  - As soon as first 2 yellow wires are cut:
    - Starting with Captain, then clockwise, each player chooses an info token from board supply and gives it to player on their left.
    - Each player places received token correctly in front of their stand (or next to stand if value not present).

### Mission 23

- Card title: `Mission in Sevenans`
- Setup:
  - Red setup: `1 out of 3`.
  - Do not draw normal in-play equipment cards.
  - Instead, create a face-down pile of `7` random equipment cards on board.
  - Place one random Number card face up next to mission card.
  - 2-player override shown on card:
    - `2 out of 3` red.
- Mission rule (back):
  - All 4 wires of the Number-card value must be cut simultaneously.
  - Special action for this mission:
    - Designate the 4 wires of that value (without equipment and without Double Detector 2000), even if active player has none in own hand.
    - Success: those 4 wires are cut.
    - Failure: bomb explodes.
  - After each round, before Captain's turn, discard 1 card from 7-card equipment pile until special action is successfully performed.
  - Once special action is performed, any remaining equipment cards become usable immediately (regardless of normal cut requirements).

### Mission 24

- Card title: `The count is good!`
- Setup:
  - Add `2` red wires.
  - Replace normal info tokens with `x1`, `x2`, `x3` tokens for this mission.
  - Token meaning:
    - `x1`: value appears once in that stand.
    - `x2`: value appears twice.
    - `x3`: value appears three times.
    - Count includes already cut wires.
  - `x2`/`x3` can be placed on any wire of that value in stand (for `x3`: left, middle, or right copy).
  - These tokens cannot be placed on red wires.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Use `x1`/`x2`/`x3` tokens throughout mission instead of normal info tokens.
  - Applies to mistake info placement and Equipment `4` (Post-it).
  - With Equipment `4`, token may be placed in front of an already cut wire.

> **FAQ:** If Walkie-Talkies (Equipment `2`) are used on a wire that has an x1/x2/x3 info token, that token is discarded.

### Mission 25

- Card title: `It's to hear you better...`
- Setup:
  - Add `2` red wires.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Players are not allowed to say wire numbers aloud.
  - Players may communicate numbers indirectly (spelling, gestures, coded phrases, etc.).
  - If a player says a number aloud, detonator advances 1 notch.

### Mission 26

- Card title: `When we talk about the wolf...`
- Setup:
  - Add `2` red wires.
  - Place all 12 Number cards face up on table.
  - If Equipment `10` is drawn, replace it.
- Mission rule (back):
  - On each turn, active player first flips one visible Number card face down.
  - Then active player must perform a cut (`Dual Cut` or `Solo Cut`) on that number.
  - Active player may only cut values whose Number cards are still visible.
  - If no Number cards are visible, turn all Number cards face up again.
  - When all 4 wires of a number are cut, remove that Number card from game.
  - If active player has no wires matching any remaining visible Number cards, they pass without detonator penalty.
  - Otherwise, they must cut among currently visible numbers.

### Mission 27

- Card title: `Dough threads`
- Setup:
  - Add `1` red wire and `4` yellow wires.
  - After selecting Captain, do not distribute character cards (no Double Detector 2000 this mission).
  - If Equipment `7` is drawn, replace it.
  - 2-player override shown on card:
    - Captain does not place an info token during setup.
- Mission rule (back):
  - As soon as first 2 yellow wires are cut:
    - Randomly draw as many info tokens as players and place face up.
    - Starting with Captain, then clockwise, each player chooses one and places it correctly in front of stand (or beside stand if value absent).

### Mission 28

- Card title: `Captain Lazy`
- Setup:
  - Add `2` red wires and `4` yellow wires.
  - After character cards are distributed, Captain returns their character card to the box.
  - Captain therefore has no Double Detector 2000.
  - 2-player override shown on card:
    - `3` red wires and `4` yellow wires.
- Mission rule (back):
  - Captain Lazy cannot use equipment cards and has no personal equipment.
  - If Captain Lazy fails a Dual Cut action, bomb explodes immediately.
  - Captain Lazy can still participate in effects of Equipment `2` (Walkie-talkies) and `8` (General Radar).

### Mission 29

- Card title: `Number error`
- Setup:
  - Add `3` red wires.
  - Shuffle Number cards and deal:
    - 2 face-down cards to each player,
    - 3 to Captain's right-hand neighbor.
  - Stack remaining Number cards face down on table.
  - Each player secretly adds dealt Number cards to hand.
  - 2-player override shown on card:
    - Captain does not place an info token during setup.
- Mission rule (back), per active turn:
  - Active player's right neighbor places one of their Number cards face down on table.
  - Active player takes normal turn.
  - Hidden Number card is revealed:
    - If active player cut that value this turn, detonator advances 1.
  - Active player takes revealed Number card into hand.
  - Additional rules:
    - When all 4 wires of a value are cut, corresponding Number card is discarded.
    - When a player has only 1 Number card left, they draw another (and redraw if that value is already completed).
    - When only one value remains to cut, last Number card is immediately discarded.

> **FAQ:** Multiple clarifications for Mission 29:
> - Detector multi-wire (e.g. Triple Detector): only the wire actually cut can trigger the detonator advance from the Number card — other designated wires do not count.
> - If a player's hand is empty (no wires), they place their Number cards face down under the draw pile.
> - If the right-hand neighbor has no Number cards, the next player to the right plays a Number card instead.
> - Coffee Thermos (Equipment `11`): skip step 2 (the Number card reveal), take the Number card, and if selecting your left neighbor as next player, that neighbor plays a Number card for their turn.

### Mission 30

- Card title: `A very speedy mission!`
- Setup:
  - Red setup: `1 out of 2`.
  - Add `4` yellow wires.
  - Shuffle the `12` Number cards face down and place them as a deck next to the board.
  - Before setup begins, play the mission audio clip (QR code/smartphone).
- Mission rule (back):
  - Before first turn, play the mission audio clip.
  - Failure: the bomb does not explode; you may take one free second chance.
    - Play the mission sound clip again and continue.
  - Success: open the `Missions 31-42` box and continue the campaign.

### Mission 31

- Card title: `With One Hand Tied (Behind My Back...)`
- Setup:
  - Red setup: `2 out of 3`.
  - Use Constraint cards `A-E` face up on table.
  - Before info-token placement, starting with Captain then clockwise, each player chooses one constraint card and places it face up in front of them.
  - If fewer than 5 players, unchosen constraint cards are discarded.
  - 2-player advice on card:
    - avoid choosing pairs `A+B` or `C+D`.
- Mission rule (back):
  - Each player must apply their constraint.
  - When player can no longer apply their constraint at start of turn, they flip it and then play normally for rest of mission.

> **FAQ:** Once a constraint card is flipped, the player plays normally even if they later recover a matching wire via Walkie-Talkies (Equipment `2`).

### Mission 32

- Card title: `Prank attack!`
- Setup:
  - Add `2` red wires.
  - Shuffle and stack `12` Constraint cards face down, then reveal the top one.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - All players must apply visible constraint.
  - At start of each turn, Captain may (after consultation) replace visible constraint with next card.
  - If active player cannot play due to constraint, they pass (no detonator movement).
  - Constraints do not apply to `Reveal Your Red Wires`.

> **FAQ:** If the Restraint card pile is empty, players continue without any restraint.

### Mission 33

- Card title on front is French (`Ce qui se passe a Vegas...`).
- Setup (from card icons/text):
  - Red setup: `2 out of 3`.
  - Replace normal info tokens with even/odd tokens.
  - During setup, place even/odd tokens instead of numeric info tokens.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Throughout mission, use even/odd tokens instead of numeric info tokens.
  - Applies on mistake info placement and Equipment `4` (Post-it).

### Mission 34

- Card title: `The weak link`
- Setup:
  - Add `1` red wire.
  - Use 5 constraint cards (`A` to `E`).
  - Determine first-player Captain as normal, then:
    - Shuffle character cards (including Captain card), deal one face down to each player.
    - First-player Captain does not necessarily receive Captain card.
  - Shuffle constraint cards `A-E`, deal one face down to each player, undealt cards stay unknown.
  - Each player privately checks their character and constraint cards.
  - Player with Captain card is the `weak link`:
    - Must stay hidden.
    - Only weak link applies their own constraint.
  - 2-player note on card:
    - Mission impossible (not playable with 2 players).
- Mission rule (back):
  - While character cards are hidden, no personal equipment is usable.
  - Weak link:
    - Must apply their constraint without discussing it.
    - If they cannot play due to constraint on their turn:
      - Detonator advances 2 notches.
      - All players redraw both constraint and character cards.
  - Other players:
    - Play normally and ignore their own constraint cards.
    - At start of turn, may accuse/designate weak link and describe that player's constraint.
      - If wrong (identity and/or constraint), detonator advances 1 notch.
      - If correct on both identity and constraint:
        - Reveal all character cards and enable them.
        - Weak link no longer applies constraint; mission continues normally.

### Mission 35

- Card title: `No ties, single thread`
- Setup:
  - Red setup: `2 out of 3`.
  - Add `4` yellow wires.
  - Use `X` marker rule:
    - Before mixing red/yellow with blue, give each player one face-down blue wire per stand.
    - This wire is unranked and placed far right regardless of value.
    - Place `X` token in front of each such wire.
    - Then mix remaining wires and deal normally.
  - Replace Equipment `2` (Walkie-Talkies) if drawn.
  - 2-player override shown on card:
    - `3` red wires and `4` yellow wires.
- Mission rule (back):
  - `X`-marked wires can be cut normally (Duo/Solo) only after all 4 yellow wires are cut.
  - Equipment restrictions:
    - No equipment can be used on `X` wires.
    - `X` wires are ignored by all equipment, including personal equipment, Equipment `5` (Super Detector), and Equipment `8` (General Radar).

### Mission 36

- Card title: `Panic in the Tropics`
- Setup:
  - Red setup: `1 out of 3`.
  - Add `2` yellow wires.
  - Shuffle Number cards, draw `5`, place face up in a line.
  - Captain chooses (without consulting others) one of the two ends and places Sequence card `side A` there with arrow pointing inward along the line.
  - 2-player override shown on card:
    - Red: `2 out of 3`.
    - Yellow: `4`.
- Mission rule (back):
  - Wires matching the visible Number cards must be cut in the arrow order.
  - Each time `2` wires of the first Number-card value are cut:
    - Remove that Number card.
    - Current player may reposition Sequence card to either end, without consulting others.
  - Values not among the 5 visible Number cards can be cut at any time.

### Mission 37

- Card title: `The boss of the farce!`
- Setup:
  - Add `2` red wires.
  - Shuffle all `12` Constraint cards face down, then reveal the top one.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Visible constraint must be applied.
  - Each time all `4` wires of any value are cut, replace visible constraint with next one.
  - If active player cannot play because of the constraint, they pass.
  - If no player can play for a full round:
    - Detonator advances `1`.
    - Replace visible constraint.
  - When constraint pile is empty, there is no longer any constraint.
  - Constraints do not apply to `Reveal Your Red Wires`.

### Mission 38

- Card title: `One thread upside down, one thread right side up...`
- Setup:
  - Add `2` red wires.
  - During wire distribution, Captain places one of their own wires upside down (value facing teammates), without looking, at one end of their hand (single stand end).
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Captain must personally cut this upside-down wire using a normal cut action; failure explodes the bomb.
  - Another player cannot cut this wire for the Captain.
  - If that upside-down wire is the only legal choice for another player, that player must pass and detonator advances `1`.
  - No equipment or personal equipment may target upside-down wires.

> **FAQ:** If the Captain's upside-down wire is RED, they reveal it when all their remaining uncut wires are RED (via the normal "Reveal Your Red Wires" action).

### Mission 39

- Card title: `The Doctor's 4 Sons Walk`
- Setup:
  - Red setup: `2 out of 3`.
  - Add `4` yellow wires.
  - Do not place equipment cards on the board.
  - Place one random Number card face up on first equipment slot.
  - Create a face-down pile of `8` random Number cards next to board.
  - Instead of choosing setup info token, each player draws one random info token and places it correctly; replace yellow info token if drawn.
  - 2-player override shown on card:
    - Red: `3`.
    - Yellow: `4`.
- Mission rule (back):
  - The `4` wires matching the visible Number card must be cut simultaneously.
  - Special action:
    - On turn, player may designate/cut those 4 wires (without personal equipment), even if they do not hold one in own hand.
    - Failure explodes bomb.
  - After each round, before Captain turn, discard one card from the 8-card Number pile until special action is successfully performed.
  - Once special action is performed:
    - Distribute all remaining Number cards from that pile to players clockwise, face down.
    - Each player places info token(s) matching received values in front of their hand.
    - If no token of a value remains, ignore that value.

> **FAQ:** If a player is dealt a Number card for a value not in their hand or no longer in the game, ignore it (no info token placed).

### Mission 40

- Card title: `Christmas Trap`
- Setup:
  - Add `3` red wires.
  - Replace normal info tokens with both:
    - `x1/x2/x3` tokens, and
    - even/odd tokens.
  - During setup and throughout game, players alternate token type by seating order:
    - Captain places `x1/x2/x3`.
    - Player on Captain's left places even/odd.
    - Continue alternating.
  - Neither token type can be placed in front of red wires.
  - 2-player override shown on card:
    - Captain places no token.
    - Only second player places one even/odd token.
- Mission rule (back):
  - Same alternating token-type assignment remains in force for full mission.
  - Applies to both normal setup/mistake info placement and Equipment `4` (Post-it).
  - Captain and (with higher player counts) 3rd/5th players use `x1/x2/x3`.
  - 2nd and (with higher player counts) 4th players use even/odd.
  - With Equipment `4`, an `x1/x2/x3` token may be placed in front of an already cut wire.
  - Neither token type may be placed in front of red wires.

### Mission 41

- Card title: `Bomba latina`
- Setup:
  - Red setup: `1 out of 3`.
  - Yellow count: equal to player count (maximum `4` yellows).
  - Yellow wires are treated as `IBERIAN` wires for this mission:
    - Do not mix them into general wire deal.
    - Distribute one face down to each player.
    - With 5 players, Captain gets no yellow at setup.
  - Set detonator dial to card-indicated opposite notch.
  - Each player draws random info token and places it correctly (instead of choosing).
  - If Equipment `6` (Double Bottom) is drawn, replace it.
  - 2-player override shown on card:
    - Red: `2 out of 3`.
    - Yellow: `2`.
- Mission rule (back):
  - Iberian (yellow) wires are cut one-by-one, not in normal yellow-pair style.
  - Special action:
    - Designate exactly one teammate yellow wire by announcing it as Iberian.
    - Success: that yellow is revealed and detonator moves back `1`.
    - Failure: place info token there and detonator moves forward `1`.
  - If a player only has Iberian yellow left (plus red if any), that player passes.

> **FAQ:** If the special designated Iberian (yellow) wire is RED, the bomb explodes.

### Mission 42

- Card title: `What is this circus?`
- Setup:
  - Red setup: `1 out of 3`.
  - Add `4` yellow wires.
- Mission rule (back):
  - Clear space around your table and let the show begin.
  - Before the first round, play the mission 42 sound file.
  - Failure outcome is a broken/interrupted show as described on card text.
  - Success outcome is `The show must go on (again)!` and then open the `Missions 43 to 54` box.

### Mission 43

- Card title: `Nano the Robot`
- Setup:
  - Add `3` red wires.
  - Place Nano robot standee on board space `1`.
  - During wire distribution, place additional face-down wires on Nano, without looking:
    - 2 players: `5` wires on Nano.
    - 3 or 4 players: `4` wires on Nano.
    - 5 players: `3` wires on Nano.
  - 2-player override shown on card:
    - Captain draws info token at random during setup.
- Mission rule (back):
  - At end of each player's turn, Nano moves forward one space; after `12`, Nano turns around and moves backward (`11`, etc.).
  - When active player cuts wires matching Nano's current number, they take one wire from Nano, keep it hidden from others, and place it correctly into own hand (if 2 stands, choose stand).
  - To defuse the bomb and win, all wires must be cut (or RED wires revealed); even Nano's.
  - Equipment `11` (Coffee Thermos) does not prevent Nano from moving.

### Mission 44

- Card title: `Underwater pressure`
- Setup:
  - Red setup: `1 out of 3`.
  - Place oxygen tokens in mission-card reserve area: `2` oxygen tokens per player.
  - If Equipment `10` (X-ray/Y-ray) is drawn, replace it.
  - Do not use the character equipped with X/Y Ray in this mission.
- Mission rule (back):
  - To perform a cut action, active player must first spend oxygen from reserve based on targeted wire value:
    - Wires `1-4`: spend `1` token.
    - Wires `5-8`: spend `2` tokens.
    - Wires `9-12`: spend `3` tokens.
  - At the start of each captain turn, return all spent tokens to reserve.
  - If player cannot act due to insufficient oxygen, they pass and detonator advances `1`.
  - Communication restriction:
    - No speaking.
    - One sign is allowed: give a thumbs up if you need more oxygen.


### Mission 45

- Card title: `My Thread, My Battle!`
- Setup:
  - Add `2` red wires.
  - Shuffle/stack 12 Number cards face down.
  - Replace Equipment `10` (X/Y Ray) and `11` (Coffee Thermos) if drawn.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Turn order is no longer clockwise.
  - Each turn:
    - Captain draws one Number card.
    - First player (including Captain) to call `Squeak!` must cut that value.
  - Number card is discarded once all 4 matching wires are cut.
  - When Number deck is empty, reshuffle discarded Number cards and continue.
  - If a player calls `Squeak!` but does not have value (or gives extra indication), detonator advances `1`.
  - If nobody volunteers, Captain designates a player; if designated player lacks value, they place info token of choice and detonator advances `1`.
  - Player with only red wires may call `Squeak!` to perform `Reveal Your Red Wires`.

### Mission 46

- Card title: `Secret Agent`
- Setup:
  - Add `4` yellow wires with required values: `5.1`, `6.1`, `7.1`, `8.1`.
  - If Equipment `7` (Emergency Batteries) is drawn, replace it.
  - 2-player override shown on card:
    - Captain does not place info token during setup.
- Mission rule (back):
- All the `7`-value wires (ahem, `007` wires) must be cut last.
- Special action:
  - When a bomb disposal expert has only `7`s left in their hand at the start of their turn, they must cut all four `7`-wires at the same time.
  - If this action fails, the bomb explodes.
- If a `7`-wire is accidentally found earlier in the mission, it is handled as a usual failed action (info token placed in front of tile stand and detonator advances `1` space).

### Mission 47

- Card title: `L'addition SVP!`
- Setup:
  - Red setup: `2 out of 3`.
  - Place all 12 Number cards face up on table.
  - If Equipment `10` (X/Y Ray) is drawn, replace it.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - To cut a wire, player chooses two Number cards and computes target value by addition or subtraction.
  - Chosen Number cards are discarded after use.
  - Example on card:
    - `3` and `9` cut `12` (`3+9`).
    - `10` and `3` cut `7` (`10-3`).
  - When no visible cards remain, reshuffle discard and lay out 12 cards again.
  - If player cannot or does not want to play, they discard 2 cards of choice and detonator advances `1`.

### Mission 48

- Card title: `3-wire plan`
- Setup:
  - Add `2` red wires and `3` yellow wires.
  - Do not mix yellow with others:
    - Distribute yellow face down clockwise starting with Captain.
    - With 2 players, Captain receives 2 yellows and places 1 on each stand.
  - Then distribute remaining wires.
  - 2-player override shown on card:
    - `3` red wires, `3` yellow wires.
- Mission rule (back):
  - Yellow wires are no longer cut by normal yellow rules.
  - Special action:
    - Cut all 3 yellow wires simultaneously.
    - With 4-5 players, action is allowed even if acting player has no yellow in hand.
  - If special action fails:
    - Put info token on each designated wire.
    - Detonator advances only `1`.

### Mission 49

- Card title: `Message in a Bottle`
- Setup:
  - Add `2` red wires.
  - Give oxygen tokens to each player as visible personal supply:
    - 2 players: `7` each
    - 3 players: `6` each
    - 4 players: `5` each
    - 5 players: `4` each
  - If Equipment `10` (X/Y Ray) is drawn, replace it.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - To perform a cut action, player must first give a teammate oxygen tokens equal to the target wire value.
  - Example on card: to attempt value `5`, give `5` tokens to one teammate (not necessarily the target's owner).
  - If player cannot act due to insufficient oxygen, they pass and detonator advances `1`.
  - Communication restriction:
    - No speaking.
    - One sign is allowed: give a thumbs up if you need more oxygen.

### Mission 50

- Card title: `The Blackest Sea`
- Setup:
  - Add `2` red wires and `2` yellow wires.
  - Return validation tokens and red/yellow board markers to box; they are not used in this mission.
  - Before shuffling with blue wires, memorize which red/yellow values are in play.
  - Instead of placing setup info token in front of stand, each player places it next to stand and points to relevant wire for teammates to memorize.
  - 2-player override shown on card:
    - `3` red wires, `4` yellow wires.
- Mission rule (back):
  - On failed cut, info token is placed next to affected stand (not in front of targeted wire).
  - Players may not exchange the remembered information with each other.
  - Equipment otherwise works normally.

### Mission 51

- Card title: `Unlucky Day`
- Setup:
  - Add `1` red wire.
  - Shuffle and stack 12 Number cards face down.
  - Move detonator back one step at start.
  - If Equipment `10` (X/Y Ray) is drawn, replace it.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `2` red wires.
    - Captain does not place info token at setup.
- Mission rule (back):
  - On their turn, the active bomb disposal expert becomes `Sir` or `Ma'am`.
    - Reveal the top Number card.
    - Choose (without consultation) which player must perform a cut on that value.
    - The chosen player says `Yes, Sir` or `Yes, Ma'am` and executes the cut.
    - Then the player to the left of the current `Sir`/`Ma'am` becomes the new `Sir`/`Ma'am`.
  - If designated player lacks the value:
    - They place info token of choice.
    - Detonator advances `1`.
  - Number card is discarded once all 4 matching wires are cut; when deck is empty, reshuffle Number cards.
  - If player starts turn with only red wires remaining, they perform `Reveal Your Red Wires`.

### Mission 52

- Card title: `Dirty Double-crossers`
- Setup:
  - Add `3` red wires.
  - Replace Equipment `1` (Label) and `12` (Label =) if drawn.
  - Instead of placing 1 info token, each player places 2 setup tokens.
  - These 2 setup tokens must be false:
    - Values must not correspond to the 2 designated wires.
    - Designated wires may be blue or red.
  - 2-player override shown on card:
    - `3` red wires and `4` yellow wires.
- Mission rule (back):
  - All info tokens in this mission are false:
    - A token means `this wire is not this value`.
  - On Dual Cut failure, targeted player places exactly one token of the announced value in front of the designated wire (also false information).

### Mission 53

- Card title: `The Fourth Law of Robotics: Sometimes a robot will buck convention and do whatever it wants`
- Setup:
  - Add `2` red wires.
  - Place Nano just before square `1` on the board track.
  - Detonator is not used in this mission.
  - Replace Equipment `6` (Retardator) and `9` (Stabilizer) if drawn.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - At end of each player's turn, Nano moves according to outcome:
    - Normal successful cut: Nano `+1` space.
    - Successful cut on Nano's current value: Nano `-1` space.
    - Cut failure: Nano `+2` spaces.
  - If Nano goes past square `12`, bomb explodes immediately.

### Mission 54

- Card title: `The Attack of Red Rabbit`
- Setup:
  - Use all `11` red wires as a separate face-down stack in mission-card location (not mixed into general wire pool at setup).
  - Mission uses oxygen economy:
    - 2 players: `9` oxygen each
    - 3 players: `6` oxygen each
    - 4 players: `3` oxygen each
    - 5 players: `2` oxygen each
  - Put each player's oxygen visibly in front of them; remaining oxygen stays in center as reserve.
  - Replace Equipment `10` (X/Y Ray) if drawn.
  - Do not use character equipped with X/Y Ray.
- Mission rule (back):
  - To perform a cut action, player pays oxygen into center reserve by targeted value zone:
    - `1-4`: pay `1`
    - `5-8`: pay `2`
    - `9-12`: pay `3`
  - If player cannot pay at start of turn, they pass and detonator advances `1`.
  - Each time a validation token is placed, every player retrieves one oxygen token.
  - Before first round, play mission sound file.
  - On success, open box `Missions 55 to 66`.

> **FAQ:** If a player has insufficient oxygen, they skip and the detonator advances +1. But if you CAN play, you MUST play.

### Mission 55

- Card title: `Doctor No's Challenge`
- Setup:
  - Add `2` red wires.
  - Draw random Challenge cards equal to player count and place face up on table.
  - Place detonator on the opposite notch indicated by mission card.
  - 2-player override shown on card:
    - `2 out of 3` red wires.
- Mission rule (back):
  - When an in-game challenge is completed, discard that challenge and move detonator back `1`.
  - Challenge cards define completion conditions for:
    - either one player (example: wire arrangement on one stand),
    - or whole team (example: sequence of wires to cut).

### Mission 56

- Card title: `The Rebel Sons`
- Setup:
  - Add `2` red wires.
  - During wire distribution, each player flips 1 of their wires around without looking at it and places it at the far right end of their tile stand.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Each bomb disposal expert must cut their flipped-around wire themselves using a regular cut action, but without using equipment or a Double Detector.
  - If that cut action fails, the bomb explodes.
  - A bomb disposal expert can (by choice or by necessity) do the Dual Cut action with a teammate's flipped-around wire; if they do, the detonator dial advances `1` space.

### Mission 57

- Card title: `Mission impossible`
- Setup:
  - Add `1` red wire.
  - Place all Number cards face up on table.
  - Randomly place one face-up Constraint card next to each Number card.
  - Replace Equipment `10-10` (Disintegrator) if drawn.
  - 2-player override shown on card:
    - `2` red wires.
- Mission rule (back):
  - Each time a validation token is placed, activate the corresponding Constraint card for that number (on top of any previous one); exactly one active constraint at a time.
  - All players must obey active constraint.
  - If active player cannot act due to constraint, they pass without detonator movement.
  - If no player can act for a full round, bomb explodes.
  - Constraints do not apply to `Reveal Your Red Wires`.

### Mission 58

- Card title: `System D`
- Setup:
  - Add `2` red wires.
  - Put all info tokens back in box; none are used this mission (including setup).
  - Replace Equipment `4` (Post-it) and `7` (Emergency Batteries) if drawn.
  - Do not take new characters; every player has Double Detector 2000 as personal equipment.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - On failed cut, do not reveal information about designated wire.
  - Every player may use Double Detector 2000 every turn (unlimited uses).

### Mission 59

- Card title: `Nano to the rescue`
- Setup:
  - Red setup: `2 out of 3`.
  - Randomly align all 12 Number cards face up side by side.
  - Place Nano on Number card `7`, facing toward the larger side/greater direction of available cards.
  - Replace Equipment `10` (X/Y Ray) if drawn.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back), per cut attempt:
  - Active player must:
    - Move Nano forward or keep Nano in place (never backward) onto a number they can play.
    - Attempt a cut action on Nano's current value.
    - Re-orient Nano (keep direction or turn around).
  - If active player cannot play with values available around Nano (under/in front per card wording):
    - Turn Nano around,
    - Advance detonator `1`,
    - then play.
  - When all 4 wires of a number are cut, turn that Number card face down.
  - Card note: Equipment `11` (Coffee Thermos) passes its entire turn.

### Mission 60

- Card title: `The Return of Doctor No`
- Setup:
  - Red setup: `2 out of 3`.
  - Draw random Challenge cards equal to player count and place face up on table.
  - Place detonator on opposite notch (as indicated on mission card).
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - As soon as an in-game challenge is completed, discard it and move detonator back `1`.
  - Challenge cards define conditions for either one player or whole-team objectives.

### Mission 61

- Card title: `Quiet, we're filming!`
- Setup:
  - Add `1` red wire.
  - Use Constraint cards `A-E`:
    - Each player randomly receives one and places it face up in front of them.
    - 2 players: add 2 additional constraints to table (left and right of Captain).
    - 3 players: add 1 additional constraint to table (left of Captain).
  - 2-player override shown on card:
    - `2` red wires.
- Mission rule (back):
  - Everyone must apply their current constraint.
  - If player cannot apply constraint, they pass (no detonator movement).
  - If all players pass for a full round, bomb explodes.
  - Before Captain's turn each round, team may rotate all table constraints clockwise or counterclockwise.
  - A player may discard own constraint any time and draw random replacement from `F-L`, then detonator advances `1`.
  - Constraints do not apply to `Reveal Your Red Wires`.

### Mission 62

- Card title: `Armageddon Roulette`
- Setup:
  - Add `2` red wires.
  - Draw random Number cards equal to player count and place face up on table.
  - Place detonator on opposite notch (as indicated on mission card).
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - Each time 4 wires whose value matches a faceup Number card are cut, move the detonator back `1` space.

### Mission 63

- Card title: `Titanic II`
- Setup:
  - Add `2` red wires.
  - Captain receives oxygen tokens:
    - 2 players: `14`
    - 3 players: `18`
    - 4 players: `24`
    - 5 players: `30`
  - Replace Equipment `10` (X/Y Ray) if drawn.
  - Do not use character equipped with X/Y Ray.
  - 2-player override shown on card:
    - `3` red wires.
- Mission rule (back):
  - To perform cut action, active player first puts oxygen into reserve equal to designated wire value.
  - At end of turn, active player passes all remaining oxygen to left neighbor.
  - After each round, Captain starts turn by taking all oxygen from reserve.
    - If Captain does not play (for example empty hand or uses Equipment `11`), tokens go to next player.
  - If player cannot play due to insufficient oxygen, they pass and detonator advances `1`.
  - Communication restriction:
    - No talking.
    - One thumb up/down gesture allowed to signal oxygen need.

> **FAQ:** You must play if you have enough oxygen. You cannot voluntarily skip your turn.

### Mission 64

- Card title: `The return of the rebel sons!`
- Setup:
  - Add `1` red wire.
  - During distribution, each player places `2` own wires upside down (facing teammates), without looking.
  - Under direction of a teammate, each player places:
    - smallest upside-down rebel value at far left,
    - largest upside-down rebel value at far right.
  - 2-player override shown on card:
    - `2` red wires.
- Mission rule (back):
  - Each player must cut upside-down wires with normal cut action, without equipment or Double Detector 2000.
  - Failure explodes bomb.
  - Dual Cut on teammate's upside-down wire is allowed by choice/necessity, but detonator advances `1`.

> **FAQ:** With 2 stands, only 2 wires total are flipped. The lowest-value upside-down wire goes to the far-left of the 1st stand, and the highest-value goes to the far-right of the 2nd stand.

### Mission 65

- Card title: `Good thread and not good thread`
- Setup:
  - Add `3` red wires.
  - Randomly distribute all Number cards to players; keep them face up in front of each player.
  - With 5 players, Captain and player to Captain's left each receive one extra Number card.
  - Replace Equipment `10` (X/Y Ray) if drawn.
  - Do not use character equipped with X/Y Ray.
  - 2-player note on card:
    - Mission impossible (not playable with 2 players).
- Mission rule (back):
  - To perform cut action, active player must cut a value matching one of their own Number cards.
  - If active player has no matching wire for any own Number card, they pass and detonator advances `1`.
  - At end of every turn, active player must give one of their Number cards to any teammate.
  - When all 4 wires of a value are cut, turn that Number card face down.
    - Face-up cards = values still required to cut.
    - Face-down cards can still be transferred.
  - Card note: Equipment `11` (Coffee Thermos) `passes all around` (wording as printed).

### Mission 66

- Card title: `The Final Countdown`
- Setup:
  - Add `2` red wires and `2` yellow wires.
  - Place `BUNKER` card next to board.
  - Place Bomb Busters standee/pawn on helicopter space.
  - Shuffle Constraint cards `A-E` and place `4` face up around bunker sides.
  - Place 5th constraint face up next to bunker as `ACTION` constraint.
- Mission rule (back):
  - After every cut action (success or failure), active player must move Bomb Busters pawn in direction of a satisfied constraint, choosing among valid options.
  - Yellow wires are cut only when instructed by mission flow.
  - Walls are impassable; if all possible moves hit walls, pawn stays in place.
  - On striped squares, a cut that matches `ACTION` constraint allows a mission action (explained during mission flow).
  - Solo Cut of 4 wires counts as two separate cuts for movement/action resolution.
  - Mission card also specifies:
    - succeed on an `ACTION`-constraint cut without movement,
    - then flip/advance floor and place pawn on staircase space while preserving `N` orientation,
    - and a printed `+1 detonator notch` effect tied to this flow (as shown on card icon line).
  - Before first round, play mission sound file.
  - Card includes final fail/success narrative text.

> **FAQ:** The standee must move after every cut (success or failure). On hash-marked squares, you must perform a SUCCESSFUL cut matching the ACTION constraint to trigger the action; regardless of success, do not move on hash squares.

## Constraint Cards

### Constraint A

- You must cut only even wires.

### Constraint B

- You must cut only odd wires.

### Constraint C

- You must cut only wires 1 to 6.

### Constraint D

- You must cut only wires 7 to 12.

### Constraint E

- You must cut only wires 4 to 9.

### Constraint F

- You cannot cut wires 4 to 9.

### Constraint G

- You CANNOT use Equipment cards or your own personal equipment.

### Constraint H

- Failed cuts don't place Info tokens, and you cannot cut a wire indicated by an Info token.

### Constraint I

- You cannot cut the far-right wire (highest number) on teammates' tile stands.

### Constraint J

- You cannot cut the far-left wire (lowest number) on teammates' tile stands.

### Constraint K

- You cannot do a Solo Cut action.

### Constraint L

- If the cut fails, the detonator dial advances 2 spaces (instead of 1).

## Challenge Cards

### Challenge 1

- Instead of their action, a bomb disposal expert cuts a teammate's wire, saying `It is RED`.
- If that wire is not RED, the bomb explodes.

### Challenge 2

- 4 bomb disposal experts consecutively cut EVEN numbers.

### Challenge 3

- Uncut wires on a tile stand consist of 2-wire pairs (separated by cut wires).

### Challenge 4

- The sum of the first 3 validation tokens used equals 18.

### Challenge 5

- 2 bomb disposal experts consecutively perform the SOLO Cut action.

### Challenge 6

- On a single tile stand, at least 5 uncut wires have been isolated (the adjacent wires have been cut).

### Challenge 7

- 3 bomb disposal experts consecutively cut sequential values (either up or down): examples: 8-9-10 or 5-4-3.

### Challenge 8

- The first 2 Validation tokens are put on these numbers. Put 2 faceup Number cards HERE.

### Challenge 9

- A tile stand has only uncut ODD wires. (`3`, `3`, `5`, and `9` must be uncut). This must be satisfied on one tile stand with a minimum of 6 uncut wires, ignoring RED and YELLOW wires.

### Challenge 10

- On a single tile stand, at least 7 wires have been cut, but the 2 wires on each end have not been cut yet.

---

## Source

- Upstream URL: `https://tesera.ru/images/items/2386644/BombBusters_rules_EN-web.pdf`
- Rulebook edition in document footer: US edition 2024, version `v1.0`.
- FAQ source: Bomb Busters FAQ (July 11, 2025).
- Sound-missions audio credits: `www.pegasusna.com/bombbusters-audiocredits-en`
