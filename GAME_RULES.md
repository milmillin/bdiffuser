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

## 8. Solo Cut Action

You may perform Solo Cut only when all remaining copies of a value that are still in the game are in your own hand.

- Allowed batch sizes:
  - 4 of a value (full set still uncut), or
  - 2 of a value (when the other pair has already been cut).
- You cut/reveal those matching wire(s) and place them face up in front of your stand.
- No teammate target is needed for Solo Cut.

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

## 20. Mission Cards 1-8 (Processed from Images)

Source images:

- Fronts: `packages/client/public/images/mission_1.png` through `packages/client/public/images/mission_8.png`
- Backs: `packages/client/public/images/mission_1_back.png` through `packages/client/public/images/mission_8_back.png`

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
  - On turn, use either `Duo Cut` or `Solo Cut`.
  - Duo Cut failure:
    - Detonator advances one space.
    - Targeted teammate places info token showing true value of targeted wire.
    - Active player does not reveal which own wire they intended to match.
  - Solo Cut:
    - Cut all remaining wires of one value in your hand.
    - Either all `4`, or the remaining `2` if the other `2` were already cut.

### Mission 2

- Card title: `TRAINING, 2nd day` (`Lesson 2: Cutting a YELLOW wire`)
- Setup:
  - Use `32` blue wires: values `1` to `8` only.
  - Add `2` yellow wires, drawn from values `1.1` to `7.1`.
  - Do not place equipment cards (training exception).
  - Place board markers/pawns for special wires (here, yellow values in play).
  - Yellow info token cannot be used during setup.
- Mission rule (back):
  - On turn, use either `Duo Cut` or `Solo Cut`.
  - Yellow wires are introduced:
    - Yellow is cut like blue (Duo/Solo), but all yellow wires are treated as one shared value.
    - To target yellow, player must call `yellow`.
    - If a yellow is misidentified during a cut, use the yellow info token to reveal.

### Mission 3

- Card title: `TRAINING, 3rd day` (`Lesson 3: (NOT) cutting a RED wire`)
- Setup:
  - Use `40` blue wires: values `1` to `10` only.
  - Add `1` red wire, drawn from values `1.5` to `9.5`.
  - Place equipment cards by player count (randomly drawn).
  - If equipment `11` (`Coffee Thermos`) or `12` (`Label =`) is drawn, replace it.
- Mission rule (back):
  - Red wire introduced: cutting red immediately explodes bomb (mission failure).
  - New action `Reveal Your Red Wires`:
    - If a player starts turn with only red wire(s) uncut, they reveal them.
    - That player's work is finished; teammates continue.
  - Equipment introduced:
    - Not usable at game start.
    - Becomes usable once 2 wires of matching equipment value are cut.
    - Each equipment can be used once.

### Mission 4

- Card title: `TRAINING, 1st day of training` (`After theory, it's time for practice!`)
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

- Card title: `TRAINING: 2nd day of training`
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
  - Emphasizes `2 of 3` yellow uncertainty (two yellow wires in play, values known only among three candidates).

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
  - Usually cut by pairs with Duo Cut.
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

## 21. Mission Cards 9-16 (Processed from Images)

Source images:

- Fronts: `packages/client/public/images/mission_9.png` through `packages/client/public/images/mission_16.png`
- Backs: `packages/client/public/images/mission_9_back.png` through `packages/client/public/images/mission_16_back.png`

Baseline assumption used in this section:

- Where a front card does not redefine blue wire count, it continues to use all `48` blue wires from mission 4 onward.

### Mission 9

- Card title: `The sense of priorities`
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
  - If the Intern fails a Duo Cut action, the bomb explodes immediately.
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

## 22. Mission Cards 17-24 (Processed from Images)

Source images:

- Fronts: `packages/client/public/images/mission_17.png` through `packages/client/public/images/mission_24.png`
- Backs: `packages/client/public/images/mission_17_back.png` through `packages/client/public/images/mission_24_back.png`

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
  - If a Duo Cut targeting Sergio fails, Sergio places info token of the announced value in front of targeted wire (also false information).
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

### Mission 19

- Card title: `In the villain's lair...`
- Setup:
  - Add `1` red wire.
  - Add `2 out of 3` yellow wires.
  - Mission includes an external audio-file prompt (QR code/smartphone icon).
- Mission rule (back):
  - Play mission audio file from QR code (or fallback URL from rulebook).
  - Card mostly provides fail/success narrative and campaign progression text.
  - On success, open the `Missions 20 to 30` box.

### Mission 20

- Card title: `The big bad wolf`
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

- Card title: `Kouign amann mortal`
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

- Card title: `None of that in my house!`
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

