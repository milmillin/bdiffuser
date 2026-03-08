import type {
  AnyEquipmentId,
  CampaignState,
  GameResult,
  GameState,
  Mission30AudioClipId,
  Mission30State,
  NumberCard,
  Player,
  UseEquipmentPayload,
} from "@bomb-busters/shared";
import {
  getMission30AudioClip,
  MISSION_30_HIDDEN_LONG_GRACE_MS,
  MISSION_30_NETWORK_GRACE_MS,
  MISSION_30_HIDDEN_SHORT_GRACE_MS,
} from "@bomb-busters/shared";

const MISSION30_NUMBER_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

const MISSION30_TRIPLE_LOCK_SUPPORT_EQUIPMENT = new Set<AnyEquipmentId>([
  "rewinder",
  "stabilizer",
  "emergency_batteries",
  "false_bottom",
  "emergency_drop",
]);

function shuffle<T>(arr: T[]): T[] {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

function makeMission30NumberDeck(): NumberCard[] {
  return shuffle([...MISSION30_NUMBER_VALUES]).map((value, index) => ({
    id: `m30-deck-${index}-${value}`,
    value,
    faceUp: false,
  }));
}

function getMission30StateInternal(
  state: Pick<GameState, "mission" | "campaign">,
): Mission30State | null {
  if (state.mission !== 30) return null;
  return state.campaign?.mission30 ?? null;
}

export function getMission30State(
  state: Pick<GameState, "mission" | "campaign">,
): Mission30State | null {
  return getMission30StateInternal(state);
}

export function isMission30Scripted(
  state: Pick<GameState, "mission" | "campaign">,
): boolean {
  return getMission30StateInternal(state) != null;
}

function ensureMission30Campaign(state: GameState): asserts state is GameState & {
  campaign: CampaignState & { mission30: Mission30State };
} {
  state.campaign ??= {};
  state.campaign.numberCards ??= {
    deck: makeMission30NumberDeck(),
    visible: [],
    discard: [],
    playerHands: {},
  };
  state.campaign.mission30 ??= {
    phase: "briefing_locked",
    mode: "instruction",
    currentClipId: "briefing",
    mimeMode: false,
    yellowCountsRevealed: false,
  };
}

function countCutValue(state: Readonly<GameState>, value: number): number {
  return state.players.reduce((count, player) => {
    return count + player.hand.filter((tile) => tile.cut && tile.gameValue === value).length;
  }, 0);
}

function getUncutTiles(player: Readonly<Player>) {
  return player.hand.filter((tile) => !tile.cut);
}

function countRemainingYellows(player: Readonly<Player>): number {
  return player.hand.filter((tile) => !tile.cut && tile.color === "yellow").length;
}

function hasRemainingDefusableTiles(state: Readonly<GameState>): boolean {
  return state.players.some((player) =>
    player.hand.some((tile) => !tile.cut && tile.color !== "red"),
  );
}

function getRemainingYellowTiles(state: GameState): Array<{ playerId: string; tileIndex: number }> {
  const tiles: Array<{ playerId: string; tileIndex: number }> = [];
  for (const player of state.players) {
    player.hand.forEach((tile, tileIndex) => {
      if (!tile.cut && tile.color === "yellow") {
        tiles.push({ playerId: player.id, tileIndex });
      }
    });
  }
  return tiles;
}

function clearMission30Timing(state: Mission30State): void {
  delete state.cueEndsAtMs;
  delete state.visibleDeadlineMs;
  delete state.hardDeadlineMs;
}

function applyMission30Clip(
  state: GameState,
  clipId: Mission30AudioClipId,
  nowMs: number,
  status: "playing" | "paused" = "playing",
): void {
  const missionAudio = state.missionAudio;
  if (!missionAudio) return;

  const clip = getMission30AudioClip(clipId);
  missionAudio.status = status;
  missionAudio.positionMs = clip.startMs;
  missionAudio.syncedAtMs = nowMs;
  missionAudio.clipId = clip.id;
  missionAudio.segmentStartMs = clip.startMs;
  missionAudio.segmentEndMs = clip.endMs;
  missionAudio.loopSegment = clip.loop;
  missionAudio.transportLocked = true;
}

function getMission30AudioCurrentPosition(state: GameState, nowMs: number): number {
  const missionAudio = state.missionAudio;
  if (!missionAudio) return 0;
  if (missionAudio.status !== "playing") {
    return Math.max(0, Math.round(missionAudio.positionMs));
  }

  const rawPosition = missionAudio.positionMs + Math.max(0, nowMs - missionAudio.syncedAtMs);
  const startMs = missionAudio.segmentStartMs ?? 0;
  const endMs = missionAudio.segmentEndMs;
  if (endMs == null) return Math.max(0, Math.round(rawPosition));
  if (!missionAudio.loopSegment) {
    return Math.max(startMs, Math.min(endMs, Math.round(rawPosition)));
  }

  const lengthMs = Math.max(1, endMs - startMs);
  if (rawPosition < startMs) return startMs;
  return startMs + ((rawPosition - startMs) % lengthMs);
}

function refillMission30Deck(state: GameState): void {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards || numberCards.deck.length > 0 || numberCards.discard.length === 0) {
    return;
  }
  numberCards.deck = shuffle(
    numberCards.discard.map((card, index) => ({
      id: `m30-reshuffle-${index}-${card.value}`,
      value: card.value,
      faceUp: false,
    })),
  );
  numberCards.discard = [];
}

