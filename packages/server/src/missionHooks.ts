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
  WireTile,
} from "@bomb-busters/shared";
import {
  EQUIPMENT_DEFS,
  MISSION_SCHEMAS,
  isLogTextDetail,
  type MissionHookRuleDef,
} from "@bomb-busters/shared";
import { pushGameLog } from "./gameLog.js";
import { getMission22TokenPassBoardState } from "./mission22TokenPass.js";
import { isMission46SevenTile } from "./mission46.js";

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
    type:
      | "dualCut"
      | "dualCutDoubleDetector"
      | "simultaneousCut"
      | "soloCut"
      | "revealReds"
      | "simultaneousRedCut"
      | "simultaneousFourCut";
    actorId: string;
    [key: string]: unknown;
  };
}

function mission41TargetIsYellowWire(
  state: Readonly<GameState>,
  action: ValidateHookContext["action"],
): boolean {
  if (state.mission !== 41) return false;

  const hasYellowTarget = (
    playerId: unknown,
    tileIndex: unknown,
  ): boolean => {
    if (typeof playerId !== "string" || typeof tileIndex !== "number") return false;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;
    const tile = player.hand[tileIndex];
    return tile != null && !tile.cut && tile.color === "yellow";
  };

  switch (action.type) {
    case "dualCut": {
      return hasYellowTarget(action.targetPlayerId, action.targetTileIndex);
    }
    case "dualCutDoubleDetector": {
      return (
        hasYellowTarget(action.targetPlayerId, action.tileIndex1) ||
        hasYellowTarget(action.targetPlayerId, action.tileIndex2)
      );
    }
    case "simultaneousCut": {
      return Array.isArray(action.cuts) && action.cuts.some((cut) => {
        if (!cut || typeof cut !== "object") return false;
        const cutRecord = cut as {
          targetPlayerId?: unknown;
          targetTileIndex?: unknown;
        };
        return hasYellowTarget(
          cutRecord.targetPlayerId,
          cutRecord.targetTileIndex,
        );
      });
    }
    case "simultaneousFourCut": {
      return Array.isArray(action.targets) && action.targets.some((target) => {
        if (!target || typeof target !== "object") return false;
        const targetRecord = target as {
          playerId?: unknown;
          tileIndex?: unknown;
        };
        return hasYellowTarget(targetRecord.playerId, targetRecord.tileIndex);
      });
    }
    default:
      return false;
  }
}

function actionTargetsUncutYellowWire(
  state: Readonly<GameState>,
  action: ValidateHookContext["action"],
): boolean {
  const hasYellowTarget = (
    playerId: unknown,
    tileIndex: unknown,
  ): boolean => {
    if (typeof playerId !== "string" || typeof tileIndex !== "number") return false;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;
    const tile = player.hand[tileIndex];
    return tile != null && !tile.cut && tile.color === "yellow";
  };

  switch (action.type) {
    case "dualCut": {
      return hasYellowTarget(action.targetPlayerId, action.targetTileIndex);
    }
    case "dualCutDoubleDetector": {
      return (
        hasYellowTarget(action.targetPlayerId, action.tileIndex1) ||
        hasYellowTarget(action.targetPlayerId, action.tileIndex2)
      );
    }
    case "simultaneousCut": {
      return Array.isArray(action.cuts) && action.cuts.some((cut) => {
        if (!cut || typeof cut !== "object") return false;
        const asTarget = cut as { targetPlayerId?: unknown; targetTileIndex?: unknown };
        return hasYellowTarget(asTarget.targetPlayerId, asTarget.targetTileIndex);
      });
    }
    default:
      return false;
  }
}

function hasOnlyUncutTripwireAndRedWires(
  player: Readonly<import("@bomb-busters/shared").Player>,
): boolean {
  const uncutTiles = player.hand.filter((tile) => !tile.cut);
  if (uncutTiles.length === 0) return false;

  const uncutYellowCount = uncutTiles.filter((tile) => tile.color === "yellow").length;
  if (uncutYellowCount !== 1) return false;

  return uncutTiles.every((tile) => tile.color === "yellow" || tile.color === "red");
}

function canCurrentPlayerKeepPlayingMission41(state: Readonly<GameState>): boolean {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) return false;
  return !hasOnlyUncutTripwireAndRedWires(currentPlayer);
}

function findNextUncutPlayerIndex(
  state: Readonly<GameState>,
  fromIndex: number,
): number | null {
  const playerCount = state.players.length;
  for (let offset = 1; offset <= playerCount; offset++) {
    const candidateIndex = (fromIndex + offset) % playerCount;
    const candidate = state.players[candidateIndex];
    if (candidate?.hand.some((tile) => !tile.cut)) {
      return candidateIndex;
    }
  }
  return null;
}

