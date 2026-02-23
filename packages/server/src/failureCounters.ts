import type { GameResult } from "@bomb-busters/shared";

export type FailureReason = Extract<
  GameResult,
  "loss_red_wire" | "loss_detonator" | "loss_timer"
>;

export interface FailureCounters {
  loss_red_wire: number;
  loss_detonator: number;
  loss_timer: number;
}

export const ZERO_FAILURE_COUNTERS: Readonly<FailureCounters> = Object.freeze({
  loss_red_wire: 0,
  loss_detonator: 0,
  loss_timer: 0,
});

export function cloneFailureCounters(
  counters: Readonly<FailureCounters>,
): FailureCounters {
  return { ...counters };
}

export function isFailureReason(
  result: GameResult | null,
): result is FailureReason {
  return (
    result === "loss_red_wire" ||
    result === "loss_detonator" ||
    result === "loss_timer"
  );
}

function toFiniteCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value >= 0 ? Math.trunc(value) : 0;
}

export function normalizeFailureCounters(raw: unknown): FailureCounters {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  return {
    loss_red_wire: toFiniteCount(obj.loss_red_wire),
    loss_detonator: toFiniteCount(obj.loss_detonator),
    loss_timer: toFiniteCount(obj.loss_timer),
  };
}

export function incrementFailureCounter(
  counters: FailureCounters,
  reason: FailureReason,
): void {
  counters[reason] += 1;
}