function discardVisibleCards(state: GameState): void {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards || numberCards.visible.length === 0) return;
  numberCards.discard.push(
    ...numberCards.visible.map((card) => ({ ...card, faceUp: true })),
  );
  numberCards.visible = [];
}

function drawVisibleCards(state: GameState, count: number): NumberCard[] {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards) return [];
  refillMission30Deck(state);
  const cards = numberCards.deck.splice(0, count).map((card) => ({
    ...card,
    faceUp: true,
  }));
  numberCards.visible = cards;
  return cards;
}

function drawRevealCard(state: GameState): NumberCard | null {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards) return null;
  refillMission30Deck(state);
  const card = numberCards.deck.shift();
  if (!card) return null;
  const revealed = { ...card, faceUp: true };
  numberCards.discard.push(revealed);
  return revealed;
}

function setCurrentTargetValue(state: Mission30State, value: number | undefined): void {
  if (value == null) {
    delete state.currentTargetValue;
    delete state.visibleTargetValues;
    return;
  }
  state.currentTargetValue = value;
  delete state.visibleTargetValues;
}

function setTripleLockValues(state: Mission30State, values: number[]): void {
  delete state.currentTargetValue;
  state.visibleTargetValues = [...values];
}

function revealYellowCounts(state: GameState): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  mission30.yellowCountsRevealed = true;
  mission30.publicYellowCountsByPlayerId = Object.fromEntries(
    state.players.map((player) => [player.id, countRemainingYellows(player)]),
  );
}

export function updateMission30YellowCounts(state: GameState): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30 || !mission30.yellowCountsRevealed) return;
  revealYellowCounts(state);
}

function enterInstruction(
  state: GameState,
  phase: Mission30State["phase"],
  clipId: Mission30AudioClipId,
  nowMs: number,
): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  mission30.phase = phase;
  mission30.mode = "instruction";
  mission30.currentClipId = clipId;
  mission30.pausedAtMs = undefined;
  clearMission30Timing(mission30);
  const clip = getMission30AudioClip(clipId);
  mission30.cueEndsAtMs = nowMs + (clip.endMs - clip.startMs);
  applyMission30Clip(state, clipId, nowMs, "playing");
}

function enterActionBed(
  state: GameState,
  phase: Mission30State["phase"],
  clipId: Mission30AudioClipId,
  nowMs: number,
  visibleDurationMs?: number,
  hardGraceMs?: number,
): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  const clip = getMission30AudioClip(clipId);
  mission30.phase = phase;
  mission30.mode = "action";
  mission30.currentClipId = clipId;
  mission30.pausedAtMs = undefined;
  clearMission30Timing(mission30);
  if (visibleDurationMs != null) {
    mission30.visibleDeadlineMs = nowMs + visibleDurationMs;
    mission30.hardDeadlineMs =
      mission30.visibleDeadlineMs
      + (hardGraceMs ?? 0)
      + MISSION_30_NETWORK_GRACE_MS;
  } else if (!clip.loop) {
    mission30.hardDeadlineMs = nowMs + (clip.endMs - clip.startMs);
  }
  applyMission30Clip(state, clipId, nowMs, "playing");
}