function skipMission41TripwireTurns(state: GameState): void {
  if (state.mission !== 41 || state.phase === "finished") return;

  const playerCount = state.players.length;
  let skipCount = 0;

  while (skipCount < playerCount) {
    if (canCurrentPlayerKeepPlayingMission41(state)) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    const nextPlayerIndex = findNextUncutPlayerIndex(state, state.currentPlayerIndex);
    if (nextPlayerIndex == null) return;

    state.currentPlayerIndex = nextPlayerIndex;
    state.turnNumber += 1;
    skipCount += 1;

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: currentPlayer.id,
      action: "hookEffect",
      detail: `iberian_yellow_mode:auto_skip|player=${currentPlayer.id}`,
      timestamp: Date.now(),
    });
  }
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
  const setupEntry = state.log.find((e) => {
    if (e.action !== "hookSetup") return false;
    if (!isLogTextDetail(e.detail)) return false;
    return e.detail.text.startsWith("blue_as_red:");
  });
  if (!setupEntry || !isLogTextDetail(setupEntry.detail)) return null;

  const value = Number.parseInt(setupEntry.detail.text.split(":")[1] ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

// ── Built-in Hook Handlers (Missions 9/10/11/12/14/15/23/43+/66) ──────

import type {
  AudioPromptRuleDef,
  BunkerFlowRuleDef,
  ChallengeRewardsRuleDef,
  ConstraintEnforcementRuleDef,
  ForcedGeneralRadarFlowRuleDef,
  InternFailureExplodesRuleDef,
  NoMarkersMemoryModeRuleDef,
  NoSpokenNumbersRuleDef,
  SequencePriorityRuleDef,
  TimerRuleDef,
  DynamicTurnOrderRuleDef,
  BlueAsRedRuleDef,
  EquipmentDoubleLockRuleDef,
  HiddenEquipmentPileRuleDef,
  NanoProgressionRuleDef,
  NumberDeckEquipmentRevealRuleDef,
  OxygenProgressionRuleDef,
  SimultaneousFourCutRuleDef,
  YellowTriggerTokenPassRuleDef,
  EvenOddTokensRuleDef,
  CountTokensRuleDef,
  FalseTokensRuleDef,
  XMarkedWireRuleDef,
  UpsideDownWireRuleDef,
  VisibleNumberCardGateRuleDef,
  HiddenNumberCardPenaltyRuleDef,
  SqueakNumberChallengeRuleDef,
  AddSubtractNumberCardsRuleDef,
  NumberCardCompletionsRuleDef,
  PersonalNumberCardsRuleDef,
  NoCharacterCardsRuleDef,
  CaptainLazyConstraintsRuleDef,
  FalseInfoTokensRuleDef,
  SimultaneousMultiCutRuleDef,
  SevensLastRuleDef,
  BossDesignatesValueRuleDef,
  NoInfoUnlimitedDDRuleDef,
  RandomSetupInfoTokensRuleDef,
  IberianYellowModeRuleDef,
} from "@bomb-busters/shared";
import { CONSTRAINT_CARD_DEFS } from "@bomb-busters/shared";

const MISSION_NUMBER_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

function shuffle<T>(arr: T[]): T[] {
  for (let pass = 0; pass < 2; pass++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
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

  pushGameLog(state, {
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

function getOxygenCostForCut(rule: OxygenProgressionRuleDef, cutValue: number): number {
  if (rule.cutCostMode === "value") return Math.max(0, Math.floor(cutValue));
  if (rule.cutCostMode === "depth") {
    const value = Math.max(1, Math.min(12, Math.floor(cutValue)));
    if (value <= 4) return 1;
    if (value <= 8) return 2;
    return 3;
  }

  return Math.max(0, Math.floor(rule.perTurnCost));
}

function getMission63CaptainOxygen(playerCount: number): number {
  const captainOxygenByPlayerCount: Record<number, number> = {
    2: 14,
    3: 18,
    4: 24,
    5: 30,
  };
  return Math.max(0, Math.floor(captainOxygenByPlayerCount[playerCount] ?? 0));
}

function moveMission63TurnEndOxygenToLeft(state: GameState, actorId: string): void {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return;

  const playerCount = state.players.length;
  if (playerCount <= 1) return;

  const actorIndex = state.players.findIndex((player) => player.id === actorId);
  if (actorIndex < 0) return;

  const leftPlayerIndex = (actorIndex + 1) % playerCount;
  const actor = state.players[actorIndex];
  const leftPlayer = state.players[leftPlayerIndex];
  if (!actor || !leftPlayer) return;

  const remaining = Math.max(
    0,
    Math.floor(oxygen.playerOxygen[actor.id] ?? 0),
  );
  if (remaining <= 0) return;

  oxygen.playerOxygen[leftPlayer.id] = Math.max(
    0,
    Math.floor(oxygen.playerOxygen[leftPlayer.id] ?? 0),
  ) + remaining;
  oxygen.playerOxygen[actor.id] = 0;
}

function actorCanAffordAnyMission44Cut(
  state: Readonly<GameState>,
  actor: { id: string; hand: ReadonlyArray<WireTile> },
  rule: OxygenProgressionRuleDef,
): boolean {
  const actorUncut = actor.hand.filter((tile) => !tile.cut);
  if (actorUncut.length === 0) return false;

  // If all remaining wires are RED, RevealReds remains legal and should not auto-skip.
  const allRemainingRed = actorUncut.every((tile) => tile.gameValue === "RED");
  if (allRemainingRed) return true;

  const available = state.mission === 63
    ? Math.max(0, Math.floor(state.campaign?.oxygen?.playerOxygen[actor.id] ?? 0))
    : getAvailableOxygen(state, actor.id);
  if (available <= 0) return false;

  const affordableValues = new Set<number>();
  for (const tile of actorUncut) {
    if (typeof tile.gameValue === "number") {
      affordableValues.add(Math.floor(tile.gameValue));
    }
  }

  for (const value of affordableValues) {
    const requiredCost = getOxygenCostForCut(rule, value);
    if (requiredCost <= available) return true;
  }

  return false;
}

function getMission49OxygenRecipientId(
  state: GameState,
  action: ValidateHookContext["action"],
): string | undefined {
  if (action.type === "dualCut" || action.type === "dualCutDoubleDetector") {
    return typeof action.targetPlayerId === "string" ? action.targetPlayerId : undefined;
  }

  if (action.type === "soloCut") {
    const actorIndex = state.players.findIndex((player) =>
      player.id === action.actorId,
    );
    if (actorIndex >= 0 && state.players.length > 0) {
      const leftPlayer = state.players[(actorIndex + 1) % state.players.length];
      return leftPlayer?.id;
    }
    return undefined;
  }

  return undefined;
}

function advanceToNextPlayerWithUncutTiles(
  state: GameState,
  currentPlayerIndex: number,
): number {
  const playerCount = state.players.length;
  let next = currentPlayerIndex;
  let attempts = 0;

  while (attempts < playerCount) {
    next = (next + 1) % playerCount;
    attempts += 1;
    const player = state.players[next];
    if (!player) continue;
    const uncutTiles = player.hand.filter((tile) => !tile.cut);
    if (uncutTiles.length > 0) return next;
  }

  return -1;
}

function getAvailableOxygen(state: Readonly<GameState>, playerId: string): number {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return 0;
  const owned = Math.max(0, Math.floor(oxygen.playerOxygen[playerId] ?? 0));
  const reserve = Math.max(0, Math.floor(oxygen.pool));
  return Math.max(0, owned + reserve);
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

function getDesiredChallengeActiveCount(
  rule: ChallengeRewardsRuleDef,
  playerCount: number,
): number {
  if (rule.activeCountMode === "per_player") {
    return Math.max(1, Math.floor(playerCount));
  }
  return Math.max(1, Math.floor(rule.activeCount));
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

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `sequence_priority:${rule.variant}:${visibleValues.join(",")}`,
      timestamp: Date.now(),
    });
  },

  validate(rule: SequencePriorityRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (
      ctx.action.type !== "dualCut" &&
      ctx.action.type !== "dualCutDoubleDetector" &&
      ctx.action.type !== "soloCut"
    ) {
      return;
    }

    const cutValue =
      ctx.action.type === "dualCut" ||
      ctx.action.type === "dualCutDoubleDetector"
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

    const nextPointer = pointer + 1;
    setSequencePointer(ctx.state, nextPointer);
    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: `sequence_priority:advance:${nextPointer}`,
      timestamp: Date.now(),
    });
  },

  endTurn(rule: SequencePriorityRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;

    const values = getSequenceVisibleValues(ctx.state, rule.cardCount);
    if (!values) return;

    const pointer = Math.min(getSequencePointer(ctx.state), rule.cardCount - 1);
    const blockedValues: number[] =
      pointer === 0
        ? [values[1], values[2]].filter((v): v is number => v != null)
        : pointer === 1
          ? [values[2]].filter((v): v is number => v != null)
          : [];
    if (blockedValues.length === 0) return;

    const currentPlayer = ctx.state.players[ctx.state.currentPlayerIndex];
    if (!currentPlayer) return;

    const uncutTiles = currentPlayer.hand.filter((t) => !t.cut);
    if (uncutTiles.length === 0) return;

    // Check if every uncut wire is a blocked sequence value.
    // When allBlocked is true the player cannot solo-cut (blocked) NOR
    // dual-cut (the guessValue must match one of their own tiles, all of
    // which are blocked values that the hook rejects).
    const allBlocked = uncutTiles.every(
      (t) => typeof t.gameValue === "number" && blockedValues.includes(t.gameValue),
    );
    if (!allBlocked) return;

    // No valid actions: the bomb explodes.
    ctx.state.result = "loss_detonator";
    ctx.state.phase = "finished";
    emitMissionFailureTelemetry(ctx.state, "loss_detonator", currentPlayer.id, null);
    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: currentPlayer.id,
      action: "hookEffect",
      detail: "sequence_priority:stuck:all_wires_blocked",
      timestamp: Date.now(),
    });
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
    pushGameLog(ctx.state, {
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
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `dynamic_turn_order:selector=${rule.selector}`,
      timestamp: Date.now(),
    });
  },

  endTurn(rule: DynamicTurnOrderRuleDef, ctx: EndTurnHookContext): HookResult | void {
    console.log(
      "[dynamic_turn_order.endTurn] entered",
      "selector=", rule.selector,
      "previousPlayerId=", ctx.previousPlayerId,
    );
    if (rule.selector !== "captain") return;

    const captainIndex = ctx.state.players.findIndex((p) => p.isCaptain);
    if (captainIndex === -1) {
      console.log("[dynamic_turn_order.endTurn] no captain found, returning");
      return;
    }

    const captain = ctx.state.players[captainIndex];
    ctx.state.pendingForcedAction = {
      kind: "chooseNextPlayer",
      captainId: captain.id,
      ...(ctx.previousPlayerId ? { lastPlayerId: ctx.previousPlayerId } : {}),
    };

    console.log(
      "[dynamic_turn_order.endTurn] set pendingForcedAction",
      JSON.stringify(ctx.state.pendingForcedAction),
      "nextPlayerIndex=", captainIndex,
    );

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

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: [{ id: `m11-blue-as-red-${hiddenRedValue}`, value: hiddenRedValue, faceUp: true }],
      deck: [],
      discard: [],
      playerHands: {},
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `blue_as_red:${hiddenRedValue}`,
      timestamp: Date.now(),
    });
    if (replacedCount > 0) {
      pushGameLog(ctx.state, {
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
      pushGameLog(ctx.state, {
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

    pushGameLog(ctx.state, {
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
    pushGameLog(ctx.state, {
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

    pushGameLog(ctx.state, {
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

    pushGameLog(ctx.state, {
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

    pushGameLog(ctx.state, {
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

    const mission = ctx.state.mission;
    const playerCount = ctx.state.players.length as 2 | 3 | 4 | 5;
    const initialPool = Math.max(
      0,
      Math.floor(rule.initialPoolByPlayerCount?.[playerCount] ?? rule.initialPool),
    );
    const initialPlayerOxygen = Math.max(
      0,
      Math.floor(
        rule.initialPlayerOxygenByPlayerCount?.[playerCount] ?? (rule.initialPlayerOxygen ?? 0),
      ),
    );
    const playerOxygen: Record<string, number> = {};
    for (const player of ctx.state.players) {
      playerOxygen[player.id] = mission === 63 ? 0 : initialPlayerOxygen;
    }

    if (mission === 63) {
      const captainIndex = Math.max(
        0,
        ctx.state.players.findIndex((player) => player.isCaptain),
      );
      const captainId = ctx.state.players[captainIndex]?.id;
      if (captainId) {
        playerOxygen[captainId] = getMission63CaptainOxygen(playerCount);
      }
    }

    const startingPool = mission === 63 ? 0 : initialPool;
    ctx.state.campaign!.oxygen = {
      pool: startingPool,
      playerOxygen,
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `oxygen_progression:pool=${initialPool},perTurnCost=${Math.max(0, Math.floor(rule.perTurnCost))},rotate=${Boolean(rule.rotatePlayerOxygen)}`,
      timestamp: Date.now(),
    });
  },

  validate(rule: OxygenProgressionRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (!rule.consumeOnCut) return;
    const actorId = ctx.action.actorId;
    const cutValue = extractCutValue(ctx.action);
    if (typeof cutValue !== "number") return;

    const requiredCost = getOxygenCostForCut(rule, cutValue);
    const oxygen = ctx.state.campaign?.oxygen;
    if (!oxygen) return;
    if (requiredCost <= 0) return;
    const available = ctx.state.mission === 63 || ctx.state.mission === 49
      ? Math.max(0, Math.floor(oxygen.playerOxygen[actorId] ?? 0))
      : getAvailableOxygen(ctx.state, actorId);
    if (available < requiredCost) {
      return {
        validationError: `Mission ${ctx.state.mission}: insufficient oxygen to cut ${cutValue} (need ${requiredCost}, available ${available})`,
        validationCode: "MISSION_RULE_VIOLATION",
      };
    }
  },

  endTurn(rule: OxygenProgressionRuleDef, ctx: EndTurnHookContext): void {
    if (!rule.consumeOnCut) {
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

      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actorId,
        action: "hookEffect",
        detail: [
          `oxygen_progression:mode=endTurn`,
          `cost=${perTurnCost}`,
          `paid=${paid}`,
          `deficit=${deficit}`,
          `pool=${oxygen.pool}`,
        ].join("|"),
        timestamp: Date.now(),
      });

      return;
    }

    if (ctx.state.phase === "finished") return;
    if (ctx.state.campaign?.oxygen == null) return;

    if (ctx.state.mission === 63) {
      const oxygen = ctx.state.campaign.oxygen;
      const players = ctx.state.players;
      const playerCount = players.length;
      if (playerCount <= 1) return;

      const previousPlayerIndex = players.findIndex(
        (player) => player.id === ctx.previousPlayerId,
      );
      if (previousPlayerIndex >= 0) {
        const previousPlayer = players[previousPlayerIndex];
        if (previousPlayer) {
          moveMission63TurnEndOxygenToLeft(ctx.state, previousPlayer.id);
        }
      }

      const captainIndex = players.findIndex((player) => player.isCaptain);
      const captain = captainIndex >= 0 ? players[captainIndex] : null;
      if (captain && captainIndex === ctx.state.currentPlayerIndex) {
        const reserve = Math.max(0, Math.floor(oxygen.pool));
        if (reserve > 0) {
          oxygen.playerOxygen[captain.id] = Math.max(
            0,
            Math.floor(oxygen.playerOxygen[captain.id] ?? 0),
          ) + reserve;
          oxygen.pool = 0;

          pushGameLog(ctx.state, {
            turn: ctx.state.turnNumber,
            playerId: captain.id,
            action: "hookEffect",
            detail: `oxygen_progression:mission63_reserve_to_captain|amount=${reserve}`,
            timestamp: Date.now(),
          });
        }
      }

      const maxAutoSkips = ctx.state.board.detonatorMax + playerCount;
      for (let autoSkipCount = 0; autoSkipCount < maxAutoSkips; autoSkipCount++) {
        if (ctx.state.result != null) return;

        const actor = ctx.state.players[ctx.state.currentPlayerIndex];
        if (!actor) return;

        const actorCanAct = actorCanAffordAnyMission44Cut(ctx.state, actor, rule);
        if (actorCanAct) return;

        const hasUncutTiles = actor.hand.some((tile) => !tile.cut);
        if (!hasUncutTiles) return;

        moveMission63TurnEndOxygenToLeft(ctx.state, actor.id);

        ctx.state.board.detonatorPosition += 1;
        pushGameLog(ctx.state, {
          turn: ctx.state.turnNumber,
          playerId: actor.id,
          action: "hookEffect",
          detail: `oxygen_progression:auto_skip|player=${actor.id}|detonator=${ctx.state.board.detonatorPosition}`,
          timestamp: Date.now(),
        });

        if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
          ctx.state.result = "loss_detonator";
          ctx.state.phase = "finished";
          emitMissionFailureTelemetry(ctx.state, "loss_detonator", actor.id, null);
          return;
        }

        const nextPlayerIndex = advanceToNextPlayerWithUncutTiles(
          ctx.state,
          ctx.state.currentPlayerIndex,
        );
        if (nextPlayerIndex < 0) {
          ctx.state.result = "win";
          ctx.state.phase = "finished";
          return;
        }

        ctx.state.currentPlayerIndex = nextPlayerIndex;
        ctx.state.turnNumber += 1;
      }
      return;
    }

    const playerCount = ctx.state.players.length;
    const maxAutoSkips = ctx.state.board.detonatorMax + playerCount;

    for (let autoSkipCount = 0; autoSkipCount < maxAutoSkips; autoSkipCount++) {
      if (ctx.state.result != null) return;

      const actor = ctx.state.players[ctx.state.currentPlayerIndex];
      if (!actor) return;

      const actorCanAct = actorCanAffordAnyMission44Cut(ctx.state, actor, rule);
      if (actorCanAct) return;

      const hasUncutTiles = actor.hand.some((tile) => !tile.cut);
      if (!hasUncutTiles) return;

      ctx.state.board.detonatorPosition += 1;
      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actor.id,
        action: "hookEffect",
        detail: `oxygen_progression:auto_skip|player=${actor.id}|detonator=${ctx.state.board.detonatorPosition}`,
        timestamp: Date.now(),
      });

      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.result = "loss_detonator";
        ctx.state.phase = "finished";
        emitMissionFailureTelemetry(ctx.state, "loss_detonator", actor.id, null);
        return;
      }

      const nextPlayerIndex = advanceToNextPlayerWithUncutTiles(
        ctx.state,
        ctx.state.currentPlayerIndex,
      );
      if (nextPlayerIndex < 0) {
        ctx.state.result = "win";
        ctx.state.phase = "finished";
        return;
      }

      ctx.state.currentPlayerIndex = nextPlayerIndex;
      ctx.state.turnNumber += 1;
    }
  },

  resolve(rule: OxygenProgressionRuleDef, ctx: ResolveHookContext): void {
    if (!rule.consumeOnCut) return;
    if (ctx.state.phase === "finished") return;

    const actorId = ctx.action.actorId;
    if (typeof ctx.cutValue !== "number") return;

    const requiredCost = getOxygenCostForCut(rule, ctx.cutValue);
    if (requiredCost <= 0) return;
    const oxygen = ctx.state.campaign?.oxygen;
    if (!oxygen) return;

    if (ctx.state.mission === 63) {
      const owned = Math.max(0, Math.floor(oxygen.playerOxygen[actorId] ?? 0));
      const movedToPool = Math.min(owned, requiredCost);
      oxygen.playerOxygen[actorId] = owned - movedToPool;
      oxygen.pool += movedToPool;

      const deficit = requiredCost - movedToPool;
      if (deficit > 0) {
        ctx.state.board.detonatorPosition += 1;
        if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
          ctx.state.result = "loss_detonator";
          ctx.state.phase = "finished";
          emitMissionFailureTelemetry(ctx.state, "loss_detonator", actorId, null);
        }
      }

      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actorId,
        action: "hookEffect",
        detail: [
          "oxygen_progression:mode=mission63_cut",
          `cost=${requiredCost}`,
          `cut=${ctx.cutValue}`,
          `moved=${movedToPool}`,
          `deficit=${deficit}`,
          `pool=${oxygen.pool}`,
        ].join("|"),
        timestamp: Date.now(),
      });
      return;
    }

    if (ctx.state.mission === 49 && rule.rotatePlayerOxygen) {
      const actorOxygen = Math.max(0, Math.floor(oxygen.playerOxygen[actorId] ?? 0));
      const movedToRecipient = Math.min(actorOxygen, requiredCost);
      oxygen.playerOxygen[actorId] = actorOxygen - movedToRecipient;

      const recipientId = getMission49OxygenRecipientId(ctx.state, ctx.action);
      const deficit = requiredCost - movedToRecipient;
      if (recipientId) {
        const previousRecipientAmount = Math.max(
          0,
          Math.floor(oxygen.playerOxygen[recipientId] ?? 0),
        );
        oxygen.playerOxygen[recipientId] = previousRecipientAmount + movedToRecipient;
      }

      if (deficit > 0) {
        ctx.state.board.detonatorPosition += 1;
        if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
          ctx.state.result = "loss_detonator";
          ctx.state.phase = "finished";
          emitMissionFailureTelemetry(ctx.state, "loss_detonator", actorId, null);
        }
      }

      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actorId,
        action: "hookEffect",
        detail: [
          "oxygen_progression:mode=mission49_cut",
          `cost=${requiredCost}`,
          `cut=${ctx.cutValue}`,
          `moved=${movedToRecipient}`,
          `deficit=${deficit}`,
          `recipient=${recipientId ?? "none"}`,
        ].join("|"),
        timestamp: Date.now(),
      });
      return;
    }

    const { paid, deficit } = spendOxygenForTurn(ctx.state, requiredCost, actorId);
    if (deficit > 0) {
      ctx.state.board.detonatorPosition += 1;
      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.result = "loss_detonator";
        ctx.state.phase = "finished";
        emitMissionFailureTelemetry(ctx.state, "loss_detonator", actorId, null);
      }
    }

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: actorId,
      action: "hookEffect",
      detail: [
        "oxygen_progression:mode=cut",
        `cost=${requiredCost}`,
        `cut=${ctx.cutValue}`,
        `paid=${paid}`,
        `deficit=${deficit}`,
        `oxygen_progression:cost=${requiredCost}`,
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

    const activeCount = getDesiredChallengeActiveCount(rule, ctx.state.players.length);
    const deck = buildChallengeDeck(Math.max(8, activeCount + 6));
    const active = deck.splice(0, activeCount);
    ctx.state.campaign!.challenges = {
      deck,
      active,
      completed: [],
    };

    pushGameLog(ctx.state, {
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

    const desiredActiveCount = getDesiredChallengeActiveCount(rule, ctx.state.players.length);
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

    pushGameLog(ctx.state, {
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

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `bunker_flow:start=${position},max=${max},cycle=${cycle}`,
      timestamp: Date.now(),
    });
  },

  resolve(rule: BunkerFlowRuleDef, ctx: ResolveHookContext): void {
    if (ctx.action.type !== "soloCut" && ctx.action.type !== "dualCut") return;
    const tracker = ctx.state.campaign?.bunkerTracker;
    if (!tracker) return;

    const advanceBy = Math.max(0, Math.floor(rule.advanceBy));
    if (advanceBy === 0) return;

    const tilesCut =
      ctx.action.type === "soloCut" && typeof ctx.action.tilesCut === "number"
        ? Math.floor(ctx.action.tilesCut)
        : null;
    // Mission 66 rulebook: solo cutting 4 identical wires counts as two cuts.
    const cutStepMultiplier = tilesCut === 4 ? 2 : 1;
    const effectiveAdvanceBy = advanceBy * cutStepMultiplier;

    const before = tracker.position;
    tracker.position = clampProgress(before + effectiveAdvanceBy, tracker.max);

    const cycle = Math.max(1, Math.floor(rule.actionCycleLength ?? 4));
    setActionPointer(ctx.state, tracker.position % cycle);

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: `bunker_flow:${before}->${tracker.position}|cycle=${cycle}|steps=${cutStepMultiplier}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 14 — Intern failure explodes.
 *
 * Validate: Block the captain (intern) from using forbidden equipment
 *           (e.g. the Stabilizer).
 *
 * Note: The "intern fails a Dual Cut → explosion" rule is enforced inline
 * in gameLogic.ts (same pattern as mission 28's Captain Lazy).
 */
registerHookHandler<"intern_failure_explodes">("intern_failure_explodes", {
  validate(rule: InternFailureExplodesRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.action.type !== "dualCut" && ctx.action.type !== "soloCut") return;

    // Equipment blocking is handled separately in equipment.ts validation.
    // This handler exists so the hook rule is registered and doesn't throw
    // UnknownHookError in strict mode.
  },
});

// ── Mission 18 — Forced General Radar Flow ──────────────────

type StandAwareHookPlayer = import("@bomb-busters/shared").Player & {
  standSizes?: number[];
};

function getHookStandSizes(
  player: Readonly<import("@bomb-busters/shared").Player>,
): number[] {
  const standSizes = (player as Readonly<StandAwareHookPlayer>).standSizes;
  if (!Array.isArray(standSizes) || standSizes.length === 0) {
    return [player.hand.length];
  }
  if (!standSizes.every((size) => Number.isInteger(size) && size >= 0)) {
    return [player.hand.length];
  }
  const total = standSizes.reduce((sum, size) => sum + size, 0);
  if (total !== player.hand.length) {
    return [player.hand.length];
  }
  return standSizes;
}

function resolveHookStandRange(
  player: Readonly<import("@bomb-busters/shared").Player>,
  standIndex: number,
): { start: number; endExclusive: number } | null {
  if (!Number.isInteger(standIndex) || standIndex < 0) return null;

  const standSizes = getHookStandSizes(player);
  if (standIndex >= standSizes.length) return null;

  let start = 0;
  for (let i = 0; i < standSizes.length; i++) {
    const endExclusive = start + standSizes[i];
    if (i === standIndex) {
      return { start, endExclusive };
    }
    start = endExclusive;
  }
  return null;
}

function hookFlatIndexToStandIndex(
  player: Readonly<import("@bomb-busters/shared").Player>,
  flatIndex: number,
): number | null {
  if (!Number.isInteger(flatIndex) || flatIndex < 0 || flatIndex >= player.hand.length) {
    return null;
  }

  const standSizes = getHookStandSizes(player);
  let start = 0;
  for (let standIndex = 0; standIndex < standSizes.length; standIndex++) {
    const endExclusive = start + standSizes[standIndex];
    if (flatIndex >= start && flatIndex < endExclusive) {
      return standIndex;
    }
    start = endExclusive;
  }
  return null;
}

function getMission18StandRadarResults(
  player: Readonly<import("@bomb-busters/shared").Player>,
  value: number,
): boolean[] {
  const standSizes = getHookStandSizes(player);
  return standSizes.map((_, standIndex) => {
    const range = resolveHookStandRange(player, standIndex);
    if (!range) return false;

    for (let i = range.start; i < range.endExclusive; i++) {
      const tile = player.hand[i];
      if (!tile.cut && typeof tile.gameValue === "number" && tile.gameValue === value) {
        return true;
      }
    }
    return false;
  });
}

function formatMission18RadarLog(
  state: Readonly<GameState>,
  value: number,
): string {
  return state.players.map((player) => {
    const perStand = getMission18StandRadarResults(player, value);
    if (perStand.length > 1) {
      const standDetail = perStand
        .map((hasValue, standIndex) => `S${standIndex + 1}:${hasValue ? "yes" : "no"}`)
        .join("|");
      return `${player.id}=${standDetail}`;
    }
    return `${player.id}=${perStand[0] ? "yes" : "no"}`;
  }).join(",");
}

/**
 * Compute General Radar results for a given value: for each player,
 * returns true if they have at least one uncut wire of that value.
 */
export function computeMission18RadarResults(
  state: Readonly<GameState>,
  value: number,
): Record<string, boolean> {
  const results: Record<string, boolean> = {};
  for (const player of state.players) {
    const perStand = getMission18StandRadarResults(player, value);
    results[player.id] = perStand.some(Boolean);
  }
  return results;
}

/**
 * Check if all 4 wires of a given value have been cut across all players.
 */
function isValueFullyCut(state: Readonly<GameState>, value: number): boolean {
  return getCutCountForValue(state, value) >= 4;
}

/**
 * Check if the active player has only red wires remaining (uncut).
 */
function playerHasOnlyReds(player: Readonly<import("@bomb-busters/shared").Player>): boolean {
  const uncut = player.hand.filter((t) => !t.cut);
  return uncut.length > 0 && uncut.every((t) => t.color === "red");
}

/**
 * Draw the next Number card for mission 18. Skips values that are fully cut.
 * Reshuffles discard into deck if deck is empty. Returns the drawn value,
 * or null if no valid cards remain.
 */
export function drawMission18NumberCard(state: GameState): number | null {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards) return null;

  // Reshuffle discard into deck if deck is empty
  if (numberCards.deck.length === 0 && numberCards.discard.length > 0) {
    numberCards.deck = shuffle([...numberCards.discard]);
    numberCards.discard = [];
  }

  // Draw cards, skipping fully-cut values
  while (numberCards.deck.length > 0) {
    const card = numberCards.deck.shift()!;
    if (isValueFullyCut(state, card.value)) {
      // Permanently remove — don't add to discard
      continue;
    }
    card.faceUp = true;
    numberCards.visible = [card];
    return card.value;
  }

  // No valid cards — all values fully cut (game should be won)
  numberCards.visible = [];
  return null;
}

/**
 * Handle the Number card after a cut: if all 4 wires of the value are cut,
 * permanently remove it; otherwise move to discard.
 */
function handleMission18PostCutCard(state: GameState): void {
  const numberCards = state.campaign?.numberCards;
  if (!numberCards) return;

  const currentCard = numberCards.visible.shift();
  if (!currentCard) return;

  if (isValueFullyCut(state, currentCard.value)) {
    // Permanently removed — don't add anywhere
  } else {
    currentCard.faceUp = false;
    numberCards.discard.push(currentCard);
  }
}

/**
 * Set up the designateCutter forced action for the given active player.
 * Draws a Number card, computes radar results, and sets pendingForcedAction.
 */
function setupMission18ForcedAction(state: GameState, activePlayer: import("@bomb-busters/shared").Player): void {
  const drawnValue = drawMission18NumberCard(state);
  if (drawnValue == null) return; // No cards — game should be finishing

  const radarResults = computeMission18RadarResults(state, drawnValue);

  state.pendingForcedAction = {
    kind: "designateCutter",
    designatorId: activePlayer.id,
    value: drawnValue,
    radarResults,
  };

  pushGameLog(state, {
    turn: state.turnNumber,
    playerId: "system",
    action: "hookEffect",
    detail: `m18:number_card:${drawnValue}|radar:${formatMission18RadarLog(state, drawnValue)}`,
    timestamp: Date.now(),
  });
}

/**
 * Mission 18 — Forced General Radar Flow.
 *
 * Setup:
 * - Initialize shuffled 1-12 Number card deck.
 * - Unlock General Radar equipment.
 * - Draw first card and set up forced action for captain.
 *
 * Validate:
 * - During cutter sub-turn: only allow dualCut/soloCut (block equipment, revealReds).
 * - Block manual use of general_radar equipment.
 *
 * EndTurn:
 * - Handle Number card disposition after cut.
 * - Override next player to designator's left (not cutter's left).
 * - Draw next card and set up forced action.
 */
registerHookHandler<"forced_general_radar_flow">("forced_general_radar_flow", {
  setup(_rule: ForcedGeneralRadarFlowRuleDef, ctx: SetupHookContext): void {
    const { state } = ctx;

    // Initialize Number card deck (1-12, shuffled)
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);
    state.campaign ??= {};
    state.campaign.numberCards = {
      deck: deckValues.map((value, idx) => ({
        id: `m18-deck-${idx}-${value}`,
        value,
        faceUp: false,
      })),
      discard: [],
      visible: [],
      playerHands: {},
    };

    // Unlock General Radar
    for (const eq of state.board.equipment) {
      if (eq.id === "general_radar") {
        eq.unlocked = true;
      }
    }

    pushGameLog(state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "forced_general_radar_flow:init",
      timestamp: Date.now(),
    });

    // Captain is the first active player; set up first forced action if they don't have only reds
    const captain = state.players.find((p) => p.isCaptain);
    if (captain && !playerHasOnlyReds(captain)) {
      setupMission18ForcedAction(state, captain);
    }
  },

  validate(_rule: ForcedGeneralRadarFlowRuleDef, ctx: ValidateHookContext): HookResult | void {
    const { state, action } = ctx;

    // During cutter sub-turn, the designated player must cut wires matching
    // the currently revealed Number card value.
    if (state.campaign?.mission18DesignatorIndex != null) {
      const requiredValue = state.campaign.numberCards?.visible?.[0]?.value;

      if (typeof requiredValue !== "number") {
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError: "Mission 18: missing active Number card value for designated cut",
        };
      }

      if (
        action.type === "dualCut"
        || action.type === "soloCut"
        || action.type === "dualCutDoubleDetector"
      ) {
        const attemptedValue =
          action.type === "soloCut" ? action.value : action.guessValue;
        if (attemptedValue !== requiredValue) {
          return {
            validationCode: "MISSION_RULE_VIOLATION",
            validationError: `Mission 18: designated cut must target value ${requiredValue}`,
          };
        }
        return;
      }

      if (action.type === "revealReds") {
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError: "During mission 18 designated cut, you must perform a cut action",
        };
      }
    }
  },

  endTurn(_rule: ForcedGeneralRadarFlowRuleDef, ctx: EndTurnHookContext): HookResult | void {
    const { state } = ctx;
    if (state.phase === "finished") return;

    const designatorIndex = state.campaign?.mission18DesignatorIndex;

    if (designatorIndex != null) {
      // Coming from a cutter's cut — handle Number card and compute next turn
      handleMission18PostCutCard(state);

      // Clear the designator marker
      state.campaign!.mission18DesignatorIndex = undefined;

      // Next player = designator's left (clockwise), skipping empty stands
      const playerCount = state.players.length;
      let nextIndex = (designatorIndex + 1) % playerCount;
      let attempts = 0;
      while (attempts < playerCount) {
        const player = state.players[nextIndex];
        if (player.hand.some((t) => !t.cut)) break;
        nextIndex = (nextIndex + 1) % playerCount;
        attempts++;
      }

      if (attempts >= playerCount) {
        // All stands empty — should already be won
        return;
      }

      const nextPlayer = state.players[nextIndex];

      // If next player has only reds, they'll reveal reds normally (no forced action)
      if (!playerHasOnlyReds(nextPlayer)) {
        setupMission18ForcedAction(state, nextPlayer);
      }

      return { nextPlayerIndex: nextIndex };
    }

    // Coming from a reveal reds (no designator marker) — default advancement already happened
    // Set up forced action for the new active player if needed
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer && !playerHasOnlyReds(currentPlayer)) {
      setupMission18ForcedAction(state, currentPlayer);
    }
  },
});

// ── Mission 23 — Simultaneous Four-of-Value Cut ─────────────

/**
 * Mission 23 — Simultaneous four-of-value cut.
 *
 * Setup:
 * - Place 1 random Number card face-up (the target value for the special action).
 *
 * EndTurn:
 * - Before Captain's turn each round (except round 1), discard 1 face-down
 *   equipment card from the hidden pile until the special action succeeds.
 */
registerHookHandler<"simultaneous_four_cut">("simultaneous_four_cut", {
  validate(_rule: SimultaneousFourCutRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.state.mission !== 23) return;
    if (ctx.action.type === "simultaneousFourCut") return;

    const targetValue = getProtectedSimultaneousFourValue(ctx.state);
    if (targetValue == null) return;
    if (!actionAttemptsCutValue(ctx.action, targetValue)) return;

    return {
      validationCode: "MISSION_RULE_VIOLATION",
      validationError:
        `Mission 23: wires of value ${targetValue} can only be cut using the simultaneous four-wire special action`,
    };
  },

  setup(_rule: SimultaneousFourCutRuleDef, ctx: SetupHookContext): void {
    const value = MISSION_NUMBER_VALUES[Math.floor(Math.random() * MISSION_NUMBER_VALUES.length)];

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: [{ id: `m23-number-${value}`, value, faceUp: true }],
      deck: [],
      discard: [],
      playerHands: {},
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `m23:number_card:init:${value}`,
      timestamp: Date.now(),
    });
  },

  endTurn(_rule: SimultaneousFourCutRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;
    if (ctx.state.campaign?.mission23SpecialActionDone) return;

    // Discard happens when the Captain is about to play and it's not the first round.
    const captainIndex = ctx.state.players.findIndex((player) => player.isCaptain);
    if (captainIndex === -1) return;
    if (ctx.state.currentPlayerIndex !== captainIndex) return;
    if (ctx.state.turnNumber <= 1) return;

    // Find first face-down equipment card and remove it
    const eqIndex = ctx.state.board.equipment.findIndex((card) => card.faceDown);
    if (eqIndex === -1) return;

    const discarded = ctx.state.board.equipment.splice(eqIndex, 1)[0];

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: "system",
      action: "hookEffect",
      detail: `m23:equipment_discard:${discarded.id}|remaining=${ctx.state.board.equipment.length}`,
      timestamp: Date.now(),
    });
  },
});

// ── Mission 22 — Yellow-Trigger Token Pass ──────────────────

/**
 * Count cut yellow tiles across all players.
 */
function countCutYellowTiles(state: Readonly<GameState>): number {
  let count = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut && tile.color === "yellow") count++;
    }
  }
  return count;
}

/**
 * Build clockwise passing order starting from captain.
 */
function buildClockwisePassingOrder(state: Readonly<GameState>): number[] {
  const captainIndex = state.players.findIndex((p) => p.isCaptain);
  if (captainIndex === -1) return [];

  const order: number[] = [];
  const playerCount = state.players.length;
  for (let i = 0; i < playerCount; i++) {
    order.push((captainIndex + i) % playerCount);
  }
  return order;
}

/**
 * Mission 22 — Yellow-trigger token pass.
 *
 * EndTurn:
 * - After the 2nd yellow wire is cut globally, trigger token passing.
 * - All players pass a token clockwise, starting from captain.
 */
registerHookHandler<"yellow_trigger_token_pass">("yellow_trigger_token_pass", {
  endTurn(rule: YellowTriggerTokenPassRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;

    // Skip if already triggered
    if (ctx.state.campaign?.mission22TokenPassTriggered) return;

    const yellowCount = countCutYellowTiles(ctx.state);
    if (yellowCount < rule.triggerCount) return;

    // Trigger the token pass
    ctx.state.campaign ??= {};
    ctx.state.campaign.mission22TokenPassTriggered = true;
    getMission22TokenPassBoardState(ctx.state);

    const passingOrder = buildClockwisePassingOrder(ctx.state);
    if (passingOrder.length === 0) return;

    const firstIndex = passingOrder[0];
    const firstPlayer = ctx.state.players[firstIndex];

    ctx.state.pendingForcedAction = {
      kind: "mission22TokenPass",
      currentChooserIndex: firstIndex,
      currentChooserId: firstPlayer.id,
      passingOrder,
      completedCount: 0,
    };

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: "system",
      action: "hookEffect",
      detail: `m22:yellow_trigger_token_pass:triggered|yellowCount=${yellowCount}|order=${passingOrder.join(",")}`,
      timestamp: Date.now(),
    });
  },
});

// ── Constraint Enforcement ──────────────────────────────────

/**
 * Get active constraints for a player (both global and personal).
 */
function getActiveConstraints(
  state: Readonly<GameState>,
  playerId: string,
): string[] {
  const constraints = state.campaign?.constraints;
  if (!constraints) return [];

  const active: string[] = [];
  for (const c of constraints.global) {
    if (c.active) active.push(c.id);
  }
  const personal = constraints.perPlayer[playerId];
  if (personal) {
    for (const c of personal) {
      if (c.active) active.push(c.id);
    }
  }
  return active;
}

export function hasActiveConstraint(
  state: Readonly<GameState>,
  playerId: string,
  constraintId: string,
): boolean {
  return getActiveConstraints(state, playerId).includes(constraintId);
}

/**
 * Extract the cut value from a validate action context.
 */
function extractCutValue(action: ValidateHookContext["action"]): number | "YELLOW" | null {
  if (action.type === "dualCut" || action.type === "dualCutDoubleDetector") {
    return action.guessValue as number | "YELLOW";
  }
  if (action.type === "soloCut") {
    return action.value as number | "YELLOW";
  }
  return null;
}

/**
 * Whether a validate action attempts to cut a specific numeric value.
 */
function actionAttemptsCutValue(
  action: ValidateHookContext["action"],
  targetValue: number,
): boolean {
  const directValue = extractCutValue(action);
  if (directValue === targetValue) return true;

  if (action.type === "simultaneousCut") {
    const cuts = Array.isArray(action.cuts) ? action.cuts : [];
    return cuts.some(
      (cut) => (cut as { guessValue?: number | "YELLOW" }).guessValue === targetValue,
    );
  }

  return false;
}

/**
 * Current protected value for missions that require a simultaneous 4-cut.
 * Returns null once the special action has been completed.
 */
function getProtectedSimultaneousFourValue(state: Readonly<GameState>): number | null {
  if (state.campaign?.mission23SpecialActionDone) return null;
  const visibleValue = state.campaign?.numberCards?.visible?.[0]?.value;
  return typeof visibleValue === "number" ? visibleValue : null;
}

/**
 * Check if a value satisfies a constraint (is NOT blocked by it).
 */
function valuePassesConstraint(value: number, constraintId: string): boolean {
  switch (constraintId) {
    case "A": return value % 2 === 0;
    case "B": return value % 2 !== 0;
    case "C": return value >= 1 && value <= 6;
    case "D": return value >= 7 && value <= 12;
    case "E": return value >= 4 && value <= 9;
    case "F": return value < 4 || value > 9;
    default: return true; // G, H, I, J, K, L are positional/structural, not value-based
  }
}

/**
 * Check if a player has ANY valid dual-cut target across all other stands.
 * A dual cut requires the actor to have a matching value for a target's uncut tile.
 */
function hasAnyDualCutTarget(state: Readonly<GameState>, playerId: string): boolean {
  const actor = state.players.find((p) => p.id === playerId);
  if (!actor) return false;

  const actorValues = new Set(
    actor.hand
      .filter((t) => !t.cut && typeof t.gameValue === "number")
      .map((t) => t.gameValue as number),
  );

  for (const target of state.players) {
    if (target.id === playerId) continue;
    for (const tile of target.hand) {
      if (!tile.cut && typeof tile.gameValue === "number" && actorValues.has(tile.gameValue)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Auto-flip stuck constraints: if a player has no legal actions due to their
 * constraint, deactivate it (matches physical game rule where constraint card
 * gets flipped face-down when the player is stuck).
 */
function autoFlipStuckConstraints(state: GameState, playerId: string): void {
  const constraints = state.campaign?.constraints;
  if (!constraints) return;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;

  const uncutValues = player.hand
    .filter((t) => !t.cut && typeof t.gameValue === "number")
    .map((t) => t.gameValue as number);
  if (uncutValues.length === 0) return;

  const flipConstraint = (c: { id: string; active: boolean }) => {
    c.active = false;
    pushGameLog(state, {
      turn: state.turnNumber,
      playerId,
      action: "hookEffect",
      detail: `constraint_auto_flip:${c.id}:stuck`,
      timestamp: Date.now(),
    });
  };

  const checkAndFlip = (c: { id: string; active: boolean }) => {
    if (!c.active) return;

    // Value-based constraints (A-F): flip if ALL tiles are blocked
    if (["A", "B", "C", "D", "E", "F"].includes(c.id)) {
      if (uncutValues.every((v) => !valuePassesConstraint(v, c.id))) {
        flipConstraint(c);
      }
      return;
    }

    // Constraint K (No Solo Cut): flip if no dual-cut targets exist
    if (c.id === "K") {
      if (!hasAnyDualCutTarget(state, playerId)) {
        flipConstraint(c);
      }
    }
  };

  for (const c of constraints.global) checkAndFlip(c);
  const personal = constraints.perPlayer[playerId];
  if (personal) {
    for (const c of personal) checkAndFlip(c);
  }
}

/**
 * Constraint enforcement for campaign missions.
 *
 * Setup: Initializes constraints from rule definition.
 * Validate: Checks each active constraint against the proposed action.
 * Resolve: Constraint L doubles the detonator advance on failed dual cuts.
 */
registerHookHandler<"constraint_enforcement">("constraint_enforcement", {
  setup(rule: ConstraintEnforcementRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};

    const allCards = shuffle(
      rule.constraintIds
        .map((id) => {
          const def = CONSTRAINT_CARD_DEFS.find((c) => c.id === id);
          return def
            ? { id: def.id, name: def.name, description: def.description, active: false }
            : null;
        })
        .filter((c): c is NonNullable<typeof c> => c != null),
    );

    if (rule.scope === "global") {
      // Global: activate only the first constraint; the rest form a draw deck.
      const first = allCards.shift();
      if (first) first.active = true;
      ctx.state.campaign.constraints = {
        global: first ? [first] : [],
        perPlayer: {},
        deck: allCards,
      };
    } else {
      // Per-player: deal ONE constraint per player, rest are unused deck.
      const perPlayer: Record<string, typeof allCards> = {};
      for (const player of ctx.state.players) {
        const card = allCards.shift();
        if (card) {
          card.active = true;
          perPlayer[player.id] = [card];
        } else {
          perPlayer[player.id] = [];
        }
      }
      ctx.state.campaign.constraints = {
        global: [],
        perPlayer,
        deck: allCards,
      };
    }

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `constraint_enforcement:scope=${rule.scope}|ids=${rule.constraintIds.join(",")}`,
      timestamp: Date.now(),
    });
  },

  validate(_rule: ConstraintEnforcementRuleDef, ctx: ValidateHookContext): HookResult | void {
    const actorId = ctx.action.actorId;

    // Auto-flip: if the player's constraint blocks ALL their remaining tiles,
    // deactivate it (matches physical game rule: flip constraint when stuck).
    autoFlipStuckConstraints(ctx.state as GameState, actorId);

    const active = getActiveConstraints(ctx.state, actorId);
    if (active.length === 0) return;

    const targetsRestrictedStandEdge = (
      targetPlayerId: string,
      targetTileIndices: readonly number[],
      edge: "left" | "right",
    ): boolean => {
      const target = ctx.state.players.find((p) => p.id === targetPlayerId);
      if (!target) return false;

      for (const targetTileIndex of targetTileIndices) {
        const targetStandIndex = hookFlatIndexToStandIndex(target, targetTileIndex);
        const standRange = targetStandIndex == null
          ? null
          : resolveHookStandRange(target, targetStandIndex);
        if (!standRange) {
          continue;
        }

        const uncutIndices = target.hand
          .map((_, i) => i)
          .filter(
            (i) =>
              i >= standRange.start &&
              i < standRange.endExclusive &&
              !target.hand[i].cut,
          );
        if (uncutIndices.length === 0) {
          continue;
        }

        const edgeIndex =
          edge === "right" ? Math.max(...uncutIndices) : Math.min(...uncutIndices);
        if (targetTileIndex === edgeIndex) {
          return true;
        }
      }

      return false;
    };

    const cutValue = extractCutValue(ctx.action);
    const targetsMarkedByInfoToken = (): boolean => {
      const targetIndicesByPlayer = new Map<string, Set<number>>();
      const addTargetIndex = (playerId: string, tileIndex: number): void => {
        if (!Number.isInteger(tileIndex) || tileIndex < 0) return;
        const existing = targetIndicesByPlayer.get(playerId);
        if (existing) {
          existing.add(tileIndex);
          return;
        }
        targetIndicesByPlayer.set(playerId, new Set([tileIndex]));
      };

      if (ctx.action.type === "dualCut") {
        if (typeof ctx.action.targetPlayerId === "string" && typeof ctx.action.targetTileIndex === "number") {
          addTargetIndex(ctx.action.targetPlayerId, ctx.action.targetTileIndex);
        }
      } else if (ctx.action.type === "dualCutDoubleDetector") {
        if (
          typeof ctx.action.targetPlayerId === "string" &&
          typeof ctx.action.tileIndex1 === "number" &&
          typeof ctx.action.tileIndex2 === "number"
        ) {
          addTargetIndex(ctx.action.targetPlayerId, ctx.action.tileIndex1);
          addTargetIndex(ctx.action.targetPlayerId, ctx.action.tileIndex2);
        }
      } else if (ctx.action.type === "simultaneousCut") {
        const cuts = Array.isArray(ctx.action.cuts) ? ctx.action.cuts : [];
        for (const cut of cuts) {
          const targetPlayerId = (cut as { targetPlayerId?: unknown }).targetPlayerId;
          const targetTileIndex = (cut as { targetTileIndex?: unknown }).targetTileIndex;
          if (typeof targetPlayerId === "string" && typeof targetTileIndex === "number") {
            addTargetIndex(targetPlayerId, targetTileIndex);
          }
        }
      } else if (ctx.action.type === "simultaneousRedCut" || ctx.action.type === "simultaneousFourCut") {
        const targets = Array.isArray(ctx.action.targets) ? ctx.action.targets : [];
        for (const target of targets) {
          const playerId = (target as { playerId?: unknown }).playerId;
          const tileIndex = (target as { tileIndex?: unknown }).tileIndex;
          if (typeof playerId === "string" && typeof tileIndex === "number") {
            addTargetIndex(playerId, tileIndex);
          }
        }
      } else if (ctx.action.type === "soloCut") {
        const cutValue = ctx.action.value;
        if (typeof cutValue === "number" || cutValue === "YELLOW") {
          const actor = ctx.state.players.find((p) => p.id === actorId);
          if (actor) {
            actor.hand.forEach((tile, index) => {
              if (!tile.cut && tile.gameValue === cutValue) {
                addTargetIndex(actor.id, index);
              }
            });
          }
        }
      }

      for (const [targetPlayerId, tileIndices] of targetIndicesByPlayer) {
        const targetPlayer = ctx.state.players.find((p) => p.id === targetPlayerId);
        if (!targetPlayer) continue;
        for (const tileIndex of tileIndices) {
          if (
            targetPlayer.infoTokens.some(
              (token) => token.position === tileIndex || token.positionB === tileIndex,
            )
          ) {
            return true;
          }
        }
      }

      return false;
    };

    for (const constraintId of active) {
      switch (constraintId) {
        case "A": // Even Wires Only
          if (typeof cutValue === "number" && cutValue % 2 !== 0) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint A: You must cut only even wires",
            };
          }
          break;

        case "B": // Odd Wires Only
          if (typeof cutValue === "number" && cutValue % 2 === 0) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint B: You must cut only odd wires",
            };
          }
          break;

        case "C": // Wires 1–6 Only
          if (typeof cutValue === "number" && (cutValue < 1 || cutValue > 6)) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint C: You must cut only wires 1 to 6",
            };
          }
          break;

        case "D": // Wires 7–12 Only
          if (typeof cutValue === "number" && (cutValue < 7 || cutValue > 12)) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint D: You must cut only wires 7 to 12",
            };
          }
          break;

        case "E": // Wires 4–9 Only
          if (typeof cutValue === "number" && (cutValue < 4 || cutValue > 9)) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint E: You must cut only wires 4 to 9",
            };
          }
          break;

        case "F": // No Wires 4–9
          if (typeof cutValue === "number" && cutValue >= 4 && cutValue <= 9) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint F: You cannot cut wires 4 to 9",
            };
          }
          break;

        case "H": // No cuts on info-token-marked wires
          if (targetsMarkedByInfoToken()) {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint H: You cannot cut a wire indicated by an Info token",
            };
          }
          break;

        case "I": // No Far-Right Wire
          if (ctx.action.type === "dualCut") {
            if (
              targetsRestrictedStandEdge(
                ctx.action.targetPlayerId as string,
                [ctx.action.targetTileIndex as number],
                "right",
              )
            ) {
              return {
                validationCode: "MISSION_RULE_VIOLATION",
                validationError: "Constraint I: You cannot cut the far-right wire",
              };
            }
          } else if (ctx.action.type === "dualCutDoubleDetector") {
            if (
              targetsRestrictedStandEdge(
                ctx.action.targetPlayerId as string,
                [ctx.action.tileIndex1 as number, ctx.action.tileIndex2 as number],
                "right",
              )
            ) {
              return {
                validationCode: "MISSION_RULE_VIOLATION",
                validationError: "Constraint I: You cannot cut the far-right wire",
              };
            }
          }
          break;

        case "J": // No Far-Left Wire
          if (ctx.action.type === "dualCut") {
            if (
              targetsRestrictedStandEdge(
                ctx.action.targetPlayerId as string,
                [ctx.action.targetTileIndex as number],
                "left",
              )
            ) {
              return {
                validationCode: "MISSION_RULE_VIOLATION",
                validationError: "Constraint J: You cannot cut the far-left wire",
              };
            }
          } else if (ctx.action.type === "dualCutDoubleDetector") {
            if (
              targetsRestrictedStandEdge(
                ctx.action.targetPlayerId as string,
                [ctx.action.tileIndex1 as number, ctx.action.tileIndex2 as number],
                "left",
              )
            ) {
              return {
                validationCode: "MISSION_RULE_VIOLATION",
                validationError: "Constraint J: You cannot cut the far-left wire",
              };
            }
          }
          break;

        case "K": // No Solo Cut
          if (ctx.action.type === "soloCut") {
            return {
              validationCode: "MISSION_RULE_VIOLATION",
              validationError: "Constraint K: You cannot do a Solo Cut action",
            };
          }
          break;

        // G (No Equipment) is enforced in equipment.ts validation
        // H (No Info on Fail) and Post-it prohibition are not enforced here
        // L (Double Detonator) is enforced at resolve time
      }
    }
  },

  resolve(_rule: ConstraintEnforcementRuleDef, ctx: ResolveHookContext): HookResult | void {
    if (ctx.action.type !== "dualCut") return;
    if (ctx.cutSuccess) return;

    const actorId = ctx.action.actorId;
    const active = getActiveConstraints(ctx.state, actorId);

    // Constraint L: double detonator advance on failed dual cut
    if (active.includes("L")) {
      // The base game already advanced detonator by 1; advance by 1 more
      ctx.state.board.detonatorPosition += 1;

      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actorId,
        action: "hookEffect",
        detail: "constraint_L:double_detonator:+1_extra",
        timestamp: Date.now(),
      });

      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.result = "loss_detonator";
        ctx.state.phase = "finished";
        emitMissionFailureTelemetry(ctx.state, "loss_detonator", actorId, null);
      }
    }
  },
});

// ── Simple informational hooks (missions 19/25/30/42/50) ──────────

/**
 * Missions 19, 30, 42: Audio prompt.
 * No server-side logic needed — this is a client-side display hint that a
 * sound file must be played. The handler is registered so the hook system
 * doesn't throw an "unknown hook kind" error.
 */
registerHookHandler<"audio_prompt">("audio_prompt", {
  setup(_rule: AudioPromptRuleDef, ctx: SetupHookContext): void {
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "",
      action: "hook",
      detail: `audio_prompt:${_rule.audioFile}:play_sound_file`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 25: No spoken numbers.
 * Communication restriction — no server enforcement needed, but the hook
 * is registered for the dispatch system.
 */
registerHookHandler<"no_spoken_numbers">("no_spoken_numbers", {
  setup(_rule: NoSpokenNumbersRuleDef, ctx: SetupHookContext): void {
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "",
      action: "hook",
      detail: "no_spoken_numbers:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 50: No markers / memory mode.
 * On failed cuts, info tokens are placed beside the stand (non-positional).
 * This is enforced in gameLogic.ts via the campaign state flag. The hook
 * sets that mode.
 */
registerHookHandler<"no_markers_memory_mode">("no_markers_memory_mode", {
  setup(_rule: NoMarkersMemoryModeRuleDef, ctx: SetupHookContext): void {
    if (!ctx.state.campaign) {
      ctx.state.campaign = {};
    }
    // Set a flag that gameLogic will check when placing info tokens on failure.
    (ctx.state.campaign as Record<string, unknown>).noMarkersMemoryMode = true;
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "",
      action: "hook",
      detail: "no_markers_memory_mode:active",
      timestamp: Date.now(),
    });
  },
});

// ── Token-based hooks (missions 21/24/33/40/52) ──────────────────

/**
 * Missions 21, 33: Even/odd tokens.
 * Replaces standard info tokens with even/odd indicators. The actual token
 * placement logic is enforced in gameLogic.ts via campaign flag.
 */
registerHookHandler<"even_odd_tokens">("even_odd_tokens", {
  setup(_rule: EvenOddTokensRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).evenOddTokenMode = true;
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "even_odd_tokens:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Missions 24, 40: Count tokens (x1/x2/x3).
 * Replaces standard info tokens with count indicators showing how many
 * wires of that value exist on the stand.
 */
registerHookHandler<"count_tokens">("count_tokens", {
  setup(_rule: CountTokensRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).countTokenMode = true;
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "count_tokens:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 52: All tokens are false — values must NOT match wires.
 */
registerHookHandler<"false_tokens">("false_tokens", {
  setup(_rule: FalseTokensRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).falseTokenMode = true;
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "false_tokens:active",
      timestamp: Date.now(),
    });
  },
});

// ── Wire-based hooks (missions 20/35/38/56/64) ──────────────────

function moveArrayItem<T>(arr: T[], fromIndex: number, toIndex: number): void {
  if (fromIndex < 0 || fromIndex >= arr.length) return;
  if (arr.length === 0) return;

  const clampedTarget = Math.max(0, Math.min(toIndex, arr.length - 1));
  if (fromIndex === clampedTarget) return;

  const [item] = arr.splice(fromIndex, 1);
  arr.splice(clampedTarget, 0, item);
}

/**
 * Mission 56 setup: move the selected flipped wire to the far-right
 * position of the same stand.
 */
function applyMission56FlippedWirePlacement(
  player: import("@bomb-busters/shared").Player,
  selectedTileIds: readonly string[],
): void {
  if (selectedTileIds.length !== 1) return;

  const hand = [...player.hand];
  if (hand.length === 0) return;

  const selectedIndex = hand.findIndex((tile) => tile.id === selectedTileIds[0]);
  if (selectedIndex < 0) return;

  const standIndex = hookFlatIndexToStandIndex(player, selectedIndex);
  const standRange =
    standIndex == null ? null : resolveHookStandRange(player, standIndex);
  const targetIndex =
    standRange && standRange.endExclusive > standRange.start
      ? standRange.endExclusive - 1
      : hand.length - 1;

  moveArrayItem(hand, selectedIndex, targetIndex);
  player.hand = hand;
}

/**
 * Mission 64 setup: once two flipped wires are selected, reposition them so:
 * - lower value goes to far-left of stand 1
 * - higher value goes to far-right of stand 2 (if present), otherwise stand 1
 */
function applyMission64FlippedWirePlacement(
  player: import("@bomb-busters/shared").Player,
  selectedTileIds: readonly string[],
): void {
  if (selectedTileIds.length !== 2) return;

  const hand = [...player.hand];
  if (hand.length === 0) return;

  const firstIdx = hand.findIndex((tile) => tile.id === selectedTileIds[0]);
  const secondIdx = hand.findIndex((tile) => tile.id === selectedTileIds[1]);
  if (firstIdx < 0 || secondIdx < 0 || firstIdx === secondIdx) return;

  const firstTile = hand[firstIdx];
  const secondTile = hand[secondIdx];

  const firstIsLower =
    firstTile.sortValue < secondTile.sortValue
      || (firstTile.sortValue === secondTile.sortValue && firstIdx <= secondIdx);

  const lowerTileId = firstIsLower ? firstTile.id : secondTile.id;
  const higherTileId = firstIsLower ? secondTile.id : firstTile.id;

  const firstStandRange = resolveHookStandRange(player, 0);
  const secondStandRange = resolveHookStandRange(player, 1);

  const lowerTargetIndex =
    firstStandRange && firstStandRange.endExclusive > firstStandRange.start
      ? firstStandRange.start
      : 0;

  const higherTargetIndex =
    secondStandRange && secondStandRange.endExclusive > secondStandRange.start
      ? secondStandRange.endExclusive - 1
      : firstStandRange && firstStandRange.endExclusive > firstStandRange.start
        ? firstStandRange.endExclusive - 1
        : hand.length - 1;

  const lowerCurrentIndex = hand.findIndex((tile) => tile.id === lowerTileId);
  moveArrayItem(hand, lowerCurrentIndex, lowerTargetIndex);

  const higherCurrentIndex = hand.findIndex((tile) => tile.id === higherTileId);
  moveArrayItem(hand, higherCurrentIndex, higherTargetIndex);

  player.hand = hand;
}

/**
 * Missions 20, 35: X-marked wire.
 * The last dealt wire on each stand is moved unsorted to the far right
 * and marked with X. Setup modifies tile positions.
 */
registerHookHandler<"x_marked_wire">("x_marked_wire", {
  setup(rule: XMarkedWireRuleDef, ctx: SetupHookContext): void {
    for (const player of ctx.state.players) {
      if (player.hand.length === 0) continue;

      const standSizes =
        Array.isArray(player.standSizes) && player.standSizes.length > 0
          ? player.standSizes
          : [player.hand.length];

      let offset = 0;
      for (const standSize of standSizes) {
        const size = Math.max(0, standSize);
        if (size === 0) {
          continue;
        }

        const start = offset;
        const endExclusive = Math.min(player.hand.length, offset + size);
        offset += size;

        if (endExclusive <= start) {
          continue;
        }

        const standTiles = player.hand.slice(start, endExclusive);

        let markerIndex = standTiles.findIndex((tile) => tile.isXMarked === true);
        if (markerIndex === -1 && ctx.state.mission === 35) {
          const blueIndices = standTiles
            .map((tile, idx) => (tile.color === "blue" ? idx : -1))
            .filter((idx) => idx >= 0);
          if (blueIndices.length > 0) {
            const randomBlueIndex = Math.floor(Math.random() * blueIndices.length);
            markerIndex = blueIndices[randomBlueIndex] ?? -1;
          }
        }
        if (markerIndex === -1) {
          markerIndex = standTiles.length - 1;
        }

        const [markerTile] = standTiles.splice(markerIndex, 1);
        for (const tile of standTiles) {
          tile.isXMarked = false;
          delete (tile as unknown as { xMarked?: boolean }).xMarked;
        }

        markerTile.isXMarked = true;
        delete (markerTile as unknown as { xMarked?: boolean }).xMarked;
        standTiles.push(markerTile);

        player.hand.splice(start, endExclusive - start, ...standTiles);
      }
    }

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `x_marked_wire:active|excludeWalkieTalkies=${Boolean(rule.excludeWalkieTalkies)}`,
      timestamp: Date.now(),
    });
  },
});

function getMission38CaptainFlippedWire(
  state: Readonly<GameState>,
): {
  captainId: string;
  flippedTileIndex: number;
} | null {
  if (state.mission !== 38) return null;

  const captain = state.players.find((player) => player.isCaptain);
  if (!captain) return null;

  const flippedTileIndex = captain.hand.findIndex((tile) =>
    !tile.cut && (tile as WireTile & { upsideDown?: boolean }).upsideDown === true,
  );
  if (flippedTileIndex === -1) return null;

  return {
    captainId: captain.id,
    flippedTileIndex,
  };
}

function canSoloCutValue(
  state: Readonly<GameState>,
  actor: Readonly<GameState["players"][number]>,
  value: GameState["players"][number]["hand"][number]["gameValue"],
): boolean {
  let actorCount = 0;
  let totalCount = 0;

  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut || tile.gameValue !== value) continue;
      totalCount += 1;
      if (player.id === actor.id) {
        actorCount += 1;
      }
    }
  }

  if (totalCount !== actorCount) return false;
  if (typeof value === "number") {
    return actorCount === 2 || actorCount === 4;
  }
  return value === "YELLOW";
}

function shouldAutoSkipMission38Turn(
  state: Readonly<GameState>,
  actor: Readonly<GameState["players"][number]>,
  captainId: string,
  flippedTileIndex: number,
): boolean {
  if (actor.id === captainId) return false;

  const actorUncut = actor.hand.filter((tile) => !tile.cut);
  if (actorUncut.length === 0) return false;

  const nonRedValues = new Set(
    actorUncut
      .map((tile) => tile.gameValue)
      .filter((value): value is Exclude<typeof value, "RED"> => value !== "RED"),
  );
  if (nonRedValues.size === 0) return false;

  let hasFlippedWireAsTarget = false;

  for (const value of nonRedValues) {
    if (canSoloCutValue(state, actor, value)) {
      return false;
    }

    for (const targetPlayer of state.players) {
      if (targetPlayer.id === actor.id) continue;

      for (let i = 0; i < targetPlayer.hand.length; i++) {
        const tile = targetPlayer.hand[i];
        if (tile.cut || tile.gameValue !== value) continue;

        const isCaptainFlippedWire =
          targetPlayer.id === captainId && i === flippedTileIndex;

        if (isCaptainFlippedWire) {
          hasFlippedWireAsTarget = true;
        } else {
          return false;
        }
      }
    }
  }

  return hasFlippedWireAsTarget;
}

/**
 * Missions 38, 56, 64: Upside-down wires.
 * Mission 38 flips only the captain's wire; missions 56/64 flip wires
 * for each player. Teammates can see the value but the owner cannot.
 */
registerHookHandler<"upside_down_wire">("upside_down_wire", {
  validate(_rule: UpsideDownWireRuleDef, ctx: ValidateHookContext): HookResult | void {
    const flippedWire = getMission38CaptainFlippedWire(ctx.state);
    if (!flippedWire) return;
    if (ctx.action.actorId === flippedWire.captainId) return;

    const targetsCaptainFlippedWire = (() => {
      if (ctx.action.type === "dualCut") {
        return (
          ctx.action.targetPlayerId === flippedWire.captainId &&
          ctx.action.targetTileIndex === flippedWire.flippedTileIndex
        );
      }

      if (ctx.action.type === "dualCutDoubleDetector") {
        return (
          ctx.action.targetPlayerId === flippedWire.captainId &&
          (ctx.action.tileIndex1 === flippedWire.flippedTileIndex ||
            ctx.action.tileIndex2 === flippedWire.flippedTileIndex)
        );
      }

      if (ctx.action.type === "simultaneousCut") {
        const cuts = Array.isArray(ctx.action.cuts) ? ctx.action.cuts : [];
        return cuts.some((cut) =>
          (cut as { targetPlayerId?: unknown }).targetPlayerId === flippedWire.captainId &&
          (cut as { targetTileIndex?: unknown }).targetTileIndex === flippedWire.flippedTileIndex,
        );
      }

      if (
        ctx.action.type === "simultaneousRedCut" ||
        ctx.action.type === "simultaneousFourCut"
      ) {
        const targets = Array.isArray(ctx.action.targets) ? ctx.action.targets : [];
        return targets.some((target) =>
          (target as { playerId?: unknown }).playerId === flippedWire.captainId &&
          (target as { tileIndex?: unknown }).tileIndex === flippedWire.flippedTileIndex,
        );
      }

      return false;
    })();

    if (!targetsCaptainFlippedWire) return;

    return {
      validationCode: "MISSION_RULE_VIOLATION",
      validationError: "Mission 38: only the Captain can cut the Captain's flipped wire",
    };
  },

  resolve(_rule: UpsideDownWireRuleDef, ctx: ResolveHookContext): void {
    if (ctx.action.type !== "dualCut" || !ctx.cutSuccess) return;
    if (ctx.state.mission !== 56 && ctx.state.mission !== 64) return;

    const actorId =
      typeof ctx.action.actorId === "string" ? ctx.action.actorId : null;
    const targetPlayerId =
      typeof ctx.action.targetPlayerId === "string"
        ? ctx.action.targetPlayerId
        : null;
    const targetTileIndex =
      typeof ctx.action.targetTileIndex === "number"
        ? ctx.action.targetTileIndex
        : null;

    if (actorId == null || targetPlayerId == null || targetTileIndex == null) return;
    if (targetPlayerId === actorId) return;

    const targetPlayer = ctx.state.players.find((player) => player.id === targetPlayerId);
    if (!targetPlayer) return;

    const targetTile = targetPlayer.hand[targetTileIndex] as
      | (WireTile & { upsideDown?: boolean })
      | undefined;
    if (!targetTile || targetTile.upsideDown !== true) return;

    ctx.state.board.detonatorPosition += 1;
    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: actorId,
      action: "hookEffect",
      detail:
        `upside_down_wire:teammate_flipped_dual_cut` +
        `|target=${targetPlayerId}` +
        `|tile=${targetTileIndex}` +
        `|detonator=${ctx.state.board.detonatorPosition}`,
      timestamp: Date.now(),
    });
  },

  endTurn(_rule: UpsideDownWireRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;

    const flippedWire = getMission38CaptainFlippedWire(ctx.state);
    if (!flippedWire) return;

    const playerCount = ctx.state.players.length;
    const maxAutoSkips = ctx.state.board.detonatorMax + playerCount;

    for (let autoSkipCount = 0; autoSkipCount < maxAutoSkips; autoSkipCount++) {
      const actor = ctx.state.players[ctx.state.currentPlayerIndex];
      if (!actor) return;

      if (
        !shouldAutoSkipMission38Turn(
          ctx.state,
          actor,
          flippedWire.captainId,
          flippedWire.flippedTileIndex,
        )
      ) {
        return;
      }

      ctx.state.board.detonatorPosition += 1;
      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actor.id,
        action: "hookEffect",
        detail:
          `upside_down_wire:auto_skip|player=${actor.id}` +
          `|detonator=${ctx.state.board.detonatorPosition}`,
        timestamp: Date.now(),
      });

      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.phase = "finished";
        ctx.state.result = "loss_detonator";
        emitMissionFailureTelemetry(
          ctx.state,
          "loss_detonator",
          actor.id,
          flippedWire.captainId,
        );
        return;
      }

      let nextPlayerIndex = ctx.state.currentPlayerIndex;
      for (let offset = 1; offset <= playerCount; offset++) {
        const candidateIndex = (ctx.state.currentPlayerIndex + offset) % playerCount;
        const candidate = ctx.state.players[candidateIndex];
        if (candidate?.hand.some((tile) => !tile.cut)) {
          nextPlayerIndex = candidateIndex;
          break;
        }
      }

      ctx.state.currentPlayerIndex = nextPlayerIndex;
      ctx.state.turnNumber += 1;
    }
  },

  setup(rule: UpsideDownWireRuleDef, ctx: SetupHookContext): void {
    const captainOnly = ctx.state.mission === 38;

    for (const player of ctx.state.players) {
      if (captainOnly && !player.isCaptain) {
        for (const tile of player.hand) {
          delete (tile as unknown as Record<string, unknown>).upsideDown;
        }
        continue;
      }

      const uncutIndices = player.hand
        .map((_, i) => i)
        .filter((i) => !player.hand[i].cut);
      if (uncutIndices.length === 0) continue;

      const toFlip = Math.min(rule.count, uncutIndices.length);
      const selected = shuffle([...uncutIndices]).slice(0, toFlip);
      const selectedTileIds = selected
        .map((idx) => player.hand[idx]?.id)
        .filter((id): id is string => typeof id === "string");

      if (ctx.state.mission === 56) {
        applyMission56FlippedWirePlacement(player, selectedTileIds);
      }

      if (ctx.state.mission === 64) {
        applyMission64FlippedWirePlacement(player, selectedTileIds);
      }

      const selectedIdSet = new Set(selectedTileIds);
      for (const tile of player.hand) {
        const mutable = tile as unknown as Record<string, unknown>;
        if (selectedIdSet.has(tile.id)) {
          mutable.upsideDown = true;
        } else {
          delete mutable.upsideDown;
        }
      }
    }

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `upside_down_wire:count=${rule.count}|selfCutExplodes=${Boolean(rule.selfCutExplodes)}|noEquipmentOnFlipped=${Boolean(rule.noEquipmentOnFlipped)}`,
      timestamp: Date.now(),
    });
  },
});

// ── Number card hooks (missions 26/29/45/47/62/65) ──────────────────

/**
 * Mission 26: Visible number card gate.
 * A face-up number card determines which value must be cut to proceed.
 */
registerHookHandler<"visible_number_card_gate">("visible_number_card_gate", {
  setup(_rule: VisibleNumberCardGateRuleDef, ctx: SetupHookContext): void {
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);
    const numberCards = deckValues.map((value, idx) => ({
      id: `m26-visible-${idx}-${value}`,
      value,
      faceUp: true,
    }));

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: numberCards,
      deck: [],
      discard: [],
      playerHands: {},
    };
    skipMission26NoMatchTurns(ctx.state);

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "visible_number_card_gate:init",
      timestamp: Date.now(),
    });
  },

  validate(_rule: VisibleNumberCardGateRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.state.mission !== 26 || ctx.state.phase === "finished") return;

    const actor = ctx.state.players.find((p) => p.id === ctx.action.actorId);
    if (!actor) return;

    if (!canPlayerActWithMission26Card(ctx.state, actor.id)) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 26: player must skip their turn",
      };
    }

    const isCutAction = ctx.action.type === "dualCut"
      || ctx.action.type === "dualCutDoubleDetector"
      || ctx.action.type === "soloCut";
    if (!isCutAction) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 26: you must cut a wire matching a visible Number card value",
      };
    }

    const attemptedValues = getMission26AttemptedValues(ctx.action);
    if (attemptedValues.length === 0) return;

    const visibleValues = new Set(
      getVisibleMission26Values(ctx.state),
    );

    for (const attemptedValue of attemptedValues) {
      if (typeof attemptedValue !== "number") {
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError: "Mission 26: cuts must target a visible Number card value",
        };
      }
      if (!visibleValues.has(attemptedValue)) {
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError:
            "Mission 26: you must pick one of the currently visible Number card values",
        };
      }
    }
  },

  resolve(_rule: VisibleNumberCardGateRuleDef, ctx: ResolveHookContext): void {
    const numberCards = ctx.state.campaign?.numberCards;
    if (!numberCards) return;
    if (ctx.state.mission !== 26 || ctx.state.phase === "finished") return;

    const attemptedValues = getMission26AttemptedValues(ctx.action);
    for (const attemptedValue of attemptedValues) {
      if (typeof attemptedValue !== "number") continue;
      const matchingCard = numberCards.visible.find(
        (card) => card.value === attemptedValue && card.faceUp,
      );
      if (matchingCard) matchingCard.faceUp = false;
    }

    if (!ctx.cutSuccess) return;
    if (typeof ctx.cutValue !== "number") return;

    const matchingCard = numberCards.visible.find((card) => card.value === ctx.cutValue);
    if (!matchingCard) return;

    matchingCard.faceUp = false;
    const projectedCutCount = getProjectedCutCountForResolve(ctx, ctx.cutValue);
    if (projectedCutCount < 4) return;

    const matchingIndex = numberCards.visible.findIndex((card) => card.value === ctx.cutValue);
    if (matchingIndex >= 0) {
      numberCards.visible.splice(matchingIndex, 1);
      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: ctx.action.actorId,
        action: "hookEffect",
        detail: `visible_number_card_gate:completed=${ctx.cutValue}`,
        timestamp: Date.now(),
      });
    }
  },

  endTurn(_rule: VisibleNumberCardGateRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished" || ctx.state.mission !== 26) return;

    revealAllMission26FaceDownCards(ctx.state);
    skipMission26NoMatchTurns(ctx.state);
  },
});

function getVisibleMission26Values(state: Readonly<GameState>): number[] {
  return (state.campaign?.numberCards?.visible ?? [])
    .filter((card) => card.faceUp)
    .map((card) => card.value);
}

function canPlayerActWithMission26Card(state: Readonly<GameState>, actorId: string): boolean {
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return false;

  const visible = state.campaign?.numberCards?.visible;
  if (!visible || visible.length === 0) return true;

  const visibleValues = new Set(getVisibleMission26Values(state));
  if (visibleValues.size === 0) return true;

  return actor.hand.some(
    (tile) => !tile.cut && typeof tile.gameValue === "number" && visibleValues.has(tile.gameValue),
  );
}

function getMission26AttemptedValues(
  action: ValidateHookContext["action"],
): Array<number | "YELLOW"> {
  if (action.type === "dualCut" || action.type === "dualCutDoubleDetector") {
    return typeof action.guessValue === "number" || action.guessValue === "YELLOW"
      ? [action.guessValue]
      : [];
  }
  if (action.type === "soloCut") {
    return typeof action.value === "number" || action.value === "YELLOW" ? [action.value] : [];
  }
  if (action.type === "simultaneousCut") {
    const cuts = Array.isArray(action.cuts) ? action.cuts : [];
    return cuts
      .map((cut) => {
        const asCut = cut as { guessValue?: unknown };
        return asCut.guessValue;
      })
      .filter((value): value is number | "YELLOW" =>
        typeof value === "number" || value === "YELLOW",
      );
  }
  return [];
}

function revealAllMission26FaceDownCards(state: GameState): void {
  const visible = state.campaign?.numberCards?.visible;
  if (!visible || visible.length === 0) return;
  if (visible.some((card) => card.faceUp)) return;

  for (const card of visible) {
    card.faceUp = true;
  }

  pushGameLog(state, {
    turn: state.turnNumber,
    playerId: "system",
    action: "hookEffect",
    detail: `visible_number_card_gate:refresh|count=${visible.length}`,
    timestamp: Date.now(),
  });
}

function skipMission26NoMatchTurns(state: GameState): void {
  const playerCount = state.players.length;
  let skipCount = 0;

  while (skipCount < playerCount) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    const canAct =
      canPlayerActWithMission26Card(state, currentPlayer.id)
      && getCurrentPlayerHasUncutCards(state);
    if (canAct) return;

    const nextPlayerIndex = findNextUncutPlayerIndex(state, state.currentPlayerIndex);
    if (nextPlayerIndex == null) return;

    state.currentPlayerIndex = nextPlayerIndex;
    state.turnNumber += 1;
    skipCount += 1;

    pushGameLog(state, {
      turn: state.turnNumber,
      playerId: currentPlayer.id,
      action: "hookEffect",
      detail: `visible_number_card_gate:auto_skip|player=${currentPlayer.id}`,
      timestamp: Date.now(),
    });
  }
}

function getCurrentPlayerHasUncutCards(state: Readonly<GameState>): boolean {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) return false;
  return currentPlayer.hand.some((tile) => !tile.cut);
}

/**
 * Mission 29: Hidden number card penalty.
 * Each turn a hidden number card is revealed and penalizes the player
 * if they cannot match it.
 */
registerHookHandler<"hidden_number_card_penalty">("hidden_number_card_penalty", {
  setup(_rule: HiddenNumberCardPenaltyRuleDef, ctx: SetupHookContext): void {
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: [],
      deck: deckValues.map((value, idx) => ({
        id: `m29-deck-${idx}-${value}`,
        value,
        faceUp: false,
      })),
      discard: [],
      playerHands: {},
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "hidden_number_card_penalty:init",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 45: Squeak number challenge.
 * Players challenge a number and must cut it before someone else does.
 */
registerHookHandler<"squeak_number_challenge">("squeak_number_challenge", {
  setup(_rule: SqueakNumberChallengeRuleDef, ctx: SetupHookContext): void {
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "squeak_number_challenge:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 47: Add/subtract number cards.
 * Mathematical operations on number cards determine valid cut targets.
 */
registerHookHandler<"add_subtract_number_cards">("add_subtract_number_cards", {
  setup(_rule: AddSubtractNumberCardsRuleDef, ctx: SetupHookContext): void {
    const visibleValues = shuffle([...MISSION_NUMBER_VALUES]);

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      // Mission 47 setup starts with all Number cards visible.
      visible: visibleValues.map((value, idx) => ({
        id: `m47-deck-${idx}-${value}`,
        value,
        faceUp: true,
      })),
      deck: [],
      discard: [],
      playerHands: {},
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "add_subtract_number_cards:init",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 62: Number card completions.
 * Cutting 4 wires of a value matching a face-up number card grants
 * a detonator reduction.
 */
registerHookHandler<"number_card_completions">("number_card_completions", {
  setup(_rule: NumberCardCompletionsRuleDef, ctx: SetupHookContext): void {
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);
    const visibleCount = Math.max(1, Math.min(ctx.state.players.length, deckValues.length));
    const visibleValues = deckValues.splice(0, visibleCount);

    ctx.state.campaign ??= {};
    ctx.state.campaign.numberCards = {
      visible: visibleValues.map((value, idx) => ({
        id: `m62-visible-${idx}-${value}`,
        value,
        faceUp: true,
      })),
      deck: deckValues.map((value, idx) => ({
        id: `m62-deck-${idx}-${value}`,
        value,
        faceUp: false,
      })),
      discard: [],
      playerHands: {},
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail:
        `number_card_completions:init:` +
        `${visibleValues.join(",") || "none"}|players=${ctx.state.players.length}`,
      timestamp: Date.now(),
    });
  },

  resolve(_rule: NumberCardCompletionsRuleDef, ctx: ResolveHookContext): void {
    if (!ctx.cutSuccess) return;
    if (typeof ctx.cutValue !== "number") return;

    const numberCards = ctx.state.campaign?.numberCards;
    if (!numberCards) return;
    const matchingIndex = numberCards.visible.findIndex((card) => card.value === ctx.cutValue);
    if (matchingIndex < 0) return;
    const matchingCard = numberCards.visible[matchingIndex];
    if (!matchingCard) return;

    const projectedCutCount = getProjectedCutCountForResolve(ctx, matchingCard.value);
    if (projectedCutCount < 4) return;

    // Value completed — reduce detonator by 1
    ctx.state.board.detonatorPosition = Math.max(
      0,
      ctx.state.board.detonatorPosition - 1,
    );

    // Move the completed face-up card to discard. Mission 62 keeps only the
    // initial face-up set and does not reveal replacement cards.
    const completed = numberCards.visible.splice(matchingIndex, 1)[0]!;
    completed.faceUp = true;
    numberCards.discard.push(completed);

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail:
        `number_card_completions:completed=${matchingCard.value}` +
        `|detonator_reduction=1|remaining=${numberCards.visible.map((card) => card.value).join(",") || "none"}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 65: Personal number cards.
 * Each player has private number cards determining their valid cut targets.
 */
registerHookHandler<"personal_number_cards">("personal_number_cards", {
  setup(_rule: PersonalNumberCardsRuleDef, ctx: SetupHookContext): void {
    const deckValues = shuffle([...MISSION_NUMBER_VALUES]);

    ctx.state.campaign ??= {};
    const playerHands: Record<string, { id: string; value: number; faceUp: boolean }[]> = {};
    const playerCount = ctx.state.players.length;
    const baseCardsPerPlayer = Math.floor(deckValues.length / playerCount);
    const extraCards = deckValues.length % playerCount;
    const captainIndex = Math.max(0, ctx.state.players.findIndex((player) => player.isCaptain));
    const cardsByPlayerIndex = Array.from(
      { length: playerCount },
      () => baseCardsPerPlayer,
    );

    // Mission 65 setup deals as equally as possible, with the extra cards
    // starting from captain and then clockwise.
    for (let offset = 0; offset < extraCards; offset++) {
      const recipientIndex = (captainIndex + offset) % playerCount;
      cardsByPlayerIndex[recipientIndex]++;
    }

    for (let i = 0; i < playerCount; i++) {
      const player = ctx.state.players[i];
      const hand = deckValues.splice(0, cardsByPlayerIndex[i]);
      playerHands[player.id] = hand.map((value, idx) => ({
        id: `m65-${player.id}-${idx}-${value}`,
        value,
        faceUp: true,
      }));
    }

    ctx.state.campaign.numberCards = {
      visible: [],
      deck: deckValues.map((value, idx) => ({
        id: `m65-remaining-${idx}-${value}`,
        value,
        faceUp: false,
      })),
      discard: [],
      playerHands,
    };

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail:
        `personal_number_cards:init|players=${playerCount}` +
        `|baseCardsPerPlayer=${baseCardsPerPlayer}|extraCards=${extraCards}`,
      timestamp: Date.now(),
    });
  },

  validate(_rule: PersonalNumberCardsRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (
      ctx.action.type !== "dualCut" &&
      ctx.action.type !== "dualCutDoubleDetector" &&
      ctx.action.type !== "soloCut" &&
      ctx.action.type !== "simultaneousCut"
    ) {
      return;
    }

    const numberCards = ctx.state.campaign?.numberCards;
    const actorCards = numberCards?.playerHands?.[ctx.action.actorId];
    if (!actorCards) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 65: personal Number cards are not initialized",
      };
    }

    const faceUpValues = new Set(
      actorCards.filter((card) => card.faceUp).map((card) => card.value),
    );
    if (faceUpValues.size === 0) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 65: you have no face-up Number cards and must skip",
      };
    }

    const attemptedValues: unknown[] =
      ctx.action.type === "dualCut" || ctx.action.type === "dualCutDoubleDetector"
        ? [ctx.action.guessValue]
        : ctx.action.type === "soloCut"
          ? [ctx.action.value]
          : (Array.isArray(ctx.action.cuts)
            ? ctx.action.cuts
            : []
          ).map((cut) => {
            const withGuess = cut as { guessValue?: unknown };
            return withGuess.guessValue;
          });

    for (const attemptedValue of attemptedValues) {
      if (typeof attemptedValue !== "number" || !faceUpValues.has(attemptedValue)) {
        const allowedValues = [...faceUpValues].sort((a, b) => a - b).join(", ");
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError:
            `Mission 65: cut values must match your face-up Number cards (${allowedValues})`,
        };
      }
    }
  },

  resolve(_rule: PersonalNumberCardsRuleDef, ctx: ResolveHookContext): void {
    if (!ctx.cutSuccess || typeof ctx.cutValue !== "number") return;

    const numberCards = ctx.state.campaign?.numberCards;
    const playerHands = numberCards?.playerHands;
    if (!numberCards || !playerHands) return;

    const projectedCutCount = getProjectedCutCountForResolve(ctx, ctx.cutValue);
    if (projectedCutCount < 4) return;

    let flippedCount = 0;
    for (const hand of Object.values(playerHands)) {
      for (const card of hand) {
        if (card.value === ctx.cutValue && card.faceUp) {
          card.faceUp = false;
          flippedCount++;
        }
      }
    }
    if (flippedCount === 0) return;

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: ctx.action.actorId,
      action: "hookEffect",
      detail: `personal_number_cards:completed=${ctx.cutValue}|flipped=${flippedCount}`,
      timestamp: Date.now(),
    });
  },

  endTurn(_rule: PersonalNumberCardsRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;

    const numberCards = ctx.state.campaign?.numberCards;
    const playerHands = numberCards?.playerHands;
    if (!numberCards || !playerHands) return;

    const playerCount = ctx.state.players.length;
    const maxAutoSkips = ctx.state.board.detonatorMax + playerCount;

    for (let autoSkipCount = 0; autoSkipCount < maxAutoSkips; autoSkipCount++) {
      if (ctx.state.result != null) return;

      const actor = ctx.state.players[ctx.state.currentPlayerIndex];
      if (!actor) return;

      const uncutTiles = actor.hand.filter((tile) => !tile.cut);
      const hasUncutNonRed = uncutTiles.some((tile) => tile.gameValue !== "RED");
      if (!hasUncutNonRed) return;

      const actorCards = playerHands[actor.id] ?? [];
      const faceUpValues = new Set(
        actorCards.filter((card) => card.faceUp).map((card) => card.value),
      );
      const hasMatchingFaceUpValue = uncutTiles.some(
        (tile) => typeof tile.gameValue === "number" && faceUpValues.has(tile.gameValue),
      );
      if (hasMatchingFaceUpValue) return;

      ctx.state.board.detonatorPosition += 1;
      pushGameLog(ctx.state, {
        turn: ctx.state.turnNumber,
        playerId: actor.id,
        action: "hookEffect",
        detail:
          `personal_number_cards:auto_skip|player=${actor.id}` +
          `|detonator=${ctx.state.board.detonatorPosition}`,
        timestamp: Date.now(),
      });

      if (ctx.state.board.detonatorPosition >= ctx.state.board.detonatorMax) {
        ctx.state.phase = "finished";
        ctx.state.result = "loss_detonator";
        return;
      }

      let nextPlayerIndex = ctx.state.currentPlayerIndex;
      for (let offset = 1; offset <= playerCount; offset++) {
        const candidateIndex = (ctx.state.currentPlayerIndex + offset) % playerCount;
        const candidate = ctx.state.players[candidateIndex];
        if (candidate?.hand.some((tile) => !tile.cut)) {
          nextPlayerIndex = candidateIndex;
          break;
        }
      }

      ctx.state.currentPlayerIndex = nextPlayerIndex;
      ctx.state.turnNumber += 1;
    }
  },
});

