/**
 * Mission Hook Dispatcher
 *
 * Provides a lightweight, typed dispatch layer for mission-specific behavior.
 * Hook handlers are registered by `MissionHookRuleDef['kind']` and invoked at
 * four well-defined points in the game lifecycle:
 *
 *   1. setup     — after board/tiles created, before first turn
 *   2. validate  — before an action is executed, may reject it
 *   3. resolve   — after an action mutates state, may apply side-effects
 *   4. endTurn   — after turn advances, may alter turn order or apply effects
 *
 * ## Deterministic Execution Ordering
 *
 * Hook execution follows these guarantees:
 *
 *   1. **Schema array order**: Rules execute in `hookRules` array index order
 *      (index 0 first, then 1, 2, …). This is the sole ordering axis — there
 *      is no priority field or secondary sort.
 *
 *   2. **Single hook point per dispatch**: Each `dispatchHooks` call targets
 *      exactly one hook point. Rules without a handler for that point are
 *      skipped (no-op), preserving index-order for the rules that do fire.
 *
 *   3. **Side-effect visibility**: State mutations from rule N are visible to
 *      rule N+1 within the same dispatch call (sequential, not snapshot-based).
 *
 *   4. **Result merge precedence**: For HookResult fields, later rules override
 *      earlier ones (object spread). Exception: `validationError` keeps the
 *      first non-undefined value (fail-fast semantics).
 */

import type {
  ActionLegalityCode,
  GameState,
  MissionId,
  NumberCardState,
} from "@bomb-busters/shared";
import {
  EQUIPMENT_DEFS,
  MISSION_SCHEMAS,
  type MissionHookRuleDef,
} from "@bomb-busters/shared";

// ── Hook Point ─────────────────────────────────────────────

export type HookPoint = "setup" | "validate" | "resolve" | "endTurn";

// ── Hook Trace Logging ────────────────────────────────────

export type HookTraceEvent =
  | "dispatch_start"
  | "rule_skip_no_handler"
  | "rule_skip_no_method"
  | "rule_invoke"
  | "dispatch_end";

export interface HookTraceEntry {
  event: HookTraceEvent;
  missionId: MissionId;
  hookPoint: HookPoint;
  /** Rule array index (omitted for dispatch_start/dispatch_end). */
  ruleIndex?: number;
  /** Rule kind (omitted for dispatch_start/dispatch_end). */
  ruleKind?: string;
  /** Total rule count for this mission (present on dispatch_start). */
  ruleCount?: number;
  /** Whether the handler returned a non-void result (present on rule_invoke). */
  hasResult?: boolean;
  /** Key outcome fields from HookResult (present on dispatch_end). */
  mergedResult?: HookResult;
}

export type HookTraceSink = (entry: HookTraceEntry) => void;

let traceSink: HookTraceSink | null = null;

/** Set a trace sink to receive structured hook dispatch entries. */
export function setTraceSink(sink: HookTraceSink): void {
  traceSink = sink;
}

/** Remove the current trace sink. */
export function clearTraceSink(): void {
  traceSink = null;
}

// ── Telemetry (production unknown-hook reporting) ──────────

export interface UnknownHookTelemetryEvent {
  type: "unknown_hook_kind";
  missionId: MissionId;
  hookPoint: HookPoint;
  ruleIndex: number;
  ruleKind: string;
  timestamp: number;
}

export type MissionFailureReason = "loss_red_wire" | "loss_detonator" | "loss_timer";

export interface MissionFailureTelemetryEvent {
  type: "mission_failure";
  missionId: MissionId;
  failureReason: MissionFailureReason;
  turnNumber: number;
  playerCount: number;
  detonatorPosition: number;
  detonatorMax: number;
  actorId: string;
  targetPlayerId: string | null;
  timestamp: number;
}

export type TelemetryEvent = UnknownHookTelemetryEvent | MissionFailureTelemetryEvent;

export type TelemetrySink = (event: TelemetryEvent) => void;

let telemetrySink: TelemetrySink | null = null;

/** Set a telemetry sink to receive structured production events. */
export function setTelemetrySink(sink: TelemetrySink): void {
  telemetrySink = sink;
}

/** Remove the current telemetry sink. */
export function clearTelemetrySink(): void {
  telemetrySink = null;
}

export function emitMissionFailureTelemetry(
  state: GameState,
  failureReason: MissionFailureReason,
  actorId: string,
  targetPlayerId?: string | null,
): void {
  telemetrySink?.({
    type: "mission_failure",
    missionId: state.mission,
    failureReason,
    turnNumber: state.turnNumber,
    playerCount: state.players.length,
    detonatorPosition: state.board.detonatorPosition,
    detonatorMax: state.board.detonatorMax,
    actorId,
    targetPlayerId: targetPlayerId ?? null,
    timestamp: Date.now(),
  });
}

// ── Strict Unknown Hooks (dev/test hard-fail) ─────────────

/**
 * Auto-detect: strict mode ON unless NODE_ENV is explicitly "production".
 * In Cloudflare Workers `process` may not exist, so we guard the access.
 */
function detectStrictDefault(): boolean {
  try {
    const g = globalThis as Record<string, unknown>;
    const proc = g["process"] as { env?: Record<string, string> } | undefined;
    return proc?.env?.NODE_ENV === "production" ? false : true;
  } catch {
    // Workers runtime — default to non-strict (production-safe).
    return false;
  }
}

let strictUnknownHooks: boolean = detectStrictDefault();