function pauseMission30Transport(state: GameState, nowMs: number): void {
  const missionAudio = state.missionAudio;
  if (!missionAudio) return;
  missionAudio.positionMs = getMission30AudioCurrentPosition(state, nowMs);
  missionAudio.syncedAtMs = nowMs;
  missionAudio.status = "paused";
}

function pauseMission30Audio(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  pauseMission30Transport(state, nowMs);
  mission30.mode = "paused";
  mission30.pausedAtMs = nowMs;
}

function resumeMission30Audio(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  const missionAudio = state.missionAudio;
  if (!mission30 || !missionAudio) return;
  const pausedAtMs = mission30.pausedAtMs;
  if (pausedAtMs != null) {
    const deltaMs = Math.max(0, nowMs - pausedAtMs);
    if (mission30.cueEndsAtMs != null) mission30.cueEndsAtMs += deltaMs;
    if (mission30.visibleDeadlineMs != null) mission30.visibleDeadlineMs += deltaMs;
    if (mission30.hardDeadlineMs != null) mission30.hardDeadlineMs += deltaMs;
  }
  mission30.pausedAtMs = undefined;
  mission30.mode = mission30.cueEndsAtMs != null ? "instruction" : "action";
  missionAudio.positionMs = getMission30AudioCurrentPosition(state, nowMs);
  missionAudio.syncedAtMs = nowMs;
  missionAudio.status =
    mission30.phase === "yellow_sweep" && mission30.cueEndsAtMs == null
      ? "paused"
      : "playing";
}

function autoStartRoundAction(
  state: GameState,
  phase: Extract<
    Mission30State["phase"],
    "round_a1" | "round_a2" | "round_b1" | "round_b2" | "round_c1" | "round_c2"
  >,
  clipId: Mission30AudioClipId,
  nowMs: number,
  visibleDurationMs: number,
  hiddenGraceMs: number,
): void {
  discardVisibleCards(state);
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  const [card] = drawVisibleCards(state, 1);
  setCurrentTargetValue(mission30, card?.value);
  enterActionBed(state, phase, clipId, nowMs, visibleDurationMs, hiddenGraceMs);
}

function moveToTripleLockIntro(state: GameState, nowMs: number): void {
  discardVisibleCards(state);
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  setCurrentTargetValue(mission30, undefined);
  enterInstruction(state, "triple_lock_intro", "tripleLockInstruction", nowMs);
}

function beginTripleLock(state: GameState, nowMs: number): void {
  discardVisibleCards(state);
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  const cards = drawVisibleCards(state, 3);
  setTripleLockValues(
    mission30,
    cards.map((card) => card.value),
  );
  enterActionBed(
    state,
    "triple_lock",
    "tripleLockBed",
    nowMs,
    120_000,
    MISSION_30_HIDDEN_LONG_GRACE_MS,
  );
}

function beginFinalCleanupInstruction(state: GameState, nowMs: number): void {
  discardVisibleCards(state);
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  mission30.mimeMode = false;
  setCurrentTargetValue(mission30, undefined);
  enterInstruction(state, "final_cleanup", "finalCleanupInstruction", nowMs);
}

function beginYellowSweepPrompt(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  enterInstruction(state, "yellow_sweep", "yellowSweepInstruction", nowMs);
}

function afterRoundSuccess(
  state: GameState,
  phase: Extract<
    Mission30State["phase"],
    "round_a1" | "round_a2" | "round_b1" | "round_b2" | "round_c1" | "round_c2"
  >,
  nowMs: number,
): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;

  discardVisibleCards(state);
  delete mission30.lastYesNoReveal;

  switch (phase) {
    case "round_a1":
      enterInstruction(state, "round_a2", "roundA2Instruction", nowMs);
      return;
    case "round_a2":
      enterInstruction(state, "round_b1", "roundB1Instruction", nowMs);
      return;
    case "round_b1":
      mission30.roundB1Succeeded = true;
      enterInstruction(state, "round_b2", "roundB2Instruction", nowMs);
      return;
    case "round_b2":
      enterInstruction(state, "mime_intro", "mimeIntroInstruction", nowMs);
      return;
    case "round_c1":
      enterInstruction(state, "round_c2", "roundC2Instruction", nowMs);
      return;
    case "round_c2":
      moveToTripleLockIntro(state, nowMs);
      return;
  }
}