// ── Unique mission hooks ──────────────────────────────────────────

/**
 * Mission 27: No character cards / DD unavailable.
 * Also triggers a token draft at yellow-wire threshold.
 */
registerHookHandler<"no_character_cards">("no_character_cards", {
  setup(rule: NoCharacterCardsRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).noCharacterCards = true;

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `no_character_cards:active|yellowTriggerDraftCount=${rule.yellowTriggerDraftCount ?? "none"}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 28: Captain lazy constraints.
 * Captain has no character card and special turn-skipping rules.
 */
registerHookHandler<"captain_lazy_constraints">("captain_lazy_constraints", {
  setup(_rule: CaptainLazyConstraintsRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).captainLazy = true;

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "captain_lazy_constraints:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 17: False info tokens.
 * Captain places misleading tokens on other players' stands.
 */
registerHookHandler<"false_info_tokens">("false_info_tokens", {
  setup(_rule: FalseInfoTokensRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).falseInfoTokenMode = true;

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "false_info_tokens:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Missions 39, 48: Simultaneous multi-wire cut.
 * Players simultaneously cut wires of the same color.
 */
registerHookHandler<"simultaneous_multi_cut">("simultaneous_multi_cut", {
  validate(rule: SimultaneousMultiCutRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.state.mission === 39) {
      if (ctx.action.type === "simultaneousFourCut") return;

      const targetValue = getProtectedSimultaneousFourValue(ctx.state);
      if (targetValue == null) return;
      if (!actionAttemptsCutValue(ctx.action, targetValue)) return;

      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError:
          `Mission 39: wires of value ${targetValue} can only be cut using the simultaneous four-wire special action`,
      };
    }

    // Mission 48: yellow wires cannot be cut via normal dual/solo actions.
    // They must be cut through the dedicated simultaneous 3-yellow action.
    if (ctx.state.mission !== 48) return;
    if (rule.color !== "yellow" || rule.count !== 3) return;

    if (
      ctx.action.type === "soloCut"
      && ctx.action.value === "YELLOW"
    ) return {
      validationCode: "MISSION_RULE_VIOLATION",
      validationError:
        "Mission 48: yellow wires can only be cut using the simultaneous 3-yellow special action",
    };

    if (!actionTargetsUncutYellowWire(ctx.state, ctx.action)) return;

    return {
      validationCode: "MISSION_RULE_VIOLATION",
      validationError:
        "Mission 48: yellow wires can only be cut using the simultaneous 3-yellow special action",
    };
  },

  setup(rule: SimultaneousMultiCutRuleDef, ctx: SetupHookContext): void {
    // Mission 39 requires a visible Number card target for the 4-wire action.
    // Initialize one face-up card plus an 8-card face-down deck.
    if (ctx.state.mission === 39) {
      const values = shuffle([...MISSION_NUMBER_VALUES]);
      const visibleValue = values.shift();
      if (visibleValue != null) {
        const deckValues = values.slice(0, 8);
        ctx.state.campaign ??= {};
        ctx.state.campaign.numberCards = {
          visible: [{ id: `m39-visible-${visibleValue}`, value: visibleValue, faceUp: true }],
          deck: deckValues.map((value, index) => ({
            id: `m39-deck-${index}-${value}`,
            value,
            faceUp: false,
          })),
          discard: [],
          playerHands: {},
        };
      }
    }

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: `simultaneous_multi_cut:color=${rule.color}|count=${rule.count}`,
      timestamp: Date.now(),
    });
  },

  endTurn(_rule: SimultaneousMultiCutRuleDef, ctx: EndTurnHookContext): void {
    // Mission 39 only: before each Captain turn (until special action succeeds),
    // discard the top card of the Number deck.
    if (ctx.state.mission !== 39) return;
    if (ctx.state.phase === "finished") return;
    if (ctx.state.campaign?.mission23SpecialActionDone) return;

    const numberCards = ctx.state.campaign?.numberCards;
    if (!numberCards || numberCards.deck.length === 0) return;

    const captainIndex = ctx.state.players.findIndex((player) => player.isCaptain);
    if (captainIndex === -1) return;
    if (ctx.state.currentPlayerIndex !== captainIndex) return;

    const discarded = numberCards.deck.shift()!;
    numberCards.discard.push({
      ...discarded,
      faceUp: true,
    });

    pushGameLog(ctx.state, {
      turn: ctx.state.turnNumber,
      playerId: "system",
      action: "hookEffect",
      detail: `m39:number_deck_discard:${discarded.value}|remaining=${numberCards.deck.length}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 46: Sevens must be last.
 * All 7-value wires must be the last wires cut on each stand.
 */
type SimultaneousCutGuess = {
  guessValue?: number | "YELLOW";
};

function isMission46SevenTileForMission(
  state: Readonly<GameState>,
  tile: WireTile,
): boolean {
  if (state.mission !== 46) return false;
  return isMission46SevenTile(tile, state.players.length);
}

function actionAttemptsSevenCut(
  state: Readonly<GameState>,
  action: ValidateHookContext["action"],
): boolean {
  if (action.type === "dualCut") {
    const typedAction = action as unknown as {
      targetPlayerId: string;
      targetTileIndex: number;
      guessValue: number | "YELLOW";
    };
    if (typedAction.guessValue === "YELLOW") {
      const targetPlayer = state.players.find((player) => player.id === typedAction.targetPlayerId);
      const targetTile = targetPlayer?.hand[typedAction.targetTileIndex];
      return !!targetTile && isMission46SevenTileForMission(state, targetTile);
    }

    return typedAction.guessValue === 7;
  }

  if (action.type === "dualCutDoubleDetector") {
    const typedAction = action as unknown as {
      targetPlayerId: string;
      tileIndex1: number;
      tileIndex2: number;
      guessValue: number | "YELLOW";
    };
    if (typedAction.guessValue !== 7 && typedAction.guessValue !== "YELLOW") return false;

    const targetPlayer = state.players.find((player) =>
      player.id === typedAction.targetPlayerId,
    );
    const targetTiles = [
      targetPlayer?.hand[typedAction.tileIndex1],
      targetPlayer?.hand[typedAction.tileIndex2],
    ];
    return targetTiles.some((tile) => tile != null && isMission46SevenTileForMission(state, tile));
  }

  if (action.type === "soloCut") {
    return action.value === 7;
  }

  if (action.type !== "simultaneousCut") {
    return false;
  }

  const cuts = Array.isArray(action.cuts) ? action.cuts as SimultaneousCutGuess[] : [];
  return cuts.some((cut) => cut.guessValue === 7);
}

function actorHasUncutNonSevenCuttableWire(
  state: Readonly<GameState>,
  actorId: string,
): boolean {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor) return false;

  return actor.hand.some((tile) =>
    !tile.cut && (state.mission === 46
      ? !isMission46SevenTileForMission(state, tile)
      : tile.gameValue !== 7),
  );
}

function playerHasOnlySevenCuttableWires(
  state: Readonly<GameState>,
  playerId: string,
): boolean {
  if (state.mission !== 46) return false;
  const player = state.players.find((player) => player.id === playerId);
  if (!player) return false;

  const uncutTiles = player.hand.filter((tile) => !tile.cut);
  if (uncutTiles.length === 0) return false;

  return uncutTiles.every((tile) => isMission46SevenTileForMission(state, tile));
}

function updateMission46SevensPendingAction(state: GameState): void {
  if (state.mission !== 46) return;
  const current = state.players[state.currentPlayerIndex];
  if (!current) return;

  const needsSevensAction = playerHasOnlySevenCuttableWires(state, current.id);
  state.campaign ??= {};

  if (needsSevensAction) {
    state.campaign.mission46PendingSevensPlayerId = current.id;
    if (
      !state.pendingForcedAction ||
      state.pendingForcedAction.kind === "mission46SevensCut"
    ) {
      state.pendingForcedAction = {
        kind: "mission46SevensCut",
        playerId: current.id,
      };
    }
    return;
  }

  state.campaign.mission46PendingSevensPlayerId = undefined;
  if (state.pendingForcedAction?.kind === "mission46SevensCut") {
    state.pendingForcedAction = undefined;
  }
}

registerHookHandler<"sevens_last">("sevens_last", {
  validate(_rule: SevensLastRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (!actionAttemptsSevenCut(ctx.state, ctx.action)) return;
    if (!actorHasUncutNonSevenCuttableWire(ctx.state, ctx.action.actorId)) return;

    return {
      validationCode: "MISSION_RULE_VIOLATION",
      validationError: "Mission 46: 7-value wires must be cut last",
    };
  },

  setup(_rule: SevensLastRuleDef, ctx: SetupHookContext): void {
    updateMission46SevensPendingAction(ctx.state);
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "sevens_last:active",
      timestamp: Date.now(),
    });
  },

  endTurn(_rule: SevensLastRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;
    updateMission46SevensPendingAction(ctx.state);
  },
});