/**
 * Enable or disable hard-fail on unknown hook kinds.
 * - `true`  → throw `UnknownHookError` (dev/test default)
 * - `false` → silently skip (production default)
 */
export function setStrictUnknownHooks(value: boolean): void {
  strictUnknownHooks = value;
}

/** Visible for testing — returns the current strict-mode value. */
export function getStrictUnknownHooks(): boolean {
  return strictUnknownHooks;
}

/** Error thrown when dispatcher encounters an unregistered hook kind in strict mode. */
export class UnknownHookError extends Error {
  public readonly hookKind: string;
  public readonly missionId: MissionId;
  public readonly hookPoint: HookPoint;
  public readonly ruleIndex: number;

  constructor(kind: string, missionId: MissionId, hookPoint: HookPoint, ruleIndex: number) {
    super(
      `Unknown hook kind "${kind}" at rule index ${ruleIndex} for mission ${missionId} ` +
      `(hook point: ${hookPoint}). Register a handler or disable strict mode for production.`,
    );
    this.name = "UnknownHookError";
    this.hookKind = kind;
    this.missionId = missionId;
    this.hookPoint = hookPoint;
    this.ruleIndex = ruleIndex;
  }
}

// ── Hook Contexts ──────────────────────────────────────────

export interface SetupHookContext {
  point: "setup";
  state: GameState;
}

export interface ValidateHookContext {
  point: "validate";
  state: Readonly<GameState>;
  action: {
    type: "dualCut" | "simultaneousCut" | "soloCut" | "revealReds";
    actorId: string;
    [key: string]: unknown;
  };
}

export interface ResolveHookContext {
  point: "resolve";
  state: GameState;
  action: {
    type: "dualCut" | "soloCut" | "revealReds";
    actorId: string;
    [key: string]: unknown;
  };
  /** The value that was just cut (if applicable). */
  cutValue?: number | "YELLOW" | "RED";
  /** Whether the cut was successful (for dualCut). */
  cutSuccess?: boolean;
}

export interface EndTurnHookContext {
  point: "endTurn";
  state: GameState;
  /** Player who just completed a turn before turn advancement. */
  previousPlayerId?: string;
}

export type HookContext =
  | SetupHookContext
  | ValidateHookContext
  | ResolveHookContext
  | EndTurnHookContext;

// ── Hook Result ────────────────────────────────────────────

export interface HookResult {
  /** If set, the action is rejected with this error message (validate only). */
  validationError?: string;
  /** Machine-readable reason code paired with `validationError` (validate only). */
  validationCode?: ActionLegalityCode;
  /** If true, skip default equipment unlock logic (resolve only). */
  overrideEquipmentUnlock?: boolean;
  /** Equipment unlock threshold override (resolve only). */
  equipmentUnlockThreshold?: number;
  /** If set during endTurn, overrides the next player index. */
  nextPlayerIndex?: number;
}

// ── Handler Interface ──────────────────────────────────────

/**
 * A mission hook handler implements behavior for one or more hook points.
 * Each method receives the rule definition and a typed context, and returns
 * a partial HookResult (or void/undefined for no effect).
 */
export interface MissionHookHandler<T extends MissionHookRuleDef = MissionHookRuleDef> {
  setup?(rule: T, ctx: SetupHookContext): HookResult | void;
  validate?(rule: T, ctx: ValidateHookContext): HookResult | void;
  resolve?(rule: T, ctx: ResolveHookContext): HookResult | void;
  endTurn?(rule: T, ctx: EndTurnHookContext): HookResult | void;
}

// ── Handler Registry ───────────────────────────────────────

const registry = new Map<MissionHookRuleDef["kind"], MissionHookHandler>();

export function registerHookHandler<K extends MissionHookRuleDef["kind"]>(
  kind: K,
  handler: MissionHookHandler<Extract<MissionHookRuleDef, { kind: K }>>,
): void {
  registry.set(kind, handler as MissionHookHandler);
}

/** Visible for testing — returns whether a handler is registered. */
export function hasHandler(kind: MissionHookRuleDef["kind"]): boolean {
  return registry.has(kind);
}

/** Visible for testing — clears all registered handlers. */
export function clearHandlers(): void {
  registry.clear();
}

// ── Dispatcher ─────────────────────────────────────────────

/**
 * Merge two HookResults, with `next` overriding `prev` for set fields.
 */
function mergeResults(prev: HookResult, next: HookResult): HookResult {
  const mergedValidationError = prev.validationError ?? next.validationError;
  const mergedValidationCode = prev.validationError
    ? prev.validationCode
    : (next.validationError ? next.validationCode : undefined);

  return {
    ...prev,
    ...next,
    // Keep the first validation outcome encountered
    validationError: mergedValidationError,
    validationCode: mergedValidationCode,
  };
}

/**
 * Get the hook rules for a mission. Returns an empty array for missions
 * without hookRules defined.
 */
export function getHookRules(missionId: MissionId): readonly MissionHookRuleDef[] {
  const schema = MISSION_SCHEMAS[missionId];
  return schema?.hookRules ?? [];
}

/**
 * Dispatch hooks for a given mission at a specific hook point.
 *
 * Iterates `hookRules` in **schema array order** (index 0 → N).  For each
 * rule whose registered handler implements the requested hook point, invokes
 * it and merges results.  See module-level "Deterministic Execution Ordering"
 * for the full contract.
 *
 * @returns Merged HookResult from all invoked handlers.
 */