function increaseDetonator(state: GameState): GameResult | null {
  state.board.detonatorPosition = Math.min(
    state.board.detonatorPosition + 1,
    state.board.detonatorMax,
  );
  if (state.board.detonatorPosition >= state.board.detonatorMax) {
    state.result = "loss_detonator";
    state.phase = "finished";
    const mission30 = getMission30StateInternal(state);
    if (mission30) {
      mission30.phase = "failed";
    }
    return "loss_detonator";
  }
  return null;
}

function resolveRoundFailure(state: GameState, phase: Mission30State["phase"], nowMs: number): GameResult | null {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return null;
  discardVisibleCards(state);

  switch (phase) {
    case "round_a1": {
      const result = increaseDetonator(state);
      if (result) return result;
      enterInstruction(state, "round_a2", "roundA2Instruction", nowMs);
      return null;
    }
    case "round_a2": {
      const result = increaseDetonator(state);
      if (result) return result;
      enterInstruction(state, "round_b1", "roundB1Instruction", nowMs);
      return null;
    }
    case "round_b1": {
      mission30.roundB1Succeeded = false;
      const result = increaseDetonator(state);
      if (result) return result;
      enterInstruction(state, "round_b2", "roundB2Instruction", nowMs);
      return null;
    }
    case "round_b2": {
      const result = increaseDetonator(state);
      if (result) return result;
      enterInstruction(state, "mime_intro", "mimeIntroInstruction", nowMs);
      return null;
    }
    case "round_c1":
    case "round_c2": {
      const revealCard = drawRevealCard(state);
      const activePlayer = state.players[state.currentPlayerIndex];
      if (revealCard && activePlayer) {
        mission30.lastYesNoReveal = {
          actorId: activePlayer.id,
          value: revealCard.value,
          hasValue: activePlayer.hand.some(
            (tile) => !tile.cut && tile.gameValue === revealCard.value,
          ),
        };
      }
      if (phase === "round_c1") {
        enterInstruction(state, "round_c2", "roundC1MissInstruction", nowMs);
      } else {
        moveToTripleLockIntro(state, nowMs);
      }
      return null;
    }
    case "triple_lock":
    case "final_cleanup":
      state.result = "loss_timer";
      state.phase = "finished";
      mission30.phase = "failed";
      return "loss_timer";
    default:
      return null;
  }
}

export function initializeMission30Setup(state: GameState): void {
  ensureMission30Campaign(state);
}

export function initializeMission30AudioTransport(state: GameState, nowMs: number): void {
  if (!isMission30Scripted(state) || !state.missionAudio) return;
  applyMission30Clip(state, "briefing", nowMs, "paused");
}

export function startMission30Gameplay(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;
  mission30.phase = "briefing_locked";
  mission30.mode = "instruction";
  mission30.currentClipId = "briefing";
  mission30.mimeMode = false;
  mission30.yellowCountsRevealed = false;
  delete mission30.publicYellowCountsByPlayerId;
  delete mission30.lastYesNoReveal;
  delete mission30.roundB1Succeeded;
  setCurrentTargetValue(mission30, undefined);
  enterInstruction(state, "briefing_locked", "briefing", nowMs);
}

export function pauseMission30(state: GameState, nowMs: number): void {
  if (!isMission30Scripted(state)) return;
  pauseMission30Audio(state, nowMs);
}

export function resumeMission30(state: GameState, nowMs: number): void {
  if (!isMission30Scripted(state)) return;
  resumeMission30Audio(state, nowMs);
}

