import type { ClientGameState, ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import {
  BLUE_COPIES_PER_VALUE,
  MISSIONS,
  describeWirePoolSpec,
  renderLogDetail,
  resolveMissionSetup,
} from "@bomb-busters/shared";

export function buildSystemPrompt(): string {
  return `You are an AI player in Bomb Busters, a fully cooperative wire-cutting board game. 2-5 players work together to defuse a bomb. You win when all tile stands are empty. You lose if a red wire is cut or the detonator reaches the skull.

## Game Overview
- Each player has a hand of wire tiles on a stand, sorted left-to-right by ascending value.
- You can see YOUR OWN tiles face-up. You CANNOT see other players' uncut tiles (HIDDEN). You CAN see cut tiles.
- 48 blue wires total: values 1-12, 4 copies each.
- Red wires are bombs — cutting one loses the game instantly!
- Yellow wires are wild — during gameplay all yellow wires share the value "YELLOW". They sort between blue values based on their hidden decimal position.

## Actions (pick exactly one per turn)
1. **dualCut** — Pick an opponent's hidden tile and guess its value. You must hold an uncut tile of that same value.
   - Correct guess: both your tile and theirs are cut (progress!).
   - Wrong guess on blue/yellow: detonator advances 1, and an info token showing the actual value is placed on that tile. You do NOT reveal which of your tiles you intended to match.
   - Wrong guess on red: GAME OVER (explosion!).
2. **soloCut** — Cut ALL your own tiles of a specific value. Only valid if you hold ALL remaining uncut copies of that value in the entire game (e.g., all 4 blue-3s, or the remaining 2 if 2 were already cut).
3. **revealReds** — If ALL your remaining uncut tiles are red, reveal them all (removes them safely). Free and safe — always do it when eligible.
4. **chooseNextPlayer** — Only when a forced action is pending for the captain: choose which player takes the next turn.
5. **simultaneousFourCut** — Cut all 4 copies of a specific value simultaneously across all stands. Only available when mission rules enable it.
6. **useEquipment** — Use an unlocked equipment card. Specify equipmentId and payload.
7. **dualCutDoubleDetector** — Pick 2 tiles on one opponent stand and guess one value. If either matches, success.

## Info Tokens
- Info tokens are placed in front of tiles to indicate their value.
- A numbered info token (e.g., "5") on a tile position means that tile has value 5.
- A yellow info token means that tile is a yellow wire.
- During setup, each player places exactly 1 info token on one of their own blue wires with matching value, giving teammates a hint.
- Some missions disable info tokens entirely (e.g., mission 58). In those missions there are no setup tokens, wrong guesses do not add info tokens, and token-placing equipment is unusable.
- Use info tokens to make SAFE dualCut guesses — a tile with an info token has a known value!

## Board Markers
- Red markers on the board indicate which sort positions MIGHT have red wires.
- Yellow markers indicate which sort positions MIGHT have yellow wires.
- "Position" refers to the sort slot between blue values (e.g., position 3.5 is between values 3 and 4).
- Tiles near red marker positions are DANGEROUS to guess — they might be red!

## Equipment Cards
- Equipment cards become usable once 2 wires of the card's trigger value are cut.
- Each equipment card is one-time use. Any player can use activated equipment.

## Validation Track
- When all 4 blue wires of a value are cut, a validation token is placed (value:4/4).
- This helps track progress toward the win condition.

## Strategy Tips
- ALWAYS prefer revealReds when eligible (zero risk).
- ALWAYS prefer soloCut when available (zero risk, cuts multiple tiles).
- For dualCut, STRONGLY prefer tiles with info tokens when the mission uses them.
- Avoid guessing tiles near red/yellow marker positions unless you have info tokens confirming the value.
- Consider the validation track: if a value shows 2/4 cut, the remaining 2 copies are still out there.
- The detonator has limited space — every wrong guess brings you closer to losing.
- If you hold many copies of the same value, consider that opponents may also hold copies.

## Chat & Communication Rules
- Your teammates may send chat messages with hints or suggestions. Consider them carefully.
- Your "communication" field will be shared with ALL players as a chat message.

COMMUNICATION RULES (these match the real board game rules):
- You MUST NOT reveal or hint at your own tile values, colors, or positions.
  BAD: "I have a 5 and a 7", "My third tile is red", "I can match that value"
- You MUST NOT reveal which tile you intend to cut from your own hand.
- You CAN discuss general strategy and tactics.
  GOOD: "Let's focus on tiles with info tokens", "Should we use the Rewinder?"
- You CAN discuss publicly visible information (cut tiles, info tokens, board markers, validation track, equipment).
  GOOD: "The 3s are at 2/4 on the validation track", "There's an info token showing 5 on your second tile"
- You CAN suggest which opponent tiles to target based on public info.
  GOOD: "Your tile at position 2 has an info token — someone should target it"
- You CAN discuss equipment timing and usage plans.
- Keep communication brief and helpful.
- If you have nothing useful to say that follows these rules, set communication to null.

## Response Format
You MUST respond with a JSON object. Always populate the "thinking" field FIRST using the structured steps below, then decide your action.

"thinking" is your PRIVATE scratchpad (never shown to other players). Follow these steps IN ORDER:

STEP 1 — SAFE ACTIONS CHECK:
- Can I revealReds? (All my remaining tiles are red?)
- Can I soloCut any value? (I hold ALL remaining uncut copies?)
- If YES to either → do it immediately, skip remaining steps.

STEP 2 — INFO TOKEN TARGETS:
- List each opponent tile that has an info token.
- For each, do I hold an uncut tile of the matching value?
- If YES → this is a SAFE dualCut (guaranteed correct). Prefer these.

STEP 3 — DANGER ASSESSMENT:
- Which opponent tiles are near red marker positions? List them.
- These are DANGEROUS — a wrong guess on red = instant loss.
- NEVER guess a tile near a red marker unless an info token confirms its value.

STEP 4 — DETONATOR BUDGET:
- Current detonator position vs max. How many wrong guesses can we survive?
- If budget is tight (≤2 remaining), only take guaranteed-safe actions.
- If budget is comfortable, a calculated risk on a non-dangerous tile is acceptable.

STEP 5 — BEST DUALCUT PICK (only if no safe actions from Steps 1-2):
- Among non-dangerous opponent tiles, which value do I hold the most copies of?
- More copies = higher chance an opponent's tile matches.
- Prefer tiles far from red markers. Prefer opponents with fewer remaining tiles.

STEP 6 — EQUIPMENT CHECK:
- Any unlocked equipment that would help right now? (Rewinder, Talkies-Walkies, etc.)

STEP 7 — DECISION:
- State which action you chose and why, based on the steps above.

After "thinking", include:
- "communication": a brief message to teammates (or null). MUST NOT reveal your own tiles.
- The action fields.

Action formats:

{"thinking": "STEP 1: No reds, no solo cuts. STEP 2: Bravo[2] has info token=5, I hold a 5. Safe match! STEP 3-6: N/A. STEP 7: dualCut Bravo[2] with guess 5.", "communication": "Going for the confirmed tile", "action": "dualCut", "targetPlayerId": "player-id", "targetTileIndex": 2, "guessValue": 5}

{"thinking": "STEP 1: I hold all 3 remaining copies of 8 (1 already cut). Solo cut! STEP 7: soloCut 8.", "communication": null, "action": "soloCut", "value": 8}

{"thinking": "STEP 1: All my tiles are red. RevealReds! STEP 7: revealReds.", "communication": "Clearing my reds", "action": "revealReds"}

{"thinking": "STEP 7: Bravo has the most tiles and an info token target.", "communication": null, "action": "chooseNextPlayer", "targetPlayerId": "player-id"}

{"thinking": "STEP 6: Rewinder unlocked, detonator at 5/7. STEP 7: use Rewinder.", "communication": "Using the Rewinder", "action": "useEquipment", "equipmentId": "rewinder", "payload": {}}

{"thinking": "STEP 7: simultaneous four cut available for value 6.", "communication": null, "action": "simultaneousFourCut"}

{"thinking": "STEP 5: Two adjacent hidden tiles on Bravo. STEP 7: double detector.", "communication": null, "action": "dualCutDoubleDetector", "targetPlayerId": "player-id", "tileIndex1": 0, "tileIndex2": 1, "guessValue": 5}

guessValue can be a number (1-12) or "YELLOW" for yellow wires.
soloCut value can be a number (1-12) or "YELLOW".`;
}

function formatInfoToken(token: {
  value: number;
  isYellow: boolean;
  parity?: "even" | "odd";
  countHint?: 1 | 2 | 3 | 4;
  relation?: "eq" | "neq";
}): string {
  if (token.relation === "eq") return "=";
  if (token.relation === "neq") return "!=";
  if (token.isYellow) return "YELLOW";
  if (token.countHint != null) return `x${token.countHint}`;
  if (token.parity === "even") return "EVEN";
  if (token.parity === "odd") return "ODD";
  return String(token.value);
}

export function buildUserMessage(state: ClientGameState, chatContext?: string): string {
  const me = state.players.find((p) => p.id === state.playerId);
  if (!me) return "ERROR: Cannot find my player state.";

  const lines: string[] = [];

  // Mission context
  const mission = MISSIONS[state.mission];
  const resolvedMission = resolveMissionSetup(state.mission, state.players.length);
  lines.push(`=== YOUR TURN (Turn ${state.turnNumber}) ===`);
  lines.push(`Mission: #${state.mission} — ${mission.name} (${mission.difficulty})`);
  if (mission.specialRules) {
    lines.push(`Mission Rules: ${mission.specialRules}`);
  }
  if (state.mission === 58) {
    lines.push(
      "Mission Token Rule: Info tokens are disabled (no setup tokens, no failure tokens, no token-placing equipment).",
    );
  }
  lines.push(
    `Players: ${state.players.length} | Red wires: ${describeWirePoolSpec(resolvedMission.setup.red)} | Yellow wires: ${describeWirePoolSpec(resolvedMission.setup.yellow)}`,
  );
  lines.push(`You are: ${me.name} (id: ${me.id})${me.character ? ` [Character: ${me.character}]` : ""}${me.isCaptain ? " (Captain)" : ""}`);
  lines.push("");

  // My hand
  lines.push("## Your Hand (you can see these):");
  for (let i = 0; i < me.hand.length; i++) {
    const tile = me.hand[i];
    const infoTokens = me.infoTokens.filter(
      (token) => token.position === i || token.positionB === i,
    );
    const infoStr = infoTokens.length > 0
      ? ` [Info Tokens: ${infoTokens.map((token) => formatInfoToken(token)).join(", ")}]`
      : "";
    if (tile.cut) {
      lines.push(`  [${i}] CUT - was ${tile.color} ${tile.gameValue}`);
    } else {
      lines.push(`  [${i}] ${tile.color} ${tile.gameValue}${infoStr}`);
    }
  }
  lines.push("");

  // Opponents
  for (const opp of state.players) {
    if (opp.id === state.playerId) continue;
    lines.push(`## ${opp.name}'s Hand (id: ${opp.id})${opp.isBot ? " [BOT]" : ""}:`);
    for (let i = 0; i < opp.hand.length; i++) {
      const tile = opp.hand[i];
      const infoTokens = opp.infoTokens.filter(
        (token) => token.position === i || token.positionB === i,
      );
      const infoStr = infoTokens.length > 0
        ? ` [Info Tokens: ${infoTokens.map((token) => formatInfoToken(token)).join(", ")}]`
        : "";
      if (tile.cut) {
        lines.push(`  [${i}] CUT - was ${tile.color} ${tile.gameValue}`);
      } else if (tile.color) {
        // Shouldn't happen for hidden tiles but handle it
        lines.push(`  [${i}] ${tile.color} ${tile.gameValue}${infoStr}`);
      } else {
        lines.push(`  [${i}] HIDDEN${infoStr}`);
      }
    }
    lines.push(`  (${opp.remainingTiles} uncut tiles remaining)`);
    lines.push("");
  }

  // Board state
  lines.push("## Board State:");
  if (state.mission === 53 && state.campaign?.nanoTracker) {
    lines.push(
      `  Nano: ${state.campaign.nanoTracker.position === 0 ? "before 1" : state.campaign.nanoTracker.position} / 12 (game over at 12!)`,
    );
  } else {
    lines.push(
      `  Detonator: ${state.board.detonatorPosition} / ${state.board.detonatorMax} (game over at max!)`,
    );
  }
  if (state.timerDeadline != null) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((state.timerDeadline - Date.now()) / 1000),
    );
    lines.push(`  Mission timer: ${remainingSeconds}s remaining`);
  }

  const mission45Turn = state.campaign?.mission45Turn;
  if (state.mission === 45 && mission45Turn) {
    const currentValue =
      typeof mission45Turn.currentValue === "number"
        ? mission45Turn.currentValue
        : null;
    const selectedCutterName =
      mission45Turn.selectedCutterId != null
        ? state.players.find((p) => p.id === mission45Turn.selectedCutterId)?.name ??
          mission45Turn.selectedCutterId
        : null;
    if (mission45Turn.stage === "awaiting_cut" && currentValue != null) {
      lines.push(
        `  Mission 45: only ${selectedCutterName ?? "the selected cutter"} may act, and they must cut value ${currentValue}`,
      );
    } else if (currentValue != null) {
      lines.push(`  Mission 45 current Number card: ${currentValue}`);
    }
  }

  const forcedAction = state.pendingForcedAction;
  if (forcedAction?.kind === "chooseNextPlayer") {
    const captain =
      state.players.find((p) => p.id === forcedAction.captainId)
        ?.name ?? forcedAction.captainId;
    lines.push(`  Forced action pending: Captain ${captain} must choose next player`);
  } else if (forcedAction?.kind === "designateCutter") {
    const designator =
      state.players.find((p) => p.id === forcedAction.designatorId)
        ?.name ?? forcedAction.designatorId;
    lines.push(`  Forced action pending: ${designator} must designate who cuts (number card: ${forcedAction.value})`);
  } else if (forcedAction?.kind === "mission45VolunteerWindow") {
    lines.push("  Forced action pending: Mission 45 volunteer window is open for Snip!");
  } else if (forcedAction?.kind === "mission45CaptainChoice") {
    lines.push("  Forced action pending: the captain must choose who cuts on Mission 45");
  } else if (forcedAction?.kind === "mission45PenaltyTokenChoice") {
    lines.push("  Forced action pending: the penalized player must choose a stand-side info token");
  }

  const validated = Object.entries(state.board.validationTrack)
    .filter(([, count]) => count > 0)
    .map(([val, count]) => `${val}:${count}/4`)
    .join(", ");
  if (validated) {
    lines.push(`  Validation Track: ${validated}`);
  }

  if (state.board.markers.length > 0) {
    const redMarkers = state.board.markers
      .filter((m) => m.color === "red")
      .map((m) => m.value);
    const yellowMarkers = state.board.markers
      .filter((m) => m.color === "yellow")
      .map((m) => m.value);
    if (redMarkers.length > 0) {
      lines.push(`  Red markers (danger zones): positions ${redMarkers.join(", ")}`);
    }
    if (yellowMarkers.length > 0) {
      lines.push(`  Yellow markers: positions ${yellowMarkers.join(", ")}`);
    }
  }

  const sequenceCards = state.campaign?.numberCards?.visible ?? [];
  const specialMarkers = state.campaign?.specialMarkers ?? [];
  const sequencePointer = specialMarkers.find(
    (marker) => marker.kind === "sequence_pointer",
  );
  const numberDeckCount = state.campaign?.numberCards?.deck.length ?? 0;
  const numberDiscardCount = state.campaign?.numberCards?.discard.length ?? 0;
  if (numberDeckCount > 0 || numberDiscardCount > 0) {
    lines.push(
      `  Number cards: deck ${numberDeckCount}, discard ${numberDiscardCount}`,
    );
  }
  if (sequenceCards.length > 0) {
    lines.push(
      `  Visible number cards: ${sequenceCards.map((card) => card.value).join(" -> ")}`,
    );
    if (sequencePointer) {
      lines.push(`  Sequence pointer index: ${sequencePointer.value}`);
    }
  }

  const constraints = state.campaign?.constraints;
  if (constraints) {
    const globalConstraints = constraints.global
      .filter((constraint) => constraint.active)
      .map((constraint) => constraint.name || constraint.id);
    if (globalConstraints.length > 0) {
      lines.push(`  Constraints (global): ${globalConstraints.join(", ")}`);
    }

    const perPlayerConstraints = Object.entries(constraints.perPlayer)
      .map(([playerId, cards]) => {
        const activeCards = cards
          .filter((constraint) => constraint.active)
          .map((constraint) => constraint.name || constraint.id);
        if (activeCards.length === 0) return null;
        const playerName =
          state.players.find((player) => player.id === playerId)?.name ??
          playerId;
        return `${playerName}: ${activeCards.join(", ")}`;
      })
      .filter((entry): entry is string => entry !== null);
    if (perPlayerConstraints.length > 0) {
      lines.push(`  Constraints (per-player): ${perPlayerConstraints.join(" | ")}`);
    }
  }

  const challenges = state.campaign?.challenges;
  if (challenges) {
    if (challenges.active.length > 0) {
      lines.push(
        `  Challenges active: ${challenges.active.map((challenge) => challenge.name || challenge.id).join(", ")}`,
      );
    }
    if (challenges.completed.length > 0) {
      lines.push(
        `  Challenges completed: ${challenges.completed.map((challenge) => challenge.name || challenge.id).join(", ")}`,
      );
    }
    if (challenges.deck.length > 0) {
      lines.push(`  Challenges deck remaining: ${challenges.deck.length}`);
    }
  }

  const oxygen = state.campaign?.oxygen;
  if (oxygen) {
    const oxygenByPlayer = state.players
      .map((player) => ({
        name: player.name,
        value: oxygen.playerOxygen[player.id] ?? 0,
      }))
      .filter((entry) => entry.value > 0)
      .map((entry) => `${entry.name}:${entry.value}`)
      .join(", ");
    lines.push(
      `  Oxygen: pool ${oxygen.pool}${oxygenByPlayer ? ` | ${oxygenByPlayer}` : ""}`,
    );
  }

  if (state.campaign?.nanoTracker) {
    lines.push(
      `  Nano tracker: ${
        state.mission === 53
          ? `${state.campaign.nanoTracker.position === 0 ? "before 1" : state.campaign.nanoTracker.position}/12`
          : `${state.campaign.nanoTracker.position}/${state.campaign.nanoTracker.max}`
      }`,
    );
  }

  if (state.campaign?.bunkerTracker) {
    lines.push(
      `  Bunker tracker: ${state.campaign.bunkerTracker.position}/${state.campaign.bunkerTracker.max}`,
    );
  }

  const visibleSpecialMarkers = specialMarkers.filter(
    (marker) =>
      marker.kind !== "sequence_pointer" || sequenceCards.length === 0,
  );
  if (visibleSpecialMarkers.length > 0) {
    lines.push(
      `  Special markers: ${visibleSpecialMarkers.map((marker) => `${marker.kind}:${marker.value}`).join(", ")}`,
    );
  }

  const equipmentLocks = state.board.equipment
    .filter(
      (equipment) =>
        equipment.secondaryLockValue !== undefined &&
        !equipment.used,
    )
    .map((equipment) => {
      const value = equipment.secondaryLockValue as number;
      const required = equipment.secondaryLockCutsRequired ?? 2;
      let cutCount = 0;
      for (const player of state.players) {
        for (const tile of player.hand) {
          if (tile.cut && tile.gameValue === value) cutCount++;
        }
      }
      return `${equipment.name}: ${value} (${Math.min(cutCount, required)}/${required})`;
    });
  if (equipmentLocks.length > 0) {
    lines.push(`  Equipment secondary locks: ${equipmentLocks.join(" | ")}`);
  }
  lines.push("");

  // Recent log
  if (state.log.length > 0) {
    lines.push("## Action Log:");
    for (const entry of state.log) {
      const playerName =
        state.players.find((p) => p.id === entry.playerId)?.name ??
        entry.playerId;
      const detailText = renderLogDetail(
        entry.detail,
        (playerId) => state.players.find((p) => p.id === playerId)?.name ?? playerId,
      );
      lines.push(`  Turn ${entry.turn}: ${playerName} - ${detailText}`);
    }
  }

  // Deduction summary (computed server-side to aid LLM reasoning)
  const deduction = buildDeductionSummary(state, me);
  if (deduction) {
    lines.push(deduction);
  }

  if (chatContext) {
    lines.push("");
    lines.push("## Recent Chat (since your last turn):");
    lines.push(chatContext);
  }

  return lines.join("\n");
}