export function dispatchHooks(
  missionId: MissionId,
  ctx: HookContext,
): HookResult {
  const rules = getHookRules(missionId);
  let result: HookResult = {};

  traceSink?.({
    event: "dispatch_start",
    missionId,
    hookPoint: ctx.point,
    ruleCount: rules.length,
  });

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const handler = registry.get(rule.kind);

    if (!handler) {
      traceSink?.({
        event: "rule_skip_no_handler",
        missionId,
        hookPoint: ctx.point,
        ruleIndex: i,
        ruleKind: rule.kind,
      });

      if (strictUnknownHooks) {
        throw new UnknownHookError(rule.kind, missionId, ctx.point, i);
      }

      // Production: emit telemetry event and skip gracefully.
      telemetrySink?.({
        type: "unknown_hook_kind",
        missionId,
        hookPoint: ctx.point,
        ruleIndex: i,
        ruleKind: rule.kind,
        timestamp: Date.now(),
      });
      continue;
    }

    const hookFn = handler[ctx.point];
    if (!hookFn) {
      traceSink?.({
        event: "rule_skip_no_method",
        missionId,
        hookPoint: ctx.point,
        ruleIndex: i,
        ruleKind: rule.kind,
      });
      continue;
    }

    const hookResult = (hookFn as (rule: MissionHookRuleDef, ctx: HookContext) => HookResult | void)(
      rule,
      ctx,
    );

    traceSink?.({
      event: "rule_invoke",
      missionId,
      hookPoint: ctx.point,
      ruleIndex: i,
      ruleKind: rule.kind,
      hasResult: hookResult != null,
    });

    if (hookResult) {
      result = mergeResults(result, hookResult);
    }
  }

  traceSink?.({
    event: "dispatch_end",
    missionId,
    hookPoint: ctx.point,
    mergedResult: result,
  });

  return result;
}

/**
 * Mission 11 helper: extract the hidden blue value that is treated as red.
 * Returns null if the setup marker is missing or malformed.
 */
export function getBlueAsRedValue(state: Readonly<GameState>): number | null {
  const setupEntry = state.log.find(
    (e) => e.action === "hookSetup" && e.detail.startsWith("blue_as_red:"),
  );
  if (!setupEntry) return null;

  const value = Number.parseInt(setupEntry.detail.split(":")[1] ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

// ── Built-in Hook Handlers (Missions 9/10/11/12/15/23/43+/66) ──────

import type {
  BunkerFlowRuleDef,
  ChallengeRewardsRuleDef,
  SequencePriorityRuleDef,
  TimerRuleDef,
  DynamicTurnOrderRuleDef,
  BlueAsRedRuleDef,
  EquipmentDoubleLockRuleDef,
  HiddenEquipmentPileRuleDef,
  NanoProgressionRuleDef,
  NumberDeckEquipmentRevealRuleDef,
  OxygenProgressionRuleDef,
} from "@bomb-busters/shared";

const MISSION_NUMBER_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getSequenceVisibleValues(
  state: Readonly<GameState>,
  cardCount: number,
): number[] | null {
  const visible = state.campaign?.numberCards?.visible ?? [];
  if (visible.length < cardCount) return null;
  return visible.slice(0, cardCount).map((card) => card.value);
}

function getSequencePointer(state: Readonly<GameState>): number {
  const marker = state.campaign?.specialMarkers?.find(
    (m) => m.kind === "sequence_pointer",
  );
  return marker ? Math.max(0, Math.floor(marker.value)) : 0;
}

function setSequencePointer(state: GameState, value: number): void {
  state.campaign ??= {};
  const markers = [...(state.campaign.specialMarkers ?? [])];
  const idx = markers.findIndex((m) => m.kind === "sequence_pointer");
  if (idx >= 0) {
    markers[idx] = { ...markers[idx], value };
  } else {
    markers.push({ kind: "sequence_pointer", value });
  }
  state.campaign.specialMarkers = markers;
}

function setActionPointer(state: GameState, value: number): void {
  state.campaign ??= {};
  const markers = [...(state.campaign.specialMarkers ?? [])];
  const idx = markers.findIndex((m) => m.kind === "action_pointer");
  if (idx >= 0) {
    markers[idx] = { ...markers[idx], value };
  } else {
    markers.push({ kind: "action_pointer", value });
  }
  state.campaign.specialMarkers = markers;
}

function parseTargetValueFromChallengeId(id: string): number | null {
  const match = /challenge-value-(\d+)/.exec(id);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(value)) return null;
  return value;
}

function clampProgress(value: number, max: number): number {
  const boundedMax = Math.max(1, Math.floor(max));
  return Math.min(Math.max(0, Math.floor(value)), boundedMax);
}

function initializeCampaignProgressState(state: GameState): void {
  state.campaign ??= {};
}

function applyNanoDelta(
  state: GameState,
  delta: number,
  actorId: string,
  logDetail: string,
): void {
  const tracker = state.campaign?.nanoTracker;
  if (!tracker) return;

  const before = tracker.position;
  tracker.position = clampProgress(before + delta, tracker.max);

  state.log.push({
    turn: state.turnNumber,
    playerId: actorId,
    action: "hookEffect",
    detail: `nano_progression:${before}->${tracker.position}|${logDetail}`,
    timestamp: Date.now(),
  });

  if (tracker.position >= tracker.max && state.phase !== "finished") {
    state.result = "loss_detonator";
    state.phase = "finished";
    emitMissionFailureTelemetry(state, "loss_detonator", actorId, null);
  }
}

function rotatePlayerOxygenClockwise(state: GameState): void {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return;

  const ids = state.players.map((player) => player.id);
  if (ids.length <= 1) return;

  const rotated: Record<string, number> = {};
  for (let i = 0; i < ids.length; i++) {
    const fromId = ids[(i - 1 + ids.length) % ids.length];
    const toId = ids[i];
    rotated[toId] = oxygen.playerOxygen[fromId] ?? 0;
  }
  oxygen.playerOxygen = rotated;
}

function spendOxygenForTurn(
  state: GameState,
  cost: number,
  playerId: string | undefined,
): { paid: number; deficit: number } {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return { paid: 0, deficit: cost };
  if (cost <= 0) return { paid: 0, deficit: 0 };

  let remaining = Math.max(0, Math.floor(cost));
  let paid = 0;

  if (playerId) {
    const owned = oxygen.playerOxygen[playerId] ?? 0;
    const fromPlayer = Math.min(owned, remaining);
    oxygen.playerOxygen[playerId] = owned - fromPlayer;
    remaining -= fromPlayer;
    paid += fromPlayer;
  }

  const fromPool = Math.min(oxygen.pool, remaining);
  oxygen.pool -= fromPool;
  remaining -= fromPool;
  paid += fromPool;

  return { paid, deficit: remaining };
}

function buildChallengeDeck(totalCount: number) {
  const count = Math.max(1, Math.floor(totalCount));
  const values = [...MISSION_NUMBER_VALUES];
  const cards: { id: string; name: string; description: string; completed: boolean }[] = [];

  let index = 0;
  while (cards.length < count) {
    if (index % values.length === 0) {
      shuffle(values);
    }
    const value = values[index % values.length];
    cards.push({
      id: `challenge-value-${value}-${cards.length}`,
      name: `Challenge ${value}`,
      description: `Complete by successfully cutting value ${value}.`,
      completed: false,
    });
    index++;
  }

  return cards;
}

function getCutCountForValue(state: Readonly<GameState>, value: number): number {
  let count = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut && tile.gameValue === value) count++;
    }
  }
  return count;
}