function isRoundObjectiveMet(state: GameState, phase: Mission30State["phase"]): boolean {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return false;
  if (phase === "final_cleanup") {
    return !hasRemainingDefusableTiles(state);
  }
  if (phase === "triple_lock") {
    const values = mission30.visibleTargetValues ?? [];
    if (values.length === 0) return false;
    return values.every((value) => countCutValue(state, value) >= 4);
  }
  if (
    phase !== "round_a1"
    && phase !== "round_a2"
    && phase !== "round_b1"
    && phase !== "round_b2"
    && phase !== "round_c1"
    && phase !== "round_c2"
  ) {
    return false;
  }
  const targetValue = mission30.currentTargetValue;
  return typeof targetValue === "number" && countCutValue(state, targetValue) >= 2;
}

export function handleMission30TurnAdvanced(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return;

  updateMission30YellowCounts(state);
  if (mission30.mode !== "action") return;

  if (!isRoundObjectiveMet(state, mission30.phase)) return;

  switch (mission30.phase) {
    case "round_a1":
    case "round_a2":
    case "round_b1":
    case "round_b2":
    case "round_c1":
    case "round_c2":
      afterRoundSuccess(state, mission30.phase, nowMs);
      return;
    case "triple_lock":
      beginYellowSweepPrompt(state, nowMs);
      return;
    case "final_cleanup":
      state.result = "win";
      state.phase = "finished";
      mission30.phase = "completed";
      clearMission30Timing(mission30);
      return;
    default:
      return;
  }
}

export function handleMission30CueEnd(state: GameState, nowMs: number): void {
  const mission30 = getMission30StateInternal(state);
  if (!mission30 || mission30.mode === "paused") return;

  switch (mission30.phase) {
    case "briefing_locked":
      enterActionBed(state, "prologue_free_play", "prologue", nowMs);
      return;
    case "prologue_free_play":
      enterInstruction(state, "round_a1", "roundA1Instruction", nowMs);
      return;
    case "round_a1":
      autoStartRoundAction(
        state,
        "round_a1",
        "roundABed",
        nowMs,
        20_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_a1")) {
        afterRoundSuccess(state, "round_a1", nowMs);
      }
      return;
    case "round_a2":
      autoStartRoundAction(
        state,
        "round_a2",
        "roundABed",
        nowMs,
        20_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_a2")) {
        afterRoundSuccess(state, "round_a2", nowMs);
      }
      return;
    case "round_b1":
      autoStartRoundAction(
        state,
        "round_b1",
        "roundBBed",
        nowMs,
        20_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_b1")) {
        afterRoundSuccess(state, "round_b1", nowMs);
      }
      return;
    case "round_b2":
      if (mission30.roundB1Succeeded) {
        revealYellowCounts(state);
      }
      autoStartRoundAction(
        state,
        "round_b2",
        "roundBBed",
        nowMs,
        15_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_b2")) {
        afterRoundSuccess(state, "round_b2", nowMs);
      }
      return;
    case "mime_intro":
      mission30.mimeMode = true;
      autoStartRoundAction(
        state,
        "round_c1",
        "roundCBed",
        nowMs,
        15_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_c1")) {
        afterRoundSuccess(state, "round_c1", nowMs);
      }
      return;
    case "round_c2":
      if (mission30.currentClipId === "roundC1MissInstruction") {
        enterInstruction(state, "round_c2", "roundC2Instruction", nowMs);
        return;
      }
      autoStartRoundAction(
        state,
        "round_c2",
        "roundCBed",
        nowMs,
        15_000,
        MISSION_30_HIDDEN_SHORT_GRACE_MS,
      );
      if (isRoundObjectiveMet(state, "round_c2")) {
        afterRoundSuccess(state, "round_c2", nowMs);
      }
      return;
    case "triple_lock_intro":
      beginTripleLock(state, nowMs);
      if (isRoundObjectiveMet(state, "triple_lock")) {
        beginYellowSweepPrompt(state, nowMs);
      }
      return;
    case "yellow_sweep":
      if (getRemainingYellowTiles(state).length === 0) {
        beginFinalCleanupInstruction(state, nowMs);
        return;
      }
      mission30.mode = "action";
      mission30.pausedAtMs = undefined;
      clearMission30Timing(mission30);
      pauseMission30Transport(state, nowMs);
      return;
    case "final_cleanup":
      if (!hasRemainingDefusableTiles(state)) {
        state.result = "win";
        state.phase = "finished";
        mission30.phase = "completed";
        clearMission30Timing(mission30);
        return;
      }
      enterActionBed(
        state,
        "final_cleanup",
        "finalCleanupBed",
        nowMs,
        120_000,
        MISSION_30_HIDDEN_LONG_GRACE_MS,
      );
      return;
    default:
      return;
  }
}