// ── Deduction Summary ─────────────────────────────────────────

function buildDeductionSummary(
  state: ClientGameState,
  me: ClientPlayer,
): string | null {
  const lines: string[] = [];
  lines.push("## Deduction Summary (computed for you)");

  // 1. Value distribution tracker
  const myValues = new Map<number, number>(); // value → count of uncut in my hand
  const myYellowCount = me.hand.filter((t) => !t.cut && t.gameValue === "YELLOW").length;
  for (const tile of me.hand) {
    if (tile.cut || typeof tile.gameValue !== "number") continue;
    myValues.set(tile.gameValue, (myValues.get(tile.gameValue) ?? 0) + 1);
  }

  // Count all cut tiles across all players (public info)
  const cutCounts = new Map<number, number>(); // value → total cut
  let cutRedCount = 0;
  let cutYellowCount = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (!tile.cut) continue;
      if (typeof tile.gameValue === "number") {
        cutCounts.set(tile.gameValue, (cutCounts.get(tile.gameValue) ?? 0) + 1);
      } else if (tile.gameValue === "YELLOW") {
        cutYellowCount++;
      } else if (tile.color === "red") {
        cutRedCount++;
      }
    }
  }

  // Resolve mission pool to know how many red/yellow exist
  let totalRedWires = 0;
  let totalYellowWires = 0;
  try {
    const resolved = resolveMissionSetup(state.mission, state.players.length);
    const redSpec = resolved.setup.red;
    if (redSpec.kind === "exact") totalRedWires = redSpec.count;
    else if (redSpec.kind === "out_of") totalRedWires = redSpec.keep;
    else if (redSpec.kind === "fixed") totalRedWires = redSpec.values.length;
    else if (redSpec.kind === "exact_same_value") totalRedWires = redSpec.count;
    const yellowSpec = resolved.setup.yellow;
    if (yellowSpec.kind === "exact") totalYellowWires = yellowSpec.count;
    else if (yellowSpec.kind === "out_of") totalYellowWires = yellowSpec.keep;
    else if (yellowSpec.kind === "fixed") totalYellowWires = yellowSpec.values.length;
    else if (yellowSpec.kind === "exact_same_value") totalYellowWires = yellowSpec.count;
  } catch {
    // Non-standard mission, skip pool info
  }

  // Total uncut hidden tiles across opponents
  const totalHiddenOpponent = state.players
    .filter((p) => p.id !== state.playerId)
    .reduce((sum, p) => sum + p.hand.filter((t) => !t.cut && !t.color).length, 0);

  // Value tracker table
  lines.push("");
  lines.push("### Value Tracker (blue wires, 4 copies each):");
  const valueLines: string[] = [];
  for (let v = 1; v <= 12; v++) {
    const cut = cutCounts.get(v) ?? 0;
    const held = myValues.get(v) ?? 0;
    const accounted = cut + held;
    const unknown = BLUE_COPIES_PER_VALUE - accounted;
    if (cut === BLUE_COPIES_PER_VALUE) {
      valueLines.push(`  ${v}: COMPLETE (4/4 cut)`);
    } else {
      const parts = [`${cut}/4 cut`];
      if (held > 0) parts.push(`you hold ${held}`);
      if (unknown > 0) parts.push(`${unknown} in other hands`);
      valueLines.push(`  ${v}: ${parts.join(", ")}`);
    }
  }
  lines.push(...valueLines);

  // Red/yellow wire status
  const hiddenRedRemaining = totalRedWires - cutRedCount;
  const hiddenYellowRemaining = totalYellowWires - cutYellowCount - myYellowCount;
  if (totalRedWires > 0) {
    lines.push(`  RED: ${cutRedCount}/${totalRedWires} revealed${hiddenRedRemaining > 0 ? ` — ${hiddenRedRemaining} still hidden among ${totalHiddenOpponent} hidden tiles!` : " — all accounted for"}`);
  }
  if (totalYellowWires > 0) {
    const yellowParts = [`${cutYellowCount}/${totalYellowWires} cut`];
    if (myYellowCount > 0) yellowParts.push(`you hold ${myYellowCount}`);
    if (hiddenYellowRemaining > 0) yellowParts.push(`${hiddenYellowRemaining} in other hands`);
    lines.push(`  YELLOW: ${yellowParts.join(", ")}`);
  }

  // 2. Solo cut candidates
  const soloCuts: string[] = [];
  for (const [value, held] of myValues) {
    const cut = cutCounts.get(value) ?? 0;
    if (held + cut === BLUE_COPIES_PER_VALUE) {
      soloCuts.push(`${value} (you hold all ${held} remaining)`);
    }
  }
  if (myYellowCount > 0 && myYellowCount + cutYellowCount === totalYellowWires) {
    soloCuts.push(`YELLOW (you hold all ${myYellowCount} remaining)`);
  }
  if (soloCuts.length > 0) {
    lines.push("");
    lines.push(`### SAFE Solo Cuts Available: ${soloCuts.join(", ")}`);
    lines.push("  → These are RISK-FREE. Always prefer these!");
  }

  // 3. RevealReds eligibility
  const myUncutTiles = me.hand.filter((t) => !t.cut);
  const allRed = myUncutTiles.length > 0 && myUncutTiles.every((t) => t.color === "red");
  if (allRed) {
    lines.push("");
    lines.push("### SAFE Reveal Reds Available!");
    lines.push("  → All your remaining tiles are red. Use revealReds for RISK-FREE progress!");
  }

  // 4. Safe dualCut targets (opponent tiles with info tokens matching values you hold)
  const safeTargets: string[] = [];
  const riskyTargets: string[] = [];
  const redMarkerValues = new Set(
    state.board.markers.filter((m) => m.color === "red").map((m) => m.value),
  );
  const yellowMarkerValues = new Set(
    state.board.markers.filter((m) => m.color === "yellow").map((m) => m.value),
  );

  for (const opp of state.players) {
    if (opp.id === state.playerId) continue;
    for (const token of opp.infoTokens) {
      const tile = opp.hand[token.position];
      if (!tile || tile.cut) continue;

      if (token.isYellow) {
        if (myYellowCount > 0) {
          safeTargets.push(
            `${opp.name}[${token.position}] = YELLOW (info token confirms)`,
          );
        }
      } else if (token.parity) {
        // Parity token — find a matching value
        const matchingValues = [...myValues.keys()].filter((v) =>
          token.parity === "even" ? v % 2 === 0 : v % 2 === 1,
        );
        if (matchingValues.length > 0) {
          safeTargets.push(
            `${opp.name}[${token.position}] = ${token.parity.toUpperCase()} (you hold ${token.parity} values: ${matchingValues.join(",")})`,
          );
        }
      } else if (token.countHint == null && token.value > 0) {
        if (myValues.has(token.value)) {
          safeTargets.push(
            `${opp.name}[${token.position}] = ${token.value} (info token confirms, you hold ${myValues.get(token.value)})`,
          );
        }
      }
    }
  }

  // 5. Danger assessment for opponent hidden tiles near red markers
  if (redMarkerValues.size > 0 || yellowMarkerValues.size > 0) {
    for (const opp of state.players) {
      if (opp.id === state.playerId) continue;
      for (let i = 0; i < opp.hand.length; i++) {
        const tile = opp.hand[i];
        if (tile.cut || tile.color != null) continue; // skip visible tiles
        const dangerMarkers = getDangerMarkersForPosition(
          opp.hand,
          i,
          redMarkerValues,
          yellowMarkerValues,
        );
        if (dangerMarkers.length > 0) {
          riskyTargets.push(
            `${opp.name}[${i}] near ${dangerMarkers.join(", ")} marker(s)`,
          );
        }
      }
    }
  }

  if (safeTargets.length > 0) {
    lines.push("");
    lines.push("### Recommended DualCut Targets (info-token confirmed):");
    for (const t of safeTargets) lines.push(`  → ${t}`);
  }

  if (riskyTargets.length > 0) {
    lines.push("");
    lines.push("### DANGEROUS Tiles (near red/yellow markers — avoid unless confirmed):");
    for (const t of riskyTargets) lines.push(`  ⚠ ${t}`);
  }

  return lines.join("\n");
}