function getProjectedCutCountForResolve(
  ctx: ResolveHookContext,
  value: number,
): number {
  let count = getCutCountForValue(ctx.state, value);
  if (!ctx.cutSuccess) return count;

  if (ctx.action.type === "dualCut") {
    const actor = ctx.state.players.find((p) => p.id === ctx.action.actorId);
    const hasPendingActorCut =
      actor?.hand.some((tile) => !tile.cut && tile.gameValue === value) ?? false;
    if (hasPendingActorCut) count += 1;
    return count;
  }

  if (ctx.action.type === "soloCut") {
    const actor = ctx.state.players.find((p) => p.id === ctx.action.actorId);
    const pendingSoloCuts =
      actor?.hand.filter((tile) => !tile.cut && tile.gameValue === value).length ?? 0;
    count += pendingSoloCuts;
  }

  return count;
}

function getEffectiveCutCountForResolve(
  ctx: ResolveHookContext,
  value: number,
): number {
  if (ctx.cutSuccess && typeof ctx.cutValue === "number" && ctx.cutValue === value) {
    return getProjectedCutCountForResolve(ctx, value);
  }
  return getCutCountForValue(ctx.state, value);
}

const DISABLE_DEFAULT_EQUIPMENT_UNLOCK_THRESHOLD = Number.MAX_SAFE_INTEGER;

function buildMission15NumberCards() {
  const deckValues = shuffle([...MISSION_NUMBER_VALUES]);
  const firstValue = deckValues.shift();

  return {
    visible:
      firstValue == null
        ? []
        : [{ id: `m15-visible-0-${firstValue}`, value: firstValue, faceUp: true }],
    deck: deckValues.map((value, idx) => ({
      id: `m15-deck-${idx}-${value}`,
      value,
      faceUp: false,
    })),
    discard: [] as { id: string; value: number; faceUp: boolean }[],
  };
}

const BASE_EQUIPMENT_DEFS = EQUIPMENT_DEFS.filter((def) => def.pool === "base");

function buildHiddenEquipmentPile(pileSize: number) {
  const count = Math.max(0, Math.min(Math.floor(pileSize), BASE_EQUIPMENT_DEFS.length));
  const selected = shuffle([...BASE_EQUIPMENT_DEFS]).slice(0, count);
  return selected.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    unlockValue: def.unlockValue,
    unlocked: false,
    used: false,
    image: def.image,
    faceDown: true as const,
  }));
}

function revealMission15NextNumberCard(
  ctx: ResolveHookContext,
  numberCards: NumberCardState,
): number[] {
  const skippedValues: number[] = [];

  while (numberCards.visible.length === 0 && numberCards.deck.length > 0) {
    const next = numberCards.deck.shift()!;
    next.faceUp = true;
    if (getEffectiveCutCountForResolve(ctx, next.value) >= 4) {
      numberCards.discard.push(next);
      skippedValues.push(next.value);
      continue;
    }
    numberCards.visible = [next];
  }

  return skippedValues;
}