export function handleMission30Deadline(state: GameState, nowMs: number): GameResult | null {
  const mission30 = getMission30StateInternal(state);
  if (!mission30 || mission30.mode !== "action" || mission30.hardDeadlineMs == null) {
    return null;
  }
  if (nowMs < mission30.hardDeadlineMs) return null;
  if (mission30.phase === "prologue_free_play") {
    enterInstruction(state, "round_a1", "roundA1Instruction", nowMs);
    return null;
  }
  return resolveRoundFailure(state, mission30.phase, nowMs);
}

function isTripleLockPhase(state: Readonly<GameState>): boolean {
  const mission30 = getMission30StateInternal(state);
  return mission30?.phase === "triple_lock" && mission30.mode === "action";
}

function getTripleLockValues(state: Readonly<GameState>): Set<number> {
  const mission30 = getMission30StateInternal(state);
  return new Set(mission30?.visibleTargetValues ?? []);
}

function isLegalTripleLockValue(state: Readonly<GameState>, value: unknown): value is number {
  return typeof value === "number" && getTripleLockValues(state).has(value);
}

function actorHasTripleLockSolo(state: Readonly<GameState>, actor: Readonly<Player>, value: number): boolean {
  const actorCount = actor.hand.filter((tile) => !tile.cut && tile.gameValue === value).length;
  if (actorCount !== 2 && actorCount !== 4) return false;
  const totalRemaining = state.players.reduce((count, player) => {
    return count + player.hand.filter((tile) => !tile.cut && tile.gameValue === value).length;
  }, 0);
  return totalRemaining === actorCount;
}

function actorHasTripleLockDualTarget(
  state: Readonly<GameState>,
  actor: Readonly<Player>,
  value: number,
): boolean {
  if (!actor.hand.some((tile) => !tile.cut && tile.gameValue === value)) return false;
  return state.players.some((player) =>
    player.id !== actor.id
    && player.hand.some(
      (tile) =>
        !tile.cut
        && tile.color === "blue"
        && tile.gameValue === value,
    ),
  );
}

export function canMission30PassTurn(
  state: Readonly<GameState>,
  actor: Readonly<Player>,
): boolean {
  if (!isTripleLockPhase(state)) return false;

  const legalValues = [...getTripleLockValues(state)];
  return !legalValues.some((value) =>
    actorHasTripleLockSolo(state, actor, value) || actorHasTripleLockDualTarget(state, actor, value),
  );
}

function validateTripleLockTargetTile(
  state: Readonly<GameState>,
  playerId: string,
  tileIndex: number,
): boolean {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const tile = player?.hand[tileIndex];
  return tile?.cut !== true
    && tile?.color === "blue"
    && isLegalTripleLockValue(state, tile?.gameValue);
}

export function validateMission30Action(
  state: Readonly<GameState>,
  action: {
    type: string;
    actorId: string;
    targetPlayerId?: string;
    targetTileIndex?: number;
    tileIndex1?: number;
    tileIndex2?: number;
    value?: number | "YELLOW";
    guessValue?: number | "YELLOW";
    targets?: Array<{ playerId: string; tileIndex: number }>;
  },
): string | null {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return null;

  if (mission30.mode !== "action") {
    return mission30.mode === "paused"
      ? "Mission 30 is paused."
      : "Mission 30: listen to the current instruction before acting.";
  }

  if (mission30.phase === "yellow_sweep") {
    return "Mission 30: resolve the yellow-sweep prompt before taking another action.";
  }

  if (!isTripleLockPhase(state)) {
    return null;
  }

  switch (action.type) {
    case "soloCut":
      return isLegalTripleLockValue(state, action.value)
        ? null
        : "Mission 30: only the three visible target values may be cut right now.";
    case "dualCut":
      if (!isLegalTripleLockValue(state, action.guessValue)) {
        return "Mission 30: only the three visible target values may be cut right now.";
      }
      return action.targetPlayerId != null && action.targetTileIndex != null
        && validateTripleLockTargetTile(state, action.targetPlayerId, action.targetTileIndex)
        ? null
        : "Mission 30: only blue wires matching the three visible target values may be cut right now.";
    case "dualCutDoubleDetector":
      if (!isLegalTripleLockValue(state, action.guessValue)) {
        return "Mission 30: only the three visible target values may be cut right now.";
      }
      if (
        action.targetPlayerId == null
        || action.tileIndex1 == null
        || action.tileIndex2 == null
      ) {
        return "Mission 30: only blue wires matching the three visible target values may be cut right now.";
      }
      return validateTripleLockTargetTile(state, action.targetPlayerId, action.tileIndex1)
        && validateTripleLockTargetTile(state, action.targetPlayerId, action.tileIndex2)
        ? null
        : "Mission 30: only blue wires matching the three visible target values may be cut right now.";
    case "simultaneousRedCut":
    case "challengeRedCut":
    case "revealReds":
    case "simultaneousFourCut":
      return "Mission 30: only blue wires matching the three visible target values may be cut right now.";
    default:
      return null;
  }
}