/**
 * Determine which danger markers a hidden tile at `tileIndex` is adjacent to,
 * based on the sort positions of its neighboring cut/visible tiles.
 *
 * Red markers at position X.5 mean the slot between value X and X+1 could hold a red wire.
 * A hidden tile sitting between two known values that bracket a marker position is "near" it.
 */
function getDangerMarkersForPosition(
  hand: VisibleTile[],
  tileIndex: number,
  redMarkerValues: Set<number>,
  yellowMarkerValues: Set<number>,
): string[] {
  // Find the nearest visible sort values to the left and right
  let leftValue: number | null = null;
  let rightValue: number | null = null;

  for (let i = tileIndex - 1; i >= 0; i--) {
    if (hand[i].sortValue != null) {
      leftValue = hand[i].sortValue!;
      break;
    }
  }
  for (let i = tileIndex + 1; i < hand.length; i++) {
    if (hand[i].sortValue != null) {
      rightValue = hand[i].sortValue!;
      break;
    }
  }

  // Default bounds if no neighbors found
  const lo = leftValue ?? 0;
  const hi = rightValue ?? 13;

  const dangers: string[] = [];
  for (const markerPos of redMarkerValues) {
    if (markerPos > lo && markerPos < hi) {
      dangers.push(`RED@${markerPos}`);
    }
  }
  for (const markerPos of yellowMarkerValues) {
    if (markerPos > lo && markerPos < hi) {
      dangers.push(`YEL@${markerPos}`);
    }
  }
  return dangers;
}