/**
 * Mission 9 — Sequence priority (face A).
 *
 * Setup:
 * - Draw 3 unique number cards, show face-up.
 * - Place sequence pointer at index 0 (left card).
 *
 * Validate:
 * - While pointer is 0: middle and right values are forbidden.
 * - While pointer is 1: right value is forbidden.
 * - Other values are always allowed.
 *
 * Resolve:
 * - After each successful numeric cut, if required cut count for the current
 *   pointer value is reached, advance pointer by 1.
 */
registerHookHandler<"sequence_priority">("sequence_priority", {
  setup(rule: SequencePriorityRuleDef, ctx: SetupHookContext): void {
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);
    const visibleValues = deckValues.slice(0, rule.cardCount);
    const hiddenDeckValues = deckValues.slice(rule.cardCount);

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: visibleValues.map((value, idx) => ({
        id: `m9-visible-${idx}-${value}`,
        value,
        faceUp: true,
      })),
      deck: hiddenDeckValues.map((value, idx) => ({
        id: `m9-deck-${idx}-${value}`,
        value,
        faceUp: false,
      })),
      discard: [],
      playerHands: {},
    };
    setSequencePointer(ctx.state, 0);

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `sequence_priority:face_a:${visibleValues.join(",")}`,
      timestamp: Date.now(),
    });
  },

  validate(rule: SequencePriorityRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.action.type !== "dualCut" && ctx.action.type !== "soloCut") return;

    const cutValue =
      ctx.action.type === "dualCut"
        ? ctx.action.guessValue
        : ctx.action.value;
    if (typeof cutValue !== "number") return;

    const values = getSequenceVisibleValues(ctx.state, rule.cardCount);
    if (!values) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission sequence cards are not initialized",
      };
    }

    const pointer = Math.min(getSequencePointer(ctx.state), rule.cardCount - 1);
    const currentRequired = values[pointer];
    const blockedValues =
      pointer === 0
        ? [values[1], values[2]]
        : pointer === 1
          ? [values[2]]
          : [];

    if (blockedValues.includes(cutValue)) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError:
          `Value ${cutValue} is locked until ${rule.requiredCuts} wires of value ${currentRequired} are cut`,
      };
    }
  },

  resolve(rule: SequencePriorityRuleDef, ctx: ResolveHookContext): HookResult | void {
    if (ctx.action.type !== "dualCut" && ctx.action.type !== "soloCut") return;
    if (!ctx.cutSuccess) return;
    if (typeof ctx.cutValue !== "number") return;

    const values = getSequenceVisibleValues(ctx.state, rule.cardCount);
    if (!values) return;

    const pointer = Math.min(getSequencePointer(ctx.state), rule.cardCount - 1);
    const currentRequired = values[pointer];
    if (ctx.cutValue !== currentRequired) return;

    const projectedCutCount = getProjectedCutCountForResolve(ctx, currentRequired);
    if (projectedCutCount < rule.requiredCuts) return;

    if (pointer < rule.cardCount - 1) {
      const nextPointer = pointer + 1;
      setSequencePointer(ctx.state, nextPointer);
      ctx.state.log.push({
        turn: ctx.state.turnNumber,
        playerId: ctx.action.actorId,
        action: "hookEffect",
        detail: `sequence_priority:advance:${nextPointer}`,
        timestamp: Date.now(),
      });
    }
  },
});

/**
 * Mission 10 — Timer: sets a deadline on game state and logs config.
 * The server enforces timeout via Durable Object alarm; the client can
 * use `timerDeadline` for countdown display.
 */