export function validateMission30Equipment(
  state: Readonly<GameState>,
  equipmentId: AnyEquipmentId,
  payload: UseEquipmentPayload,
): string | null {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) return null;

  if (mission30.mode !== "action") {
    return mission30.mode === "paused"
      ? "Mission 30 is paused."
      : "Mission 30: listen to the current instruction before using equipment.";
  }

  if (mission30.phase === "yellow_sweep") {
    return "Mission 30: resolve the yellow-sweep prompt before using equipment.";
  }

  if (!isTripleLockPhase(state)) {
    return null;
  }

  if (!MISSION30_TRIPLE_LOCK_SUPPORT_EQUIPMENT.has(equipmentId)) {
    return "Mission 30: equipment may only be used during triple lock if it does not target illegal values.";
  }

  if (payload.kind === "false_bottom") {
    return null;
  }

  return null;
}

export function executeMission30Mistake(
  state: GameState,
): GameResult | null {
  return increaseDetonator(state);
}

export function executeMission30CutRemainingYellows(
  state: GameState,
  actorId: string,
  nowMs: number,
): { ok: boolean; error?: string; result?: GameResult | null; tilesCut?: number } {
  const mission30 = getMission30StateInternal(state);
  if (!mission30) {
    return { ok: false, error: "Mission 30 scripted state is not active." };
  }
  if (mission30.phase !== "yellow_sweep" || mission30.mode !== "action") {
    return { ok: false, error: "Mission 30 is not currently in the yellow-sweep step." };
  }

  const actor = state.players.find((player) => player.id === actorId);
  if (!actor) {
    return { ok: false, error: "Actor not found" };
  }

  if (state.players[state.currentPlayerIndex]?.id !== actorId) {
    return { ok: false, error: "You cannot resolve another player's yellow sweep." };
  }

  const remainingYellows = getRemainingYellowTiles(state);
  const actorRemainingYellowCount = actor.hand.filter(
    (tile) => !tile.cut && tile.color === "yellow",
  ).length;

  if (remainingYellows.length === 0) {
    beginFinalCleanupInstruction(state, nowMs);
    return { ok: true, result: null, tilesCut: 0 };
  }

  if (actorRemainingYellowCount !== remainingYellows.length) {
    state.result = "loss_detonator";
    state.phase = "finished";
    mission30.phase = "failed";
    return { ok: true, result: "loss_detonator" };
  }

  for (const { tileIndex } of remainingYellows.filter((tile) => tile.playerId === actorId)) {
    const tile = actor.hand[tileIndex];
    if (tile) {
      tile.cut = true;
    }
  }

  updateMission30YellowCounts(state);
  beginFinalCleanupInstruction(state, nowMs);
  return { ok: true, result: null, tilesCut: remainingYellows.length };
}

export function getMission30AlarmDeadline(
  state: Readonly<GameState>,
): number | null {
  const mission30 = getMission30StateInternal(state);
  if (!mission30 || mission30.mode === "paused") return null;
  if (mission30.cueEndsAtMs != null) return mission30.cueEndsAtMs;
  if (mission30.hardDeadlineMs != null) return mission30.hardDeadlineMs;
  return null;
}