## 23. Mission Cards 25-34 (Processed from Images, Next 8 Available)

Source images processed in this batch:

- `mission_25(.png/_back.png)`
- `mission_26(.png/_back.png)`
- `mission_27(.png/_back.png)`
- `mission_28(.png/_back.png)`
- `mission_29(.png/_back.png)`
- `mission_30(.png/_back.png)`
- `mission_33(.png/_back.png)`
- `mission_34(.png/_back.png)`

Note:

- `mission_31` and `mission_32` images are not present in `packages/client/public/images/`.

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
  - Then active player must perform a cut (`Duo Cut` or `Solo Cut`) on that number.
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
  - If Captain Lazy fails a Duo Cut action, bomb explodes immediately.
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

### Mission 30

- Card title: `A very speedy mission!`
- Setup:
  - Red setup: `1 out of 2`.
  - Add `4` yellow wires.
  - Shuffle 12 Number cards face down next to board.
  - Mission includes audio-file requirement (QR/smartphone).
- Mission rule (back):
  - Play mission audio file before first round.
  - Card provides fail/success narrative and progression note.
  - On success, open `Missions 31 to 42` box.

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

## 24. Mission Cards 36-43 (Processed from Images, Next 8 Available)

Source images processed in this batch:

- `mission_36(.png/_back.png)`
- `mission_37(.png/_back.png)`
- `mission_38(.png/_back.png)`
- `mission_39(.png/_back.png)`
- `mission_40(.png/_back.png)`
- `mission_41(.png/_back.png)`
- `mission_42(.png/_back.png)`
- `mission_43(.png/_back.png)`

Note:

- `mission_35` image is not present in `packages/client/public/images/`.

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

### Mission 42

- Card title: `What is this circus?`
- Setup:
  - Red setup: `1 out of 3`.
  - Add `4` yellow wires.
  - Card indicates external mission audio (smartphone/QR).
- Mission rule (back):
  - Before first round, play mission sound file.
  - Card otherwise provides fail/success narrative outcome.
  - On success, open box `Missions 43 to 54`.

### Mission 43

- Card title: `Nano and robot`
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
  - Mission win requires cutting/revealing all wires including Nano's wires.
  - Equipment `11` (Coffee Thermos) does not prevent Nano from moving.

## 25. Mission Cards 44-51 (Processed from Images)

Source images processed in this batch:

- `mission_44(.png/_back.png)`
- `mission_45(.png/_back.png)`
- `mission_46(.png/_back.png)`
- `mission_47(.png/_back.png)`
- `mission_48(.png/_back.png)`
- `mission_49(.png/_back.png)`
- `mission_50(.png/_back.png)`
- `mission_51(.png/_back.png)`

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
  - After each round, Captain starts turn by returning all spent tokens to reserve.
  - If player cannot act due to insufficient oxygen, they pass and detonator advances `1`.
  - Communication restriction:
    - No speaking.
    - One gesture allowed: raise thumb up/down to indicate oxygen need.

### Mission 45

- Card title: `My thread, my battle!`
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

- Card title: `Agent 007`
- Setup:
  - Add `4` yellow wires with required values: `5.1`, `6.1`, `7.1`, `8.1`.
  - If Equipment `7` (Emergency Batteries) is drawn, replace it.
  - 2-player override shown on card:
    - Captain does not place info token during setup.
- Mission rule (back):
  - All `7`-value wires must be cut last.
  - Special action:
    - If player starts turn with only `7`s left, they must cut all four 7-wires simultaneously.
    - Failure explodes bomb.
  - If a 7-wire is designated earlier, resolve as normal failure (info token placement and detonator +1).

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

- Card title: `Bottles in the sea`
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
    - One thumb up/down gesture allowed to indicate oxygen need.

### Mission 50

- Card title: `The Black Sea`
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

- Card title: `Unlucky day`
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
  - Active player becomes `the boss` each turn:
    - Reveal top Number card.
    - Choose (without consultation) which player must perform cut on that value.
    - Designated player says `Leader, yes, leader` and executes cut.
    - Then leadership passes left to next player.
  - If designated player lacks the value:
    - They place info token of choice.
    - Detonator advances `1`.
  - Number card is discarded once all 4 matching wires are cut; when deck is empty, reshuffle Number cards.
  - If player starts turn with only red wires remaining, they perform `Reveal Your Red Wires`.

---

## Source

- PDF processed: `tmp/pdfs/BombBusters_rules_EN-web.pdf`
- Upstream URL: `https://tesera.ru/images/items/2386644/BombBusters_rules_EN-web.pdf`
- Rulebook edition in document footer: US edition 2024, version `v1.0`.