registerHookHandler<"timer">("timer", {
  setup(rule: TimerRuleDef, ctx: SetupHookContext): void {
    const playerCount = ctx.state.players.length as 2 | 3 | 4 | 5;
    const durationSeconds =
      rule.durationSecondsByPlayerCount?.[playerCount] ?? rule.durationSeconds;

    // Set the timer deadline on game state (unix-ms).
    ctx.state.timerDeadline = Date.now() + durationSeconds * 1000;

    // Store timer config in the log so downstream systems can read it.
    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `timer:${durationSeconds}s,audio:${rule.audioPrompt}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 10 — Dynamic turn order: captain picks next player.
 * During setup, records the mode. During endTurn, sets a pending forced
 * action requiring the captain to choose the next active player.
 */
registerHookHandler<"dynamic_turn_order">("dynamic_turn_order", {
  setup(rule: DynamicTurnOrderRuleDef, ctx: SetupHookContext): void {
    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `dynamic_turn_order:selector=${rule.selector}`,
      timestamp: Date.now(),
    });
  },

  endTurn(rule: DynamicTurnOrderRuleDef, ctx: EndTurnHookContext): HookResult | void {
    if (rule.selector !== "captain") return;

    const captainIndex = ctx.state.players.findIndex((p) => p.isCaptain);
    if (captainIndex === -1) return;

    const captain = ctx.state.players[captainIndex];
    ctx.state.pendingForcedAction = {
      kind: "chooseNextPlayer",
      captainId: captain.id,
      ...(ctx.previousPlayerId ? { lastPlayerId: ctx.previousPlayerId } : {}),
    };

    return { nextPlayerIndex: captainIndex };
  },
});

/**
 * Mission 11 — Blue value treated as red.
 *
 * Setup: Randomly selects a blue wire value to secretly act as a detonator.
 *        Stores it in the game log (hidden from clients via view filter).
 *
 * Resolve: Any successful cut of the hidden value explodes the bomb,
 *          matching red-wire behavior for this mission.
 */
registerHookHandler<"blue_value_treated_as_red">("blue_value_treated_as_red", {
  setup(_rule: BlueAsRedRuleDef, ctx: SetupHookContext): void {
    // Pick a random blue value from 1-12 to be the hidden red
    const hiddenRedValue = Math.floor(Math.random() * 12) + 1;

    // Mission card rule: replace any equipment whose unlock value matches
    // the hidden red-like value.
    const usedEquipmentIds = new Set(
      ctx.state.board.equipment.map((card) => card.id),
    );
    const replacementPool = EQUIPMENT_DEFS.filter(
      (def) => def.pool === "base" && def.unlockValue !== hiddenRedValue,
    );

    let replacedCount = 0;
    for (let i = 0; i < ctx.state.board.equipment.length; i++) {
      const card = ctx.state.board.equipment[i];
      if (card.unlockValue !== hiddenRedValue) continue;

      const replacement = replacementPool.find((def) => !usedEquipmentIds.has(def.id));
      if (!replacement) continue;

      usedEquipmentIds.delete(card.id);
      usedEquipmentIds.add(replacement.id);
      ctx.state.board.equipment[i] = {
        id: replacement.id,
        name: replacement.name,
        description: replacement.description,
        unlockValue: replacement.unlockValue,
        unlocked: false,
        used: false,
        image: replacement.image,
      };
      replacedCount++;
    }

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `blue_as_red:${hiddenRedValue}`,
      timestamp: Date.now(),
    });
    if (replacedCount > 0) {
      ctx.state.log.push({
        turn: 0,
        playerId: "system",
        action: "hookSetup",
        detail: `blue_as_red:equipment_replaced:${replacedCount}`,
        timestamp: Date.now(),
      });
    }
  },

  resolve(_rule: BlueAsRedRuleDef, ctx: ResolveHookContext): HookResult | void {
    if (ctx.action.type !== "dualCut" && ctx.action.type !== "soloCut") return;
    if (!ctx.cutSuccess) return;
    if (typeof ctx.cutValue !== "number") return;

    const hiddenRedValue = getBlueAsRedValue(ctx.state);
    if (hiddenRedValue == null) return;
    if (ctx.cutValue === hiddenRedValue) {
      // This blue wire is secretly red — immediate explosion.
      ctx.state.result = "loss_red_wire";
      ctx.state.phase = "finished";
      const targetPlayerId =
        ctx.action.type === "dualCut" && typeof ctx.action.targetPlayerId === "string"
          ? ctx.action.targetPlayerId
          : null;
      emitMissionFailureTelemetry(ctx.state, "loss_red_wire", ctx.action.actorId, targetPlayerId);
      ctx.state.log.push({
        turn: ctx.state.turnNumber,
        playerId: ctx.action.actorId,
        action: "hookEffect",
        detail: `blue_as_red:explosion (value ${hiddenRedValue})`,
        timestamp: Date.now(),
      });
    }
  },
});

/**
 * Mission 12 — Equipment double lock.
 *
 * Setup: Assigns a face-up number-card lock value to each equipment card
 *        when `secondaryLockSource` is enabled.
 *
 * Resolve: Overrides the default equipment unlock threshold using
 *          `requiredCuts`.
 */
registerHookHandler<"equipment_double_lock">("equipment_double_lock", {
  setup(rule: EquipmentDoubleLockRuleDef, ctx: SetupHookContext): void {
    if (rule.secondaryLockSource !== "number_card") return;

    const requiredSecondaryCuts = rule.secondaryRequiredCuts ?? rule.requiredCuts;
    const lockValues = shuffle([...MISSION_NUMBER_VALUES]).slice(
      0,
      ctx.state.board.equipment.length,
    );

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: lockValues.map((value, idx) => ({
        id: `m12-lock-${idx}-${value}`,
        value,
        faceUp: true,
      })),
      deck: [],
      discard: [],
      playerHands: {},
    };

    for (let i = 0; i < ctx.state.board.equipment.length; i++) {
      const card = ctx.state.board.equipment[i];
      const lockValue = lockValues[i];
      card.secondaryLockValue = lockValue;
      card.secondaryLockCutsRequired = requiredSecondaryCuts;
    }

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `equipment_double_lock:number_cards:${lockValues.join(",")}`,
      timestamp: Date.now(),
    });
  },

  resolve(rule: EquipmentDoubleLockRuleDef, _ctx: ResolveHookContext): HookResult {
    return {
      overrideEquipmentUnlock: true,
      equipmentUnlockThreshold: rule.requiredCuts,
    };
  },
});

/**
 * Mission 15 — Face-down equipment unlocked via Number deck progression.
 *
 * Setup:
 * - Equipment cards start face-down and locked.
 * - Number deck is initialized with one visible card and a hidden draw pile.
 *
 * Resolve:
 * - Default value-based equipment unlock is disabled.
 * - When the current visible Number value reaches 4 cuts, reveal one face-down
 *   equipment card and make it immediately available.
 * - Then reveal the next Number card; if it is already complete, skip/discard
 *   it and continue revealing until a non-complete value is found.
 */
registerHookHandler<"number_deck_equipment_reveal">("number_deck_equipment_reveal", {
  setup(_rule: NumberDeckEquipmentRevealRuleDef, ctx: SetupHookContext): void {
    const numberCards = buildMission15NumberCards();

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      deck: numberCards.deck,
      discard: numberCards.discard,
      visible: numberCards.visible,
      // Preserve any existing hands map shape if present.
      playerHands: ctx.state.campaign.numberCards?.playerHands ?? {},
    };

    for (const card of ctx.state.board.equipment) {
      card.faceDown = true;
      card.unlocked = false;
    }

    const firstVisible = ctx.state.campaign.numberCards.visible[0]?.value;
    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail:
        firstVisible == null
          ? "m15:number_deck:init:empty"
          : `m15:number_deck:init:${firstVisible}`,
      timestamp: Date.now(),
    });
  },

  resolve(_rule: NumberDeckEquipmentRevealRuleDef, ctx: ResolveHookContext): HookResult {
    if (ctx.action.type !== "dualCut" && ctx.action.type !== "soloCut") {
      return {};
    }
    if (!ctx.cutSuccess || typeof ctx.cutValue !== "number") {
      return {};
    }

    if (!ctx.state.board.equipment.some((card) => card.faceDown)) {
      return {};
    }

    const result: HookResult = {
      overrideEquipmentUnlock: true,
      equipmentUnlockThreshold: DISABLE_DEFAULT_EQUIPMENT_UNLOCK_THRESHOLD,
    };

    const numberCards = ctx.state.campaign?.numberCards;
    const currentCard = numberCards?.visible?.[0];
    if (!numberCards || !currentCard) {
      return result;
    }

    const projectedCutCount = getProjectedCutCountForResolve(ctx, currentCard.value);
    if (projectedCutCount < 4) {
      return result;
    }

    // Current visible number is completed: reveal exactly one face-down
    // equipment card, if any remain.
    const revealedCard = ctx.state.board.equipment.find((card) => card.faceDown);
    if (revealedCard) {
      revealedCard.faceDown = false;
      revealedCard.unlocked = true;
    }

    // Move current visible number card to discard.
    const completed = numberCards.visible.shift()!;
    completed.faceUp = true;
    numberCards.discard.push(completed);

    // Reveal next card and skip any already-completed values.
    const skippedValues = revealMission15NextNumberCard(ctx, numberCards);
    const nextVisibleValue = numberCards.visible[0]?.value;

    ctx.state.log.push({
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: [
        `m15:number_complete:${completed.value}`,
        `revealed_equipment:${revealedCard?.id ?? "none"}`,
        `next:${nextVisibleValue ?? "none"}`,
        `skipped:${skippedValues.join(",") || "none"}`,
      ].join("|"),
      timestamp: Date.now(),
    });

    return result;
  },
});

/**
 * Mission 23 — Hidden equipment pile setup.
 *
 * Setup:
 * - Replaces normal in-play equipment with a face-down pile of random base cards.
 * - Cards remain locked until mission-specific progression reveals them.
 */
registerHookHandler<"hidden_equipment_pile">("hidden_equipment_pile", {
  setup(rule: HiddenEquipmentPileRuleDef, ctx: SetupHookContext): void {
    ctx.state.board.equipment = buildHiddenEquipmentPile(rule.pileSize);

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `hidden_equipment_pile:${ctx.state.board.equipment.length}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Nano progression missions (e.g. 43/53/59).
 *
 * Maintains campaign.nanoTracker and applies mission failure when max is reached.
 */
registerHookHandler<"nano_progression">("nano_progression", {
  setup(rule: NanoProgressionRuleDef, ctx: SetupHookContext): void {
    initializeCampaignProgressState(ctx.state);

    const max = Math.max(1, Math.floor(rule.max));
    const start = clampProgress(rule.start, max);
    ctx.state.campaign!.nanoTracker = { position: start, max };

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `nano_progression:start=${start},max=${max},advanceOn=${rule.advanceOn},movement=${rule.movement ?? "forward"}`,
      timestamp: Date.now(),
    });
  },

  resolve(rule: NanoProgressionRuleDef, ctx: ResolveHookContext): void {
    if (rule.advanceOn !== "successful_cut") return;
    if (!ctx.cutSuccess) return;
    if (ctx.state.phase === "finished") return;

    let delta = Math.abs(Math.floor(rule.advanceBy ?? 1));
    if (delta === 0) return;

    if (rule.movement === "value_parity") {
      if (typeof ctx.cutValue !== "number") return;
      delta = ctx.cutValue % 2 === 0 ? -delta : delta;
    }

    applyNanoDelta(ctx.state, delta, ctx.action.actorId, "point=resolve");
  },

  endTurn(rule: NanoProgressionRuleDef, ctx: EndTurnHookContext): void {
    if (rule.advanceOn !== "end_turn") return;
    if (ctx.state.phase === "finished") return;

    const delta = Math.abs(Math.floor(rule.advanceBy ?? 1));
    if (delta === 0) return;

    applyNanoDelta(ctx.state, delta, ctx.previousPlayerId ?? "system", "point=endTurn");
  },
});

/**
 * Oxygen progression missions (e.g. 44/49/54/63).
 *
 * Consumes oxygen each turn. If oxygen is depleted for required cost, detonator
 * advances by one as a fallback penalty.
 */
registerHookHandler<"oxygen_progression">("oxygen_progression", {
  setup(rule: OxygenProgressionRuleDef, ctx: SetupHookContext): void {
    initializeCampaignProgressState(ctx.state);

    const initialPool = Math.max(0, Math.floor(rule.initialPool));
    const initialPlayerOxygen = Math.max(0, Math.floor(rule.initialPlayerOxygen ?? 0));
    const playerOxygen: Record<string, number> = {};
    for (const player of ctx.state.players) {
      playerOxygen[player.id] = initialPlayerOxygen;
    }

    ctx.state.campaign!.oxygen = {
      pool: initialPool,
      playerOxygen,
    };

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `oxygen_progression:pool=${initialPool},perTurnCost=${Math.max(0, Math.floor(rule.perTurnCost))},rotate=${Boolean(rule.rotatePlayerOxygen)}`,
      timestamp: Date.now(),
    });
  },

  endTurn(rule: OxygenProgressionRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;
    const oxygen = ctx.state.campaign?.oxygen;
    if (!oxygen) return;

    const perTurnCost = Math.max(0, Math.floor(rule.perTurnCost));
    const actorId = ctx.previousPlayerId ?? "system";
    const { paid, deficit } = spendOxygenForTurn(ctx.state, perTurnCost, ctx.previousPlayerId);

    if (rule.rotatePlayerOxygen) {
      rotatePlayerOxygenClockwise(ctx.state);
    }

    if (deficit > 0) {
      ctx.state.board.detonatorPosition += 1;
      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.result = "loss_detonator";
        ctx.state.phase = "finished";
        emitMissionFailureTelemetry(ctx.state, "loss_detonator", actorId, null);
      }
    }

    ctx.state.log.push({
      turn: ctx.state.turnNumber,
      playerId: actorId,
      action: "hookEffect",
      detail: [
        `oxygen_progression:cost=${perTurnCost}`,
        `paid=${paid}`,
        `deficit=${deficit}`,
        `pool=${oxygen.pool}`,
      ].join("|"),
      timestamp: Date.now(),
    });
  },
});