/**
 * Mission 51: Boss designates value.
 * The designated player announces a value and a teammate must cut it.
 */
registerHookHandler<"boss_designates_value">("boss_designates_value", {
  setup(_rule: BossDesignatesValueRuleDef, ctx: SetupHookContext): void {
    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "boss_designates_value:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 58: No info tokens, unlimited Double Detector.
 * DD is always available but failed cuts give no information.
 */
registerHookHandler<"no_info_unlimited_dd">("no_info_unlimited_dd", {
  setup(_rule: NoInfoUnlimitedDDRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    (ctx.state.campaign as Record<string, unknown>).noInfoUnlimitedDD = true;
    (ctx.state.campaign as Record<string, unknown>).noMarkersMemoryMode = true;

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "no_info_unlimited_dd:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 13: Random setup info tokens.
 * During setup, random info tokens are placed instead of player-chosen ones.
 */
registerHookHandler<"random_setup_info_tokens">("random_setup_info_tokens", {
  setup(rule: RandomSetupInfoTokensRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    const campaignState = ctx.state.campaign as Record<string, unknown>;

    if (rule.captainOnly && ctx.state.players.length !== 2) {
      return;
    }

    campaignState.randomSetupInfoTokens = true;
    if (rule.captainOnly && ctx.state.players.length === 2) {
      campaignState.randomSetupCaptainOnly = true;
    }

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "random_setup_info_tokens:active",
      timestamp: Date.now(),
    });
  },
});

/**
 * Mission 41: Iberian yellow mode.
 * Special yellow wire handling where a designated wire must be cut when
 * instructed. If the designated yellow wire is RED, the bomb explodes.
 * Setup also uses random info-token draws.
 */
registerHookHandler<"iberian_yellow_mode">("iberian_yellow_mode", {
  setup(_rule: IberianYellowModeRuleDef, ctx: SetupHookContext): void {
    ctx.state.campaign ??= {};
    const campaignState = ctx.state.campaign as Record<string, unknown>;
    campaignState.iberianYellowMode = true;
    campaignState.randomSetupInfoTokens = true;
    skipMission41TripwireTurns(ctx.state);

    pushGameLog(ctx.state, {
      turn: 0,
      playerId: "system",
      action: "hookSetup",
      detail: "iberian_yellow_mode:active",
      timestamp: Date.now(),
    });
  },

  validate(_rule: IberianYellowModeRuleDef, ctx: ValidateHookContext): HookResult | void {
    if (ctx.state.mission === 41) {
      const actor = ctx.state.players.find((p) => p.id === ctx.action.actorId);
      if (actor && hasOnlyUncutTripwireAndRedWires(actor)) {
        return {
          validationCode: "MISSION_RULE_VIOLATION",
          validationError: "Mission 41: player must skip their turn",
        };
      }
    }

    if (ctx.action.type === "revealReds") return;

    if (
      ctx.action.type === "soloCut" &&
      ctx.action.value === "YELLOW"
    ) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 41: yellow wires are only cut with the mission special action",
      };
    }

    if (mission41TargetIsYellowWire(ctx.state, ctx.action)) {
      return {
        validationCode: "MISSION_RULE_VIOLATION",
        validationError: "Mission 41: yellow wires are only cut with the mission special action",
      };
    }
  },

  endTurn(_rule: IberianYellowModeRuleDef, ctx: EndTurnHookContext): void {
    if (ctx.state.phase === "finished") return;
    skipMission41TripwireTurns(ctx.state);
  },
});
