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

---

## Source

- PDF processed: `tmp/pdfs/BombBusters_rules_EN-web.pdf`
- Upstream URL: `https://tesera.ru/images/items/2386644/BombBusters_rules_EN-web.pdf`
- Rulebook edition in document footer: US edition 2024, version `v1.0`.