/**
 * Challenge progression missions (e.g. 55/60).
 *
 * Completing active challenge values reduces the detonator and draws replacements.
 */
registerHookHandler<"challenge_rewards">("challenge_rewards", {
  setup(rule: ChallengeRewardsRuleDef, ctx: SetupHookContext): void {
    initializeCampaignProgressState(ctx.state);

    const activeCount = Math.max(1, Math.floor(rule.activeCount));
    const deck = buildChallengeDeck(Math.max(8, activeCount + 6));
    const active = deck.splice(0, activeCount);
    ctx.state.campaign!.challenges = {
      deck,
      active,
      completed: [],
    };

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `challenge_rewards:active=${active.map((card) => card.id).join(",")}`,
      timestamp: Date.now(),
    });
  },

  resolve(rule: ChallengeRewardsRuleDef, ctx: ResolveHookContext): void {
    if (!ctx.cutSuccess) return;
    if (typeof ctx.cutValue !== "number") return;

    const challenges = ctx.state.campaign?.challenges;
    if (!challenges) return;

    const completedTargets: number[] = [];
    const stillActive = [] as typeof challenges.active;
    for (const challenge of challenges.active) {
      const targetValue = parseTargetValueFromChallengeId(challenge.id);
      if (targetValue == null || targetValue !== ctx.cutValue) {
        stillActive.push(challenge);
        continue;
      }
      challenge.completed = true;
      challenges.completed.push(challenge);
      completedTargets.push(targetValue);
    }

    if (completedTargets.length === 0) return;

    challenges.active = stillActive;

    const desiredActiveCount = Math.max(1, Math.floor(rule.activeCount));
    while (challenges.active.length < desiredActiveCount && challenges.deck.length > 0) {
      const next = challenges.deck.shift()!;
      next.completed = false;
      challenges.active.push(next);
    }

    const reductionPerCompletion = Math.max(0, Math.floor(rule.rewardDetonatorReduction));
    const totalReduction = reductionPerCompletion * completedTargets.length;
    if (totalReduction > 0) {
      ctx.state.board.detonatorPosition = Math.max(
        0,
        ctx.state.board.detonatorPosition - totalReduction,
      );
    }

    ctx.state.log.push({
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: [
        `challenge_rewards:completed=${completedTargets.join(",")}`,
        `detonator_reduction=${totalReduction}`,
        `active=${challenges.active.map((card) => card.id).join(",") || "none"}`,
      ].join("|"),
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 66 bunker flow progression.
 */
registerHookHandler<"bunker_flow">("bunker_flow", {
  setup(rule: BunkerFlowRuleDef, ctx: SetupHookContext): void {
    initializeCampaignProgressState(ctx.state);

    const max = Math.max(1, Math.floor(rule.max));
    const position = clampProgress(rule.start, max);
    ctx.state.campaign!.bunkerTracker = { position, max };

    const cycle = Math.max(1, Math.floor(rule.actionCycleLength ?? 4));
    setActionPointer(ctx.state, position % cycle);

    ctx.state.log.push({
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `bunker_flow:start=${position},max=${max},cycle=${cycle}`,
      timestamp: Date.now(),
    });
  },

  resolve(rule: BunkerFlowRuleDef, ctx: ResolveHookContext): void {
    if (!ctx.cutSuccess) return;

    const tracker = ctx.state.campaign?.bunkerTracker;
    if (!tracker) return;

    const advanceBy = Math.max(0, Math.floor(rule.advanceBy));
    if (advanceBy === 0) return;

    const before = tracker.position;
    tracker.position = clampProgress(before + advanceBy, tracker.max);

    const cycle = Math.max(1, Math.floor(rule.actionCycleLength ?? 4));
    setActionPointer(ctx.state, tracker.position % cycle);

    ctx.state.log.push({
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: `bunker_flow:${before}->${tracker.position}|cycle=${cycle}`,
      timestamp: Date.now(),
    });
  },
});
